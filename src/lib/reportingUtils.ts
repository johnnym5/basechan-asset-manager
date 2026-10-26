import {
  MonthlyPackage,
  ApplicationCountValidation,
  ReportColumnDef,
  ReportComparisonResult,
  ReportSectionDef,
  ReportMetricDef,
  WeeklyReport,
} from "@/types/reporting";

const APPLICATION_CHANNELS = ["B2B", "B2C", "SUBAGENTS"] as const;
const OFFER_STATUSES = ["conditional_offers", "unconditional_offers", "awaiting_offers"] as const;

export function validateApplicationCounts(values: Record<string, number | null | undefined>, metrics?: ReportMetricDef[]): ApplicationCountValidation {
  const errors: string[] = [];
  const activeIds = metrics ? new Set(metrics.map((metric) => metric.id)) : null;
  const isActive = (key: string) => !activeIds || activeIds.has(key);
  const checked = new Set<string>();
  const count = (key: string) => {
    if (!isActive(key)) return 0;
    const value = values[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || !Number.isFinite(value)) {
      if (!checked.has(key)) errors.push(`${key} must be a non-negative whole number.`);
      checked.add(key);
      return 0;
    }
    checked.add(key);
    return value;
  };
  metrics?.filter((metric) => metric.group && metric.group !== "PIPELINE").forEach((metric) => count(metric.id));

  const totalEquationKeys = ["total_applications", "applications_b2b", "applications_b2c", "applications_subagents"];
  const totalEquationEnabled = totalEquationKeys.every(isActive);
  const total = totalEquationEnabled ? count("total_applications") : 0;
  const channelTotals = Object.fromEntries(APPLICATION_CHANNELS.map((channel) => {
    const suffix = channel.toLowerCase();
    const applicationsKey = `applications_${suffix}`;
    const offerKeys = OFFER_STATUSES.map((status) => `${status}_${suffix}`);
    const equationEnabled = [applicationsKey, ...offerKeys].every(isActive);
    const applications = equationEnabled ? count(applicationsKey) : 0;
    const offers = equationEnabled ? offerKeys.reduce((sum, key) => sum + count(key), 0) : 0;
    if (equationEnabled && offers !== applications) errors.push(`${channel} offer statuses total ${offers}; applications total ${applications}.`);
    return [channel, { applications, offers }];
  })) as ApplicationCountValidation["channelTotals"];

  const expectedTotal = APPLICATION_CHANNELS.reduce((sum, channel) => sum + channelTotals[channel].applications, 0);
  if (totalEquationEnabled && expectedTotal !== total) errors.push(`Channel applications total ${expectedTotal}; total applications is ${total}.`);
  return { valid: errors.length === 0, errors, expectedTotal, channelTotals };
}

export interface AlignedMetricReport {
  reportId: string;
  weekLabel: string;
  values: Record<string, number | null>;
}

export function alignWeeklyReportMetrics(reports: WeeklyReport[]): { metrics: ReportMetricDef[]; reports: AlignedMetricReport[] } {
  const metricMap = new Map<string, ReportMetricDef>();
  reports.forEach((report) => (report.selectedTemplates || []).forEach((selected) => selected.metrics.forEach((metric) => {
    const metricKey = `${selected.templateId}::${metric.id}`;
    if (!metricMap.has(metricKey)) metricMap.set(metricKey, { ...metric, id: metricKey, label: `${selected.templateSnapshot.name}: ${metric.label}` });
  })));

  return {
    metrics: Array.from(metricMap.values()),
    reports: reports.map((report) => {
      const values: Record<string, number | null> = {};
      (report.selectedTemplates || []).forEach((selected) => selected.metrics.forEach((metric) => {
        values[`${selected.templateId}::${metric.id}`] = selected.values[metric.id] ?? null;
      }));
      return {
        reportId: report.id,
        weekLabel: `Week ${report.weekNumber}${report.year ? ` · ${report.year}` : ""}`,
        values,
      };
    }),
  };
}

/**
 * Calculates the Tuesday-to-Monday reporting week, labelled by the ISO week
 * containing its ending Monday. A new reporting week begins every Tuesday.
 */
