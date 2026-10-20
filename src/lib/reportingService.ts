import { db } from "@/lib/firebase";
import { mergeTemplates } from "@/lib/reportingUtils";
import { ReportSectionDef, ReportTemplate } from "@/types/reporting";
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

  // Fallback default mandatory global sections if not yet initialized in Firestore
  return [
    {
      id: "sec_weekly_goals",
      title: "Weekly Key Deliverables & Targets",
      isRequired: true,
      columns: [
        { key: "deliverable", label: "Deliverable / Task Name", type: "text" },
        { key: "target_qty", label: "Target Qty", type: "number", isCalculatedTotal: true },
        { key: "achieved_qty", label: "Achieved Qty", type: "number", isCalculatedTotal: true },
        { key: "notes", label: "Status & Notes", type: "text" },
      ],
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
