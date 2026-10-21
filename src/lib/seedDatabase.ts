import { db } from "./firebase";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";
import { ParsedWorkbookData } from "./excelParser";
import { UserProfile } from "@/types/assets";
import { buildActivityLog } from "./activityLog";

export interface SeedResult {
  success: boolean;
  staffUploaded: number;
  assetsUploaded: number;
  credentialsUploaded: number;
  workbooksUploaded: number;
  facilitiesUploaded: number;
  error?: string;
  archivedCount?: number;
}

type ImportRow = Record<string, any> & { id: string };

function withoutUndefined<T extends Record<string, any>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

export async function seedFirestoreFromParsedData(data: ParsedWorkbookData, actor: UserProfile, previous: ParsedWorkbookData): Promise<SeedResult> {
  const result: SeedResult = { success: false, staffUploaded: 0, assetsUploaded: 0, credentialsUploaded: 0, workbooksUploaded: 0, facilitiesUploaded: 0 };
  const staffByEmail = new Map(previous.staff.filter((person) => person.email).map((person) => [person.email.toLowerCase(), person]));
  data.staff.forEach((person) => {
    if (person.email) {
      const existing = staffByEmail.get(person.email.toLowerCase());
      staffByEmail.set(person.email.toLowerCase(), { ...person, uid: existing?.uid });
    }
    staffByEmail.set(`name:${person.name.trim().toLowerCase()}`, person);
  });
  const definitions: { key: keyof Pick<ParsedWorkbookData, "staff" | "physicalAssets" | "digitalCredentials" | "workbooks" | "facilities">; collection: string; label: string; oldRows: any[]; rows: any[] }[] = [
    { key: "staff", collection: "staff_inventory", label: "staff member", oldRows: previous.staff, rows: data.staff },
    { key: "physicalAssets", collection: "physical_assets", label: "physical asset", oldRows: previous.physicalAssets, rows: data.physicalAssets },
    { key: "digitalCredentials", collection: "digital_credentials", label: "digital credential", oldRows: previous.digitalCredentials, rows: data.digitalCredentials },
    { key: "workbooks", collection: "workbooks", label: "workbook", oldRows: previous.workbooks, rows: data.workbooks },
    { key: "facilities", collection: "facilities", label: "facility item", oldRows: previous.facilities, rows: data.facilities },
  ];

  try {
    for (const definition of definitions) {
      const oldById = new Map(definition.oldRows.map((row) => [row.id, row]));
      const chunkSize = definition.collection === "digital_credentials" ? 140 : 220;
      for (let offset = 0; offset < definition.rows.length; offset += chunkSize) {
        const batch = writeBatch(db);
        for (const imported of definition.rows.slice(offset, offset + chunkSize)) {
          const before = oldById.get(imported.id) || null;
          const action = before ? "UPDATE" : "CREATE";
          const row: ImportRow = { ...imported };
          if (definition.collection === "physical_assets" && (row.assignedStaffEmail || row.assignedStaff)) {
            const assignee = (row.assignedStaffEmail ? staffByEmail.get(String(row.assignedStaffEmail).toLowerCase()) : undefined) || staffByEmail.get(`name:${String(row.assignedStaff || "").trim().toLowerCase()}`);
            if (assignee) {
              if (assignee.uid) row.assignedStaffUid = assignee.uid;
              if (assignee.branch) row.assignedStaffBranch = assignee.branch;
            }
          }
          if (definition.collection === "digital_credentials" && row.assignedUserEmail) {
            const assignee = staffByEmail.get(String(row.assignedUserEmail).toLowerCase());
            if (assignee) row.assignedUserUid = assignee.uid || "";
          }
          const { rawPass, ...metadata } = withoutUndefined(row);
          const recordRef = doc(db, definition.collection, imported.id);
          batch.set(recordRef, { ...metadata, archived: false, updatedAt: serverTimestamp(), ...(before ? {} : { createdAt: serverTimestamp() }) }, { merge: true });
          const label = String(row.tag || row.name || row.title || row.platform || row.itemDescription || row.id);
          const activity = buildActivityLog(actor, {
            resource: definition.collection,
            action,
            id: imported.id,
            record: row,
            before,
            after: row,
            details: `${actor.displayName} imported ${action === "CREATE" ? "new" : "updated"} ${definition.label} ${label}`,
          });
          batch.set(doc(collection(db, "audit_logs")), { ...activity, timestamp: serverTimestamp() });
          if (typeof rawPass === "string" && rawPass.length) {
            batch.set(doc(db, "credential_secrets", imported.id), { secret: rawPass, updatedAt: serverTimestamp() }, { merge: true });
          }
        }
        await batch.commit();
      }
      if (definition.collection === "staff_inventory") result.staffUploaded = definition.rows.length;
      if (definition.collection === "physical_assets") result.assetsUploaded = definition.rows.length;
      if (definition.collection === "digital_credentials") result.credentialsUploaded = definition.rows.length;
      if (definition.collection === "workbooks") result.workbooksUploaded = definition.rows.length;
      if (definition.collection === "facilities") result.facilitiesUploaded = definition.rows.length;
    }
    result.success = true;
  } catch (error) {
    console.error("Firestore seeding error:", error);
    result.error = error instanceof Error ? error.message : "Failed to seed Firestore";
  }
  return result;
}

