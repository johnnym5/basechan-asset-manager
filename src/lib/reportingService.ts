import { db } from "@/lib/firebase";
import { mergeTemplates } from "@/lib/reportingUtils";
import { MonthlyPackage, ReportSectionDef, ReportTemplate, WeeklyReport } from "@/types/reporting";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const GLOBAL_ADMIN_DOC_ID = "global_admin";

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
    console.warn("Could not fetch global admin template, returning fallback defaults:", err);
  }

  // Fallback default mandatory global sections for Basechan Study Abroad Agency
  const DEFAULT_AGGREGATOR_LIST = [
    "SI - UK",
    "EDVOY",
    "UAP",
    "York St'John",
    "AIMS EDUCATION",
    "STUDY NOW",
    "SUNDERLAND",
    "ASTON LONDON",
    "HULL LONDON",
    "CRIZAC",
  ];

  const standardColumns: ReportSectionDef["columns"] = [
    { key: "aggregator", label: "Aggregator / Partner", type: "text" },
    { key: "applications", label: "No of Application", type: "number", isCalculatedTotal: true },
    { key: "awaiting_offer", label: "Awaiting Offer", type: "number", isCalculatedTotal: true },
    { key: "conditional_offer", label: "Conditional Offer", type: "number", isCalculatedTotal: true },
    { key: "unconditional_offer", label: "Unconditional Offer", type: "number", isCalculatedTotal: true },
  ];

  return [
    {
      id: "sec_b2c_aggregators",
      title: "Aggregator Performance (DIRECT - B2C)",
      isRequired: true,
      columns: standardColumns,
      defaultRows: DEFAULT_AGGREGATOR_LIST.map((name) => ({
        aggregator: name,
        applications: "",
        awaiting_offer: "",
        conditional_offer: "",
        unconditional_offer: "",
      })),
    },
    {
      id: "sec_b2b_aggregators",
      title: "Aggregator Performance (B2B)",
      isRequired: true,
      columns: standardColumns,
      defaultRows: DEFAULT_AGGREGATOR_LIST.map((name) => ({
        aggregator: name,
        applications: "",
        awaiting_offer: "",
        conditional_offer: "",
        unconditional_offer: "",
      })),
    },
  ];
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
 * Fetches a specific weekly report for a user by year and weekNumber.
 */
export async function fetchWeeklyReport(
  userId: string,
  year: number,
  weekNumber: number
): Promise<WeeklyReport | null> {
  const docId = `${userId}_${year}_W${String(weekNumber).padStart(2, "0")}`;
  try {
    const docRef = doc(db, "weeklyReports", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as WeeklyReport;
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
    const reports = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WeeklyReport));
    return reports.sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate));
  } catch (err) {
    console.warn(`Could not fetch weekly history for user ${userId}:`, err);
    return [];
  }
}

/**
 * Fetches or compiles a MonthlyPackage document for a user.
 */
export async function fetchOrCompileMonthlyPackage(
  userId: string,
  userName: string,
  year: number,
  month: number
): Promise<MonthlyPackage> {
  const { compileMonthlyPackage } = await import("@/lib/reportingUtils");
  const docId = `${userId}_${year}_M${String(month).padStart(2, "0")}`;
  try {
    const docRef = doc(db, "monthlyPackages", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as MonthlyPackage;
    }
  } catch (err) {
    console.warn(`Could not fetch monthly package ${docId}:`, err);
  }

  // Compile on-demand from weekly reports history
  const history = await fetchUserWeeklyReportsHistory(userId);
  const compiled = compileMonthlyPackage(userId, userName, year, month, history);

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

  // Expiration set to 24 hours from grant time
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

  // Also update report status if document exists
  const reportDocId = `${userId}_${weekIdentifier}`;
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
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as WeeklyReport));
  } catch (err) {
    console.warn(`Could not fetch all weekly reports for ${year} W${weekNumber}:`, err);
    return [];
  }
}
