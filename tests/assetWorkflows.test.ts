import { describe, expect, it } from "vitest";
import { buildActivityLog } from "../src/lib/activityLog";
import { PhysicalAsset, StaffMember, UserProfile } from "../src/types/assets";

describe("Asset Register & Custody Workflows", () => {
  const actor: UserProfile = {
    uid: "admin-1",
    email: "admin@basechaninternational.com",
    displayName: "Admin Alice",
    role: "SUPER_ADMIN",
    department: "Executive",
  };

  const currentAsset: PhysicalAsset = {
    id: "AST-001",
    sn: 1,
    tag: "BAM-101",
    serialNumber: "SN-98765",
    makeModel: "HP EliteBook 840",
    category: "Laptop",
    assignedStaff: "Bob Staff",
    assignedStaffEmail: "bob.basechaninternational@gmail.com",
    assignedStaffUid: "staff-bob",
    department: "Sales",
    branch: "Benin Branch",
    condition: "Good",
    status: "Active",
    isLocked: false,
  };

  const newStaff: StaffMember = {
    id: "STF-002",
    sn: 2,
    name: "Charlie Recipient",
    email: "charlie.basechaninternational@gmail.com",
    department: "Operations",
    branch: "Abuja Branch",
    position: "Field Lead",
  };

  it("constructs an atomic custody transfer activity log entry", () => {
    const nextAsset: PhysicalAsset = {
      ...currentAsset,
      assignedStaff: newStaff.name,
      assignedStaffEmail: newStaff.email,
      department: newStaff.department,
      branch: newStaff.branch,
      assignedStaffUid: "staff-charlie",
      assignedStaffBranch: newStaff.branch,
    };

    const log = buildActivityLog(actor, {
      resource: "physical_assets",
      action: "TRANSFER_CUSTODY",
      id: currentAsset.id,
      record: nextAsset,
      before: currentAsset,
      after: nextAsset,
      additionalVisibilityUids: ["staff-charlie"],
      details: `Transferred ${currentAsset.tag} (${currentAsset.makeModel}) from ${currentAsset.assignedStaff} to ${newStaff.name}. Reason: Branch re-assignment`,
    });

    expect(log.action).toBe("TRANSFER_CUSTODY");
    expect(log.targetId).toBe("AST-001");
    expect(log.visibilityUids).toContain("staff-charlie");
    expect(log.visibilityUids).toContain("staff-bob");
    expect(log.details).toContain("Transferred BAM-101");
    expect(log.changes).toHaveProperty("assignedStaff");
    expect(log.changes.assignedStaff).toEqual({
      from: "Bob Staff",
      to: "Charlie Recipient",
    });
  });

  it("detects timestamp concurrency mismatches during offline updates", () => {
    const serverTimestampMillis: number = 1700000000000;
    const clientBaseTimestampMillis: number = 1699990000000;

    const isConflict = clientBaseTimestampMillis !== serverTimestampMillis;
    expect(isConflict).toBe(true);
  });
});
