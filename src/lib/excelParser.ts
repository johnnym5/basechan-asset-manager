import * as XLSX from "xlsx";
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

export function parseBasechanWorkbook(buffer: ArrayBuffer): ParsedWorkbookData {
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

  const addSheetMappingDiagnostics = (sheetName: string, rows: Record<string, any>[], knownHeaders: string[]) => {
    const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
    const known = new Set(knownHeaders.map(normalize));
    const headers = Object.keys(rows[0] || {});
    const unknown = headers.filter((header) => !known.has(normalize(header)) && rows.some((row) => row[header] !== null && row[header] !== undefined && String(row[header]).trim() !== ""));
    if (unknown.length) result.parseIssues?.push({ sheet: sheetName, row: 1, message: `Unmapped populated column(s): ${unknown.join(", ")}.` });
  };

  const chooseSheet = (aliases: string[], requiredHeaderGroups: string[][]) => workbook.SheetNames.find((name) => {
    const normalizedName = name.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!aliases.some((alias) => normalizedName.includes(alias))) return false;
    const headers = Object.keys(XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[name], { defval: null })[0] || {}).map((header) => header.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, ""));
    return requiredHeaderGroups.every((group) => group.some((candidate) => headers.includes(candidate.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/g, ""))));
  });

  const reportMissingSheet = (name: string) => {
    result.parseIssues?.push({ sheet: name, row: 1, message: "Expected source worksheet or identifying headers were not found; this section was not parsed." });
  };

  // Helper map staff email to name
  const staffEmailMap = new Map<string, string>();
  const staffByName = new Map<string, StaffMember>();

  // 1. Staff Inventory
  const staffSheet = chooseSheet(["staff"], [["Staff Name", "Name"]]);
  if (!staffSheet) reportMissingSheet("Staff Inventory");
  if (staffSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[staffSheet]);
    addSheetMappingDiagnostics(staffSheet, rows, ["S/N", "Staff Name", "Department", "Position", "Employment Date", "Email", "Phone Number", "Registered Under", "Branch"]);
    rows.forEach((r, idx) => {
      const name = findVal(r, ["Staff Name", "Name", "Staff"]);
      const email = findVal(r, ["Email", "Email Address"]);
      if (name) {
        const cleanName = String(name).trim();
        const cleanEmail = email ? String(email).trim().toLowerCase() : "";
        if (cleanEmail) staffEmailMap.set(cleanName.toLowerCase(), cleanEmail);

        const member: StaffMember = {
          id: serialId("STF", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          name: cleanName,
          email: cleanEmail,
          department: String(findVal(r, ["Department", "Dept"]) || "Operations").trim(),
          position: String(findVal(r, ["Position", "Role"]) || "Staff").trim(),
          branch: String(findVal(r, ["Branch", "Location"]) || "Abuja Branch").trim(),
          phone: String(findVal(r, ["Phone Number", "Phone"]) || "").trim(),
          registeredUnder: String(findVal(r, ["Registered Under"]) || "").trim(),
          employmentDate: asText(findVal(r, ["Employment Date"]), true)
        };

        result.staff.push(member);
        staffByName.set(cleanName.toLowerCase(), member);

        // Index individual name tokens (e.g., "jumai" -> member) so short names like "JUMAI" map to "JUMAI ADAMU"
        const tokens = cleanName.toLowerCase().split(/\s+/).filter(t => t.length >= 3);
        tokens.forEach(t => {
          if (!staffByName.has(t)) staffByName.set(t, member);
        });
      } else result.parseIssues?.push({ sheet: staffSheet, row: idx + 2, message: "Missing staff name; row was skipped." });
    });
    result.stats.staffCount = result.staff.length;
  }

  // 2. Physical Hardware Assets
  const physSheet = chooseSheet(["physical"], [["Category (Laptop/Monitor/Mobile)", "Category", "Make & Model", "Model"]]);
  if (!physSheet) reportMissingSheet("Physical Assets");
  if (physSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[physSheet]);
    addSheetMappingDiagnostics(physSheet, rows, ["S/N", "Asset Tag ID", "Category (Laptop/Monitor/Mobile)", "Make & Model", "Serial Number", "Assigned Staff", "Department", "Physical Location", "Purchase Date", "Condition", "Status (Active/Repair/Retired)"]);
    rows.forEach((r, idx) => {
      const model = findVal(r, ["Make & Model", "Model", "Device"]);
      const category = findVal(r, ["Category (Laptop/Monitor/Mobile)", "Category"]);
      const tag = findVal(r, ["Asset Tag ID", "Tag ID", "Tag"]);
      const assignedVal = findVal(r, ["Assigned Staff", "Staff"]);

      // A row represents an asset if model, category, tag, or assignedStaff is present
      if (model || category || tag || assignedVal) {
        const assignedStaff = String(assignedVal || "Unassigned").trim();
        const assignedPerson = staffByName.get(assignedStaff.toLowerCase());
        const staffEmail = assignedPerson?.email || staffEmailMap.get(assignedStaff.toLowerCase()) || "";
        const makeModelVal = String(model || category || "Peripheral Hardware").trim();

        const asset: PhysicalAsset = {
          id: serialId("PA", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          tag: String(tag || `BAM-HW-${String(idx + 1).padStart(3, "0")}`).trim(),
          category: String(category || "Hardware").trim(),
          makeModel: makeModelVal,
          serialNumber: String(findVal(r, ["Serial Number", "Serial", "S/N"]) || "").trim(),
          assignedStaff: assignedPerson ? assignedPerson.name : assignedStaff,
          assignedStaffEmail: staffEmail,
          assignedStaffBranch: assignedPerson?.branch,
          department: String(findVal(r, ["Department", "Dept"]) || assignedPerson?.department || "Operations").trim(),
          branch: String(findVal(r, ["Physical Location", "Location", "Branch"]) || assignedPerson?.branch || "Abuja Branch").trim(),
          purchaseDate: asText(findVal(r, ["Purchase Date"]), true),
          condition: String(findVal(r, ["Condition"]) || "Good").trim(),
          status: String(findVal(r, ["Status (Active/Repair/Retired)", "Status"]) || "Active").trim(),
          isLocked: false,
          customAttributes: {}
        };

        result.physicalAssets.push(asset);

        if (!model) result.parseIssues?.push({ sheet: physSheet, row: idx + 2, message: "Missing make/model; parser used the category as a placeholder." });

        const alert = auditAssetCompleteness(asset);
        if (alert) result.missingDetailAlerts.push(alert);
      }
    });
    result.stats.physicalCount = result.physicalAssets.length;
  }

  // 3. Digital Credentials
  const digitalSheet = chooseSheet(["digital", "accounts"], [["Platform / Software", "Platform", "Software"]]);
  if (!digitalSheet) reportMissingSheet("Digital & Accounts");
  if (digitalSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[digitalSheet]);
    addSheetMappingDiagnostics(digitalSheet, rows, ["S/N", "Platform / Software", "Account / Login Email", "Sub-Agent / Handle ID", "Assigned User", "User Role", "Passwords", "Password Vault Status"]);
    rows.forEach((r, idx) => {
      const platform = findVal(r, ["Platform / Software", "Platform", "Software"]);
      const handle = findVal(r, ["Sub-Agent / Handle ID", "Handle ID"]);
      const login = findVal(r, ["Account / Login Email", "Email", "Account"]);
      const assigned = findVal(r, ["Assigned User", "User"]);
      if (platform || handle || login || assigned || findVal(r, ["Passwords", "Password"])) {
        const assignedUser = String(findVal(r, ["Assigned User", "User"]) || "Unassigned").trim();
        const userEmail = staffEmailMap.get(assignedUser.toLowerCase()) || "";
        const assignedPerson = staffByName.get(assignedUser.toLowerCase());
        const platformName = asText(platform) || `Unlabeled credential · row ${asText(findVal(r, ["S/N", "SN", "No"]) || idx + 1)}`;

        result.digitalCredentials.push({
          id: serialId("DC", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          platform: platformName,
          loginEmail: asText(login),
          subAgentHandleId: asText(handle),
          assignedUser: assignedUser,
          assignedUserEmail: userEmail,
          assignedUserBranch: assignedPerson?.branch,
          userRole: String(findVal(r, ["User Role", "Role"]) || "User").trim(),
          rawPass: String(findVal(r, ["Passwords", "Password"]) || "").trim(),
          passwordVaultLocation: asText(findVal(r, ["Password Vault Status", "Vault Status", "Password Storage"])),
          // This describes whether the app protects the secret, not the external source's label/provider.
          vaultStatus: "SECURED"
        });
        if (!platform) result.parseIssues?.push({ sheet: digitalSheet, row: idx + 2, message: `Missing platform; retained under placeholder “${platformName}”.` });
      } else result.parseIssues?.push({ sheet: digitalSheet, row: idx + 2, message: "Empty credential row; skipped because it contains no record details." });
    });
    result.stats.digitalCount = result.digitalCredentials.length;
  }

  // 4. Data Workbooks
  const wbSheet = chooseSheet(["workbook", "data"], [["Workbook / Doc Title", "Title", "Doc Title"]]);
  if (!wbSheet) reportMissingSheet("Data & Workbooks");
  if (wbSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[wbSheet]);
    addSheetMappingDiagnostics(wbSheet, rows, ["S/N", "Workbook / Doc Title", "Business Function", "Cloud Storage Link (URL)", "Primary File Owner", "Department", "Access Permissions", "Last Audit Date"]);
    rows.forEach((r, idx) => {
      const title = findVal(r, ["Workbook / Doc Title", "Title", "Doc Title"]);
      const url = findVal(r, ["Cloud Storage Link (URL)", "Link", "URL"]);
      const businessFunction = findVal(r, ["Business Function"]);
      if (title || url || businessFunction || findVal(r, ["Primary File Owner", "Owner"])) {
        const ownerName = String(findVal(r, ["Primary File Owner", "Owner"]) || "Basechan").trim();
        const owner = staffByName.get(ownerName.toLowerCase());
        const workbookTitle = asText(title) || `Untitled workbook · row ${asText(findVal(r, ["S/N", "SN", "No"]) || idx + 1)}`;
        result.workbooks.push({
          id: serialId("WB", r, idx),
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
        result.facilities.push({
          id: serialId("FAC", r, idx),
          sn: findVal(r, ["S/N", "SN", "No"]) || idx + 1,
          infrastructureId: asText(findVal(r, ["Infrastructure ID"])),
          branch: normalizeBranch(findVal(r, ["Infrastructure ID", "Branch", "Location"])),
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
 * Exports data to an Excel file using SheetJS
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = "Export") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