export function getISOWeekDetails(dateInput: Date = new Date()): {
  year: number;
  month: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
} {
  const targetDate = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  const daysSinceTuesday = (targetDate.getDay() + 5) % 7;
  const tuesday = new Date(targetDate);
  tuesday.setDate(targetDate.getDate() - daysSinceTuesday);
  const monday = new Date(tuesday);
  monday.setDate(tuesday.getDate() + 6);

  // Label the Tuesday-to-Monday reporting period with the ISO week containing
  // its ending Monday, keeping the existing week-number convention familiar.
  const thursday = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const dayNum = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - dayNum);
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const formatYYYMMDD = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    year: isoYear,
    month: monday.getMonth() + 1, // Month index 1-12 based on Monday
    weekNumber,
    weekStartDate: formatYYYMMDD(tuesday),
    weekEndDate: formatYYYMMDD(monday),
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
  if (typeof value === "number") return Number.isNaN(value) || !Number.isFinite(value) ? 0 : value;
  if (typeof value === "string") {
    let str = value.trim();
    if (str === "" || str === "—" || str === "N/A" || str === "nil" || str === "null") return 0;
    if (/^\(.*\)$/.test(str)) {
      str = "-" + str.slice(1, -1);
    }
    const cleaned = str.replace(/,/g, "").replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) || !Number.isFinite(parsed) ? 0 : parsed;
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
export function calculatePercentageDelta(current: number, previous: number): number | "NEW" {
  if (previous === 0) {
    if (current === 0) return 0;
    return "NEW";
  }
  const rawDelta = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(rawDelta)) return "NEW";
  return Math.round(rawDelta * 100) / 100;
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
      totals: Record<string, number | null>;
    }> = [];

    const columnSumTotals: Record<string, number> = {};
    columns.forEach((c) => (columnSumTotals[c.key] = 0));

    sortedReports.forEach((rpt) => {
      const secRows = rpt.data?.[sectionId] || [];
      const reportSection = (rpt.snapshotTemplate || []).find((sec) => sec.id === sectionId);
      const reportColumns = reportSection?.columns || [];
      const rawTotals = rpt.totals?.[sectionId] || calculateSectionTotals(secRows, reportColumns);
      const secTotals: Record<string, number | null> = {};

      columns.forEach((c) => {
        if (!reportSection || !reportColumns.some((reportColumn) => reportColumn.key === c.key)) {
          secTotals[c.key] = null;
          return;
        }
        const value = rawTotals[c.key] ?? 0;
        secTotals[c.key] = value;
        columnSumTotals[c.key] += value;
      });

      reportsData.push({
        reportId: rpt.id,
        weekLabel: `W${rpt.weekNumber} (${rpt.weekStartDate})`,
        rows: secRows,
        totals: secTotals,
      });
    });

    const columnAverages: Record<string, number> = {};
    const columnDeltas: Record<string, number | "NEW"> = {};

    const oldestReportTotals = reportsData[0]?.totals || {};
    const newestReportTotals = reportsData[reportsData.length - 1]?.totals || {};

    columns.forEach((c) => {
      const reportsWithMetric = reportsData.filter((reportData) => reportData.totals[c.key] !== null && reportData.totals[c.key] !== undefined).length;
      const avg = reportsWithMetric > 0 ? columnSumTotals[c.key] / reportsWithMetric : 0;
      columnAverages[c.key] = Math.round(avg * 100) / 100;

      const oldestVal = oldestReportTotals[c.key] ?? 0;
      const newestVal = newestReportTotals[c.key] ?? 0;
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
  const templateMetricSummaries: NonNullable<MonthlyPackage["templateMetricSummaries"]> = {};

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
    (rpt.selectedTemplates || []).forEach((selected) => {
      const templateSummary = templateMetricSummaries[selected.templateId] || { templateName: selected.templateSnapshot.name, metrics: {} };
      selected.metrics.forEach((metric) => {
        const value = selected.values[metric.id];
        if (value === null || value === undefined || !Number.isFinite(value)) return;
        const summary = templateSummary.metrics[metric.id] || { label: metric.label, total: 0, average: 0, reportedWeekCount: 0 };
        summary.total += value;
        summary.reportedWeekCount += 1;
        summary.average = Math.round((summary.total / summary.reportedWeekCount) * 100) / 100;
        templateSummary.metrics[metric.id] = summary;
      });
      templateMetricSummaries[selected.templateId] = templateSummary;
    });
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
    templateMetricSummaries,
  };
}
