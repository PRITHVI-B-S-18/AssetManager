import { createContext } from "react";
import type { UserRole } from "../services/firestore";

export interface UserRoleContextValue {
  role: UserRole | null;
  loading: boolean;
}

export const UserRoleContext = createContext<UserRoleContextValue>({
  role: null,
  loading: true,
});
