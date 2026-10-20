import { AccessGrant, GrantAction, PhysicalAsset, ResourceKey, StaffMember, UserProfile } from "@/types/assets";

export type RecordShape = Record<string, any> & { id: string; archived?: boolean };

export function isAdmin(profile: UserProfile | null | undefined): boolean {
  return profile?.role === "SUPER_ADMIN";
}

export function canPerform(
  profile: UserProfile | null | undefined,
  grant: AccessGrant | null | undefined,
  resource: ResourceKey,
  action: GrantAction,
): boolean {
  if (isAdmin(profile)) return true;
  return profile?.role === "STAFF" && !!grant?.grants?.[resource]?.actions.includes(action);
}

export function recordWithinScope(
  profile: UserProfile,
  grant: AccessGrant | null | undefined,
  resource: ResourceKey,
  record: RecordShape,
): boolean {
  if (profile.role === "SUPER_ADMIN") return true;

  const email = profile.email.toLowerCase();

  // Check if the record is directly assigned to the staff user (their own record):
  const isOwnRecord = (
    (resource === "staff_inventory" && String(record.email || "").toLowerCase() === email) ||
    (resource === "physical_assets" && (String(record.assignedStaffEmail || "").toLowerCase() === email || (!!record.assignedStaffUid && record.assignedStaffUid === profile.uid))) ||
    (resource === "digital_credentials" && (String(record.assignedUserEmail || "").toLowerCase() === email || (!!record.assignedUserUid && record.assignedUserUid === profile.uid))) ||
    (resource === "workbooks" && String(record.primaryOwnerEmail || "").toLowerCase() === email) ||
    (resource === "facilities" && String(record.assignedOrSharedEmail || "").toLowerCase() === email)
  );

  if (isOwnRecord) return true;

  // If not directly assigned, check if there's an explicit AccessGrant scope (e.g. "all" or "branch"):
  if (!grant?.grants?.[resource]) return false;
  const scope = grant.grants[resource]?.scope ?? "assigned";
  if (scope === "all") return true;
  if (scope === "branch") {
    if (resource === "workbooks") return !!grant?.department && record.department === grant.department;
    const branch = record.branch ?? record.assignedUserBranch ?? record.primaryOwnerBranch ?? record.assignedOrSharedBranch;
    return !!grant?.branch && branch === grant.branch;
  }

  return false;
}

export function canReadRecord(
  profile: UserProfile,
  grant: AccessGrant | null | undefined,
  resource: ResourceKey,
  record: RecordShape,
): boolean {
  if (profile.role === "SUPER_ADMIN") return true;
  return recordWithinScope(profile, grant, resource, record);
}

export type PageAccess = Record<
  "overview" | "hardware" | "auditor" | "credentials" | "workbooks" | "facilities" | "staff" | "ingestion" | "stocktake" | "tasks" | "workspace" | "reporting",
  boolean
>;

export function accessiblePages(
  profile: UserProfile,
  grant: AccessGrant | null | undefined,
  hasAssignedStocktake: boolean,
): PageAccess {
  if (profile.role === "SUPER_ADMIN") {
    return {
      overview: true, hardware: true, auditor: true, credentials: true, workbooks: true,
      facilities: true, staff: true, ingestion: true, stocktake: true, tasks: true, workspace: true, reporting: true,
    };
  }
  const canRead = (resource: ResourceKey) => canPerform(profile, grant, resource, "read");
  return {
    overview: true,
    hardware: true,
    auditor: canRead("physical_assets"),
    credentials: true,
    workbooks: canRead("workbooks"),
    facilities: canRead("facilities"),
    staff: canRead("staff_inventory"),
    ingestion: false,
    stocktake: hasAssignedStocktake,
    tasks: true,
    workspace: true,
    reporting: true,
  };
}

export function excludeArchived<T extends { archived?: boolean }>(rows: T[], showArchived: boolean): T[] {
  return rows.filter((row) => showArchived ? row.archived === true : row.archived !== true);
}

export function staffHasAsset(asset: PhysicalAsset, staff: StaffMember): boolean {
  if (asset.assignedStaffUid && staff.uid) return asset.assignedStaffUid === staff.uid;
  const assetEmail = asset.assignedStaffEmail?.trim().toLowerCase();
  const staffEmail = staff.email?.trim().toLowerCase();
  if (assetEmail && staffEmail) return assetEmail === staffEmail;
  return asset.assignedStaff.trim().toLowerCase() === staff.name.trim().toLowerCase();
}