/** Replaces active imported inventory safely: writes imported dataset first, and only archives prior unreferenced active records after successful import. */
export async function replaceFirestoreFromParsedData(data: ParsedWorkbookData, actor: UserProfile, previous: ParsedWorkbookData): Promise<SeedResult> {
  const result: SeedResult = { success: false, staffUploaded: 0, assetsUploaded: 0, credentialsUploaded: 0, workbooksUploaded: 0, facilitiesUploaded: 0, archivedCount: 0 };

  // 1. Write the new dataset first without modifying active inventory
  const imported = await seedFirestoreFromParsedData(data, actor, previous);
  if (!imported.success) {
    return { ...imported, error: `Workbook import failed before archiving active inventory: ${imported.error || "unknown Firestore error"}` };
  }

  // 2. Only after new dataset is written successfully, archive active records that were superseded/not in the import
  const newIdsByCollection = {
    staff_inventory: new Set(data.staff.map((s) => s.id)),
    physical_assets: new Set(data.physicalAssets.map((a) => a.id)),
    digital_credentials: new Set(data.digitalCredentials.map((c) => c.id)),
    workbooks: new Set(data.workbooks.map((w) => w.id)),
    facilities: new Set(data.facilities.map((f) => f.id)),
  };

  const definitions = [
    { collection: "staff_inventory", newIds: newIdsByCollection.staff_inventory },
    { collection: "physical_assets", newIds: newIdsByCollection.physical_assets },
    { collection: "digital_credentials", newIds: newIdsByCollection.digital_credentials },
    { collection: "workbooks", newIds: newIdsByCollection.workbooks },
    { collection: "facilities", newIds: newIdsByCollection.facilities },
  ];

  try {
    for (const definition of definitions) {
      const snapshot = await getDocs(collection(db, definition.collection));
      const obsolete = snapshot.docs.filter((record) => record.data().archived !== true && !definition.newIds.has(record.id));
      for (let offset = 0; offset < obsolete.length; offset += 200) {
        const batch = writeBatch(db);
        for (const record of obsolete.slice(offset, offset + 200)) {
          const before = record.data();
          batch.update(record.ref, { archived: true, archivedAt: serverTimestamp(), archivedBy: actor.uid, updatedAt: serverTimestamp() });
          const activity = buildActivityLog(actor, {
            resource: definition.collection,
            action: "ARCHIVE",
            id: record.id,
            before,
            after: { ...before, archived: true },
            details: `${actor.displayName} archived obsolete record during workbook replacement`,
          });
          batch.set(doc(collection(db, "audit_logs")), { ...activity, timestamp: serverTimestamp() });
        }
        await batch.commit();
        result.archivedCount = (result.archivedCount || 0) + obsolete.slice(offset, offset + 200).length;
      }
    }
  } catch (error) {
    console.warn("Could not finish archiving superseded records:", error);
  }

  return { ...imported, archivedCount: result.archivedCount };
}
