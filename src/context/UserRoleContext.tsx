import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { ensureUserProfile, subscribeUserProfile } from "../services/firestore";
import type { UserRole } from "../services/firestore";
import { UserRoleContext } from "./roleContext";

export function UserRoleProvider({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    setLoading(true);
    ensureUserProfile(user.uid, user.email ?? null)
      .then((profile) => {
        setRole(profile.role);
        unsub = subscribeUserProfile(user.uid, (next) => {
          setRole(next?.role ?? null);
        });
      })
      .catch(() => setRole("viewer"))
      .finally(() => setLoading(false));
    return () => {
      unsub?.();
    };
  }, [user?.uid]);

  return (
    <UserRoleContext.Provider value={{ role, loading }}>
      {children}
    </UserRoleContext.Provider>
  );
}
