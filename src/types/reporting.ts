import { FirestoreTimestampValue } from "./assets";

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
  updatedAt?: FirestoreTimestampValue;
  updatedBy?: string;
}

export type ReportTemplateKind = "APPLICATION" | "LEAD";

export interface ReportMetricDef {
  id: string;
  label: string;
  type: "number";
  group?: "PIPELINE" | "APPLICATION_TOTAL" | "APPLICATION_CHANNEL" | "OFFER_STATUS";
  channel?: "B2B" | "B2C" | "SUBAGENTS";
}

export interface SharedReportTemplate {
  id: string;
  name: string;
  kind: ReportTemplateKind;
  metrics: ReportMetricDef[];
  createdBy: string;
  updatedBy: string;
  createdAt?: FirestoreTimestampValue;
  updatedAt?: FirestoreTimestampValue;
}

export interface PersonalReportTemplate extends SharedReportTemplate {
  ownerUid: string;
  sourceTemplateId?: string | null;
}

export interface ReportTemplateAssignment {
  uid: string;
  templateIds: string[];
  applicationTemplateIds?: string[];
  personalTemplateIds?: string[];
  personalApplicationTemplateIds?: string[];
  updatedBy: string;
  updatedAt?: FirestoreTimestampValue;
}

export interface SelectedReportTemplate {
  templateId: string;
  templateSnapshot: SharedReportTemplate;
  metrics: ReportMetricDef[];
  values: Record<string, number | null>;
  metricIds?: string[];
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
  submittedAt?: FirestoreTimestampValue;
  snapshotTemplate: ReportSectionDef[];
  data: Record<string, Array<Record<string, any>>>;
  totals?: Record<string, Record<string, number>>;
  selectedTemplates?: SelectedReportTemplate[];
  selectedTemplatesById?: Record<string, SelectedReportTemplate>;
  applicationTemplateId?: string | null;
}

export interface ApplicationCountValidation {
  valid: boolean;
  errors: string[];
  expectedTotal: number;
  channelTotals: Record<"B2B" | "B2C" | "SUBAGENTS", { applications: number; offers: number }>;
}

export interface MonthlyPackage {
  id: string;
  userId: string;
  userName: string;
  reportCategory?: string;
  year: number;
  month: number;
  compiledAt: FirestoreTimestampValue;
  includedWeeklyReportIds: string[];
  sectionSummaries: Record<
    string,
    {
      columnTotals: Record<string, number>;
      columnAverages: Record<string, number>;
      rowCount: number;
    }
  >;
  templateMetricSummaries?: Record<string, { templateName: string; metrics: Record<string, { label: string; total: number; average: number; reportedWeekCount: number }> }>;
}

export interface LateUnlockRequest {
  id: string;
  userId: string;
  weekIdentifier: string; // e.g. "2025_W10"
  grantedBy: string;
  grantedAt: FirestoreTimestampValue;
  expiresAt: FirestoreTimestampValue;
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
      totals: Record<string, number | null>;
    }>;
    columnAverages: Record<string, number>;
    columnDeltas: Record<string, number | "NEW">;
  }>;
}
