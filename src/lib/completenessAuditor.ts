import { MissingDetailAlert } from "@/types/completeness";
import { PhysicalAsset } from "@/types/assets";

export function auditAssetCompleteness(asset: Partial<PhysicalAsset>): MissingDetailAlert | null {
  const missing: string[] = [];

  // Check hardware essentials
  if (!asset.serialNumber || asset.serialNumber.trim() === "" || asset.serialNumber === "NaN" || asset.serialNumber.toLowerCase() === "nil" || asset.serialNumber.toLowerCase() === "n/a") {
    missing.push("Serial Number");
  }

  if (!asset.tag || asset.tag.startsWith("PROVISIONAL-") || asset.tag.startsWith("UNASSIGNED") || asset.tag.trim() === "" || asset.tag === "NaN") {
    missing.push("Asset Tag ID");
  }

  if (!asset.purchaseDate || asset.purchaseDate === "NaN" || asset.purchaseDate.trim() === "" || asset.purchaseDate.toLowerCase() === "nil" || asset.purchaseDate.toLowerCase() === "n/a") {
    missing.push("Purchase Date");
  }

  if (
    !asset.condition ||
    asset.condition.trim() === "" ||
    asset.condition.toLowerCase().includes("lags") ||
    asset.condition.toLowerCase().includes("unverified") ||
    asset.condition.toLowerCase().includes("check")
  ) {
    missing.push("Physical Condition Verification");
  }

  if (missing.length === 0) return null;

  // Determine responsibility
  let actionBy: "STAFF" | "ADMIN" = "ADMIN";
  let resolutionGuide = "IT Administrator must update physical serial and asset tag records.";

  if (missing.includes("Physical Condition Verification") && missing.length === 1) {
    actionBy = "STAFF";
    resolutionGuide = `${asset.assignedStaff || "Staff"} must submit an updated condition report in their self-service portal.`;
  } else if (asset.branch) {
    resolutionGuide = `IT Administrator must audit and supply missing asset metrics for ${asset.branch}.`;
  }

  return {
    assetId: asset.id || "TEMP",
    assetTag: asset.tag || "NO-TAG",
    makeModel: asset.makeModel || "Unknown Device",
    assignedStaff: asset.assignedStaff || "Unassigned",
    assignedStaffEmail: asset.assignedStaffEmail,
    branch: asset.branch || "Unassigned Branch",
    missingFields: missing,
    actionRequiredBy: actionBy,
    priority: missing.includes("Serial Number") ? "CRITICAL" : missing.includes("Asset Tag ID") ? "HIGH" : "MEDIUM",
    resolutionGuide
  };
}

export function auditAllAssets(assets: Partial<PhysicalAsset>[]): MissingDetailAlert[] {
  const alerts: MissingDetailAlert[] = [];
  for (const asset of assets) {
    const alert = auditAssetCompleteness(asset);
    if (alert) alerts.push(alert);
  }
  return alerts;
}
