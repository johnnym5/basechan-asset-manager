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

describe("Reporting Subsystem Integration Workflow", () => {
  it("executes complete lifecycle: template merging -> data entry -> submission freeze -> 4-week comparison -> monthly compilation", () => {
    // 1. Define Global Admin & User Custom Templates
    const globalAdminSections: ReportSectionDef[] = [
      {
        id: "sec_key_metrics",
        title: "Key Operational Metrics",
        isRequired: true,
        columns: [
          { key: "kpi_name", label: "KPI Name", type: "text" },
          { key: "target", label: "Target", type: "number", isCalculatedTotal: true },
          { key: "actual", label: "Actual", type: "number", isCalculatedTotal: true },
        ],
      },
    ];

    const userCustomSections: ReportSectionDef[] = [
      {
        id: "sec_hardware_audits",
        title: "Hardware Audits Conducted",
        isRequired: false,
        columns: [
          { key: "asset_tag", label: "Asset Tag", type: "text" },
          { key: "repair_cost", label: "Estimated Cost", type: "currency", isCalculatedTotal: true },
        ],
      },
    ];

    // 2. Merge Templates
    const mergedTemplate = mergeTemplates(globalAdminSections, userCustomSections);
    expect(mergedTemplate).toHaveLength(2);
    expect(mergedTemplate[0].id).toBe("sec_key_metrics");
    expect(mergedTemplate[1].id).toBe("sec_hardware_audits");

    // 3. Create 4 Weeks of Reports (Week 9 to Week 12)
    const mockReports: WeeklyReport[] = [];
    const actualValues = [100, 120, 150, 180];
    const costValues = [250, 300, 200, 400];

    for (let i = 0; i < 4; i++) {
      const weekNum = 9 + i;
      const weekData = {
        sec_key_metrics: [
          { kpi_name: "Hardware Inspections", target: 100, actual: actualValues[i] },
        ],
        sec_hardware_audits: [
          { asset_tag: `BCAM-00${i + 1}`, repair_cost: costValues[i] },
        ],
      };

      const metricsTotals = calculateSectionTotals(weekData.sec_key_metrics, mergedTemplate[0].columns);
      const auditsTotals = calculateSectionTotals(weekData.sec_hardware_audits, mergedTemplate[1].columns);

      mockReports.push({
        id: `usr1_2025_W${weekNum}`,
        userId: "usr1",
        userName: "Sarah Connor",
        year: 2025,
        month: 3,
        weekNumber: weekNum,
        weekStartDate: `2025-03-${String(1 + i * 7).padStart(2, "0")}`,
        weekEndDate: `2025-03-${String(7 + i * 7).padStart(2, "0")}`,
        status: "SUBMITTED",
        submittedAt: new Date(),
        snapshotTemplate: mergedTemplate,
        data: weekData,
        totals: {
          sec_key_metrics: metricsTotals,
          sec_hardware_audits: auditsTotals,
        },
      });
    }

    expect(mockReports).toHaveLength(4);

    // 4. Run Side-by-Side 4-Week Comparison
    const comparison = compareWeeklyReports(mockReports);
    expect(comparison.alignedSections).toHaveLength(2);

    const metricsComparison = comparison.alignedSections.find((s) => s.sectionId === "sec_key_metrics")!;
    expect(metricsComparison.reportsData).toHaveLength(4);

    // Average actual: (100 + 120 + 150 + 180) / 4 = 137.5
    expect(metricsComparison.columnAverages.actual).toBe(137.5);

    // Net delta from W9 (100) to W12 (180): +80%
    expect(metricsComparison.columnDeltas.actual).toBe(80);

    // 5. Aggregate Monthly Package
    const monthlyPkg = compileMonthlyPackage("usr1", "Sarah Connor", 2025, 3, mockReports);
    expect(monthlyPkg.includedWeeklyReportIds).toHaveLength(4);

    // Sum actuals: 100 + 120 + 150 + 180 = 550
    expect(monthlyPkg.sectionSummaries.sec_key_metrics.columnTotals.actual).toBe(550);
    expect(monthlyPkg.sectionSummaries.sec_key_metrics.columnAverages.actual).toBe(137.5);

    // Sum costs: 250 + 300 + 200 + 400 = 1150
    expect(monthlyPkg.sectionSummaries.sec_hardware_audits.columnTotals.repair_cost).toBe(1150);
  });
});
