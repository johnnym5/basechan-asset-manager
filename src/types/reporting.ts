export type ColumnType = "text" | "number" | "currency" | "date";

export interface ReportColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  isCalculatedTotal?: boolean;
}

export interface ReportSectionDef {
  id: string;
  title: string;
  isRequired?: boolean;
  columns: ReportColumnDef[];
  defaultRows?: Array<Record<string, any>>;
}

export interface ReportTemplate {
  userId: string | null; // null for global admin template
  reportCategory?: string; // e.g. "B2C Direct", "B2B Partnerships", "General Operations"
  sections: ReportSectionDef[];
  updatedAt?: any;
  updatedBy?: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  userName: string;
  reportCategory?: string; // e.g. "B2C Direct", "B2B Partnerships", "General Operations"
  year: number;
  month: number;
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  status: "DRAFT" | "SUBMITTED" | "OVERDUE" | "LATE_UNLOCKED";
  submittedAt?: any;
  snapshotTemplate: ReportSectionDef[];
  data: Record<string, Array<Record<string, any>>>;
  totals?: Record<string, Record<string, number>>;
}

export interface MonthlyPackage {
  id: string;
  userId: string;
  userName: string;
  reportCategory?: string;
  year: number;
  month: number;
  compiledAt: any;
  includedWeeklyReportIds: string[];
  sectionSummaries: Record<
    string,
    {
      columnTotals: Record<string, number>;
      columnAverages: Record<string, number>;
      rowCount: number;
    }
  >;
}

export interface LateUnlockRequest {
  id: string;
  userId: string;
  weekIdentifier: string; // e.g. "2025_W10"
  grantedBy: string;
  grantedAt: any;
  expiresAt: any;
  status: "ACTIVE" | "USED" | "EXPIRED";
}

export interface ReportComparisonResult {
  alignedSections: Array<{
    sectionId: string;
    sectionTitle: string;
    columns: ReportColumnDef[];
    reportsData: Array<{
      reportId: string;
      weekLabel: string;
      rows: Array<Record<string, any>>;
      totals: Record<string, number>;
    }>;
    columnAverages: Record<string, number>;
    columnDeltas: Record<string, number>; // Percentage change from oldest to newest
  }>;
}
