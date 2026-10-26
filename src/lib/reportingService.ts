import { db } from "@/lib/firebase";
import { mergeTemplates } from "@/lib/reportingUtils";
import { validateApplicationCounts } from "@/lib/reportingUtils";
import { MonthlyPackage, PersonalReportTemplate, ReportMetricDef, ReportSectionDef, ReportTemplate, SharedReportTemplate, ReportTemplateAssignment, SelectedReportTemplate, WeeklyReport } from "@/types/reporting";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";

const GLOBAL_ADMIN_DOC_ID = "global_admin";

export function buildDefaultApplicationTemplate(adminUid: string): SharedReportTemplate {
  const pipelines = ["Lead Assigned", "Documents Received", "Prospective", "Non Prospective", "Duration of Ad", "Future Leads", "Not Concluded", "Application Submitted"];
  const metrics: ReportMetricDef[] = pipelines.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label, type: "number", group: "PIPELINE" }));
  metrics.push({ id: "conversion", label: "Conversion", type: "number", group: "PIPELINE" });
  metrics.push({ id: "total_applications", label: "Total Applications", type: "number", group: "APPLICATION_TOTAL" });
  const channels = [{ id: "b2b", name: "B2B", channel: "B2B" as const }, { id: "b2c", name: "B2C", channel: "B2C" as const }, { id: "subagents", name: "Subagents", channel: "SUBAGENTS" as const }];
  channels.forEach(({ id, name, channel }) => {
    metrics.push({ id: `applications_${id}`, label: `${name} Applications`, type: "number", group: "APPLICATION_CHANNEL", channel });
    metrics.push({ id: `conditional_offers_${id}`, label: `${name} Conditional Offers`, type: "number", group: "OFFER_STATUS", channel });
    metrics.push({ id: `unconditional_offers_${id}`, label: `${name} Unconditional Offers`, type: "number", group: "OFFER_STATUS", channel });
    metrics.push({ id: `awaiting_offers_${id}`, label: `${name} Awaiting Offers`, type: "number", group: "OFFER_STATUS", channel });
  });
  return { id: "application_default", name: "Application", kind: "APPLICATION", metrics, createdBy: adminUid, updatedBy: adminUid };
}

export function buildUniversalDefaultTemplate(ownerUid: string): SharedReportTemplate {
  return { ...buildDefaultApplicationTemplate(ownerUid), id: "weekly_report_starter", name: "Weekly Report Starter" };
}

export function buildDefaultLeadTemplate(adminUid: string): SharedReportTemplate {
  return { id: "lead_default", name: "Lead", kind: "LEAD", metrics: [], createdBy: adminUid, updatedBy: adminUid };
}

