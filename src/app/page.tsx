"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, TabKey } from "@/components/layout/Sidebar";
import { OverviewTab } from "@/components/dashboard/OverviewTab";
import { HardwareTab } from "@/components/dashboard/HardwareTab";
import { MissingDetailsTab } from "@/components/dashboard/MissingDetailsTab";
import { CredentialsTab } from "@/components/dashboard/CredentialsTab";
import { WorkbooksTab } from "@/components/dashboard/WorkbooksTab";
import { FacilitiesTab } from "@/components/dashboard/FacilitiesTab";
import { StaffDirectoryTab } from "@/components/dashboard/StaffDirectoryTab";
import { IngestionTab } from "@/components/dashboard/IngestionTab";
import { AuthLoadingScreen, DashboardSkeleton } from "@/components/ui/LoadingStates";

import { PhysicalAsset, StaffMember, DigitalCredential, WorkbookDocument, FacilityItem, WorkspaceLink } from "@/types/assets";
import { auditAllAssets } from "@/lib/completenessAuditor";
import { excludeArchived } from "@/lib/accessControl";
import { ParsedWorkbookData } from "@/lib/excelParser";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, updateDoc, writeBatch, serverTimestamp, query, where, setDoc, onSnapshot, deleteField } from "firebase/firestore";
import { ShieldAlert, LogIn } from "lucide-react";
import { addDoc, runTransaction, Timestamp } from "firebase/firestore";
import { deleteField as firestoreDeleteField } from "firebase/firestore";
import { StocktakeTab } from "@/components/dashboard/StocktakeTab";
import { TaskInboxTab } from "@/components/dashboard/TaskInboxTab";
import { WorkspaceTab } from "@/components/dashboard/WorkspaceTab";
import { InboxTask, StocktakeItem, StocktakeRound } from "@/types/assets";
import { listPendingAssetUpdates, queueAssetUpdate, flushAssetUpdates, retryAssetUpdate, cacheAssignedAssets, readCachedAssignedAssets, PendingAssetUpdate, listPendingRepairRequests, queueRepairRequest, flushRepairRequests, retryRepairRequest, PendingRepairRequest } from "@/lib/offlineAssetQueue";

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const records = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => records.set(item.id, { ...records.get(item.id), ...item }));
  return Array.from(records.values());
}
import { AccessGrant, ResourceKey } from "@/types/assets";
import { AccessGrantModal } from "@/components/modals/AccessGrantModal";
import { RecordEditorModal, RecordField } from "@/components/modals/RecordEditorModal";
import { buildActivityLog } from "@/lib/activityLog";
import { accessiblePages } from "@/lib/accessControl";
import { PersonalHomeTab } from "@/components/dashboard/PersonalHomeTab";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";

