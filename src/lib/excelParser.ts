import { auditAssetCompleteness } from "./completenessAuditor";
import { MissingDetailAlert } from "@/types/completeness";
import { StaffMember, PhysicalAsset, DigitalCredential, WorkbookDocument, FacilityItem } from "@/types/assets";

export interface ParsedWorkbookData {
  stats: {
    staffCount: number;
    physicalCount: number;
    digitalCount: number;
    workbookCount: number;
    facilityCount: number;
  };
  staff: StaffMember[];
  physicalAssets: PhysicalAsset[];
  digitalCredentials: DigitalCredential[];
  workbooks: WorkbookDocument[];
  facilities: FacilityItem[];
  missingDetailAlerts: MissingDetailAlert[];
  parseIssues?: { sheet: string; row: number; message: string }[];
}

export async function parseBasechanWorkbook(buffer: ArrayBuffer): Promise<ParsedWorkbookData> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const result: ParsedWorkbookData = {
    stats: { staffCount: 0, physicalCount: 0, digitalCount: 0, workbookCount: 0, facilityCount: 0 },
    staff: [],
    physicalAssets: [],
    digitalCredentials: [],
    workbooks: [],
    facilities: [],
    missingDetailAlerts: [],
    parseIssues: []
  };

  const findVal = (row: Record<string, any>, candidates: string[]) => {
    const keys = Object.keys(row);
    const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const c of candidates) {
      const match = keys.find(k => normalize(k) === normalize(c));
      if (match && row[match] !== undefined && row[match] !== null) return row[match];
    }
    return null;
  };

  const asText = (value: unknown, isDate = false): string => {
    if (value === null || value === undefined || value === "") return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }
    if (isDate && typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
    return String(value).trim();
  };

  const serialId = (prefix: string, row: Record<string, any>, index: number) => {
    const sourceNumber = Number(findVal(row, ["S/N", "SN", "No", "Serial No", "Serial Number"]));
    return `${prefix}-${String(Number.isInteger(sourceNumber) && sourceNumber > 0 ? sourceNumber : index + 1).padStart(3, "0")}`;
  };

  const normalizeSheetName = (sheetName: string) => sheetName.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
  const chooseSheet = (aliases: string[], expectedHeaderGroups: string[][]) => {
    const sheets = workbook.SheetNames;
    for (const alias of aliases) {
      const match = sheets.find(s => normalizeSheetName(s) === normalizeSheetName(alias));
      if (match) return match;
    }
    for (const sheet of sheets) {
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheet], { header: 1 });
      const firstRow = rows.find(r => Array.isArray(r) && r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ""));
      if (!firstRow) continue;
      const headers = firstRow.map((h: any) => String(h || "").toLowerCase());
      const matchesGroup = expectedHeaderGroups.some(group => group.every(expected => headers.some((h: string) => h.includes(expected.toLowerCase()))));
      if (matchesGroup) return sheet;
    }
    return null;
  };

  const reportMissingSheet = (label: string) => {
    result.parseIssues?.push({
      sheet: label,
      row: 1,
      message: `Could not locate a sheet for "${label}".`
    });
  };

  const addSheetMappingDiagnostics = (sheetName: string, rows: Record<string, any>[], expectedColumns: string[]) => {
    if (!rows || rows.length === 0) {
      result.parseIssues?.push({ sheet: sheetName, row: 1, message: `Sheet "${sheetName}" contains no readable data rows.` });
      return;
    }
    const rowKeys = Object.keys(rows[0] || {});
    const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
    const missing = expectedColumns.filter(col => !rowKeys.some(k => normalize(k) === normalize(col)));
    if (missing.length > 0) {
      result.parseIssues?.push({
        sheet: sheetName,
        row: 1,
        message: `Expected columns were missing or unrecognized: ${missing.join(", ")}.`
      });
    }
  };

  // 1. Staff Directory
  const staffSheet = chooseSheet(["staff", "personnel", "staff directory"], [["Full Name", "Name"]]);
  if (!staffSheet) reportMissingSheet("Staff Directory");
  if (staffSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[staffSheet]);
    addSheetMappingDiagnostics(staffSheet, rows, ["S/N", "Full Name", "Email Address", "Department", "Position / Role", "Branch Location", "Phone Number"]);
    const seenEmails = new Set<string>();
    rows.forEach((r, idx) => {
      const name = findVal(r, ["Full Name", "Name", "Staff Name"]);
      if (name) {
        const email = asText(findVal(r, ["Email Address", "Email", "Corporate Email"])).toLowerCase();
        if (email && seenEmails.has(email)) {
          result.parseIssues?.push({ sheet: staffSheet, row: idx + 2, message: `Duplicate email detected for staff member: ${email}.` });
        } else if (email) {
          seenEmails.add(email);
        }
        result.staff.push({
          id: serialId("STF", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          name: String(name).trim(),
          email,
          department: String(findVal(r, ["Department", "Dept"]) || "Operations").trim(),
          position: String(findVal(r, ["Position / Role", "Position", "Role", "Title"]) || "Staff").trim(),
          branch: normalizeBranch(findVal(r, ["Branch Location", "Branch", "Location"])),
          phone: asText(findVal(r, ["Phone Number", "Phone", "Mobile"]))
        });
      } else {
        result.parseIssues?.push({ sheet: staffSheet, row: idx + 2, message: "Row skipped because full name is required." });
      }
    });
    result.stats.staffCount = result.staff.length;
  }

  const staffByName = new Map(result.staff.map(s => [s.name.toLowerCase(), s]));

  // 2. Physical Hardware Assets
  const hwSheet = chooseSheet(["hardware", "assets", "physical assets"], [["Make & Model", "Model", "Device"]]);
  if (!hwSheet) reportMissingSheet("Physical Hardware Assets");
  if (hwSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[hwSheet]);
    addSheetMappingDiagnostics(hwSheet, rows, ["S/N", "Tag ID", "Serial Number", "Make & Model", "Category", "Assigned Custodian", "Condition", "Operational Status", "Purchase Date", "Branch Location"]);
    const seenTags = new Set<string>();
    const seenSerials = new Set<string>();
    rows.forEach((r, idx) => {
      const model = findVal(r, ["Make & Model", "Model", "Device Name", "Description"]);
      if (model) {
        const custodianName = String(findVal(r, ["Assigned Custodian", "Custodian", "Assigned Staff", "User"]) || "").trim();
        const custodian = staffByName.get(custodianName.toLowerCase());
        const rawSerial = asText(findVal(r, ["Serial Number", "Serial", "Service Tag", "SN"]));
        const rawTag = asText(findVal(r, ["Tag ID", "Asset Tag", "Tag"]));

        const isProvisionalTag = !rawTag || /^TAG-\d+$/i.test(rawTag) || /^PROVISIONAL-/i.test(rawTag);
        const tag = isProvisionalTag ? `PROVISIONAL-${String(idx + 1).padStart(3, "0")}` : rawTag;

        if (!isProvisionalTag && seenTags.has(tag.toLowerCase())) {
          result.parseIssues?.push({ sheet: hwSheet, row: idx + 2, message: `Duplicate official asset tag detected: ${tag}.` });
        } else if (!isProvisionalTag) {
          seenTags.add(tag.toLowerCase());
        }

        if (rawSerial && rawSerial.toLowerCase() !== "nil" && rawSerial.toLowerCase() !== "n/a" && seenSerials.has(rawSerial.toLowerCase())) {
          result.parseIssues?.push({ sheet: hwSheet, row: idx + 2, message: `Duplicate serial number detected: ${rawSerial}.` });
        } else if (rawSerial && rawSerial.toLowerCase() !== "nil" && rawSerial.toLowerCase() !== "n/a") {
          seenSerials.add(rawSerial.toLowerCase());
        }

        const assetRecord: PhysicalAsset = {
          id: serialId("AST", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          tag,
          serialNumber: rawSerial,
          makeModel: String(model).trim(),
          category: String(findVal(r, ["Category", "Device Category"]) || "Laptop").trim(),
          assignedStaff: custodianName || "Unassigned",
          assignedStaffEmail: custodian?.email,
          assignedStaffBranch: custodian?.branch,
          department: custodian?.department || String(findVal(r, ["Department"]) || "Operations").trim(),
          condition: String(findVal(r, ["Condition"]) || "Good").trim(),
          status: String(findVal(r, ["Operational Status", "Status"]) || "Active").trim(),
          purchaseDate: asText(findVal(r, ["Purchase Date"]), true),
          branch: normalizeBranch(findVal(r, ["Branch Location", "Branch", "Location"])),
          isLocked: false
        };

        const auditAlert = auditAssetCompleteness(assetRecord);
        if (auditAlert) {
          result.missingDetailAlerts.push(auditAlert);
        }
        result.physicalAssets.push(assetRecord);
      } else {
        result.parseIssues?.push({ sheet: hwSheet, row: idx + 2, message: "Missing make/model description; row was skipped." });
      }
    });
    result.stats.physicalCount = result.physicalAssets.length;
  }

  // 3. Digital Credentials Vault
  const credSheet = chooseSheet(["credentials", "digital credentials", "passwords"], [["Platform / Resource", "Platform", "Resource"]]);
  if (!credSheet) reportMissingSheet("Digital Credentials Vault");
  if (credSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[credSheet]);
    addSheetMappingDiagnostics(credSheet, rows, ["S/N", "Vault ID", "Platform / Resource", "Category (Sub-Agent/OAuth/SaaS)", "Bound Staff Email", "Vault Status", "Security Level"]);
    rows.forEach((r, idx) => {
      const platformName = findVal(r, ["Platform / Resource", "Platform", "Resource Name", "Service"]);
      if (platformName) {
        const assignedEmail = asText(findVal(r, ["Bound Staff Email", "Assigned User", "Email"])).toLowerCase();
        const assignedUser = Array.from(staffByName.values()).find(s => s.email.toLowerCase() === assignedEmail);
        const rawStatus = String(findVal(r, ["Vault Status", "Status"]) || "SECURED").trim().toUpperCase();
        result.digitalCredentials.push({
          id: serialId("CRD", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          platform: String(platformName).trim(),
          loginEmail: assignedEmail,
          assignedUser: assignedUser?.name || "Assigned User",
          assignedUserEmail: assignedEmail,
          assignedUserBranch: assignedUser?.branch,
          vaultStatus: rawStatus === "UNRESTRICTED" ? "UNRESTRICTED" : "SECURED"
        });
      } else result.parseIssues?.push({ sheet: credSheet, row: idx + 2, message: "Missing platform name; credential record skipped." });
    });
    result.stats.digitalCount = result.digitalCredentials.length;
  }

  // 4. Data Workbooks Register
  const wbSheet = chooseSheet(["workbooks", "documents", "files"], [["Workbook Title", "Title", "Document"]]);
  if (!wbSheet) reportMissingSheet("Data Workbooks Register");
  if (wbSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[wbSheet]);
    addSheetMappingDiagnostics(wbSheet, rows, ["S/N", "Workbook Title", "Business Function", "Primary Owner", "Department", "Cloud Link", "Access Permissions", "Last Audit Date"]);
    rows.forEach((r, idx) => {
      const title = findVal(r, ["Workbook Title", "Title", "Document Name"]);
      const businessFunction = findVal(r, ["Business Function", "Function"]);
      const url = findVal(r, ["Cloud Link", "URL", "Link", "OneDrive/Drive Link"]);
      if (title || businessFunction || url) {
        const ownerName = String(findVal(r, ["Primary Owner", "Owner"]) || "").trim();
        const owner = staffByName.get(ownerName.toLowerCase());
        const workbookTitle = title ? String(title).trim() : `Workbook Document #${idx + 1}`;
        result.workbooks.push({
          id: serialId("WBK", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          title: workbookTitle,
          businessFunction: asText(businessFunction),
          cloudStorageUrl: asText(url),
          primaryOwner: ownerName,
          primaryOwnerEmail: owner?.email,
          primaryOwnerBranch: owner?.branch,
          department: String(findVal(r, ["Department"]) || "General").trim(),
          accessPermissions: String(findVal(r, ["Access Permissions", "Permissions"]) || "RESTRICTED").trim(),
          lastAuditDate: asText(findVal(r, ["Last Audit Date"]), true)
        });
        if (!title) result.parseIssues?.push({ sheet: wbSheet, row: idx + 2, message: `Missing workbook title; retained under placeholder “${workbookTitle}”.` });
      } else result.parseIssues?.push({ sheet: wbSheet, row: idx + 2, message: "Empty workbook row; skipped because it contains no record details." });
    });
    result.stats.workbookCount = result.workbooks.length;
  }

  // 5. Facilities & Infrastructure
  const facSheet = chooseSheet(["office", "facilities"], [["Item Description", "Item", "Description"]]);
  if (!facSheet) reportMissingSheet("Office & Facilities");
  if (facSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[facSheet]);
    addSheetMappingDiagnostics(facSheet, rows, ["S/N", "Infrastructure ID", "Item Description", "Category (Furniture/Network/Peripheral)", "Room / Zone", "Quantity", "Purchase Date", "Condition", "Assigned / Shared", "Maintenance Notes"]);
    rows.forEach((r, idx) => {
      const item = findVal(r, ["Item Description", "Item", "Description"]);
      if (item) {
        const allocation = String(findVal(r, ["Assigned / Shared"]) || "").trim();
        const assignedPerson = staffByName.get(allocation.toLowerCase());
        const infraId = asText(findVal(r, ["Infrastructure ID", "Infra ID", "Facility ID"]));
        const branchVal = findVal(r, ["Branch Location", "Branch", "Location", "Site"]);
        result.facilities.push({
          id: serialId("FAC", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          infrastructureId: infraId,
          branch: normalizeBranch(branchVal || "Abuja Branch"),
          itemDescription: String(item).trim(),
          category: String(findVal(r, ["Category (Furniture/Network/Peripheral)", "Category"]) || "FURNITURE").trim(),
          roomZone: String(findVal(r, ["Room / Zone"]) || "").trim(),
          quantity: Number(findVal(r, ["Quantity", "Qty"])) || 1,
          condition: String(findVal(r, ["Condition"]) || "Good").trim(),
          purchaseDate: asText(findVal(r, ["Purchase Date"]), true),
          assignedOrShared: allocation,
          assignedOrSharedEmail: assignedPerson?.email,
          assignedOrSharedBranch: assignedPerson?.branch,
          maintenanceNotes: String(findVal(r, ["Maintenance Notes", "Notes"]) || "").trim()
        });
      } else result.parseIssues?.push({ sheet: facSheet, row: idx + 2, message: "Missing facility item description; row was skipped." });
    });
    result.stats.facilityCount = result.facilities.length;
  }

  return result;
}

function normalizeBranch(value: unknown): string {
  const raw = String(value || "Abuja Branch").trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, " ");
  if (normalized === "abuja" || normalized === "abuja hq" || normalized === "abuja branch") return "Abuja Branch";
  if (normalized === "benin" || normalized === "benin city" || normalized === "benin branch") return "Benin Branch";
  return raw;
}

/**
 * Exports data to an Excel file using SheetJS lazily
 */
export async function exportToExcel(data: any[], fileName: string, sheetName: string = "Export") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
