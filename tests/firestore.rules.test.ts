import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";

const projectId = "basechan-am";
let testEnv: RulesTestEnvironment;
const staffEmail = "alice.basechaninternational@gmail.com";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] || "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] || 8080),
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async ({ firestore }) => {
    await Promise.all([
      setDoc(doc(firestore(), "physical_assets", "staff-asset"), { tag: "BAM-001", assignedStaffEmail: staffEmail, assignedStaffUid: "staff-1", branch: "Abuja Branch", isLocked: false, condition: "Good", status: "Active", updatedAt: 1 }),
      setDoc(doc(firestore(), "physical_assets", "other-asset"), { tag: "BAM-002", assignedStaffEmail: "bob.basechaninternational@gmail.com", assignedStaffUid: "staff-2", branch: "Benin Branch", isLocked: false, condition: "Good", status: "Active", updatedAt: 1 }),
      setDoc(doc(firestore(), "staff_inventory", "own-staff"), { name: "Alice Example", email: staffEmail, branch: "Abuja Branch", department: "Application" }),
      setDoc(doc(firestore(), "staff_inventory", "other-staff"), { name: "Bob Example", email: "bob.basechaninternational@gmail.com", branch: "Benin Branch", department: "Sales" }),
      setDoc(doc(firestore(), "workbooks", "branch-book"), { title: "Branch book", primaryOwnerEmail: staffEmail, department: "Application", cloudStorageUrl: "https://example.com/branch.xlsx", archived: false }),
      setDoc(doc(firestore(), "workbooks", "other-book"), { title: "Other book", primaryOwnerEmail: "bob.basechaninternational@gmail.com", department: "Sales", cloudStorageUrl: "https://example.com/other.xlsx", archived: false }),
      setDoc(doc(firestore(), "digital_credentials", "staff-credential"), { platform: "Example", loginEmail: "alice@example.com", assignedUserEmail: staffEmail, assignedUserUid: "staff-1", archived: false }),
      setDoc(doc(firestore(), "digital_credentials", "other-credential"), { platform: "Other", loginEmail: "bob@example.com", assignedUserEmail: "bob.basechaninternational@gmail.com", assignedUserUid: "staff-2", archived: false }),
      setDoc(doc(firestore(), "credential_secrets", "staff-credential"), { secret: "staff-secret" }),
      setDoc(doc(firestore(), "credential_secrets", "other-credential"), { secret: "other-secret" }),
      setDoc(doc(firestore(), "audit_logs", "staff-authored"), { actorUid: "staff-1", visibilityUids: ["staff-1"], action: "UPDATE" }),
      setDoc(doc(firestore(), "audit_logs", "shared-with-staff"), { actorUid: "admin-1", visibilityUids: ["admin-1", "staff-1"], action: "TRANSFER_CUSTODY" }),
      setDoc(doc(firestore(), "audit_logs", "admin-only"), { actorUid: "admin-1", visibilityUids: ["admin-1"], action: "UPDATE" }),
      setDoc(doc(firestore(), "access_grants", "staff-1"), {
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
    const assets = await getDocs(collection(db, "physical_assets"));
    expect(assets.size).toBe(2);
  });

  it("limits staff asset reads to assigned or granted scope", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    expect((await getDoc(doc(db, "staff_inventory", "own-staff"))).exists()).toBe(true);
    await expect(getDoc(doc(db, "staff_inventory", "other-staff"))).rejects.toBeDefined();
    const ownAsset = await getDoc(doc(db, "physical_assets", "staff-asset"));
    expect(ownAsset.exists()).toBe(true);
    await expect(getDoc(doc(db, "physical_assets", "other-asset"))).rejects.toBeDefined();
    await expect(getDocs(query(collection(db, "physical_assets"), where("branch", "==", "Abuja Branch")))).resolves.toMatchObject({ size: 1 });
  });

  it("permits unlocked condition updates but rejects lock and ownership edits", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(updateDoc(doc(db, "physical_assets", "staff-asset"), { condition: "Fair", updatedAt: 2 })).resolves.toBeUndefined();
    await expect(updateDoc(doc(db, "physical_assets", "staff-asset"), { branch: "Benin Branch" })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "physical_assets", "staff-asset"), { isLocked: true })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "physical_assets", "other-asset"), { condition: "Fair" })).rejects.toBeDefined();
  });

  it("honors branch grants while protecting workbook ownership and archive fields", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(getDoc(doc(db, "workbooks", "branch-book"))).resolves.toBeDefined();
    await expect(getDoc(doc(db, "workbooks", "other-book"))).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "workbooks", "branch-book"), { title: "Updated title" })).resolves.toBeUndefined();
    await expect(updateDoc(doc(db, "workbooks", "branch-book"), { primaryOwnerEmail: "bob@example.com" })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "workbooks", "branch-book"), { archived: true, archivedAt: new Date(), archivedBy: "staff-1", primaryOwnerEmail: "bob@example.com" })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "workbooks", "branch-book"), { archived: true, archivedAt: new Date(), archivedBy: "staff-1" })).resolves.toBeUndefined();
  });

  it("allows a staff member to acknowledge only their own onboarding without granting role changes", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(setDoc(doc(db, "users", "staff-1"), { uid: "staff-1", email: staffEmail, onboardingCompletedAt: new Date() })).resolves.toBeUndefined();
    await expect(updateDoc(doc(db, "users", "staff-1"), { role: "SUPER_ADMIN" })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "users", "admin-1"), { onboardingCompletedAt: new Date() })).rejects.toBeDefined();
  });

  it("restricts secret reads to the credential owner and forbids collection listing", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(getDoc(doc(db, "credential_secrets", "staff-credential"))).resolves.toBeDefined();
    await expect(getDoc(doc(db, "credential_secrets", "other-credential"))).rejects.toBeDefined();
    await expect(getDocs(collection(db, "credential_secrets"))).rejects.toBeDefined();
  });

  it("allows staff to read authored and explicitly visible activity only", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    const authored = await getDocs(query(collection(db, "audit_logs"), where("actorUid", "==", "staff-1")));
    const visible = await getDocs(query(collection(db, "audit_logs"), where("visibilityUids", "array-contains", "staff-1")));
    expect(authored.docs.map((row) => row.id)).toEqual(["staff-authored"]);
    expect(new Set(visible.docs.map((row) => row.id))).toEqual(new Set(["staff-authored", "shared-with-staff"]));
    await expect(getDoc(doc(db, "audit_logs", "admin-only"))).rejects.toBeDefined();
    await expect(getDocs(collection(db, "audit_logs"))).rejects.toBeDefined();
  });

  it("does not let staff create or change access grants", async () => {
    const db = testEnv.authenticatedContext("staff-1", { email: staffEmail }).firestore();
    await expect(setDoc(doc(db, "access_grants", "staff-2"), { uid: "staff-2", grants: {} })).rejects.toBeDefined();
    await expect(updateDoc(doc(db, "access_grants", "staff-1"), { branch: "Benin Branch" })).rejects.toBeDefined();
  });
});

