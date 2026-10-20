import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

const projectId = "basechan-am";
const password = "Local-Test-Only-2026!";

async function createEmulatorAccount(email: string): Promise<string> {
  const response = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error(`Could not create local test account ${email}: ${await response.text()}`);
  return String((await response.json()).localId);
}

export default async function globalSetup() {
  const staffEmail = "alice.basechaninternational@gmail.com";
  const mobileStaffEmail = "mobile.basechaninternational@gmail.com";
  const adminEmail = "qa@basechaninternational.com";
  const mobileAdminEmail = "mobile-qa@basechaninternational.com";
  const [staffUid, mobileStaffUid, adminUid, mobileAdminUid] = await Promise.all([createEmulatorAccount(staffEmail), createEmulatorAccount(mobileStaffEmail), createEmulatorAccount(adminEmail), createEmulatorAccount(mobileAdminEmail)]);
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: "127.0.0.1", port: 8080, rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8") },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ({ firestore }) => {
    await Promise.all([
      setDoc(doc(firestore(), "staff_inventory", "staff-row"), { id: "staff-row", name: "Alice Example", email: staffEmail, branch: "Abuja Branch", department: "Applications", position: "Staff" }),
      setDoc(doc(firestore(), "staff_inventory", "mobile-staff-row"), { id: "mobile-staff-row", name: "Mobile Example", email: mobileStaffEmail, branch: "Abuja Branch", department: "Applications", position: "Staff" }),
      setDoc(doc(firestore(), "physical_assets", "staff-laptop"), { tag: "BAM-E2E-001", category: "Laptop", makeModel: "HP EliteBook 840 G6", serialNumber: "E2E-001", assignedStaff: "Alice Example", assignedStaffEmail: staffEmail, assignedStaffUid: staffUid, assignedStaffBranch: "Abuja Branch", department: "Applications", branch: "Abuja Branch", purchaseDate: "2025-01-01", condition: "Good", status: "Active", isLocked: false, archived: false, updatedAt: 1 }),
      setDoc(doc(firestore(), "physical_assets", "mobile-staff-laptop"), { tag: "BAM-E2E-002", category: "Laptop", makeModel: "Dell Latitude 5420", serialNumber: "E2E-002", assignedStaff: "Mobile Example", assignedStaffEmail: mobileStaffEmail, assignedStaffUid: mobileStaffUid, assignedStaffBranch: "Abuja Branch", department: "Applications", branch: "Abuja Branch", purchaseDate: "2025-01-01", condition: "Good", status: "Active", isLocked: false, archived: false, updatedAt: 1 }),
      setDoc(doc(firestore(), "digital_credentials", "staff-login"), { platform: "Example Workspace", loginEmail: "alice@example.com", assignedUser: "Alice Example", assignedUserEmail: staffEmail, assignedUserUid: staffUid, assignedUserBranch: "Abuja Branch", vaultStatus: "SECURED", archived: false }),
      setDoc(doc(firestore(), "credential_secrets", "staff-login"), { secret: "test-only-secret" }),
      setDoc(doc(firestore(), "workspace_links", "all-staff-tool"), { title: "Company Portal", url: "https://example.com", description: "Test link", audience: "all", assignedUids: [], createdBy: adminUid, createdAt: new Date(), updatedAt: new Date(), archived: false }),
      setDoc(doc(firestore(), "tasks", "staff-task"), { type: "repair_request", title: "Check laptop hinge", description: "Test inbox item", status: "open", createdByUid: staffUid, assignedToUid: staffUid, assetId: "staff-laptop", assetTag: "BAM-E2E-001", createdAt: new Date(), updatedAt: new Date() }),
      setDoc(doc(firestore(), "tasks", "mobile-staff-task"), { type: "repair_request", title: "Check laptop hinge", description: "Test inbox item", status: "open", createdByUid: mobileStaffUid, assignedToUid: mobileStaffUid, assetId: "mobile-staff-laptop", assetTag: "BAM-E2E-002", createdAt: new Date(), updatedAt: new Date() }),
    ]);
  });
  await env.cleanup();
}

