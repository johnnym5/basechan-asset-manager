export type UserRole = "SUPER_ADMIN" | "STAFF" | "UNAUTHORIZED";
export type ResourceKey = "staff_inventory" | "physical_assets" | "digital_credentials" | "workbooks" | "facilities" | "reporting";

export type FirestoreTimestampValue = string | number | Date | unknown;

export interface WorkspaceLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  audience: "all" | "selected";
  assignedUids: string[];
  createdBy: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  archived?: boolean;
}

export type GrantScope = "assigned" | "branch" | "all";
export type GrantAction = "read" | "create" | "edit" | "archive" | "restore" | "secretWrite";

export interface ResourceGrant {
  actions: GrantAction[];
  scope: GrantScope;
}

export interface AccessGrant {
  uid: string;
  email: string;
  branch?: string;
  department?: string;
  grants: Partial<Record<ResourceKey, ResourceGrant>>;
  updatedAt?: FirestoreTimestampValue;
  updatedBy?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  branch?: string;
  department?: string;
  staffId?: string;
  lastLogin?: FirestoreTimestampValue;
  onboardingCompletedAt?: FirestoreTimestampValue;
}

export interface StaffMember {
  id: string;
  archived?: boolean;
  archivedAt?: FirestoreTimestampValue;
  archivedBy?: string;
  uid?: string;
  sn?: number | string;
  name: string;
  department: string;
  position: string;
  employmentDate?: string;
  email: string;
  phone?: string;
  registeredUnder?: string;
  branch: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
}

export interface PhysicalAsset {
  id: string;
  sn?: number | string;
  tag: string;
  category: string;
  makeModel: string;
  serialNumber: string;
  assignedStaff: string;
  assignedStaffEmail?: string;
  assignedStaffUid?: string;
  assignedStaffBranch?: string;
  department: string;
  branch: string;
  purchaseDate?: string;
  condition: string;
  status: "Active" | "Repair" | "Retired" | string;
  isLocked: boolean;
  customAttributes?: Record<string, string>;
  lastStaffCheckin?: FirestoreTimestampValue;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  archived?: boolean;
  archivedAt?: FirestoreTimestampValue;
  archivedBy?: string;
}

export type AssetCheckStatus = "unverified" | "verified" | "missing" | "moved" | "damaged";

export interface StocktakeRound {
  id: string;
  title: string;
  branch: string;
  status: "open" | "closed";
  assignedUids: string[];
  createdBy: string;
  createdAt?: FirestoreTimestampValue;
  closedAt?: FirestoreTimestampValue;
}

export interface StocktakeItem {
  id: string;
  roundId: string;
  assetId: string;
  assetTag: string;
  branch: string;
  assignedUid?: string;
  status: AssetCheckStatus;
  note?: string;
  checkedBy?: string;
  checkedAt?: FirestoreTimestampValue;
  history?: Array<{ status: AssetCheckStatus; note?: string; checkedBy: string; checkedAt: FirestoreTimestampValue }>;
}

export interface InboxTask {
  id: string;
  type: "repair_request" | "stocktake" | "handover" | "general_task" | string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "done";
  createdByUid: string;
  createdByName?: string;
  assignedToUid?: string;
  assignedToName?: string;
  assignedToEmail?: string;
  assetId?: string;
  assetTag?: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  localOnly?: boolean;
  localSyncFailed?: boolean;
}

export interface DigitalCredential {
  id: string;
  sn?: number | string;
  platform: string;
  loginEmail: string;
  subAgentHandleId?: string;
  assignedUser: string;
  assignedUserEmail?: string;
  assignedUserUid?: string;
  assignedUserBranch?: string;
  userRole?: string;
  passwordVaultLocation?: string;
  rawPass?: string;
  vaultStatus: "SECURED" | "UNRESTRICTED";
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  archived?: boolean;
  archivedAt?: FirestoreTimestampValue;
  archivedBy?: string;
}

export interface WorkbookDocument {
  id: string;
  sn?: number | string;
  title: string;
  businessFunction?: string;
  cloudStorageUrl: string;
  primaryOwner: string;
  primaryOwnerEmail?: string;
  primaryOwnerBranch?: string;
  department: string;
  accessPermissions: "ALL" | "RESTRICTED" | string;
  lastAuditDate?: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  archived?: boolean;
  archivedAt?: FirestoreTimestampValue;
  archivedBy?: string;
}

export interface FacilityItem {
  id: string;
  sn?: number | string;
  infrastructureId?: string;
  branch: string;
  itemDescription: string;
  category: "FURNITURE" | "HARDWARE" | "NETWORKING" | string;
  roomZone?: string;
  quantity: number;
  condition: string;
  assignedOrShared?: string;
  assignedOrSharedEmail?: string;
  assignedOrSharedBranch?: string;
  maintenanceNotes?: string;
  purchaseDate?: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
  archived?: boolean;
  archivedAt?: FirestoreTimestampValue;
  archivedBy?: string;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorName?: string;
  actorRole: string;
  action: string;
  targetId: string;
  targetType: "PHYSICAL_ASSET" | "DIGITAL_CREDENTIAL" | "WORKBOOK" | "FACILITY" | "SYSTEM";
  details: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  visibilityUids: string[];
  timestamp: FirestoreTimestampValue;
}

export interface VaultAccessLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  credentialId: string;
  platform: string;
  loginEmail: string;
  timestamp: FirestoreTimestampValue;
}