export async function fetchSharedReportTemplates(): Promise<SharedReportTemplate[]> {
  const snap = await getDocs(query(collection(db, "reportTemplates"), where("kind", "in", ["APPLICATION", "LEAD"])));
  return snap.docs.filter((row) => {
    const data = row.data();
    return row.id !== GLOBAL_ADMIN_DOC_ID && !data.userId && (data.kind === "APPLICATION" || data.kind === "LEAD") && Array.isArray(data.metrics);
  }).map((row) => ({ id: row.id, ...row.data() } as SharedReportTemplate)).sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchAssignedReportTemplates(uid: string): Promise<SharedReportTemplate[]> {
  const assignment = await fetchReportTemplateAssignment(uid);
  if (!assignment?.templateIds.length) return [];
  const rows = await Promise.all(assignment.templateIds.map(async (templateId) => {
    const snap = await getDoc(doc(db, "reportTemplates", templateId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return (data.kind === "APPLICATION" || data.kind === "LEAD") && Array.isArray(data.metrics) ? ({ id: snap.id, ...data } as SharedReportTemplate) : null;
  }));
  return rows.filter((row): row is SharedReportTemplate => row !== null);
}

export async function fetchPersonalReportTemplates(uid: string): Promise<PersonalReportTemplate[]> {
  const snap = await getDocs(query(collection(db, "staffReportTemplates"), where("ownerUid", "==", uid)));
  return snap.docs.map((row) => ({ id: row.id, ...row.data() } as PersonalReportTemplate));
}

export async function savePersonalReportTemplate(template: PersonalReportTemplate, uid: string): Promise<void> {
  if (template.ownerUid !== uid) throw new Error("A personal template must belong to the current staff account.");
  const ref = doc(db, "staffReportTemplates", template.id);
  const existing = await getDoc(ref);
  if (existing.exists() && existing.data().ownerUid !== uid) throw new Error("This template belongs to another account.");
  const assignmentRef = doc(db, "reportTemplateAssignments", uid);
  const assignmentSnap = await getDoc(assignmentRef);
  const assignment = assignmentSnap.exists() ? assignmentSnap.data() : {};
  const personalTemplateIds = Array.from(new Set([...(assignment.personalTemplateIds || []), template.id]));
  const personalApplicationTemplateIds = template.kind === "APPLICATION"
    ? Array.from(new Set([...(assignment.personalApplicationTemplateIds || []), template.id]))
    : (assignment.personalApplicationTemplateIds || []).filter((id: string) => id !== template.id);
  const batch = writeBatch(db);
  batch.set(ref, { ...template, ownerUid: uid, createdBy: existing.exists() ? existing.data().createdBy || uid : uid, updatedBy: uid, updatedAt: serverTimestamp(), ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}) }, { merge: true });
  batch.set(assignmentRef, { uid, personalTemplateIds, personalApplicationTemplateIds, updatedBy: uid, updatedAt: serverTimestamp() }, { merge: true });
  await batch.commit();
}

export async function deletePersonalReportTemplate(templateId: string, uid: string): Promise<void> {
  const ref = doc(db, "staffReportTemplates", templateId);
  const existing = await getDoc(ref);
  if (!existing.exists()) return;
  if (existing.data().ownerUid !== uid) throw new Error("You can only delete your own templates.");
  // Keep the library-index ID so drafts already snapshotting this template can still be submitted.
  await deleteDoc(ref);
}

export async function saveSharedReportTemplate(template: SharedReportTemplate, adminUid: string): Promise<void> {
  const ref = doc(db, "reportTemplates", template.id);
  const existing = await getDoc(ref);
  await setDoc(ref, { ...template, createdBy: existing.exists() ? (existing.data().createdBy || adminUid) : adminUid, updatedBy: adminUid, updatedAt: serverTimestamp(), ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}) }, { merge: true });
}

export async function fetchReportTemplateAssignment(uid: string): Promise<ReportTemplateAssignment | null> {
  const snap = await getDoc(doc(db, "reportTemplateAssignments", uid));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as ReportTemplateAssignment) : null;
}

export async function saveReportTemplateAssignment(uid: string, templateIds: string[], adminUid: string): Promise<void> {
  const uniqueTemplateIds = Array.from(new Set(templateIds));
  const templateRows = await Promise.all(uniqueTemplateIds.map((templateId) => getDoc(doc(db, "reportTemplates", templateId))));
  const applicationTemplateIds = templateRows.filter((row) => row.exists() && row.data().kind === "APPLICATION").map((row) => row.id);
  await setDoc(doc(db, "reportTemplateAssignments", uid), { uid, templateIds: uniqueTemplateIds, applicationTemplateIds, updatedBy: adminUid, updatedAt: serverTimestamp() }, { merge: true });
}

export async function saveAssignedWeeklyReportDraft(report: WeeklyReport & { selectedTemplates: SelectedReportTemplate[] }, isAdmin = false): Promise<void> {
  if (report.selectedTemplates.length > 5) throw new Error("Choose no more than five report templates for one week.");
  if (new Set(report.selectedTemplates.map((item) => item.templateId)).size !== report.selectedTemplates.length) throw new Error("A template can only be selected once per weekly report.");
  const assignment = await fetchReportTemplateAssignment(report.userId);
  const allowedTemplateIds = new Set([...(assignment?.templateIds || []), ...(assignment?.personalTemplateIds || [])]);
  if (!isAdmin && report.selectedTemplates.some((item) => !allowedTemplateIds.has(item.templateId))) throw new Error("One or more selected templates are not in this account's template library.");
  const ref = doc(db, "weeklyReports", report.id);
  const { selectedTemplates, ...legacySafeData } = report;
  const normalizedTemplates = selectedTemplates.map((item) => ({ ...item, metricIds: item.metrics.map((metric) => metric.id) }));
  await setDoc(ref, { ...legacySafeData, selectedTemplatesById: Object.fromEntries(normalizedTemplates.map((item) => [item.templateId, item])), updatedAt: serverTimestamp() }, { merge: true });
}

