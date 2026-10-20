import {
  MonthlyPackage,
  ReportColumnDef,
  ReportComparisonResult,
  ReportSectionDef,
  WeeklyReport,
} from "@/types/reporting";

/**
 * Calculates the ISO week details for a given Date object.
 */
export function getISOWeekDetails(dateInput: Date = new Date()): {
  year: number;
  month: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
} {
  const d = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (make Sunday = 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  // Determine Monday (start of week) and Sunday (end of week)
  const targetDate = new Date(dateInput);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon ...
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatYYYMMDD = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    year: monday.getFullYear(),
    month: monday.getMonth() + 1, // Month index 1-12 based on Monday
    weekNumber,
    weekStartDate: formatYYYMMDD(monday),
    weekEndDate: formatYYYMMDD(sunday),
  };
}

/**
 * Merges the global admin mandatory sections with a user's custom sections.
 */
export function mergeTemplates(
  globalAdminSections: ReportSectionDef[] = [],
  userCustomSections: ReportSectionDef[] = []
): ReportSectionDef[] {
  const adminMap = new Map<string, ReportSectionDef>();
  globalAdminSections.forEach((sec) => {
    adminMap.set(sec.id, { ...sec, isRequired: true });
  });

  const merged: ReportSectionDef[] = Array.from(adminMap.values());

  userCustomSections.forEach((userSec) => {
    if (!adminMap.has(userSec.id)) {
      merged.push({ ...userSec, isRequired: false });
    }
  });

  return merged;
}

/**
 * Parses any numeric cell value safely.
 */
export function parseNumericCell(value: any): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Calculates column totals for numeric/currency columns in a table section.
 */
export function calculateSectionTotals(
  rows: Array<Record<string, any>> = [],
  columns: ReportColumnDef[] = []
): Record<string, number> {
  const totals: Record<string, number> = {};

  const numericCols = columns.filter(
    (col) => col.type === "number" || col.type === "currency" || col.isCalculatedTotal
  );

  numericCols.forEach((col) => {
    totals[col.key] = 0;
  });

  rows.forEach((row) => {
    numericCols.forEach((col) => {
      const val = parseNumericCell(row[col.key]);
      totals[col.key] += val;
    });
  });

  return totals;
}

/**
 * Computes percentage delta from previous to current value safely.
 */
export function calculatePercentageDelta(current: number, previous: number): number {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100; // 0 to positive value is +100%
  }
  const rawDelta = ((current - previous) / Math.abs(previous)) * 100;
  return Math.round(rawDelta * 100) / 100; // Round to 2 decimal places
}

/**
 * Compares up to 4 weekly reports side-by-side, aligning snapshot templates and calculating column totals, averages, and deltas.
 */
