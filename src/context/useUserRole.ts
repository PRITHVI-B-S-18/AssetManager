import { useContext } from "react";
import { UserRoleContext } from "./roleContext";

export function useUserRole() {
  const ctx = useContext(UserRoleContext);
  if (!ctx) throw new Error("useUserRole must be used within UserRoleProvider");
  return ctx;
}
