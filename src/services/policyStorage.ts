import { supabase } from "../supabase";

const BUCKET = "policies";
const FOLDER_PLACEHOLDER = ".keep";

export type PolicyFile = {
  name: string;
  path: string;
  createdAt: string;
  size?: number;
};

export type PolicyListResult = {
  folders: string[];
  files: PolicyFile[];
};

function getBucket() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.storage.from(BUCKET);
}

function fullPath(currentPath: string, segment: string): string {
  return currentPath ? `${currentPath}/${segment}` : segment;
}

type ListItem = { name: string; created_at?: string; updated_at?: string; metadata?: { size?: number } };

/**
 * List folders and PDF files at a given path.
 * @param folderPath - Empty string for root, or e.g. "HR Policies", "HR Policies/2024"
 */
export async function listPoliciesAt(folderPath: string): Promise<PolicyListResult> {
  const bucket = getBucket();
  const { data, error } = await bucket.list(folderPath, {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  const list = (data ?? []) as ListItem[];
  const folders: string[] = [];
  const files: PolicyFile[] = [];

  for (const item of list) {
    const name = item.name;
    if (!name) continue;
    if (name.includes("/")) {
      // Nested path: "SubFolder/file.pdf" or "SubFolder/.keep" -> folder is first segment
      const first = name.split("/")[0];
      if (first && !folders.includes(first)) folders.push(first);
    } else if (name.toLowerCase().endsWith(".pdf")) {
      files.push({
        name,
        path: fullPath(folderPath, name),
        createdAt: item.created_at ?? item.updated_at ?? "",
        size: item.metadata?.size,
      });
    } else if (name !== FOLDER_PLACEHOLDER) {
      // Treat as folder (e.g. folder created with .keep, or other non-pdf file)
      if (!folders.includes(name)) folders.push(name);
    }
  }

  // If we got no folders from nested paths, check for direct "folder" entries (Supabase may return folder names as items)
  for (const item of list) {
    const name = item.name;
    if (!name || name.includes("/") || name.toLowerCase().endsWith(".pdf") || name === FOLDER_PLACEHOLDER) continue;
    if (!folders.includes(name)) folders.push(name);
  }

  files.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  folders.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return { folders, files };
}

/** List all PDFs at root (backward compatible). */
export async function listPolicies(): Promise<PolicyFile[]> {
  const { files } = await listPoliciesAt("");
  return files;
}

/** Create a new folder at the given path. Creates a placeholder file so the folder appears in list. */
export async function createFolder(parentPath: string, folderName: string): Promise<void> {
  const name = folderName.trim().replace(/[/\\]/g, "").trim();
  if (!name) throw new Error("Folder name is required");
  const path = fullPath(parentPath, name);
  const placeholderPath = `${path}/${FOLDER_PLACEHOLDER}`;
  const bucket = getBucket();
  const { error } = await bucket.upload(placeholderPath, new Blob([""]), {
    contentType: "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
}

/** Upload a PDF file into the given folder path (or root if empty). */
export async function uploadPolicy(file: File, folderPath?: string): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed");
  }
  const bucket = getBucket();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const path = folderPath ? `${folderPath}/${fileName}` : fileName;
  const { error } = await bucket.upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/** Get a public URL for viewing (opens in browser). */
export function getPolicyPublicUrl(path: string): string {
  const bucket = getBucket();
  const { data } = bucket.getPublicUrl(path);
  return data.publicUrl;
}

/** Download file as blob for direct save (no new tab). */
export async function downloadPolicyBlob(path: string): Promise<Blob> {
  const bucket = getBucket();
  const { data, error } = await bucket.download(path);
  if (error) throw error;
  return data;
}

/** Delete a single file by full path. */
export async function deletePolicy(path: string): Promise<void> {
  const bucket = getBucket();
  const { error } = await bucket.remove([path]);
  if (error) throw error;
}

/** Collect all object paths under a prefix (recursive). */
async function collectPathsUnder(bucket: ReturnType<typeof getBucket>, prefix: string): Promise<string[]> {
  const { data } = await bucket.list(prefix, { limit: 1000 });
  const list = (data ?? []) as ListItem[];
  const paths: string[] = [];
  for (const item of list) {
    if (!item.name) continue;
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.name.includes("/")) {
      paths.push(full);
    } else {
      paths.push(full);
      const looksLikeFolder = !item.name.toLowerCase().endsWith(".pdf") && item.name !== FOLDER_PLACEHOLDER;
      if (looksLikeFolder) {
        const nested = await collectPathsUnder(bucket, full);
        paths.push(...nested);
      }
    }
  }
  return paths;
}

/** Delete a folder and all its contents (recursive). */
export async function deleteFolder(folderPath: string): Promise<void> {
  const bucket = getBucket();
  const paths = await collectPathsUnder(bucket, folderPath);
  if (paths.length === 0) return;
  const { error } = await bucket.remove(paths);
  if (error) throw error;
}
