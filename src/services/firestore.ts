import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  writeBatch,
  onSnapshot,
  limit,
  startAfter,
} from "firebase/firestore";
import type { Unsubscribe, DocumentSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import type { SectionConfig, StoredRecord } from "../types/sections";
import { BUILT_IN_SECTIONS } from "../types/sections";

const SECTIONS_COLLECTION = "sections";

/** Each section has its own Firestore collection (e.g. allEmp, allLaptop, or custom section id). */
function getSectionCollectionName(sectionId: string): string {
  return sectionId;
}

function mapSectionsSnapshot(docs: { id: string; data: () => Record<string, unknown> }[]): SectionConfig[] {
  if (docs.length === 0) return [];
  // Use Firestore as source of truth so edits to section name/columns in Settings are persisted
  return docs.map((d) => ({ ...d.data(), id: d.id } as SectionConfig));
}

export async function getSections(): Promise<SectionConfig[]> {
  const snap = await getDocs(
    query(
      collection(db, SECTIONS_COLLECTION),
      orderBy("order", "asc")
    )
  );
  return mapSectionsSnapshot(snap.docs);
}

/** Real-time listener for sections. Returns unsubscribe function. */
export function subscribeSections(onUpdate: (sections: SectionConfig[]) => void): Unsubscribe {
  const q = query(
    collection(db, SECTIONS_COLLECTION),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snap) => {
    const list = mapSectionsSnapshot(snap.docs);
    onUpdate(list.length ? list : BUILT_IN_SECTIONS);
  }, (err: { code?: string }) => {
    // Expected when user signs out: listeners get permission-denied before unsubscribe runs
    if (err?.code !== "permission-denied") {
      console.error("subscribeSections error:", err);
    }
    onUpdate(BUILT_IN_SECTIONS);
  });
}

export async function initSectionsIfEmpty(builtInSections: SectionConfig[]) {
  const snap = await getDocs(collection(db, SECTIONS_COLLECTION));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  builtInSections.forEach((s, i) => {
    const ref = doc(db, SECTIONS_COLLECTION, s.id);
    batch.set(ref, { ...s, order: i });
  });
  await batch.commit();
}

export async function addSection(section: Omit<SectionConfig, "id">): Promise<string> {
  const ref = await addDoc(collection(db, SECTIONS_COLLECTION), section);
  return ref.id;
}

export async function updateSection(id: string, data: Partial<SectionConfig>) {
  await updateDoc(doc(db, SECTIONS_COLLECTION, id), data as Record<string, unknown>);
}

export async function deleteSection(id: string) {
  await deleteDoc(doc(db, SECTIONS_COLLECTION, id));
  const sectionCol = collection(db, getSectionCollectionName(id));
  const recs = await getDocs(sectionCol);
  const batch = writeBatch(db);
  recs.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function getRecords(sectionId: string): Promise<StoredRecord[]> {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  const snap = await getDocs(sectionCol);
  const list = snap.docs.map((d) => ({ ...d.data(), id: d.id, sectionId } as StoredRecord));
  list.sort((a, b) => {
    const t1 = (a._createdAt as string) || "";
    const t2 = (b._createdAt as string) || "";
    return t2.localeCompare(t1);
  });
  return list;
}

/** Real-time listener for records in a section. Returns unsubscribe function. */
export function subscribeRecords(sectionId: string, onUpdate: (records: StoredRecord[]) => void): Unsubscribe {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  return onSnapshot(sectionCol, (snap) => {
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id, sectionId } as StoredRecord));
    list.sort((a, b) => {
      const t1 = (a._createdAt as string) || "";
      const t2 = (b._createdAt as string) || "";
      return t2.localeCompare(t1);
    });
    onUpdate(list);
  }, (err: { code?: string }) => {
    if (err?.code !== "permission-denied") {
      console.error("subscribeRecords error:", err);
    }
    onUpdate([]);
  });
}

const PAGE_SIZE_DEFAULT = 50;

