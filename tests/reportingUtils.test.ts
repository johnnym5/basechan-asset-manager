import { describe, expect, it } from "vitest";
import {
  calculatePercentageDelta,
  calculateSectionTotals,
  compileMonthlyPackage,
  compareWeeklyReports,
  getISOWeekDetails,
  mergeTemplates,
} from "../src/lib/reportingUtils";
import { ReportSectionDef, WeeklyReport } from "../src/types/reporting";

describe("reportingUtils", () => {
  describe("getISOWeekDetails", () => {
    it("returns correct week details for a known date", () => {
      // March 5, 2025 is a Wednesday in Week 10 of 2025
      const date = new Date(2025, 2, 5); // 2025-03-05
      const details = getISOWeekDetails(date);

      expect(details.year).toBe(2025);
      expect(details.month).toBe(3); // March = 3
      expect(details.weekNumber).toBe(10);
      expect(details.weekStartDate).toBe("2025-03-03"); // Monday
      expect(details.weekEndDate).toBe("2025-03-09"); // Sunday
    });

    it("correctly handles year boundary dates according to ISO week-year convention", () => {
      // December 30, 2024 is Monday of ISO Week 1, ISO Year 2025!
      const dec30_2024 = new Date(2024, 11, 30);
      const details30 = getISOWeekDetails(dec30_2024);
      expect(details30.year).toBe(2025);
      expect(details30.weekNumber).toBe(1);

      // January 1, 2025 is Wednesday of ISO Week 1, ISO Year 2025
      const jan1_2025 = new Date(2025, 0, 1);
      const detailsJan1 = getISOWeekDetails(jan1_2025);
      expect(detailsJan1.year).toBe(2025);
      expect(detailsJan1.weekNumber).toBe(1);

      // December 31, 2025 is Wednesday of ISO Week 1, ISO Year 2026 (nearest Thursday is Jan 1, 2026)
      const dec31_2025 = new Date(2025, 11, 31);
      const detailsDec31 = getISOWeekDetails(dec31_2025);
      expect(detailsDec31.year).toBe(2026);
      expect(detailsDec31.weekNumber).toBe(1);
    });
  });

  describe("mergeTemplates", () => {
    it("merges global admin sections with user custom sections without duplicate titles", () => {
      const globalAdmin: ReportSectionDef[] = [
        {
          id: "sec_mandatory",
          title: "Weekly Objectives",
          isRequired: true,
          columns: [{ key: "col_obj", label: "Objective", type: "text" }],
        },
      ];

      const userCustom: ReportSectionDef[] = [
        {
          id: "sec_custom_1",
          title: "Hardware Audits",
          isRequired: false,
          columns: [{ key: "col_count", label: "Audited Count", type: "number", isCalculatedTotal: true }],
        },
      ];

      const merged = mergeTemplates(globalAdmin, userCustom);

      expect(merged).toHaveLength(2);
      expect(merged[0].id).toBe("sec_mandatory");
      expect(merged[0].isRequired).toBe(true);
      expect(merged[1].id).toBe("sec_custom_1");
      expect(merged[1].isRequired).toBe(false);
    });
  });

  describe("calculateSectionTotals", () => {
    it("computes totals for numeric columns safely ignoring empty strings and nulls", () => {
      const columns = [
        { key: "item", label: "Item", type: "text" as const },
        { key: "qty", label: "Quantity", type: "number" as const, isCalculatedTotal: true },
        { key: "cost", label: "Cost", type: "currency" as const, isCalculatedTotal: true },
      ];

      const rows = [
        { item: "Laptop A", qty: "10", cost: "500.50" },
        { item: "Laptop B", qty: 5, cost: "" },
        { item: "Laptop C", qty: null, cost: "100" },
      ];

      const totals = calculateSectionTotals(rows, columns);

      expect(totals.qty).toBe(15);
      expect(totals.cost).toBe(600.5);
    });
  });

  describe("calculatePercentageDelta", () => {
    it("calculates positive percentage change correctly", () => {
      expect(calculatePercentageDelta(150, 100)).toBe(50);
    });

    it("calculates negative percentage change correctly", () => {
      expect(calculatePercentageDelta(50, 100)).toBe(-50);
    });

    it("handles zero baseline safely without Infinity or NaN", () => {
      expect(calculatePercentageDelta(50, 0)).toBe("NEW");
      expect(calculatePercentageDelta(0, 0)).toBe(0);
    });
  });

  describe("compareWeeklyReports", () => {
    it("aligns up to 4 weekly reports side-by-side with section totals and deltas", () => {
      const sampleTemplate: ReportSectionDef[] = [
        {
          id: "sec_metrics",
          title: "Operational Metrics",
          isRequired: true,
          columns: [
            { key: "task_name", label: "Task", type: "text" },
            { key: "completed", label: "Completed", type: "number", isCalculatedTotal: true },
          ],
        },
      ];

      const r1: WeeklyReport = {
        id: "w1",
        userId: "usr1",
        userName: "John Doe",
        year: 2025,
        month: 3,
        weekNumber: 9,
        weekStartDate: "2025-02-24",
        weekEndDate: "2025-03-02",
        status: "SUBMITTED",
        snapshotTemplate: sampleTemplate,
        data: {
          sec_metrics: [{ task_name: "Audit", completed: 10 }],
        },
        totals: { sec_metrics: { completed: 10 } },
      };

      const r2: WeeklyReport = {
        id: "w2",
        userId: "usr1",
        userName: "John Doe",
        year: 2025,
        month: 3,
        weekNumber: 10,
        weekStartDate: "2025-03-03",
        weekEndDate: "2025-03-09",
        status: "SUBMITTED",
        snapshotTemplate: sampleTemplate,
        data: {
          sec_metrics: [{ task_name: "Audit", completed: 15 }],
        },
        totals: { sec_metrics: { completed: 15 } },
      };

      const comparison = compareWeeklyReports([r1, r2]);

      expect(comparison.alignedSections).toHaveLength(1);
      const sec = comparison.alignedSections[0];
      expect(sec.sectionTitle).toBe("Operational Metrics");
      expect(sec.reportsData).toHaveLength(2);
      expect(sec.columnAverages.completed).toBe(12.5); // (10 + 15) / 2
      expect(sec.columnDeltas.completed).toBe(50); // 10 -> 15 = +50%
    });
  });

  describe("compileMonthlyPackage", () => {
    it("aggregates weekly reports into a monthly package with totals and averages", () => {
      const sampleTemplate: ReportSectionDef[] = [
        {
          id: "sec_sales",
          title: "Sales Summary",
          columns: [{ key: "units", label: "Units Sold", type: "number", isCalculatedTotal: true }],
        },
      ];

      const reports: WeeklyReport[] = [
        {
          id: "w1",
          userId: "usr1",
          userName: "Alice",
          year: 2025,
          month: 3,
          weekNumber: 9,
          weekStartDate: "2025-03-01",
          weekEndDate: "2025-03-02",
          status: "SUBMITTED",
          snapshotTemplate: sampleTemplate,
          data: { sec_sales: [{ units: 20 }] },
          totals: { sec_sales: { units: 20 } },
        },
        {
          id: "w2",
          userId: "usr1",
          userName: "Alice",
          year: 2025,
          month: 3,
          weekNumber: 10,
          weekStartDate: "2025-03-03",
          weekEndDate: "2025-03-09",
          status: "SUBMITTED",
          snapshotTemplate: sampleTemplate,
          data: { sec_sales: [{ units: 30 }] },
          totals: { sec_sales: { units: 30 } },
        },
      ];

      const monthlyPkg = compileMonthlyPackage("usr1", "Alice", 2025, 3, reports);

      expect(monthlyPkg.userId).toBe("usr1");
      expect(monthlyPkg.year).toBe(2025);
      expect(monthlyPkg.month).toBe(3);
      expect(monthlyPkg.includedWeeklyReportIds).toEqual(["w1", "w2"]);
      expect(monthlyPkg.sectionSummaries.sec_sales.columnTotals.units).toBe(50); // 20 + 30
      expect(monthlyPkg.sectionSummaries.sec_sales.columnAverages.units).toBe(25); // (20 + 30) / 2
    });
  });
});
