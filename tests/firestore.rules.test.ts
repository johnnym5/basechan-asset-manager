import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

const projectId = "basechan-am";
let testEnv: RulesTestEnvironment;
const staffEmail = "alice.basechaninternational@gmail.com";
const otherStaffEmail = "bob.basechaninternational@gmail.com";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
}, 30000);

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      db.collection("physical_assets").doc("staff-asset").set({ tag: "BAM-001", assignedStaffEmail: staffEmail, assignedStaffUid: "staff-1", branch: "Abuja Branch", isLocked: false, condition: "Good", status: "Active", updatedAt: 1 }),
      db.collection("physical_assets").doc("other-asset").set({ tag: "BAM-002", assignedStaffEmail: otherStaffEmail, assignedStaffUid: "staff-2", branch: "Benin Branch", isLocked: false, condition: "Good", status: "Active", updatedAt: 1 }),
      db.collection("staff_inventory").doc("own-staff").set({ name: "Alice Example", email: staffEmail, branch: "Abuja Branch", department: "Application" }),
      db.collection("staff_inventory").doc("other-staff").set({ name: "Bob Example", email: otherStaffEmail, branch: "Benin Branch", department: "Sales" }),
      db.collection("workbooks").doc("branch-book").set({ title: "Branch book", primaryOwnerEmail: staffEmail, department: "Application", cloudStorageUrl: "https://example.com/branch.xlsx", archived: false }),
      db.collection("workbooks").doc("other-book").set({ title: "Other book", primaryOwnerEmail: otherStaffEmail, department: "Sales", cloudStorageUrl: "https://example.com/other.xlsx", archived: false }),
      db.collection("digital_credentials").doc("staff-credential").set({ platform: "Example", loginEmail: "alice@example.com", assignedUserEmail: staffEmail, assignedUserUid: "staff-1", archived: false }),
      db.collection("digital_credentials").doc("other-credential").set({ platform: "Other", loginEmail: "bob@example.com", assignedUserEmail: otherStaffEmail, assignedUserUid: "staff-2", archived: false }),
      db.collection("credential_secrets").doc("staff-credential").set({ secret: "staff-secret" }),
      db.collection("credential_secrets").doc("other-credential").set({ secret: "other-secret" }),
      db.collection("audit_logs").doc("staff-authored").set({ actorUid: "staff-1", visibilityUids: ["staff-1"], action: "UPDATE" }),
      db.collection("audit_logs").doc("shared-with-staff").set({ actorUid: "admin-1", visibilityUids: ["admin-1", "staff-1"], action: "TRANSFER_CUSTODY" }),
      db.collection("audit_logs").doc("admin-only").set({ actorUid: "admin-1", visibilityUids: ["admin-1"], action: "UPDATE" }),
      db.collection("weeklyReports").doc("staff-1_2025_W01_ops").set({ userId: "staff-1", ownerEmail: staffEmail, status: "SUBMITTED", year: 2025, weekNumber: 1 }),
      db.collection("weeklyReports").doc("staff-2_2025_W01_ops").set({ userId: "staff-2", ownerEmail: otherStaffEmail, status: "DRAFT", year: 2025, weekNumber: 1 }),
      db.collection("reportTemplates").doc("global_admin").set({ userId: null, sections: [] }),
      db.collection("reportTemplates").doc("staff-1").set({ userId: "staff-1", sections: [] }),
      db.collection("monthlyPackages").doc("staff-1_2025_M01").set({ userId: "staff-1", ownerEmail: staffEmail, year: 2025, month: 1 }),
      db.collection("monthlyPackages").doc("staff-2_2025_M01").set({ userId: "staff-2", ownerEmail: otherStaffEmail, year: 2025, month: 1 }),
      db.collection("access_grants").doc("staff-1").set({
        uid: "staff-1", email: staffEmail, branch: "Abuja Branch", department: "Application",
        grants: {
          workbooks: { actions: ["read", "edit", "archive"], scope: "branch" },
          physical_assets: { actions: ["read", "edit", "archive"], scope: "branch" },
        },
      }),
    ]);
  });
});

afterAll(async () => { await testEnv.cleanup(); });

