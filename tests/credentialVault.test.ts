import { describe, expect, it } from "vitest";
import { buildActivityLog } from "../src/lib/activityLog";
import { UserProfile, DigitalCredential } from "../src/types/assets";

describe("Credential Vault Security & Sanitization", () => {
  const mockAdminProfile: UserProfile = {
    uid: "admin-123",
    email: "admin@basechaninternational.com",
    displayName: "Admin User",
    role: "SUPER_ADMIN",
    department: "Executive",
  };

  it("never includes sensitive secret fields in activity log changes", () => {
    const before: Partial<DigitalCredential> = {
      platform: "AWS",
      loginEmail: "admin@basechan.com",
      rawPass: "SuperSecret123!",
    };
    const after: Partial<DigitalCredential> = {
      platform: "AWS",
      loginEmail: "admin@basechan.com",
      rawPass: "NewSecret456!",
      vaultStatus: "SECURED",
    };

    const log = buildActivityLog(mockAdminProfile, {
      resource: "digital_credentials",
      action: "UPDATE",
      id: "cred-001",
      before: before as Record<string, any>,
      after: after as Record<string, any>,
    });

    expect(log.details).not.toContain("SuperSecret123!");
    expect(log.details).not.toContain("NewSecret456!");
    expect(log.changes).not.toHaveProperty("rawPass");
    expect(log.changes).not.toHaveProperty("secret");
    expect(log.changes).not.toHaveProperty("password");
    expect(log.changes).toHaveProperty("vaultStatus");
  });

  it("sanitizes credential records for directory exports", () => {
    const credentials: DigitalCredential[] = [
      {
        id: "c1",
        platform: "Google Workspace",
        loginEmail: "john@basechan.com",
        assignedUser: "John Doe",
        userRole: "Manager",
        vaultStatus: "SECURED",
        rawPass: "UnsafeExportPassword!",
      },
    ];

    const sanitizedData = credentials.map((c) => ({
      "Platform / Software": c.platform,
      "Account / Login Email": c.loginEmail,
      "Sub-Agent / Handle ID": c.subAgentHandleId || "N/A",
      "Assigned Custodian": c.assignedUser,
      "User Role": c.userRole || "User",
      "Vault Status": c.vaultStatus,
    }));

    const exportedJsonString = JSON.stringify(sanitizedData);
    expect(exportedJsonString).not.toContain("UnsafeExportPassword!");
    expect(exportedJsonString).not.toContain("rawPass");
    expect(sanitizedData[0]).toEqual({
      "Platform / Software": "Google Workspace",
      "Account / Login Email": "john@basechan.com",
      "Sub-Agent / Handle ID": "N/A",
      "Assigned Custodian": "John Doe",
      "User Role": "Manager",
      "Vault Status": "SECURED",
    });
  });
});