export function compareWeeklyReports(reports: WeeklyReport[]): ReportComparisonResult {
  if (reports.length === 0) {
    return { alignedSections: [] };
  }

  // Sort reports chronologically by weekStartDate
  const sortedReports = [...reports].sort((a, b) =>
    a.weekStartDate.localeCompare(b.weekStartDate)
  );

  // Collect all unique sections across snapshot templates
  const sectionMap = new Map<string, { title: string; columnsMap: Map<string, ReportColumnDef> }>();

  sortedReports.forEach((rpt) => {
    const template = rpt.snapshotTemplate || [];
    template.forEach((sec) => {
      if (!sectionMap.has(sec.id)) {
        sectionMap.set(sec.id, {
          title: sec.title,
          columnsMap: new Map<string, ReportColumnDef>(),
        });
      }
      const existingSec = sectionMap.get(sec.id)!;
      sec.columns.forEach((col) => {
        if (!existingSec.columnsMap.has(col.key)) {
          existingSec.columnsMap.set(col.key, col);
        }
      });
    });
  });

  const alignedSections: ReportComparisonResult["alignedSections"] = [];

  sectionMap.forEach((secMeta, sectionId) => {
    const columns = Array.from(secMeta.columnsMap.values());
    const reportsData: Array<{
      reportId: string;
      weekLabel: string;
      rows: Array<Record<string, any>>;
      totals: Record<string, number>;
    }> = [];

    const columnSumTotals: Record<string, number> = {};
    columns.forEach((c) => (columnSumTotals[c.key] = 0));

    sortedReports.forEach((rpt) => {
      const secRows = rpt.data?.[sectionId] || [];
      const secTotals = rpt.totals?.[sectionId] || calculateSectionTotals(secRows, columns);

      columns.forEach((c) => {
        columnSumTotals[c.key] += secTotals[c.key] || 0;
      });

      reportsData.push({
        reportId: rpt.id,
        weekLabel: `W${rpt.weekNumber} (${rpt.weekStartDate})`,
        rows: secRows,
        totals: secTotals,
      });
    });

    const reportCount = sortedReports.length;
    const columnAverages: Record<string, number> = {};
    const columnDeltas: Record<string, number> = {};

    const oldestReportTotals = reportsData[0]?.totals || {};
    const newestReportTotals = reportsData[reportsData.length - 1]?.totals || {};

    columns.forEach((c) => {
      const avg = reportCount > 0 ? columnSumTotals[c.key] / reportCount : 0;
      columnAverages[c.key] = Math.round(avg * 100) / 100;

      const oldestVal = oldestReportTotals[c.key] || 0;
      const newestVal = newestReportTotals[c.key] || 0;
      columnDeltas[c.key] = calculatePercentageDelta(newestVal, oldestVal);
    });

    alignedSections.push({
      sectionId,
      sectionTitle: secMeta.title,
      columns,
      reportsData,
      columnAverages,
      columnDeltas,
    });
  });

  return { alignedSections };
}

/**
 * Compiles a user's submitted weekly reports for a specific month into a MonthlyPackage.
 */
export function compileMonthlyPackage(
  userId: string,
  userName: string,
  year: number,
  month: number,
  weeklyReports: WeeklyReport[]
): MonthlyPackage {
  const filteredReports = weeklyReports.filter(
    (rpt) => rpt.userId === userId && rpt.year === year && rpt.month === month && rpt.status === "SUBMITTED"
  );

  const includedWeeklyReportIds = filteredReports.map((r) => r.id);
  const sectionSummaries: MonthlyPackage["sectionSummaries"] = {};

  if (filteredReports.length === 0) {
    return {
      id: `${userId}_${year}_M${String(month).padStart(2, "0")}`,
      userId,
      userName,
      year,
      month,
      compiledAt: new Date(),
      includedWeeklyReportIds: [],
      sectionSummaries: {},
    };
  }

  // Collect all section definitions across reports
  const sectionMap = new Map<string, ReportColumnDef[]>();

  filteredReports.forEach((rpt) => {
    (rpt.snapshotTemplate || []).forEach((sec) => {
      if (!sectionMap.has(sec.id)) {
        sectionMap.set(sec.id, sec.columns);
      }
    });
  });

  sectionMap.forEach((columns, sectionId) => {
    const columnTotals: Record<string, number> = {};
    const columnAverages: Record<string, number> = {};
    let totalRowCount = 0;

    columns.forEach((c) => {
      columnTotals[c.key] = 0;
    });

    filteredReports.forEach((rpt) => {
      const secRows = rpt.data?.[sectionId] || [];
      totalRowCount += secRows.length;
      const secTotals = rpt.totals?.[sectionId] || calculateSectionTotals(secRows, columns);

      columns.forEach((c) => {
        columnTotals[c.key] += secTotals[c.key] || 0;
      });
    });

    const reportCount = filteredReports.length;
    columns.forEach((c) => {
      const avg = reportCount > 0 ? columnTotals[c.key] / reportCount : 0;
      columnAverages[c.key] = Math.round(avg * 100) / 100;
    });

    sectionSummaries[sectionId] = {
      columnTotals,
      columnAverages,
      rowCount: totalRowCount,
    };
  });

  return {
    id: `${userId}_${year}_M${String(month).padStart(2, "0")}`,
    userId,
    userName,
    year,
    month,
    compiledAt: new Date(),
    includedWeeklyReportIds,
    sectionSummaries,
  };
}