export default function Home() {
  const { userProfile, loading: authLoading, error: authError, signInWithGoogle, signInWithEmulatorAccount, signOutUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [hardwareStaffFilter, setHardwareStaffFilter] = useState<StaffMember | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Core Data States
  const [assets, setAssets] = useState<PhysicalAsset[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [credentials, setCredentials] = useState<DigitalCredential[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookDocument[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [accessGrants, setAccessGrants] = useState<Record<string, AccessGrant>>({});
  const [grantTarget, setGrantTarget] = useState<StaffMember | null>(null);
  const [grantLookupError, setGrantLookupError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ resource: ResourceKey; record: any | null; ids?: string[] } | null>(null);
  const [pageShowArchived, setPageShowArchived] = useState<Record<string, boolean>>({});
  const [stocktakeRounds, setStocktakeRounds] = useState<StocktakeRound[]>([]);
  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>([]);
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [offlineUpdates, setOfflineUpdates] = useState<PendingAssetUpdate[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineRepairs, setOfflineRepairs] = useState<PendingRepairRequest[]>([]);
  const [workspaceLinks, setWorkspaceLinks] = useState<WorkspaceLink[]>([]);
  const [workspaceFavorites, setWorkspaceFavorites] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomePromptedUid, setWelcomePromptedUid] = useState<string | null>(null);
  const [emulatorEmail, setEmulatorEmail] = useState("");
  const [emulatorPassword, setEmulatorPassword] = useState("");

  // Load only authenticated Firestore data. Staff collection queries are constrained
  // to records allowed by the Firestore security rules.
  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!userProfile) {
        if (active) {
          setAssets([]); setStaff([]); setCredentials([]); setWorkbooks([]); setFacilities([]);
          setWorkspaceLinks([]);
          setDataError(null);
          setDataLoading(false);
        }
        return;
      }
      setDataLoading(true);
      setDataError(null);
      try {
        const isAdmin = userProfile.role === "SUPER_ADMIN";
        if (!navigator.onLine && !isAdmin) setAssets(await readCachedAssignedAssets(userProfile.uid));
        const queryErrors: string[] = [];
        const safeGet = (label: string, promise: Promise<any>) => promise.catch((error) => {
          const detail = error instanceof Error ? error.message : "Permission denied or request failed.";
          console.error(`${label} query failed:`, error);
          queryErrors.push(`${label}: ${detail}`);
          return { docs: [] };
        });
        const grantsSnap = isAdmin
          ? await getDocs(collection(db, "access_grants"))
          : await getDoc(doc(db, "access_grants", userProfile.uid));
        const grantDocuments: any[] = isAdmin ? (grantsSnap as any).docs : (grantsSnap as any).exists() ? [grantsSnap] : [];
        const grantsByUser = new Map(grantDocuments.map((row: any) => [row.id, row.data()]));
        const grant = grantsByUser.get(userProfile.uid) as AccessGrant | undefined;
        const staffSnap = !isAdmin
          ? await safeGet("Own staff record", getDocs(query(collection(db, "staff_inventory"), where("email", "==", userProfile.email.toLowerCase()))))
          : null;
        const ownStaffRecord = (staffSnap as any)?.docs?.[0];
        const ownStaff = ownStaffRecord ? { id: ownStaffRecord.id, ...ownStaffRecord.data() } as StaffMember : null;
        const scopedQueries = (resource: ResourceKey, collectionName: string, own: any[]) => {
          if (isAdmin) return [getDocs(collection(db, collectionName))];
          const config = grant?.grants?.[resource];
          if (!config?.actions?.includes("read")) return own;
          if (config.scope === "all") return [getDocs(collection(db, collectionName))];
          if (config.scope === "branch") {
            if (resource === "workbooks") return [getDocs(query(collection(db, collectionName), where("department", "==", grant?.department || userProfile.department)))];
            const fields: Record<string, string> = { physical_assets: "branch", staff_inventory: "branch", digital_credentials: "assignedUserBranch", facilities: "branch" };
            return [...own, getDocs(query(collection(db, collectionName), where(fields[resource], "==", grant?.branch || userProfile.branch || "")))];
          }
          if (resource === "physical_assets" && ownStaff) {
            return [...own,
              getDocs(query(collection(db, collectionName), where("assignedStaff", "==", ownStaff.name))),
              ...(ownStaff.email ? [getDocs(query(collection(db, collectionName), where("assignedStaffEmail", "==", ownStaff.email.toLowerCase())))] : []),
            ];
          }
          const assignment: Record<string, string> = { physical_assets: "assignedStaffEmail", staff_inventory: "email", digital_credentials: "assignedUserEmail", workbooks: "primaryOwnerEmail", facilities: "assignedOrSharedEmail" };
          const email = userProfile.email;
          return [...own, getDocs(query(collection(db, collectionName), where(assignment[resource], "==", email)))];
        };
        const assetQueries = scopedQueries("physical_assets", "physical_assets", [
          getDocs(query(collection(db, "physical_assets"), where("assignedStaffEmail", "==", userProfile.email.toLowerCase()))),
          getDocs(query(collection(db, "physical_assets"), where("assignedStaffUid", "==", userProfile.uid))),
        ]);
        const credentialQueries = scopedQueries("digital_credentials", "digital_credentials", [
          getDocs(query(collection(db, "digital_credentials"), where("assignedUserEmail", "==", userProfile.email))),
          getDocs(query(collection(db, "digital_credentials"), where("assignedUserUid", "==", userProfile.uid))),
        ]);
        const staffQueries = scopedQueries("staff_inventory", "staff_inventory", []);
        const workbookQueries = scopedQueries("workbooks", "workbooks", []);
        const facilityQueries = scopedQueries("facilities", "facilities", []);
        const workspaceQueries = isAdmin
          ? [getDocs(collection(db, "workspace_links"))]
          : [
              getDocs(query(collection(db, "workspace_links"), where("audience", "==", "all"), where("archived", "==", false))),
              getDocs(query(collection(db, "workspace_links"), where("audience", "==", "selected"), where("assignedUids", "array-contains", userProfile.uid), where("archived", "==", false))),
            ];

        const [assetSnaps, staffSnaps, credentialSnaps, wbSnaps, facSnaps, usersSnap, roundSnap, itemSnap, taskSnap, workspaceSnaps] = await Promise.all([
          Promise.all(assetQueries.map((promise, index) => safeGet(`Assets (${index + 1})`, promise))),
          Promise.all(staffQueries.map((promise, index) => safeGet(`Staff (${index + 1})`, promise))),
          Promise.all(credentialQueries.map((promise, index) => safeGet(`Credentials (${index + 1})`, promise))),
          Promise.all(workbookQueries.map((promise, index) => safeGet(`Workbooks (${index + 1})`, promise))),
          Promise.all(facilityQueries.map((promise, index) => safeGet(`Facilities (${index + 1})`, promise))),
          isAdmin ? safeGet("User profiles", getDocs(collection(db, "users"))) : Promise.resolve({ docs: [] }),
          isAdmin ? safeGet("Stocktake rounds", getDocs(collection(db, "stocktake_rounds"))) : safeGet("Assigned stocktake rounds", getDocs(query(collection(db, "stocktake_rounds"), where("assignedUids", "array-contains", userProfile.uid)))),
          isAdmin ? safeGet("Stocktake items", getDocs(collection(db, "stocktake_items"))) : safeGet("Assigned stocktake items", getDocs(query(collection(db, "stocktake_items"), where("assignedUid", "==", userProfile.uid)))),
          isAdmin ? safeGet("Tasks", getDocs(collection(db, "tasks"))) : safeGet("Assigned tasks", getDocs(query(collection(db, "tasks"), where("assignedToUid", "==", userProfile.uid)))),
          Promise.all(workspaceQueries.map((promise, index) => safeGet(`Workspace links (${index + 1})`, promise))),
        ]);

        if (!active) return;

        const uniqueDocs = <T,>(snaps: any[]) => Array.from(
          new Map(
            (snaps || [])
              .flatMap((s) => s?.docs || [])
              .map((d) => [d.id, { id: d.id, ...d.data() } as T])
          ).values()
        );

        const loadedAssets = uniqueDocs<PhysicalAsset>(assetSnaps);
        setAssets(loadedAssets);
        if (!isAdmin) await cacheAssignedAssets(userProfile.uid, loadedAssets.filter((asset) => asset.assignedStaffUid === userProfile.uid || asset.assignedStaffEmail?.toLowerCase() === userProfile.email.toLowerCase()));
        const usersByEmail = new Map<string, string>(((usersSnap as any)?.docs || []).map((d: any) => [String(d.data().email || "").toLowerCase(), String(d.id)] as [string, string]));
        setStaff(uniqueDocs<StaffMember>(staffSnaps).map((row) => ({ ...row, uid: usersByEmail.get(String(row.email || "").toLowerCase()) })));
        setCredentials(uniqueDocs<DigitalCredential>(credentialSnaps).map(({ rawPass: _secret, ...metadata }) => metadata));
        setWorkbooks(uniqueDocs<WorkbookDocument>(wbSnaps));
        setFacilities(uniqueDocs<FacilityItem>(facSnaps));
        setAccessGrants(Object.fromEntries(grantDocuments.map((d: any) => [d.id, { uid: d.id, ...d.data() } as AccessGrant])));
        setStocktakeRounds(((roundSnap as any)?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as StocktakeRound)));
        setStocktakeItems(((itemSnap as any)?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as StocktakeItem)));
        setTasks(((taskSnap as any)?.docs || []).map((d: any) => ({ id: d.id, ...d.data() } as InboxTask)));
        setWorkspaceLinks(uniqueDocs<WorkspaceLink>(workspaceSnaps));
        const credentialPermissionIssue = queryErrors.some((message) => message.startsWith("Credentials") && message.toLowerCase().includes("permission"));
        setDataError(queryErrors.length ? `${queryErrors.join(" · ")}${credentialPermissionIssue ? " Legacy credential secrets may need migration by an administrator before staff can read those records." : ""}` : null);
      } catch (err) {
        if (!active) return;
        console.error("Data loading error:", err);
        setDataError(!navigator.onLine ? "Offline mode · showing your last cached assigned assets. Changes will sync when you reconnect." : err instanceof Error ? err.message : "Unable to load live Firestore data. Check your connection and permissions.");
      } finally {
        if (active) setDataLoading(false);
      }
    }

    loadData();
    return () => { active = false; };
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    const refresh = async () => { setOfflineUpdates(await listPendingAssetUpdates(userProfile.uid)); setOfflineRepairs(await listPendingRepairRequests(userProfile.uid)); };
    const online = async () => {
      setIsOnline(true);
      try {
        setOfflineUpdates(await flushAssetUpdates(userProfile.uid, userProfile));
        setOfflineRepairs(await flushRepairRequests(userProfile.uid, userProfile));
        const refreshedTasks = userProfile.role === "SUPER_ADMIN"
          ? await getDocs(collection(db, "tasks"))
          : await getDocs(query(collection(db, "tasks"), where("assignedToUid", "==", userProfile.uid)));
        setTasks(refreshedTasks.docs.map((row) => ({ id: row.id, ...row.data() } as InboxTask)));
        const refreshedAssets = await Promise.all([
          getDocs(query(collection(db, "physical_assets"), where("assignedStaffUid", "==", userProfile.uid))),
          getDocs(query(collection(db, "physical_assets"), where("assignedStaffEmail", "==", userProfile.email.toLowerCase()))),
        ]);
        setAssets((current) => mergeById(current, refreshedAssets.flatMap((snapshot) => snapshot.docs.map((row) => ({ id: row.id, ...row.data() } as PhysicalAsset)))));
      } catch (error) {
        console.error("Offline sync or refresh failed:", error);
      }
    };
    const offline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    void refresh();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) { setWorkspaceFavorites([]); return; }
    return onSnapshot(doc(db, "workspace_favorites", userProfile.uid), (snapshot) => {
      setWorkspaceFavorites(snapshot.exists() && Array.isArray(snapshot.data().linkIds) ? snapshot.data().linkIds : []);
    }, (error) => console.error("Could not sync workspace favourites:", error));
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile || userProfile.role !== "STAFF") return;
    return onSnapshot(doc(db, "access_grants", userProfile.uid), (snapshot) => {
      setAccessGrants((previous) => ({ ...previous, [userProfile.uid]: snapshot.exists() ? ({ uid: userProfile.uid, ...snapshot.data() } as AccessGrant) : { uid: userProfile.uid, email: userProfile.email, grants: {} } }));
    });
  }, [userProfile]);

  const currentGrant = userProfile ? accessGrants[userProfile.uid] : undefined;
  const accessibleTabs = useMemo(
    () => userProfile ? accessiblePages(userProfile, currentGrant, stocktakeRounds.some((round) => round.assignedUids?.includes(userProfile.uid))) : null,
    [userProfile, currentGrant, stocktakeRounds],
  );
  const navigateToTab = (tab: TabKey) => {
    if (accessibleTabs?.[tab]) setActiveTab(tab);
  };

  useEffect(() => {
    if (accessibleTabs && !accessibleTabs[activeTab]) setActiveTab("overview");
  }, [accessibleTabs, activeTab]);

  useEffect(() => {
    if (!userProfile) {
      setShowWelcome(false);
      setWelcomePromptedUid(null);
      return;
    }
    if (!dataLoading && !userProfile.onboardingCompletedAt && welcomePromptedUid !== userProfile.uid) {
      setWelcomePromptedUid(userProfile.uid);
      setShowWelcome(true);
    }
  }, [userProfile, dataLoading, welcomePromptedUid]);

  const completeOnboarding = async () => {
    if (!userProfile) throw new Error("Sign in again to save your welcome progress.");
    await setDoc(doc(db, "users", userProfile.uid), { onboardingCompletedAt: serverTimestamp() }, { merge: true });
  };
  const recordsByResource: Record<ResourceKey, any[]> = { staff_inventory: staff, physical_assets: assets, digital_credentials: credentials, workbooks, facilities };
  const setRecordsByResource: Record<ResourceKey, (rows: any[]) => void> = { staff_inventory: setStaff, physical_assets: setAssets, digital_credentials: setCredentials, workbooks: setWorkbooks, facilities: setFacilities };
  const saveRecords = async (resource: ResourceKey, ids: string[], patch: Record<string, any>, creating = false) => {
    const rows = recordsByResource[resource];
    const targets = creating ? [null] : ids.map((id) => rows.find((row) => row.id === id)).filter(Boolean);
    const results = await Promise.allSettled(targets.map(async (row, index) => {
      const id = row?.id || `${resource.slice(0, 3).toUpperCase()}-${Date.now()}-${index}`;
      const values = { ...patch };
      if (resource === "physical_assets" && values.assignedStaffEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedStaffEmail).toLowerCase());
        if (assignee) {
          values.assignedStaffUid = assignee.uid || "";
          values.assignedStaff = values.assignedStaff || assignee.name;
          values.assignedStaffBranch = assignee.branch;
        }
      }
      if (resource === "digital_credentials" && values.assignedUserEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedUserEmail).toLowerCase());
        if (assignee) values.assignedUserUid = assignee.uid || "";
      }
      if (resource === "physical_assets" && values.assignedStaffEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedStaffEmail).toLowerCase());
        if (assignee) {
          values.assignedStaffUid = assignee.uid || "";
          values.assignedStaff = values.assignedStaff || assignee.name;
          values.assignedStaffBranch = assignee.branch;
        }
      }
      if (resource === "digital_credentials" && values.assignedUserEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedUserEmail).toLowerCase());
        if (assignee) values.assignedUserUid = assignee.uid || "";
      }
      if (resource === "physical_assets" && values.assignedStaffEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedStaffEmail).toLowerCase());
        if (assignee) {
          values.assignedStaffUid = assignee.uid || "";
          values.assignedStaff = values.assignedStaff || assignee.name;
          values.assignedStaffBranch = assignee.branch;
        }
      }
      if (resource === "digital_credentials" && values.assignedUserEmail) {
        const assignee = staff.find((person) => person.email.toLowerCase() === String(values.assignedUserEmail).toLowerCase());
        if (assignee) values.assignedUserUid = assignee.uid || "";
      }
      const secret = resource === "digital_credentials" ? values.rawPass : undefined;
      delete values.rawPass;
      const value = { ...values, updatedAt: serverTimestamp(), ...(creating ? { createdAt: serverTimestamp(), archived: false } : {}) };
      const logRef = doc(collection(db, "audit_logs"));
      const activity = buildActivityLog(userProfile!, { resource, action: creating ? "CREATE" : "UPDATE", id, record: { ...(row || {}), ...values }, before: row, after: { ...(row || {}), ...values } });
      if (resource === "digital_credentials") {
        const batch = writeBatch(db);
        batch.set(doc(db, resource, id), value, { merge: !creating });
        if (typeof secret === "string" && secret.length) batch.set(doc(db, "credential_secrets", id), { secret, updatedAt: serverTimestamp() }, { merge: true });
        batch.set(logRef, { ...activity, timestamp: serverTimestamp() });
        await batch.commit();
      } else {
        const batch = writeBatch(db);
        if (creating) batch.set(doc(db, resource, id), value);
        else batch.update(doc(db, resource, id), value);
        batch.set(logRef, { ...activity, timestamp: serverTimestamp() });
        await batch.commit();
      }
      return { id, value };
    }));
    const saved = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (saved.length) setRecordsByResource[resource]([...rows.filter((row) => !saved.some((item) => item.id === row.id)), ...saved.map(({ id }) => ({ ...(rows.find((row) => row.id === id) || {}), ...patch, id, updatedAt: new Date().toISOString() }))]);
    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) throw new Error(`${saved.length} saved; ${failed.length} failed. Failed rows remain selected. ${failed[0].reason instanceof Error ? failed[0].reason.message : "Check access and try again."}`);
  };
  const archiveRecords = async (resource: ResourceKey, ids: string[], archived: boolean) => {
    const rows = recordsByResource[resource];
    const results = await Promise.allSettled(ids.map(async (id) => {
      const row = rows.find((item) => item.id === id);
      if (!row || !userProfile) throw new Error("Record or user profile is unavailable.");
      const batch = writeBatch(db);
      batch.update(doc(db, resource, id), { archived, archivedAt: archived ? serverTimestamp() : deleteField(), archivedBy: archived ? userProfile.uid : deleteField(), updatedAt: serverTimestamp() });
      const activity = buildActivityLog(userProfile, { resource, action: archived ? "ARCHIVE" : "RESTORE", id, record: row, before: row, after: { ...row, archived } });
      batch.set(doc(collection(db, "audit_logs")), { ...activity, timestamp: serverTimestamp() });
      await batch.commit();
    }));
    const savedIds = ids.filter((_, index) => results[index].status === "fulfilled");
    setRecordsByResource[resource](rows.map((row) => savedIds.includes(row.id) ? { ...row, archived, archivedAt: archived ? new Date().toISOString() : undefined, archivedBy: archived ? userProfile?.uid : undefined } : row));
    const failed = ids.length - savedIds.length;
    if (failed) throw new Error(`${savedIds.length} ${archived ? "archived" : "restored"}; ${failed} failed. Failed rows remain selected.`);
  };
  const saveAccessGrant = async (grant: AccessGrant) => {
    if (!userProfile) throw new Error("Sign in to update access permissions.");
    const batch = writeBatch(db);
    batch.set(doc(db, "access_grants", grant.uid), { ...grant, updatedAt: serverTimestamp(), updatedBy: userProfile.uid }, { merge: true });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "access_grants", action: "UPDATE_ACCESS", id: grant.uid, record: { name: grant.email }, details: `${userProfile.displayName} updated access permissions for ${grant.email}` }), timestamp: serverTimestamp() });
    await batch.commit();
    setAccessGrants((previous) => ({ ...previous, [grant.uid]: grant }));
  };

  const handleManageAccess = async (person: StaffMember) => {
    setGrantLookupError(null);
    if (person.uid) { setGrantTarget(person); return; }
    if (!person.email?.trim()) {
      setGrantLookupError(`Cannot assign account-specific access to ${person.name}: this staff record has no email address.`);
      return;
    }
    try {
      const profileSnapshot = await getDocs(query(collection(db, "users"), where("email", "==", person.email.trim().toLowerCase())));
      const matchedProfile = profileSnapshot.docs[0];
      if (!matchedProfile) {
        setGrantLookupError(`No Firebase profile was found for ${person.email}. Ask them to sign out and sign in with that exact Google account, then retry.`);
        return;
      }
      const resolved = { ...person, uid: matchedProfile.id };
      setStaff((rows) => rows.map((row) => row.id === person.id ? resolved : row));
      setGrantTarget(resolved);
    } catch (error) {
      setGrantLookupError(`Could not look up the Firebase account for ${person.email}. ${error instanceof Error ? error.message : "Check administrator permissions and retry."}`);
    }
  };

  const toggleWorkspaceFavorite = async (linkId: string) => {
    if (!userProfile || !workspaceLinks.some((link) => link.id === linkId && !link.archived)) throw new Error("This workspace link is no longer available.");
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, "workspace_favorites", userProfile.uid);
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists() && Array.isArray(snapshot.data().linkIds) ? snapshot.data().linkIds as string[] : [];
      const linkIds = current.includes(linkId) ? current.filter((id) => id !== linkId) : [...current, linkId].slice(-100);
      transaction.set(ref, { uid: userProfile.uid, linkIds, updatedAt: serverTimestamp() });
    });
  };

  const saveWorkspaceLink = async (input: Partial<WorkspaceLink> & Pick<WorkspaceLink, "title" | "url" | "audience" | "assignedUids">) => {
    if (userProfile?.role !== "SUPER_ADMIN") throw new Error("Administrator access is required to manage workspace links.");
    const id = input.id || `site-${crypto.randomUUID()}`;
    const record = { title: input.title, url: input.url, description: input.description || "", audience: input.audience, assignedUids: input.audience === "all" ? [] : input.assignedUids, updatedAt: serverTimestamp() };
    const batch = writeBatch(db);
    if (input.id) batch.update(doc(db, "workspace_links", id), record);
    else batch.set(doc(db, "workspace_links", id), { ...record, createdBy: userProfile.uid, createdAt: serverTimestamp(), archived: false });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "workspace_links", action: input.id ? "UPDATE" : "CREATE", id, record: { ...input, id } }), timestamp: serverTimestamp() });
    await batch.commit();
    setWorkspaceLinks((current) => input.id ? current.map((link) => link.id === id ? { ...link, ...record, updatedAt: new Date().toISOString() } : link) : [...current, { ...record, id, createdBy: userProfile.uid, archived: false, createdAt: new Date().toISOString() } as WorkspaceLink]);
  };

  const archiveWorkspaceLink = async (link: WorkspaceLink) => {
    if (userProfile?.role !== "SUPER_ADMIN") throw new Error("Administrator access is required.");
    if (!window.confirm(`Remove ${link.title} from staff workspaces?`)) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "workspace_links", link.id), { archived: true, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "workspace_links", action: "ARCHIVE", id: link.id, record: link, before: link, after: { ...link, archived: true } }), timestamp: serverTimestamp() });
    await batch.commit();
    setWorkspaceLinks((current) => current.map((item) => item.id === link.id ? { ...item, archived: true } : item));
  };

  const restoreWorkspaceLink = async (link: WorkspaceLink) => {
    if (userProfile?.role !== "SUPER_ADMIN") throw new Error("Administrator access is required.");
    const batch = writeBatch(db);
    batch.update(doc(db, "workspace_links", link.id), { archived: false, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "workspace_links", action: "RESTORE", id: link.id, record: link, before: link, after: { ...link, archived: false } }), timestamp: serverTimestamp() });
    await batch.commit();
    setWorkspaceLinks((current) => current.map((item) => item.id === link.id ? { ...item, archived: false } : item));
  };

  const actionFields: Record<ResourceKey, RecordField[]> = {
    staff_inventory: [{ key: "name", label: "Name", required: true }, { key: "email", label: "Email", type: "email", required: true }, { key: "department", label: "Department", required: true }, { key: "position", label: "Position", required: true }, { key: "branch", label: "Branch", required: true }, { key: "phone", label: "Phone" }, { key: "employmentDate", label: "Employment date", type: "date" }],
    physical_assets: [{ key: "tag", label: "Asset tag", required: true }, { key: "category", label: "Category", required: true }, { key: "makeModel", label: "Make and model", required: true }, { key: "serialNumber", label: "Serial number" }, { key: "assignedStaff", label: "Assigned staff" }, { key: "assignedStaffEmail", label: "Assigned staff email", type: "email" }, { key: "department", label: "Department" }, { key: "branch", label: "Branch", required: true }, { key: "condition", label: "Condition" }, { key: "status", label: "Status", type: "select", options: ["Active", "Repair", "Retired"] }, { key: "purchaseDate", label: "Purchase date", type: "date" }],
    digital_credentials: [{ key: "platform", label: "Platform", required: true }, { key: "loginEmail", label: "Login email", type: "email", required: true }, { key: "subAgentHandleId", label: "Handle ID" }, { key: "assignedUser", label: "Assigned user" }, { key: "assignedUserEmail", label: "Assigned user email", type: "email" }, { key: "assignedUserBranch", label: "Assigned branch" }, { key: "userRole", label: "User role" }, { key: "vaultStatus", label: "Vault status", type: "select", options: ["SECURED", "UNRESTRICTED"] }, { key: "rawPass", label: "Secret", type: "password" }],
    workbooks: [{ key: "title", label: "Title", required: true }, { key: "businessFunction", label: "Business function" }, { key: "cloudStorageUrl", label: "Cloud URL", required: true }, { key: "primaryOwner", label: "Primary owner", required: true }, { key: "primaryOwnerEmail", label: "Owner email", type: "email" }, { key: "primaryOwnerBranch", label: "Owner branch" }, { key: "department", label: "Department", required: true }, { key: "accessPermissions", label: "Access", type: "select", options: ["ALL", "RESTRICTED"] }, { key: "lastAuditDate", label: "Last audit date", type: "date" }],
    facilities: [{ key: "branch", label: "Branch", required: true }, { key: "itemDescription", label: "Item description", required: true }, { key: "category", label: "Category", type: "select", options: ["FURNITURE", "HARDWARE", "NETWORKING"] }, { key: "roomZone", label: "Room / zone" }, { key: "quantity", label: "Quantity", type: "number", required: true }, { key: "condition", label: "Condition", required: true }, { key: "assignedOrShared", label: "Allocation" }, { key: "assignedOrSharedEmail", label: "Assignee email", type: "email" }, { key: "assignedOrSharedBranch", label: "Assignee branch" }, { key: "maintenanceNotes", label: "Maintenance notes", type: "textarea" }],
  };

  // Compute Missing Details Alerts dynamically
  const missingAlerts = React.useMemo(() => {
    return auditAllAssets(assets.filter((asset) => asset.archived !== true));
  }, [assets]);
  const activeAssets = excludeArchived(assets, false);
  const activeStaff = excludeArchived(staff, false);
  const activeCredentials = excludeArchived(credentials, false);
  const activeWorkbooks = excludeArchived(workbooks, false);
  const activeFacilities = excludeArchived(facilities, false);

  // Asset Update Handler
  const handleUpdateAsset = async (updatedAsset: PhysicalAsset) => {
    const ref = doc(db, "physical_assets", updatedAsset.id);
    const updatedAt = Timestamp.now();
    const changes = userProfile?.role === "SUPER_ADMIN"
      ? { ...updatedAsset, updatedAt }
      : { condition: updatedAsset.condition, status: updatedAsset.status, lastStaffCheckin: updatedAt, updatedAt };
    if (userProfile?.role === "STAFF" && !isOnline) {
      const time = updatedAsset.updatedAt instanceof Timestamp ? updatedAsset.updatedAt.toMillis() : typeof updatedAsset.updatedAt === "string" ? Date.parse(updatedAsset.updatedAt) : typeof updatedAsset.updatedAt === "number" ? updatedAsset.updatedAt : null;
      const currentAsset = assets.find((asset) => asset.id === updatedAsset.id);
      const queued: PendingAssetUpdate = { id: updatedAsset.id, uid: userProfile.uid, patch: { condition: updatedAsset.condition, status: updatedAsset.status, lastStaffCheckin: new Date().toISOString() }, before: { condition: currentAsset?.condition, status: currentAsset?.status }, baseUpdatedAt: Number.isFinite(time) ? time : null, createdAt: Date.now(), state: "pending" };
      await queueAssetUpdate(queued);
      setOfflineUpdates(await listPendingAssetUpdates(userProfile.uid));
      setAssets((previous) => previous.map((asset) => asset.id === updatedAsset.id ? { ...asset, condition: updatedAsset.condition, status: updatedAsset.status, updatedAt: updatedAsset.updatedAt } : asset));
      await cacheAssignedAssets(userProfile.uid, assets.map((asset) => asset.id === updatedAsset.id ? { ...asset, condition: updatedAsset.condition, status: updatedAsset.status, updatedAt: updatedAsset.updatedAt } : asset));
      return;
    }
    if (userProfile?.role === "STAFF") {
      const base = updatedAsset.updatedAt instanceof Timestamp ? updatedAsset.updatedAt.toMillis() : typeof updatedAsset.updatedAt === "string" ? Date.parse(updatedAsset.updatedAt) : null;
      const logRef = doc(collection(db, "audit_logs"));
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error("This asset is no longer available.");
        const serverUpdated = snapshot.data().updatedAt;
        const current = serverUpdated instanceof Timestamp ? serverUpdated.toMillis() : typeof serverUpdated === "string" ? Date.parse(serverUpdated) : null;
        if (base !== current) throw new Error("This asset changed since you opened it. Refresh and review the latest record before saving.");
        transaction.update(ref, { condition: updatedAsset.condition, status: updatedAsset.status, lastStaffCheckin: updatedAt, updatedAt });
        const before = snapshot.data();
        const activity = buildActivityLog(userProfile, { resource: "physical_assets", action: "UPDATE", id: updatedAsset.id, record: before, before, after: { ...before, condition: updatedAsset.condition, status: updatedAsset.status } });
        transaction.set(logRef, { ...activity, timestamp: serverTimestamp() });
      });
    } else {
      const before = assets.find((asset) => asset.id === updatedAsset.id);
      const batch = writeBatch(db);
      batch.update(ref, changes);
      if (userProfile) batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "physical_assets", action: "UPDATE", id: updatedAsset.id, record: updatedAsset, before: before || null, after: updatedAsset }), timestamp: serverTimestamp() });
      await batch.commit();
    }
    setAssets((prev) => prev.map((a) => (a.id === updatedAsset.id ? { ...a, ...changes, updatedAt: new Date().toISOString() } : a)));
  };

  const requestRepair = async (asset: PhysicalAsset, description: string) => {
    if (!userProfile) throw new Error("Sign in to submit a repair request.");
    if (!isOnline) {
      const request: PendingRepairRequest = { id: `offline-repair-${crypto.randomUUID()}`, uid: userProfile.uid, assetId: asset.id, assetTag: asset.tag, description, createdAt: Date.now(), state: "pending" };
      await queueRepairRequest(request);
      setOfflineRepairs(await listPendingRepairRequests(userProfile.uid));
      return;
    }
    const batch = writeBatch(db);
    const taskRef = doc(collection(db, "tasks"));
    const task = { type: "repair_request", title: `Repair request · ${asset.tag}`, description, status: "open", createdByUid: userProfile.uid, assignedToUid: userProfile.uid, assetId: asset.id, assetTag: asset.tag, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    batch.set(taskRef, task);
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "tasks", action: "CREATE", id: taskRef.id, record: task, details: `${userProfile.displayName} submitted a repair request for ${asset.tag}` }), timestamp: serverTimestamp() });
    await batch.commit();
    const snapshot = await getDocs(query(collection(db, "tasks"), where("assignedToUid", "==", userProfile.uid)));
    setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InboxTask)));
  };

  const createStocktakeRound = async (title: string, branch: string) => {
    if (!userProfile || userProfile.role !== "SUPER_ADMIN") throw new Error("Administrator access is required.");
    const branchAssets = assets.filter((asset) => asset.archived !== true && asset.branch === branch);
    const staffByEmail = new Map(staff.map((person) => [person.email.toLowerCase(), person]));
    const assignedUids = Array.from(new Set(branchAssets.map((asset) => asset.assignedStaffUid || staffByEmail.get((asset.assignedStaffEmail || "").toLowerCase())?.uid).filter((uid): uid is string => !!uid)));
    const roundRef = doc(collection(db, "stocktake_rounds"));
    const roundBatch = writeBatch(db);
    roundBatch.set(roundRef, { title, branch, status: "open", assignedUids, createdBy: userProfile.uid, createdAt: serverTimestamp() });
    roundBatch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "stocktake_rounds", action: "CREATE", id: roundRef.id, record: { title } }), timestamp: serverTimestamp() });
    await roundBatch.commit();
    await Promise.all(branchAssets.map(async (asset) => {
      const assignee = staffByEmail.get((asset.assignedStaffEmail || "").toLowerCase());
      const item: Omit<StocktakeItem, "id"> = { roundId: roundRef.id, assetId: asset.id, assetTag: asset.tag, branch, assignedUid: asset.assignedStaffUid || assignee?.uid, status: "unverified", history: [] };
      const ref = doc(db, "stocktake_items", `${roundRef.id}_${asset.id}`);
      await setDoc(ref, item);
      if (item.assignedUid) await addDoc(collection(db, "tasks"), { type: "stocktake", title: `Verify asset ${asset.tag}`, description: title, status: "open", createdByUid: userProfile.uid, assignedToUid: item.assignedUid, assetId: asset.id, assetTag: asset.tag, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }));
    const [rounds, checks] = await Promise.all([getDocs(collection(db, "stocktake_rounds")), getDocs(collection(db, "stocktake_items"))]);
    setStocktakeRounds(rounds.docs.map((d) => ({ id: d.id, ...d.data() } as StocktakeRound)));
    setStocktakeItems(checks.docs.map((d) => ({ id: d.id, ...d.data() } as StocktakeItem)));
  };

  const updateStocktakeItem = async (item: StocktakeItem, status: StocktakeItem["status"], note: string) => {
    if (!userProfile) throw new Error("Sign in to record verification.");
    const historyEntry = { status, note, checkedBy: userProfile.uid, checkedAt: new Date().toISOString() };
    const patch = { status, note, checkedBy: userProfile.uid, checkedAt: serverTimestamp(), history: [...(item.history || []), historyEntry] };
    const batch = writeBatch(db);
    batch.update(doc(db, "stocktake_items", item.id), patch);
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "stocktake_items", action: "UPDATE", id: item.id, record: item, before: item, after: { ...item, status, note, checkedBy: userProfile.uid } }), timestamp: serverTimestamp() });
    await batch.commit();
    setStocktakeItems((current) => current.map((row) => row.id === item.id ? { ...row, ...patch, checkedAt: historyEntry.checkedAt } : row));
    const relatedTasks = tasks.filter((task) => task.type === "stocktake" && task.assetId === item.assetId && task.description === stocktakeRounds.find((round) => round.id === item.roundId)?.title);
    if (status !== "unverified") {
      const completed = await Promise.allSettled(relatedTasks.map(async (task) => {
        const taskBatch = writeBatch(db);
        taskBatch.update(doc(db, "tasks", task.id), { status: "done", updatedAt: serverTimestamp() });
        taskBatch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "tasks", action: "UPDATE", id: task.id, record: task, before: task, after: { ...task, status: "done" } }), timestamp: serverTimestamp() });
        await taskBatch.commit();
      }));
      const completedIds = relatedTasks.filter((_, index) => completed[index].status === "fulfilled").map((task) => task.id);
      setTasks((current) => current.map((task) => completedIds.includes(task.id) ? { ...task, status: "done" } : task));
      const failed = completed.filter((result) => result.status === "rejected").length;
      if (failed) throw new Error(`Verification was saved, but ${failed} inbox task(s) could not be completed. Retry from the task inbox.`);
    }
  };

  const closeStocktakeRound = async (round: StocktakeRound) => {
    if (!stocktakeItems.filter((item) => item.roundId === round.id).every((item) => item.status !== "unverified")) throw new Error("Complete or mark every asset before closing this round.");
    if (stocktakeItems.some((item) => item.roundId === round.id && ["missing", "moved", "damaged"].includes(item.status)) && !window.confirm("This round has unresolved discrepancies. Close it and retain those discrepancies in the history?")) return;
    if (!userProfile) throw new Error("Sign in to close this round.");
    const batch = writeBatch(db);
    batch.update(doc(db, "stocktake_rounds", round.id), { status: "closed", closedAt: serverTimestamp() });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "stocktake_rounds", action: "CLOSE", id: round.id, record: round, before: round, after: { ...round, status: "closed" } }), timestamp: serverTimestamp() });
    await batch.commit();
    setStocktakeRounds((current) => current.map((item) => item.id === round.id ? { ...item, status: "closed", closedAt: new Date().toISOString() } : item));
  };

  const updateTaskStatus = async (task: InboxTask, status: InboxTask["status"]) => {
    if (!userProfile) throw new Error("Sign in to update this task.");
    const batch = writeBatch(db);
    batch.update(doc(db, "tasks", task.id), { status, updatedAt: serverTimestamp() });
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "tasks", action: "UPDATE", id: task.id, record: task, before: task, after: { ...task, status } }), timestamp: serverTimestamp() });
    await batch.commit();
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
  };

  const assignNewTask = async (newTaskData: {
    title: string;
    description: string;
    type: "repair_request" | "stocktake" | "handover" | "general_task";
    assignedToStaff: StaffMember;
    asset?: PhysicalAsset;
  }) => {
    if (!userProfile) throw new Error("Sign in before assigning tasks.");

    const recipientUid = newTaskData.assignedToStaff.uid || staff.find((person) => person.email.toLowerCase() === newTaskData.assignedToStaff.email.toLowerCase())?.uid || "";

    const taskRef = doc(collection(db, "tasks"));
    const taskPayload = {
      type: newTaskData.type,
      title: newTaskData.title,
      description: newTaskData.description,
      status: "open",
      createdByUid: userProfile.uid,
      createdByName: userProfile.displayName,
      assignedToUid: recipientUid,
      assignedToEmail: newTaskData.assignedToStaff.email,
      assignedToName: newTaskData.assignedToStaff.name,
      assetId: newTaskData.asset?.id || "",
      assetTag: newTaskData.asset?.tag || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(taskRef, taskPayload);
    batch.set(doc(collection(db, "audit_logs")), {
      ...buildActivityLog(userProfile, {
        resource: "tasks",
        action: "CREATE",
        id: taskRef.id,
        record: taskPayload,
        details: `${userProfile.displayName} assigned task "${newTaskData.title}" to ${newTaskData.assignedToStaff.name}`,
      }),
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    const tasksSnapshot = userProfile.role === "SUPER_ADMIN"
      ? await getDocs(collection(db, "tasks"))
      : await getDocs(query(collection(db, "tasks"), where("assignedToUid", "==", userProfile.uid)));

    setTasks(tasksSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InboxTask)));
  };

  const migrateCredentialSecrets = async () => {
    if (userProfile?.role !== "SUPER_ADMIN") throw new Error("Administrator access is required.");
    const snapshot = await getDocs(collection(db, "digital_credentials"));
    let count = 0; const failures: string[] = [];
    for (let offset = 0; offset < snapshot.docs.length; offset += 200) {
      const batch = writeBatch(db); let batchCount = 0;
      for (const credentialDoc of snapshot.docs.slice(offset, offset + 200)) {
        const secret = credentialDoc.data().rawPass;
        if (typeof secret !== "string" || !secret.length) continue;
        batch.set(doc(db, "credential_secrets", credentialDoc.id), { secret, updatedAt: serverTimestamp() }, { merge: true });
        batch.update(doc(db, "digital_credentials", credentialDoc.id), { rawPass: firestoreDeleteField(), updatedAt: serverTimestamp() });
        count++; batchCount++;
      }
      if (batchCount) try { await batch.commit(); } catch (err) { count -= batchCount; failures.push(err instanceof Error ? err.message : "A migration batch failed."); }
    }
    setCredentials((current) => current.map(({ rawPass: _secret, ...metadata }) => metadata));
    if (count > 0 && userProfile) await addDoc(collection(db, "audit_logs"), { ...buildActivityLog(userProfile, { resource: "digital_credentials", action: "MIGRATE_SECRETS", id: "credential-secret-migration", details: `${userProfile.displayName} migrated ${count} credential secret(s) into restricted storage` }), timestamp: serverTimestamp() });
    if (failures.length) throw new Error(`${count} migrated; ${failures.length} batch(es) failed. Retry after checking Firestore permissions.`);
    return count;
  };

  // Custody Transfer Handler
  const handleTransferCustody = async (assetId: string, newStaff: StaffMember, reason: string) => {
    if (!userProfile) throw new Error("Sign in to transfer custody.");
    const targetAsset = assets.find((a) => a.id === assetId);
    if (!targetAsset) return;

    const previousCustodian = targetAsset.assignedStaff;
    const updated: PhysicalAsset = {
      ...targetAsset,
      assignedStaff: newStaff.name,
      assignedStaffEmail: newStaff.email,
      department: newStaff.department,
      branch: newStaff.branch,
      updatedAt: new Date().toISOString(),
    };

    const recipientUid = newStaff.uid || staff.find((person) => person.email.toLowerCase() === newStaff.email.toLowerCase())?.uid;
    const batch = writeBatch(db);
    batch.update(doc(db, "physical_assets", assetId), {
      assignedStaff: newStaff.name,
      assignedStaffEmail: newStaff.email,
      assignedStaffUid: recipientUid || null,
      assignedStaffBranch: newStaff.branch,
      department: newStaff.department,
      branch: newStaff.branch,
      updatedAt: serverTimestamp(),
    });
    const nextAsset = { ...updated, assignedStaffUid: recipientUid || "", assignedStaffBranch: newStaff.branch };
    batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(userProfile, { resource: "physical_assets", action: "TRANSFER_CUSTODY", id: assetId, record: nextAsset, before: targetAsset, after: nextAsset, additionalVisibilityUids: recipientUid ? [recipientUid] : [], details: `Transferred ${targetAsset.tag} (${targetAsset.makeModel}) from ${previousCustodian} to ${newStaff.name}. Reason: ${reason || "Operational transfer"}` }), timestamp: serverTimestamp() });
    if (recipientUid) {
      const handoverTask = { type: "handover", title: `Confirm receipt · ${targetAsset.tag}`, description: reason || `Transferred from ${previousCustodian}.`, status: "open", createdByUid: userProfile?.uid, assignedToUid: recipientUid, assetId, assetTag: targetAsset.tag, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      batch.set(doc(collection(db, "tasks")), handoverTask);
    }
    await batch.commit();
    setAssets((prev) => prev.map((a) => (a.id === assetId ? nextAsset : a)));
  };

  const handleDataIngested = (data: ParsedWorkbookData, replace = false) => {
    setAssets((current) => replace ? data.physicalAssets : mergeById(current, data.physicalAssets));
    setStaff((current) => replace ? data.staff : mergeById(current, data.staff));
    const credentials = data.digitalCredentials.map(({ rawPass: _secret, ...metadata }) => metadata);
    setCredentials((current) => replace ? credentials : mergeById(current, credentials));
    setWorkbooks((current) => replace ? data.workbooks : mergeById(current, data.workbooks));
    setFacilities((current) => replace ? data.facilities : mergeById(current, data.facilities));
  };

  // Filter hardware view for a specific staff member
  const handleSelectStaffAssets = (staffName: string) => {
    const selected = staff.find((person) => person.name.trim().toLowerCase() === staffName.trim().toLowerCase());
    setHardwareStaffFilter(selected || { id: "", name: staffName, email: "", department: "", position: "", branch: "", phone: "" });
    setActiveTab("hardware");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar dataLoading={dataLoading} isOnline={isOnline} onShowHelp={() => setShowWelcome(true)} onSignOut={() => void signOutUser()} />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Only a Firebase-authenticated profile can access live app data. */}
        {authLoading ? (
          <AuthLoadingScreen />
        ) : !userProfile ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg-primary)]">
            <div className="max-w-md w-full bg-[var(--bg-surface)] rounded-2xl p-8 border border-[var(--border)] shadow-xl space-y-6 text-center">

              {/* Logo */}
              <div className="flex justify-center">
                <Image
                  src="/logo.png"
                  alt="Basechan Logo"
                  width={72}
                  height={72}
                  className="rounded-2xl object-contain"
                  priority
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Basechan Asset Manager</h2>
                <p className="text-sm font-semibold tracking-wider uppercase text-[var(--text-muted)] mt-1">LOGIN</p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2 text-left">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                onClick={() => void signInWithGoogle().catch(() => undefined)}
                className="w-full py-3 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-gold-400 font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>

              {process.env.NEXT_PUBLIC_E2E_AUTH_EMULATOR === "true" && <form onSubmit={(event) => { event.preventDefault(); void signInWithEmulatorAccount(emulatorEmail, emulatorPassword).catch(() => undefined); }} className="space-y-2 border-t border-[var(--border)] pt-4 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Local emulator test account</p>
                <input aria-label="Test account email" type="email" required value={emulatorEmail} onChange={(event) => setEmulatorEmail(event.target.value)} placeholder="test account email" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]" />
                <input aria-label="Test account password" type="password" required value={emulatorPassword} onChange={(event) => setEmulatorPassword(event.target.value)} placeholder="password" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-primary)]" />
                <button type="submit" className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">Sign in to local test account</button>
              </form>}

            </div>
          </div>
        ) : (
          <>
            <Sidebar
              activeTab={activeTab}
              onSelectTab={navigateToTab}
              missingDetailsCount={missingAlerts.length}
              openTaskCount={tasks.filter((task) => task.status !== "done").length + offlineRepairs.length}
              accessibleTabs={accessibleTabs!}
            />

            <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8 max-w-7xl mx-auto w-full">
              {dataLoading ? (
                <DashboardSkeleton />
              ) : (
                <div key={activeTab} className="page-transition" data-scroll-motion-root>
                  {dataError && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Live Firestore data could not be loaded: {dataError}</div>}
                  {activeTab === "overview" && (userProfile.role === "SUPER_ADMIN" ? (
                    <OverviewTab
                      displayName={userProfile.displayName}
                      assets={activeAssets}
                      staff={activeStaff}
                      credentials={activeCredentials}
                      workbooks={activeWorkbooks}
                      facilities={activeFacilities}
                      missingAlerts={missingAlerts}
                      onNavigateTab={navigateToTab}
                      workspaceLinks={workspaceLinks.filter((link) => !link.archived)}
                      workspaceFavorites={workspaceFavorites}
                      onToggleWorkspaceFavorite={toggleWorkspaceFavorite}
                    />
                  ) : <PersonalHomeTab
                    displayName={userProfile.displayName}
                    branch={userProfile.branch}
                    department={userProfile.department}
                    assets={activeAssets.filter((asset) => !asset.archived)}
                    credentials={activeCredentials.filter((credential) => !credential.archived)}
                    tasks={tasks}
                    workspaceLinks={workspaceLinks.filter((link) => !link.archived)}
                    favorites={workspaceFavorites}
                    onNavigate={navigateToTab}
                    onToggleFavorite={toggleWorkspaceFavorite}
                    onShowHelp={() => setShowWelcome(true)}
                  />)}

                  {activeTab === "hardware" && (
                    <HardwareTab
                      assets={assets}
                      staff={staff}
                      onUpdateAsset={handleUpdateAsset}
                      onTransferCustody={handleTransferCustody}
                      onCreate={() => setEditor({ resource: "physical_assets", record: null })}
                      pendingUpdates={offlineUpdates}
                      onRetryPendingUpdate={async (id) => setOfflineUpdates(await retryAssetUpdate(userProfile.uid, id, userProfile))}
                      isOnline={isOnline}
                      onRequestRepair={requestRepair}
                      grant={currentGrant}
                      staffFilter={hardwareStaffFilter ? { name: hardwareStaffFilter.name, email: hardwareStaffFilter.email } : null}
                      onClearStaffFilter={() => setHardwareStaffFilter(null)}
                      showArchived={!!pageShowArchived.physical_assets}
                      onToggleArchived={() => setPageShowArchived((value) => ({ ...value, physical_assets: !value.physical_assets }))}
                      onSaveRecord={(record) => saveRecords("physical_assets", [record.id], record)}
                      onArchiveRecord={(id) => archiveRecords("physical_assets", [id], true)}
                      onRestoreRecord={(id) => archiveRecords("physical_assets", [id], false)}
                      onBulkEdit={(ids) => setEditor({ resource: "physical_assets", record: null, ids })}
                      onBulkArchive={(ids) => archiveRecords("physical_assets", ids, true)}
                      onBulkRestore={(ids) => archiveRecords("physical_assets", ids, false)}
                    />
                  )}

                  {activeTab === "auditor" && (
                    <MissingDetailsTab
                      alerts={missingAlerts}
                      assets={assets}
                      onUpdateAsset={handleUpdateAsset}
                    />
                  )}

                  {activeTab === "credentials" && (
                    <CredentialsTab credentials={credentials} grant={currentGrant} showArchived={!!pageShowArchived.digital_credentials} onToggleArchived={() => setPageShowArchived((value) => ({ ...value, digital_credentials: !value.digital_credentials }))} onCreate={() => setEditor({ resource: "digital_credentials", record: null })} onEdit={(record) => setEditor({ resource: "digital_credentials", record })} onSaveRecord={(record) => saveRecords("digital_credentials", [record.id], record)} onArchiveRecord={(id) => archiveRecords("digital_credentials", [id], true)} onRestoreRecord={(id) => archiveRecords("digital_credentials", [id], false)} onBulkEdit={(ids) => setEditor({ resource: "digital_credentials", record: null, ids })} onBulkArchive={(ids) => archiveRecords("digital_credentials", ids, true)} onBulkRestore={(ids) => archiveRecords("digital_credentials", ids, false)} />
                  )}

                  {activeTab === "workbooks" && (
                    <WorkbooksTab workbooks={workbooks} grant={currentGrant} showArchived={!!pageShowArchived.workbooks} onToggleArchived={() => setPageShowArchived((value) => ({ ...value, workbooks: !value.workbooks }))} onCreate={() => setEditor({ resource: "workbooks", record: null })} onEdit={(record) => setEditor({ resource: "workbooks", record })} onSaveRecord={(record) => saveRecords("workbooks", [record.id], record)} onArchiveRecord={(id) => archiveRecords("workbooks", [id], true)} onRestoreRecord={(id) => archiveRecords("workbooks", [id], false)} onBulkEdit={(ids) => setEditor({ resource: "workbooks", record: null, ids })} onBulkArchive={(ids) => archiveRecords("workbooks", ids, true)} onBulkRestore={(ids) => archiveRecords("workbooks", ids, false)} />
                  )}

                  {activeTab === "facilities" && (
                    <FacilitiesTab facilities={facilities} grant={currentGrant} showArchived={!!pageShowArchived.facilities} onToggleArchived={() => setPageShowArchived((value) => ({ ...value, facilities: !value.facilities }))} onCreate={() => setEditor({ resource: "facilities", record: null })} onEdit={(record) => setEditor({ resource: "facilities", record })} onSaveRecord={(record) => saveRecords("facilities", [record.id], record)} onArchiveRecord={(id) => archiveRecords("facilities", [id], true)} onRestoreRecord={(id) => archiveRecords("facilities", [id], false)} onBulkEdit={(ids) => setEditor({ resource: "facilities", record: null, ids })} onBulkArchive={(ids) => archiveRecords("facilities", ids, true)} onBulkRestore={(ids) => archiveRecords("facilities", ids, false)} />
                  )}

                  {activeTab === "staff" && (
                    <StaffDirectoryTab
                      staff={staff}
                      assets={assets}
                      onSelectStaffAssets={handleSelectStaffAssets}
                      grant={currentGrant}
                      isAdmin={userProfile.role === "SUPER_ADMIN"}
                      onManageAccess={handleManageAccess}
                      showArchived={!!pageShowArchived.staff_inventory}
                      onToggleArchived={() => setPageShowArchived((value) => ({ ...value, staff_inventory: !value.staff_inventory }))}
                      onCreate={() => setEditor({ resource: "staff_inventory", record: null })}
                      onEdit={(record) => setEditor({ resource: "staff_inventory", record })}
                      onSaveRecord={(record) => saveRecords("staff_inventory", [record.id], record)}
                      onArchiveRecord={(id) => archiveRecords("staff_inventory", [id], true)}
                      onRestoreRecord={(id) => archiveRecords("staff_inventory", [id], false)}
                      onBulkEdit={(ids) => setEditor({ resource: "staff_inventory", record: null, ids })}
                      onBulkArchive={(ids) => archiveRecords("staff_inventory", ids, true)}
                      onBulkRestore={(ids) => archiveRecords("staff_inventory", ids, false)}
                    />
                  )}

                  {activeTab === "ingestion" && (
                    <IngestionTab
                      currentStats={{
                        staffCount: activeStaff.length,
                        physicalCount: activeAssets.length,
                        digitalCount: activeCredentials.length,
                        workbookCount: activeWorkbooks.length,
                        facilityCount: activeFacilities.length,
                      }}
                      onDataIngested={handleDataIngested}
                      onMigrateSecrets={migrateCredentialSecrets}
                      currentRecords={{ stats: { staffCount: activeStaff.length, physicalCount: activeAssets.length, digitalCount: activeCredentials.length, workbookCount: activeWorkbooks.length, facilityCount: activeFacilities.length }, staff: activeStaff, physicalAssets: activeAssets, digitalCredentials: activeCredentials, workbooks: activeWorkbooks, facilities: activeFacilities, missingDetailAlerts: [] }}
                    />
                  )}
                  {activeTab === "stocktake" && accessibleTabs?.stocktake && <StocktakeTab rounds={stocktakeRounds} items={stocktakeItems} assets={assets} isAdmin={userProfile.role === "SUPER_ADMIN"} onCreateRound={createStocktakeRound} onUpdateItem={updateStocktakeItem} onCloseRound={closeStocktakeRound} />}
                  {activeTab === "tasks" && (
                    <TaskInboxTab
                      tasks={[
                        ...tasks,
                        ...offlineRepairs.map((task) => ({
                          id: task.id,
                          type: "repair_request" as const,
                          title: `Repair request · ${task.assetTag}`,
                          description: `${task.description} · ${task.state === "failed" ? task.error : "Pending sync"}`,
                          status: "open" as const,
                          createdByUid: task.uid,
                          assignedToUid: task.uid,
                          assetId: task.assetId,
                          assetTag: task.assetTag,
                          localOnly: true,
                          localSyncFailed: task.state === "failed",
                        })),
                      ]}
                      isAdmin={userProfile.role === "SUPER_ADMIN"}
                      staffList={staff}
                      assetList={assets}
                      onAssignTask={assignNewTask}
                      onStatusChange={updateTaskStatus}
                      onRetryLocal={async (task) => setOfflineRepairs(await retryRepairRequest(userProfile.uid, task.id, userProfile))}
                    />
                  )}
                  {activeTab === "workspace" && <WorkspaceTab links={workspaceLinks} favorites={workspaceFavorites} staff={staff} isAdmin={userProfile.role === "SUPER_ADMIN"} onToggleFavorite={toggleWorkspaceFavorite} onSave={saveWorkspaceLink} onArchive={archiveWorkspaceLink} onRestore={restoreWorkspaceLink} />}
                </div>
              )}
            </main>
          </>
        )}
      </div>
      {editor && <RecordEditorModal title={`${editor.record ? "Edit" : editor.ids ? "Bulk edit" : "Create"} ${editor.resource.replaceAll("_", " ")}`} fields={editor.ids ? actionFields[editor.resource].filter((field) => !["email", "branch", "department", "assignedStaffEmail", "assignedUserEmail", "primaryOwnerEmail", "primaryOwnerBranch", "assignedOrSharedEmail", "assignedOrSharedBranch", "rawPass", "isLocked"].includes(field.key)) : actionFields[editor.resource]} initial={editor.record} bulk={!!editor.ids} onClose={() => setEditor(null)} onSave={(values) => saveRecords(editor.resource, editor.ids || (editor.record ? [editor.record.id] : []), values, !editor.record && !editor.ids)} />}
      {grantLookupError && <div role="alert" className="fixed bottom-20 left-1/2 z-[70] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 shadow-xl">{grantLookupError}<button type="button" onClick={() => setGrantLookupError(null)} className="ml-3 font-bold underline">Dismiss</button></div>}
      {grantTarget && <AccessGrantModal staff={grantTarget} current={accessGrants[grantTarget.uid || ""]} onClose={() => setGrantTarget(null)} onSave={saveAccessGrant} />}
      {showWelcome && userProfile && accessibleTabs && <OnboardingGuide displayName={userProfile.displayName} role={userProfile.role} accessibleTabs={accessibleTabs} onComplete={completeOnboarding} onDismiss={() => setShowWelcome(false)} />}
    </div>
  );
}
