import { useUserRole } from "./useUserRole";

/** True if user can edit (add/update/delete). Viewers are read-only. */
export function useCanEdit(): boolean {
  const { role } = useUserRole();
  return role === "admin" || role === null;
}
