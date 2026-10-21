import { describe, expect, it } from "vitest";
import { parseBasechanWorkbook } from "../src/lib/excelParser";
import * as XLSX from "xlsx";

describe("Spreadsheet Import, Mapping & Validation", () => {
  it("correctly maps facility fields without mapping Infrastructure ID to Branch Location", async () => {
    const wb = XLSX.utils.book_new();

    // Staff Sheet
    const staffData = [
      ["S/N", "Full Name", "Email Address", "Department", "Position / Role", "Branch Location", "Phone Number"],
      [1, "Alice Smith", "alice.basechaninternational@gmail.com", "Operations", "Manager", "Abuja Branch", "08012345678"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(staffData), "Staff");

    // Hardware Sheet
    const hwData = [
      ["S/N", "Tag ID", "Serial Number", "Make & Model", "Category", "Assigned Custodian", "Condition", "Operational Status", "Purchase Date", "Branch Location"],
      [1, "BAM-100", "SN123456", "Dell XPS 15", "Laptop", "Alice Smith", "Good", "Active", "2024-01-15", "Abuja Branch"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hwData), "Hardware");

    // Credentials Sheet
    const credData = [
      ["S/N", "Vault ID", "Platform / Resource", "Category (Sub-Agent/OAuth/SaaS)", "Bound Staff Email", "Vault Status", "Security Level"],
      [1, "CRD-001", "Google Workspace", "SaaS", "alice.basechaninternational@gmail.com", "SECURED", "High"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(credData), "Credentials");

    // Workbooks Sheet
    const wbData = [
      ["S/N", "Workbook Title", "Business Function", "Primary Owner", "Department", "Cloud Link", "Access Permissions", "Last Audit Date"],
      [1, "Asset Master 2025", "Asset Tracking", "Alice Smith", "Operations", "https://example.com/sheet.xlsx", "RESTRICTED", "2025-01-01"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wbData), "Workbooks");

    // Office & Facilities Sheet (with explicit Infrastructure ID and Branch Location)
    const facData = [
      ["S/N", "Infrastructure ID", "Item Description", "Category (Furniture/Network/Peripheral)", "Room / Zone", "Quantity", "Purchase Date", "Condition", "Assigned / Shared", "Maintenance Notes", "Branch Location"],
      [1, "INFRA-ABJ-001", "Executive Desk", "Furniture", "Executive Office 1", 1, "2024-02-01", "Good", "Alice Smith", "None", "Benin Branch"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(facData), "Facilities");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const parsed = await parseBasechanWorkbook(buffer);

    expect(parsed.facilities.length).toBe(1);
    const facility = parsed.facilities[0];
    expect(facility.infrastructureId).toBe("INFRA-ABJ-001");
    // Verify branch is mapped from Branch Location column ("Benin Branch"), NOT from Infrastructure ID ("INFRA-ABJ-001")!
    expect(facility.branch).toBe("Benin Branch");
  });

  it("assigns provisional tag when asset tag is missing and flags in missingDetailAlerts", async () => {
    const wb = XLSX.utils.book_new();

    const staffData = [
      ["S/N", "Full Name", "Email Address", "Department", "Position / Role", "Branch Location", "Phone Number"],
      [1, "Alice Smith", "alice.basechaninternational@gmail.com", "Operations", "Manager", "Abuja Branch", "08012345678"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(staffData), "Staff");

    // Hardware asset with NO Tag ID specified
    const hwData = [
      ["S/N", "Tag ID", "Serial Number", "Make & Model", "Category", "Assigned Custodian", "Condition", "Operational Status", "Purchase Date", "Branch Location"],
      [1, "", "SN99999", "MacBook Pro 16", "Laptop", "Alice Smith", "Good", "Active", "2024-01-15", "Abuja Branch"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hwData), "Hardware");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const parsed = await parseBasechanWorkbook(buffer);

    expect(parsed.physicalAssets.length).toBe(1);
    const asset = parsed.physicalAssets[0];
    expect(asset.tag).toBe("PROVISIONAL-001");

    // Verify completeness auditor flags provisional tag
    const alert = parsed.missingDetailAlerts.find((a) => a.assetId === asset.id);
    expect(alert).toBeDefined();
    expect(alert?.missingFields).toContain("Asset Tag ID");
  });

  it("detects duplicate tags and serial numbers in parseIssues", async () => {
    const wb = XLSX.utils.book_new();

    const staffData = [
      ["S/N", "Full Name", "Email Address", "Department", "Position / Role", "Branch Location", "Phone Number"],
      [1, "Alice Smith", "alice.basechaninternational@gmail.com", "Operations", "Manager", "Abuja Branch", "08012345678"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(staffData), "Staff");

    // Hardware asset with duplicate official Tag ID and Serial Number
    const hwData = [
      ["S/N", "Tag ID", "Serial Number", "Make & Model", "Category", "Assigned Custodian", "Condition", "Operational Status", "Purchase Date", "Branch Location"],
      [1, "BAM-100", "SN-DUP-001", "Device 1", "Laptop", "Alice Smith", "Good", "Active", "2024-01-15", "Abuja Branch"],
      [2, "BAM-100", "SN-DUP-001", "Device 2", "Laptop", "Alice Smith", "Good", "Active", "2024-01-15", "Abuja Branch"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hwData), "Hardware");

    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const parsed = await parseBasechanWorkbook(buffer);

    const issues = parsed.parseIssues || [];
    expect(issues.some((i) => i.message.includes("Duplicate official asset tag"))).toBe(true);
    expect(issues.some((i) => i.message.includes("Duplicate serial number"))).toBe(true);
  });
});
