import { Timestamp } from "firebase/firestore";

export type CompanyRole = "owner" | "admin" | "seller" | "stock" | "finance";

export type CompanyMemberStatus = "active" | "invited" | "disabled";

export interface UserDoc {
  email: string;
  displayName: string;
  createdAt: Timestamp;
  currentCompanyId?: string;
  phone?: string;
  photoURL?: string;
}

export interface CompanyDoc {
  name: string;
  rut?: string;
  size?: "micro" | "small" | "medium" | "large";
  ownerId: string;
  createdAt: Timestamp;
  isActive: boolean;
}

export interface CompanyMemberDoc {
  userId: string;
  email: string;
  role: CompanyRole;
  status: CompanyMemberStatus;
  createdAt: Timestamp;
}
