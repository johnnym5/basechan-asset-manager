import { collection, doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PhysicalAsset, UserProfile } from "@/types/assets";
import { buildActivityLog } from "@/lib/activityLog";

export interface PendingAssetUpdate {
  id: string;
  uid: string;
  patch: { condition?: string; status?: string; lastStaffCheckin?: string };
  before?: { condition?: string; status?: string };
  baseUpdatedAt: number | null;
  createdAt: number;
  state: "pending" | "conflict" | "failed";
  error?: string;
}

const DB_NAME = "basechan-offline";
const STORE = "asset-updates";
export interface PendingRepairRequest { id: string; uid: string; assetId: string; assetTag: string; description: string; createdAt: number; state: "pending" | "failed"; error?: string; }

function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheAssignedAssets(uid: string, assets: PhysicalAsset[]): Promise<void> {
  // Never cache credential secrets or sensitive fields in ordinary asset cache
  const cached = assets.map((asset) => ({ ...asset, updatedAt: asset.updatedAt instanceof Timestamp ? asset.updatedAt.toMillis() : asset.updatedAt }));
  await withStore("readwrite", (store) => store.put({ key: `cache:${uid}:assets`, uid, kind: "asset_cache", assets: cached, savedAt: Date.now() }));
}

export async function readCachedAssignedAssets(uid: string): Promise<PhysicalAsset[]> {
  const cached = await withStore<any>("readonly", (store) => store.get(`cache:${uid}:assets`));
  return Array.isArray(cached?.assets) ? cached.assets : [];
}

export async function clearUserCache(uid: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(`cache:${uid}:assets`));
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openQueue();
  return new Promise((resolve, reject) => {
    const request = operation(database.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listPendingAssetUpdates(uid: string): Promise<PendingAssetUpdate[]> {
  const rows = await withStore<any[]>("readonly", (store) => store.getAll());
  return rows.filter((row) => row.uid === uid && row.kind !== "asset_cache").map(({ key: _key, ...row }) => row as PendingAssetUpdate);
}

export async function queueAssetUpdate(update: PendingAssetUpdate): Promise<void> {
  await withStore("readwrite", (store) => store.put({ ...update, key: `${update.uid}:${update.id}` }));
}

export async function removeQueuedAssetUpdate(uid: string, id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(`${uid}:${id}`));
}

export async function retryAssetUpdate(uid: string, id: string, actor?: UserProfile): Promise<PendingAssetUpdate[]> {
  const existing = (await listPendingAssetUpdates(uid)).find((item) => item.id === id);
  if (!existing) return listPendingAssetUpdates(uid);
  const snapshot = await import("firebase/firestore").then(({ getDoc }) => getDoc(doc(db, "physical_assets", id)));
  if (!snapshot.exists()) throw new Error("This asset no longer exists. Remove its pending update after reviewing the record.");
  const value = snapshot.data().updatedAt;
  const baseUpdatedAt = value instanceof Timestamp ? value.toMillis() : typeof value === "string" ? Date.parse(value) : null;
  await queueAssetUpdate({ ...existing, baseUpdatedAt: Number.isFinite(baseUpdatedAt) ? baseUpdatedAt : null, state: "pending", error: undefined });
  return flushAssetUpdates(uid, actor);
}

export async function flushAssetUpdates(uid: string, actor?: UserProfile): Promise<PendingAssetUpdate[]> {
  const pending = (await listPendingAssetUpdates(uid)).filter((item) => item.state === "pending");
  for (const item of pending) {
    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "physical_assets", item.id);
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new Error("Asset no longer exists.");
        const currentUpdatedAt = snapshot.data().updatedAt;
        const currentMillis = currentUpdatedAt instanceof Timestamp ? currentUpdatedAt.toMillis() : typeof currentUpdatedAt === "string" ? Date.parse(currentUpdatedAt) : null;
        if (item.baseUpdatedAt !== currentMillis) throw new Error("The asset changed since this offline update. Review the current record before retrying.");
        transaction.update(ref, { ...item.patch, updatedAt: Timestamp.now() });
        if (actor) {
          const current = snapshot.data();
          const activity = buildActivityLog(actor, { resource: "physical_assets", action: "UPDATE", id: item.id, record: current, before: { ...current, ...(item.before || {}) }, after: { ...current, ...item.patch } });
          transaction.set(doc(collection(db, "audit_logs")), { ...activity, timestamp: serverTimestamp() });
        }
      });
      await removeQueuedAssetUpdate(uid, item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      await queueAssetUpdate({ ...item, state: /changed since|no longer exists/i.test(message) ? "conflict" : "failed", error: message });
    }
  }
  return listPendingAssetUpdates(uid);
}

export async function listPendingRepairRequests(uid: string): Promise<PendingRepairRequest[]> {
  const rows = await withStore<any[]>("readonly", (store) => store.getAll());
  return rows.filter((row) => row.uid === uid && row.kind === "repair_request").map(({ key: _key, kind: _kind, ...row }) => row as PendingRepairRequest);
}

export async function queueRepairRequest(request: PendingRepairRequest): Promise<void> {
  await withStore("readwrite", (store) => store.put({ ...request, kind: "repair_request", key: `${request.uid}:repair:${request.id}` }));
}

export async function flushRepairRequests(uid: string, actor?: UserProfile): Promise<PendingRepairRequest[]> {
  const pending = (await listPendingRepairRequests(uid)).filter((request) => request.state === "pending");
  for (const request of pending) {
    try {
      const { getDoc, serverTimestamp, writeBatch } = await import("firebase/firestore");
      const taskRef = doc(db, "tasks", request.id);
      const existing = await getDoc(taskRef);
      if (!existing.exists()) {
        const batch = writeBatch(db);
        const task = { type: "repair_request", title: `Repair request · ${request.assetTag}`, description: request.description, status: "open", createdByUid: uid, assignedToUid: uid, assetId: request.assetId, assetTag: request.assetTag, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        batch.set(taskRef, task);
        if (actor) batch.set(doc(collection(db, "audit_logs")), { ...buildActivityLog(actor, { resource: "tasks", action: "CREATE", id: request.id, record: task, details: `${actor.displayName} submitted a repair request for ${request.assetTag}` }), timestamp: serverTimestamp() });
        await batch.commit();
      }
      await withStore("readwrite", (store) => store.delete(`${uid}:repair:${request.id}`));
    } catch (error) {
      await queueRepairRequest({ ...request, state: "failed", error: error instanceof Error ? error.message : "Could not sync repair request." });
    }
  }
  return listPendingRepairRequests(uid);
}

export async function retryRepairRequest(uid: string, id: string, actor?: UserProfile): Promise<PendingRepairRequest[]> {
  const existing = (await listPendingRepairRequests(uid)).find((request) => request.id === id);
  if (!existing) return listPendingRepairRequests(uid);
  await queueRepairRequest({ ...existing, state: "pending", error: undefined });
  return flushRepairRequests(uid, actor);
}