export async function submitAssignedWeeklyReport(reportId: string, selectedTemplates: SelectedReportTemplate[]): Promise<void> {
  if (selectedTemplates.length > 5) throw new Error("Choose no more than five report templates for one week.");
  if (selectedTemplates.filter((item) => item.templateSnapshot.kind === "APPLICATION").length > 1) throw new Error("Choose only one Application template for one week.");
  const application = selectedTemplates.find((item) => item.templateSnapshot.kind === "APPLICATION");
  if (application) {
    const validation = validateApplicationCounts(application.values, application.metrics);
    if (!validation.valid) throw new Error(`Application counts are not valid: ${validation.errors.join(" ")}`);
  }
  const normalizedTemplates = selectedTemplates.map((item) => ({ ...item, metricIds: item.metrics.map((metric) => metric.id) }));
  await setDoc(doc(db, "weeklyReports", reportId), { selectedTemplatesById: Object.fromEntries(normalizedTemplates.map((item) => [item.templateId, item])), status: "SUBMITTED", submittedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
}

function normalizeWeeklyReport(id: string, data: Record<string, any>): WeeklyReport {
  const selectedTemplates = data.selectedTemplates || (data.selectedTemplatesById ? Object.values(data.selectedTemplatesById) : undefined);
  return { id, ...data, ...(selectedTemplates ? { selectedTemplates } : {}) } as WeeklyReport;
}

/**
 * Fetches the global admin required template sections.
 */
export async function fetchGlobalAdminTemplate(): Promise<ReportSectionDef[]> {
  try {
    const docRef = doc(db, "reportTemplates", GLOBAL_ADMIN_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ReportTemplate;
      return data.sections || [];
    }
  } catch (err) {
    console.warn("Could not fetch global admin template:", err);
  }

  return [];
}

/**
 * Saves the global admin template sections.
 */
export async function saveGlobalAdminTemplate(
  sections: ReportSectionDef[],
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, "reportTemplates", GLOBAL_ADMIN_DOC_ID);
  await setDoc(
    docRef,
    {
      userId: null,
      sections: sections.map((sec) => ({ ...sec, isRequired: true })),
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}

/**
 * Fetches a user's personal custom template sections.
 */
export async function fetchUserTemplate(userId: string): Promise<ReportSectionDef[]> {
  try {
    const docRef = doc(db, "reportTemplates", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as ReportTemplate;
      return data.sections || [];
    }
  } catch (err) {
    console.warn(`Could not fetch template for user ${userId}:`, err);
  }
  return [];
}

/**
 * Saves a user's personal custom template sections.
 */
export async function saveUserTemplate(
  userId: string,
  sections: ReportSectionDef[],
  updatedBy: string
): Promise<void> {
  const docRef = doc(db, "reportTemplates", userId);
  await setDoc(
    docRef,
    {
      userId,
      sections: sections.map((sec) => ({ ...sec, isRequired: false })),
      updatedAt: serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );
}

/**
 * Fetches and merges global admin required sections with user's personal sections.
 */
export async function fetchMergedTemplate(userId: string): Promise<ReportSectionDef[]> {
  const [globalSections, userSections] = await Promise.all([
    fetchGlobalAdminTemplate(),
    fetchUserTemplate(userId),
  ]);
  return mergeTemplates(globalSections, userSections);
}

/**
 * Computes a unique canonical document ID for a report by user, year, week, and category.
 */
export function getReportDocId(
  userId: string,
  year: number,
  weekNumber: number,
  category: string = "General Operations"
): string {
  const catSlug = category.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `${userId}_${year}_W${String(weekNumber).padStart(2, "0")}_${catSlug}`;
}

/**
 * Fetches a specific weekly report for a user by year, weekNumber, and report category.
 */
export async function fetchWeeklyReport(
  userId: string,
  year: number,
  weekNumber: number,
  category: string = "General Operations"
): Promise<WeeklyReport | null> {
  const docId = getReportDocId(userId, year, weekNumber, category);
  try {
    const docRef = doc(db, "weeklyReports", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeWeeklyReport(snap.id, snap.data());
    }
  } catch (err) {
    console.warn(`Could not fetch weekly report ${docId}:`, err);
  }
  return null;
}

/**
 * Saves a draft weekly report.
 */
export async function saveWeeklyReportDraft(
  reportData: Partial<WeeklyReport> & { id: string; userId: string; year: number; weekNumber: number }
): Promise<void> {
  const docRef = doc(db, "weeklyReports", reportData.id);
  await setDoc(
    docRef,
    {
      ...reportData,
      status: reportData.status || "DRAFT",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Submits a weekly report, freezing its current merged template as snapshotTemplate.
 */
export async function submitWeeklyReport(
  reportId: string,
  snapshotTemplate: ReportSectionDef[],
  data: Record<string, any[]>,
  totals: Record<string, Record<string, number>>
): Promise<void> {
  const docRef = doc(db, "weeklyReports", reportId);
  await setDoc(
    docRef,
    {
      status: "SUBMITTED",
      submittedAt: serverTimestamp(),
      snapshotTemplate,
      data,
      totals,
    },
    { merge: true }
  );
}

/**
 * Fetches all weekly reports for a user across history.
 */
export async function fetchUserWeeklyReportsHistory(userId: string): Promise<WeeklyReport[]> {
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  try {
    const q = query(collection(db, "weeklyReports"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const reports = snap.docs.map((row) => normalizeWeeklyReport(row.id, row.data()));
    return reports.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  } catch (err) {
    console.warn(`Could not fetch weekly history for user ${userId}:`, err);
    return [];
  }
}

/**
 * Fetches or compiles a MonthlyPackage document for a user with freshness validation.
 */
export async function fetchOrCompileMonthlyPackage(
  userId: string,
  userName: string,
  year: number,
  month: number
): Promise<MonthlyPackage> {
  const { compileMonthlyPackage } = await import("@/lib/reportingUtils");
  const docId = `${userId}_${year}_M${String(month).padStart(2, "0")}`;

  const history = await fetchUserWeeklyReportsHistory(userId);
  const compiled = compileMonthlyPackage(userId, userName, year, month, history);

  try {
    const docRef = doc(db, "monthlyPackages", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cached = { id: snap.id, ...snap.data() } as MonthlyPackage;
      const cachedIds = (cached.includedWeeklyReportIds || []).slice().sort().join(",");
      const freshIds = compiled.includedWeeklyReportIds.slice().sort().join(",");
      const compiledHasTemplateMetrics = Object.keys(compiled.templateMetricSummaries || {}).length > 0;
      const cachedHasTemplateMetrics = Object.keys(cached.templateMetricSummaries || {}).length > 0;
      if (cachedIds === freshIds && compiledHasTemplateMetrics === cachedHasTemplateMetrics) {
        return cached;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch cached monthly package ${docId}:`, err);
  }

  if (compiled.includedWeeklyReportIds.length > 0) {
    try {
      const docRef = doc(db, "monthlyPackages", docId);
      await setDoc(docRef, { ...compiled, compiledAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.warn("Could not cache compiled monthly package:", e);
    }
  }

  return compiled;
}

/**
 * Fetches all compiled monthly packages for a user.
 */
export async function fetchUserMonthlyPackagesHistory(userId: string): Promise<MonthlyPackage[]> {
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  try {
    const q = query(collection(db, "monthlyPackages"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const packages = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MonthlyPackage));
    return packages.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  } catch (err) {
    console.warn(`Could not fetch monthly packages history for user ${userId}:`, err);
    return [];
  }
}

/**
 * Grants a late submission unlock for a staff member for a specific week.
 */
export async function grantLateUnlock(
  userId: string,
  year: number,
  weekNumber: number,
  adminUid: string
): Promise<void> {
  const weekIdentifier = `${year}_W${String(weekNumber).padStart(2, "0")}`;
  const requestId = `${userId}_${weekIdentifier}`;
  const docRef = doc(db, "lateUnlockRequests", requestId);

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await setDoc(
    docRef,
    {
      userId,
      weekIdentifier,
      grantedBy: adminUid,
      grantedAt: serverTimestamp(),
      expiresAt,
      status: "ACTIVE",
    },
    { merge: true }
  );

  const reportDocId = getReportDocId(userId, year, weekNumber);
  const reportRef = doc(db, "weeklyReports", reportDocId);
  await setDoc(reportRef, { status: "LATE_UNLOCKED", updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Fetches all weekly report submissions for a specific week across all staff.
 */
export async function fetchAllWeeklyReportsForWeek(
  year: number,
  weekNumber: number
): Promise<WeeklyReport[]> {
  const { collection, query, where, getDocs } = await import("firebase/firestore");
  try {
    const q = query(
      collection(db, "weeklyReports"),
      where("year", "==", year),
      where("weekNumber", "==", weekNumber)
    );
    const snap = await getDocs(q);
    return snap.docs.map((row) => normalizeWeeklyReport(row.id, row.data()));
  } catch (err) {
    console.warn(`Could not fetch all weekly reports for ${year} W${weekNumber}:`, err);
    return [];
  }
}