/** Paginated real-time listener. Uses orderBy(_createdAt, desc) and limit. startAfter is the last doc from the previous page. */
export function subscribeRecordsPaginated(
  sectionId: string,
  options: { limit?: number; startAfterDoc?: DocumentSnapshot | null },
  onUpdate: (records: StoredRecord[], lastDoc: DocumentSnapshot | null) => void
): Unsubscribe {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  const limitNum = options.limit ?? PAGE_SIZE_DEFAULT;
  const q = options.startAfterDoc
    ? query(
        sectionCol,
        orderBy("_createdAt", "desc"),
        limit(limitNum),
        startAfter(options.startAfterDoc)
      )
    : query(sectionCol, orderBy("_createdAt", "desc"), limit(limitNum));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ ...d.data(), id: d.id, sectionId } as StoredRecord));
    const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1]! : null;
    onUpdate(list, last);
  }, (err: { code?: string }) => {
    if (err?.code !== "permission-denied") {
      console.error("subscribeRecordsPaginated error:", err);
    }
    onUpdate([], null);
  });
}

/** Remove undefined values; Firestore does not accept undefined. */
function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}

export async function addRecord(record: Omit<StoredRecord, "id">): Promise<string> {
  const sectionId = record.sectionId != null ? String(record.sectionId) : "";
  if (!sectionId) throw new Error("sectionId is required");
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  const { sectionId: _s, ...rest } = record;
  const uid = auth.currentUser?.uid ?? null;
  const ref = await addDoc(sectionCol, stripUndefined({
    ...rest,
    _createdAt: new Date().toISOString(),
    ...(uid != null && { _createdBy: uid }),
  }));
  return ref.id;
}

export async function updateRecord(
  sectionId: string,
  id: string,
  data: Partial<Omit<StoredRecord, "id" | "sectionId">>
) {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  const uid = auth.currentUser?.uid ?? null;
  await updateDoc(doc(sectionCol, id), stripUndefined({
    ...data,
    _updatedAt: new Date().toISOString(),
    ...(uid != null && { _updatedBy: uid }),
  }) as Record<string, unknown>);
}

export async function deleteRecord(sectionId: string, id: string) {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  await deleteDoc(doc(sectionCol, id));
}

export async function getSectionRecordCount(sectionId: string): Promise<number> {
  const sectionCol = collection(db, getSectionCollectionName(sectionId));
  const snap = await getCountFromServer(sectionCol);
  return snap.data().count;
}

// --- User roles (viewer / admin) ---
const CONFIG_COLLECTION = "config";
const USERS_COLLECTION = "users";

export type UserRole = "viewer" | "admin";

export interface AppConfig {
  adminUids?: string[];
}

export interface UserProfile {
  email: string;
  role: UserRole;
  createdAt?: string;
}

export async function getAppConfig(): Promise<AppConfig> {
  const ref = doc(db, CONFIG_COLLECTION, "app");
  const snap = await getDoc(ref);
  return (snap.data() as AppConfig) ?? {};
}

/** Create or ensure current user's profile. Call after sign-in. Default role viewer unless uid in config.adminUids. Keeps email in sync with Auth on each sign-in. */
export async function ensureUserProfile(uid: string, email: string | null): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(userRef);
  const config = await getAppConfig();
  const isAdmin = config.adminUids?.includes(uid) ?? false;
  const currentEmail = email ?? "";

  if (snap.exists()) {
    const existing = snap.data() as UserProfile;
    if (existing.email !== currentEmail && currentEmail) {
      try {
        await updateDoc(userRef, { email: currentEmail });
      } catch {
        /* may lack permission to update own email; non-fatal */
      }
      return { ...existing, email: currentEmail };
    }
    return existing;
  }

  const profile: UserProfile = {
    email: currentEmail,
    role: isAdmin ? "admin" : "viewer",
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, profile);
  return profile;
}

export function subscribeUserProfile(uid: string, onUpdate: (profile: UserProfile | null) => void): Unsubscribe {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userRef,
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (err: { code?: string }) => {
      // Expected when user signs out: listener gets permission-denied before unsubscribe runs
      if (err?.code !== "permission-denied") {
        console.error("subscribeUserProfile error:", err);
      }
      onUpdate(null);
    }
  );
}

export async function getUsers(): Promise<{ uid: string; email: string; role: UserRole }[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  const list = snap.docs.map((d) => {
    const data = d.data() as UserProfile;
    return { uid: d.id, email: data.email ?? "", role: data.role ?? "viewer" };
  });
  return list.sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: "base" }));
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), { role });
}
