import { describe, expect, it } from "vitest";
import { auditAllAssets, auditAssetCompleteness } from "../src/lib/completenessAuditor";
import { PhysicalAsset } from "../src/types/assets";

describe("Completeness Auditor", () => {
  it("passes complete hardware assets with valid official details", () => {
    const completeAsset: PhysicalAsset = {
      id: "AST-001",
      tag: "BAM-100",
      serialNumber: "SN12345678",
      makeModel: "Dell Latitude 5420",
      category: "Laptop",
      assignedStaff: "Alice Smith",
      assignedStaffEmail: "alice@basechan.com",
      department: "Operations",
      branch: "Abuja Branch",
      condition: "Good",
      status: "Active",
      purchaseDate: "2024-01-15",
      isLocked: false,
    };

    const alert = auditAssetCompleteness(completeAsset);
    expect(alert).toBeNull();
  });

  it("flags missing serial numbers as CRITICAL priority for ADMIN", () => {
    const asset: Partial<PhysicalAsset> = {
      id: "AST-002",
      tag: "BAM-101",
      serialNumber: "N/A",
      makeModel: "HP EliteBook 840",
      assignedStaff: "Bob Staff",
      branch: "Benin Branch",
      condition: "Good",
      purchaseDate: "2024-01-01",
    };

    const alert = auditAssetCompleteness(asset);
    expect(alert).not.toBeNull();
    expect(alert?.missingFields).toContain("Serial Number");
    expect(alert?.priority).toBe("CRITICAL");
    expect(alert?.actionRequiredBy).toBe("ADMIN");
  });

  it("flags provisional asset tags as HIGH priority for ADMIN", () => {
    const asset: Partial<PhysicalAsset> = {
      id: "AST-003",
      tag: "PROVISIONAL-005",
      serialNumber: "SN99999",
      makeModel: "MacBook Pro 14",
      assignedStaff: "Charlie Lead",
      branch: "Abuja Branch",
      condition: "Good",
      purchaseDate: "2024-02-01",
    };

    const alert = auditAssetCompleteness(asset);
    expect(alert).not.toBeNull();
    expect(alert?.missingFields).toContain("Asset Tag ID");
    expect(alert?.priority).toBe("HIGH");
    expect(alert?.actionRequiredBy).toBe("ADMIN");
  });

  it("flags unverified condition as STAFF action when other fields are present", () => {
    const asset: Partial<PhysicalAsset> = {
      id: "AST-004",
      tag: "BAM-104",
      serialNumber: "SN88888",
      makeModel: "Lenovo ThinkPad X1",
      assignedStaff: "David Engineer",
      branch: "Abuja Branch",
      condition: "Unverified Check Needed",
      purchaseDate: "2024-01-10",
    };

    const alert = auditAssetCompleteness(asset);
    expect(alert).not.toBeNull();
    expect(alert?.missingFields).toContain("Physical Condition Verification");
    expect(alert?.actionRequiredBy).toBe("STAFF");
  });

  it("audits multiple assets correctly", () => {
    const assets: Partial<PhysicalAsset>[] = [
      { id: "1", tag: "BAM-1", serialNumber: "SN1", condition: "Good", purchaseDate: "2024-01-01" },
      { id: "2", tag: "PROVISIONAL-002", serialNumber: "SN2", condition: "Good", purchaseDate: "2024-01-01" },
    ];

    const alerts = auditAllAssets(assets);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].assetId).toBe("2");
  });
});