describe("Firestore access boundaries", () => {
  it("lets corporate admins read organization records", async () => {
    const db = testEnv.authenticatedContext("admin-1", { email: "admin@basechaninternational.com" }).firestore();
    const assets = await db.collection("physical_assets").get();
    expect(assets.size).toBe(2);
  });

  it("limits staff asset reads to assigned or granted scope", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("staff_inventory").doc("own-staff").get()).exists).toBe(true);
    await expect(db.collection("staff_inventory").doc("other-staff").get()).rejects.toBeDefined();
    const ownAsset = await db.collection("physical_assets").doc("staff-asset").get();
    expect(ownAsset.exists).toBe(true);
    await expect(db.collection("physical_assets").doc("other-asset").get()).rejects.toBeDefined();
    const branchAssets = await db.collection("physical_assets").where("branch", "==", "Abuja Branch").get();
    expect(branchAssets.size).toBe(1);
  });

  it("permits unlocked condition updates but rejects lock and ownership edits", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(db.collection("physical_assets").doc("staff-asset").update({ condition: "Fair", updatedAt: 2 })).resolves.toBeUndefined();
    await expect(db.collection("physical_assets").doc("staff-asset").update({ branch: "Benin Branch" })).rejects.toBeDefined();
    await expect(db.collection("physical_assets").doc("staff-asset").update({ isLocked: true })).rejects.toBeDefined();
    await expect(db.collection("physical_assets").doc("other-asset").update({ condition: "Fair" })).rejects.toBeDefined();
  });

  it("honors branch grants while protecting workbook ownership and archive fields", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("workbooks").doc("branch-book").get()).exists).toBe(true);
    await expect(db.collection("workbooks").doc("other-book").get()).rejects.toBeDefined();
    await expect(db.collection("workbooks").doc("branch-book").update({ title: "Updated title" })).resolves.toBeUndefined();
    await expect(db.collection("workbooks").doc("branch-book").update({ primaryOwnerEmail: "bob@example.com" })).rejects.toBeDefined();
    await expect(db.collection("workbooks").doc("branch-book").update({ archived: true, archivedAt: new Date(), archivedBy: "staff-1", primaryOwnerEmail: "bob@example.com" })).rejects.toBeDefined();
    await expect(db.collection("workbooks").doc("branch-book").update({ archived: true, archivedAt: new Date(), archivedBy: "staff-1" })).resolves.toBeUndefined();
  });

  it("allows a staff member to acknowledge only their own onboarding without granting role changes", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(db.collection("users").doc("staff-1").set({ uid: "staff-1", email: staffEmail, onboardingCompletedAt: new Date() })).resolves.toBeUndefined();
    await expect(db.collection("users").doc("staff-1").update({ role: "SUPER_ADMIN" })).rejects.toBeDefined();
    await expect(db.collection("users").doc("admin-1").update({ onboardingCompletedAt: new Date() })).rejects.toBeDefined();
  });

  it("restricts secret reads to the credential owner and forbids collection listing", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("credential_secrets").doc("staff-credential").get()).exists).toBe(true);
    await expect(db.collection("credential_secrets").doc("other-credential").get()).rejects.toBeDefined();
    await expect(db.collection("credential_secrets").get()).rejects.toBeDefined();
  });

  it("allows staff to read authored and explicitly visible activity only", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    const authored = await db.collection("audit_logs").where("actorUid", "==", "staff-1").get();
    const visible = await db.collection("audit_logs").where("visibilityUids", "array-contains", "staff-1").get();
    expect(authored.docs.map((row) => row.id)).toEqual(["staff-authored"]);
    expect(new Set(visible.docs.map((row) => row.id))).toEqual(new Set(["staff-authored", "shared-with-staff"]));
    await expect(db.collection("audit_logs").doc("admin-only").get()).rejects.toBeDefined();
    await expect(db.collection("audit_logs").get()).rejects.toBeDefined();
  });

  it("does not let staff create or change access grants", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(db.collection("access_grants").doc("staff-2").set({ uid: "staff-2", grants: {} })).rejects.toBeDefined();
    await expect(db.collection("access_grants").doc("staff-1").update({ branch: "Benin Branch" })).rejects.toBeDefined();
  });

  it("restricts weekly reports read/write by user identity and status", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("weeklyReports").doc("staff-1_2025_W01_ops").get()).exists).toBe(true);
    await expect(db.collection("weeklyReports").doc("staff-2_2025_W01_ops").get()).rejects.toBeDefined();

    // Cannot update submitted report
    await expect(db.collection("weeklyReports").doc("staff-1_2025_W01_ops").update({ data: { test: "val" } })).rejects.toBeDefined();

    // Can create draft report for self
    await expect(db.collection("weeklyReports").doc("staff-1_2025_W02_ops").set({
      userId: "staff-1", ownerEmail: staffEmail, status: "DRAFT", year: 2025, weekNumber: 2
    })).resolves.toBeUndefined();

    // Cannot create report for another user
    await expect(db.collection("weeklyReports").doc("staff-2_2025_W02_ops").set({
      userId: "staff-2", ownerEmail: otherStaffEmail, status: "DRAFT", year: 2025, weekNumber: 2
    })).rejects.toBeDefined();
  });

  it("restricts report templates so staff cannot modify global admin templates", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("reportTemplates").doc("global_admin").get()).exists).toBe(true);
    await expect(db.collection("reportTemplates").doc("global_admin").update({ sections: [{ id: "hacked" }] })).rejects.toBeDefined();

    // Staff can update own personal template
    await expect(db.collection("reportTemplates").doc("staff-1").set({ userId: "staff-1", sections: [] })).resolves.toBeUndefined();
    await expect(db.collection("reportTemplates").doc("staff-2").set({ userId: "staff-2", sections: [] })).rejects.toBeDefined();
  });

  it("restricts monthly packages to owner or admin", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await db.collection("monthlyPackages").doc("staff-1_2025_M01").get()).exists).toBe(true);
    await expect(db.collection("monthlyPackages").doc("staff-2_2025_M01").get()).rejects.toBeDefined();
  });

  it("restricts late unlock requests so only admins can grant unlocks", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(db.collection("lateUnlockRequests").doc("staff-1_2025_W01").set({
      userId: "staff-1", status: "ACTIVE"
    })).rejects.toBeDefined();

    const adminDb = testEnv.authenticatedContext("admin-1", { email: "admin@basechaninternational.com" }).firestore();
    await expect(adminDb.collection("lateUnlockRequests").doc("staff-1_2025_W01").set({
      userId: "staff-1", status: "ACTIVE"
    })).resolves.toBeUndefined();
  });
});
