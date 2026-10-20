import { UserProfile } from "@/types/assets";

const LABELS: Record<string, string> = {
  staff_inventory: "staff member",
  physical_assets: "physical asset",
  digital_credentials: "digital credential",
  workbooks: "workbook",
  facilities: "facility item",
  stocktake_rounds: "stocktake round",
  stocktake_items: "stocktake item",
  tasks: "task",
};

export function activityTargetType(resource: string): "PHYSICAL_ASSET" | "DIGITAL_CREDENTIAL" | "WORKBOOK" | "FACILITY" | "SYSTEM" {
  if (resource === "physical_assets") return "PHYSICAL_ASSET";
  if (resource === "digital_credentials") return "DIGITAL_CREDENTIAL";
  if (resource === "workbooks") return "WORKBOOK";
  if (resource === "facilities") return "FACILITY";
  return "SYSTEM";
}

function safeValue(value: unknown): unknown {
  if (value === undefined || value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value ?? "";
  if (Array.isArray(value)) return value.map(safeValue);
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (typeof object.toDate === "function") return (object.toDate as () => Date)().toISOString();
    return JSON.stringify(object);
  }
  return String(value);
}

export function buildActivityLog(
  actor: UserProfile,
  input: { resource: string; action: string; id: string; record?: Record<string, any> | null; before?: Record<string, any> | null; after?: Record<string, any> | null; details?: string; additionalVisibilityUids?: string[] },
) {
  const { resource, action, id, record, before, after } = input;
  const changeMap: Record<string, { from: unknown; to: unknown }> = {};
  const sensitive = new Set(["rawPass", "secret", "password"]);
  if (before && after) {
    for (const key of Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))) {
      if (sensitive.has(key) || ["createdAt", "updatedAt", "lastStaffCheckin"].includes(key)) continue;
      const oldValue = safeValue(before[key]);
      const newValue = safeValue(after[key]);
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) changeMap[key] = { from: oldValue, to: newValue };
    }
  }
  const name = String(record?.tag || record?.name || record?.title || record?.platform || record?.itemDescription || id);
  const actionLabel = action === "CREATE" ? "added" : action === "UPDATE" ? "updated" : action === "ARCHIVE" ? "archived" : action === "RESTORE" ? "restored" : action.toLowerCase().replaceAll("_", " ");
  const displayValue = (value: unknown) => value === "" || value === null ? "—" : String(value);
  const changedDetails = Object.entries(changeMap).map(([key, value]) => `${key}: ${displayValue(value.from)} → ${displayValue(value.to)}`).join("; ");
  const visibilityUids = new Set<string>([actor.uid, ...(input.additionalVisibilityUids || [])]);
  const recipient = after || record || before;
  if (recipient) {
    for (const key of ["assignedStaffUid", "assignedUserUid"]) {
      if (typeof recipient[key] === "string" && recipient[key]) visibilityUids.add(recipient[key]);
    }
  }
  return {
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorName: actor.displayName,
    actorRole: actor.role,
    action,
    targetId: id,
    targetType: activityTargetType(resource),
    resource,
    targetName: name,
    details: input.details || `${actor.displayName} ${actionLabel} ${LABELS[resource] || "record"} ${name}${changedDetails ? ` · ${changedDetails}` : ""}`,
    changes: changeMap,
    visibilityUids: Array.from(visibilityUids),
    timestamp: null,
  };
}
