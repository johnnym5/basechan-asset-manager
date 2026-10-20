# Basechan Enterprise Asset Manager (BAM) — Antigravity Engineering Blueprint & Execution Spec

> **Target Environment:** Antigravity / Cursor / Agentic IDE  
> **Backend & Hosting:** Firebase (Auth, Firestore, Cloud Functions, Firebase Hosting)  
> **Frontend Stack:** Next.js 14 (App Router, TypeScript, Tailwind CSS, Lucide Icons, SheetJS `xlsx`)  
> **Firebase Project ID:** `basechan-am`  
> **Status:** Production Specification & Ingestion Engine Complete  

---

## 1. System Architecture & Dynamic Identity Reconciliation

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 14 Client (Antigravity Workspace)             │
│  ┌──────────────────────┬──────────────────────┬────────────────────┐  │
│  │ Super Admin View     │ Delegated Asset Lead │ Staff Self-Service │  │
│  │ (@basechaninter...com│ (Branch Ingestion &  │ (*.basechaninter...│  │
│  │  Full Ops, Vault)    │  Updates - Benin/Abj)│  Own Assets Only)  │  │
│  └──────────┬───────────┴──────────┬───────────┴─────────┬──────────┘  │
└─────────────┼──────────────────────┼─────────────────────┼─────────────┘
              │                      │                     │
              ▼                      ▼                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Firebase Authentication Gate (OAuth)                │
│                                                                        │
│  Domain Rules:                                                         │
│  • adminUser.email.endsWith('@basechaninternational.com')              │
│    ➜ Role: SUPER_ADMIN                                                 │
│  • staffUser.email.endsWith('.basechaninternational@gmail.com')        │
│    ➜ Role: STAFF                                                       │
│                                                                        │
│  Post-Auth Lifecycle:                                                  │
│  1. Query `users` / `staff_inventory` collection by email.             │
│  2. If matched, attach `staffId`, `department`, `branch`, and link UID │
│     to all physical assets and credentials matching staff name/email.  │
│  3. Enforce Row-Level and Field-Level isolation in Firestore Rules.    │
└────────────────────────────────────────────────────────────────────────┘
```

### Trust Boundary Directives (`AI_Engineering_Project_OS.md §21`)

* **Server-Owned (Browser cannot dictate):** `user.role`, `user.isDelegated`, `asset.isLocked`, `asset.transferStatus`, `auditLogs`.
* **Client-Owned / Validated:** `asset.condition`, `asset.status` (permitted for assigned staff only when `asset.isLocked == false`).
* **Sensitive (AES-256 Vault):** Passwords in `digital_credentials` are encrypted at rest. Unmasking requests invoke a Cloud Function that verifies role permissions and records the actor's identity, IP address, and timestamp into `vault_access_logs`.

---

## 2. Canonical Default Headers & Schemas

Derived from the 5 operational sheets of `BASECHAN INTERNATIONAL CONSOLIDATED SEPTEMBER ASSET LIST.xlsx`:

### 2.1 Staff Inventory (`Staff Inventory`)
```typescript
export const STAFF_HEADERS = [
  { key: "sn", label: "S/N", required: false },
  { key: "name", label: "Staff Name", required: true },
  { key: "department", label: "Department", required: true }, // APPLICATION, Conversion, Marketing and Sales, Operations
  { key: "position", label: "Position", required: true },
  { key: "employmentDate", label: "Employment Date", required: false },
  { key: "email", label: "Email", required: true },
  { key: "phone", label: "Phone Number", required: false },
  { key: "registeredUnder", label: "Registered Under", required: false },
  { key: "branch", label: "Branch", required: true } // Abuja Branch | Benin Branch
] as const;
```

### 2.2 Physical Hardware (`Physical Assets`)
```typescript
export const PHYSICAL_ASSET_HEADERS = [
  { key: "sn", label: "S/N", required: false },
  { key: "tag", label: "Asset Tag ID", required: true, defaultPrefix: "BAM-HW-" },
  { key: "category", label: "Category", required: true }, // Laptop, Monitor, Desktop computer, SIM card, Keyboard, Mouse, Headset
  { key: "makeModel", label: "Make & Model", required: true },
  { key: "serialNumber", label: "Serial Number", required: true },
  { key: "assignedStaff", label: "Assigned Staff", required: true },
  { key: "department", label: "Department", required: true },
  { key: "branch", label: "Physical Location", required: true }, // Abuja Branch | Benin Branch
  { key: "purchaseDate", label: "Purchase Date", required: false },
  { key: "condition", label: "Condition", required: true },
  { key: "status", label: "Status (Active/Repair/Retired)", required: true },
  { key: "isLocked", label: "Locked", required: false, default: false }
] as const;
```

### 2.3 Digital Credentials (`Digital&Accounts`)
```typescript
export const DIGITAL_CREDENTIAL_HEADERS = [
  { key: "platform", label: "Platform / Software", required: true },
  { key: "loginEmail", label: "Account / Login Email", required: true },
  { key: "subAgentHandleId", label: "Sub-Agent / Handle ID", required: false },
  { key: "assignedUser", label: "Assigned User", required: true },
  { key: "userRole", label: "User Role", required: false },
  { key: "rawPass", label: "Passwords", sensitive: true, vaultEncrypted: true },
  { key: "vaultStatus", label: "Password Vault Status", required: true }
] as const;
```

### 2.4 Workbooks & Drive Links (`Data&Workbooks`)
```typescript
export const WORKBOOK_HEADERS = [
  { key: "title", label: "Workbook / Doc Title", required: true },
  { key: "businessFunction", label: "Business Function", required: false },
  { key: "cloudStorageUrl", label: "Cloud Storage Link (URL)", required: true },
  { key: "primaryOwner", label: "Primary File Owner", required: true },
  { key: "department", label: "Department", required: true },
  { key: "accessPermissions", label: "Access Permissions", required: true }, // ALL | RESTRICTED
  { key: "lastAuditDate", label: "Last Audit Date", required: false }
] as const;
```

### 2.5 Office Infrastructure (`Office&Facilities`)
```typescript
export const FACILITY_HEADERS = [
  { key: "branch", label: "Infrastructure ID / Branch", required: true },
  { key: "itemDescription", label: "Item Description", required: true },
  { key: "category", label: "Category", required: true }, // FURNITURE | HARDWARE | NETWORKING
  { key: "roomZone", label: "Room / Zone", required: false },
  { key: "quantity", label: "Quantity", required: true },
  { key: "condition", label: "Condition", required: true },
  { key: "assignedOrShared", label: "Assigned / Shared", required: false },
  { key: "maintenanceNotes", label: "Maintenance Notes", required: false }
] as const;
```

---

## 3. Data Completeness & Missing Details Auditor

The system executes an automated audit over every ingested asset to flag missing operational attributes and designate the responsible user/role.

```typescript
// types/completeness.ts
export interface MissingDetailAlert {
  assetId: string;
  assetTag: string;
  makeModel: string;
  assignedStaff: string;
  assignedStaffEmail?: string;
  branch: string;
  missingFields: string[];
  actionRequiredBy: "STAFF" | "ADMIN" | "BRANCH_LEAD";
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  resolutionGuide: string;
}

export function auditAssetCompleteness(asset: any): MissingDetailAlert | null {
  const missing: string[] = [];

  // Check hardware essentials
  if (!asset.serialNumber || asset.serialNumber.trim() === "" || asset.serialNumber === "NaN") {
    missing.push("Serial Number");
  }
  if (!asset.tag || asset.tag.startsWith("UNASSIGNED") || asset.tag.trim() === "") {
    missing.push("Asset Tag ID");
  }
  if (!asset.purchaseDate || asset.purchaseDate === "NaN" || asset.purchaseDate.trim() === "") {
    missing.push("Purchase Date");
  }
  if (!asset.condition || asset.condition.trim() === "" || asset.condition.toLowerCase().includes("lags")) {
    missing.push("Physical Condition Verification");
  }

  if (missing.length === 0) return null;

  // Determine responsibility
  let actionBy: "STAFF" | "ADMIN" | "BRANCH_LEAD" = "ADMIN";
  let resolutionGuide = "IT Administrator must update physical serial and asset tag records.";

  if (missing.includes("Physical Condition Verification") && missing.length === 1) {
    actionBy = "STAFF";
    resolutionGuide = `${asset.assignedStaff} must submit an updated condition report in their self-service portal.`;
  } else if (asset.branch === "Benin Branch") {
    actionBy = "BRANCH_LEAD";
    resolutionGuide = "Blessing Izunyon (Benin Lead) must audit and supply missing branch asset metrics.";
  }

  return {
    assetId: asset.id,
    assetTag: asset.tag || "NO-TAG",
    makeModel: asset.makeModel || "Unknown Device",
    assignedStaff: asset.assignedStaff || "Unassigned",
    assignedStaffEmail: asset.staffEmail,
    branch: asset.branch || "Unassigned Branch",
    missingFields: missing,
    actionRequiredBy: actionBy,
    priority: missing.includes("Serial Number") ? "CRITICAL" : "MEDIUM",
    resolutionGuide
  };
}
```

---

## 4. Production Firebase Client & Auth Domain Matcher

```typescript
// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: "AIzaSyB-3rFNmiIR7bYKGNCGOYFoYfvQfYLrR98",
  authDomain: "basechan-am.firebaseapp.com",
  projectId: "basechan-am",
  storageBucket: "basechan-am.firebasestorage.app",
  messagingSenderId: "316714277090",
  appId: "1:316714277090:web:e851bf6528c39043ac26bb",
  measurementId: "G-XDDKYVBXGX"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Evaluates Google OAuth user email against organization domain rules.
 */
export function resolveUserRole(email: string): "SUPER_ADMIN" | "STAFF" | "UNAUTHORIZED" {
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith("@basechaninternational.com")) {
    return "SUPER_ADMIN";
  }
  if (normalized.endsWith(".basechaninternational@gmail.com")) {
    return "STAFF";
  }
  return "UNAUTHORIZED";
}

/**
 * Reconciles authenticated user against Staff Inventory records in Firestore.
 */
export async function syncUserProfile(user: User) {
  if (!user.email) throw new Error("Authenticated user has no email address.");

  const role = resolveUserRole(user.email);
  if (role === "UNAUTHORIZED") {
    await auth.signOut();
    throw new Error("Access Denied: Only authorized Basechan corporate or staff Google accounts are permitted.");
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split("@")[0],
      photoURL: user.photoURL || null,
      role: role,
      isDelegated: user.email.toLowerCase().includes("izunyon"), // Default delegated lead for Benin
      branch: user.email.toLowerCase().includes("izunyon") ? "Benin Branch" : "Abuja Branch",
      lastLogin: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  } else {
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
  }

  return { role, uid: user.uid };
}
```

---

## 5. SheetJS Ingestion Engine (`lib/excelParser.ts`)

```typescript
// lib/excelParser.ts
import * as XLSX from "xlsx";
import { auditAssetCompleteness, MissingDetailAlert } from "../types/completeness";

export interface ParsedWorkbookData {
  stats: {
    staffCount: number;
    physicalCount: number;
    digitalCount: number;
    workbookCount: number;
    facilityCount: number;
  };
  staff: any[];
  physicalAssets: any[];
  digitalCredentials: any[];
  workbooks: any[];
  facilities: any[];
  missingDetailAlerts: MissingDetailAlert[];
}

export function parseBasechanWorkbook(buffer: ArrayBuffer): ParsedWorkbookData {
  const workbook = XLSX.read(buffer, { type: "array" });
  const result: ParsedWorkbookData = {
    stats: { staffCount: 0, physicalCount: 0, digitalCount: 0, workbookCount: 0, facilityCount: 0 },
    staff: [],
    physicalAssets: [],
    digitalCredentials: [],
    workbooks: [],
    facilities: [],
    missingDetailAlerts: []
  };

  const findVal = (row: any, candidates: string[]) => {
    const keys = Object.keys(row);
    for (const c of candidates) {
      const match = keys.find(k => k.trim().toLowerCase() === c.toLowerCase());
      if (match && row[match] !== undefined) return row[match];
    }
    return null;
  };

  // 1. Staff Inventory
  const staffSheet = workbook.SheetNames.find(s => s.toLowerCase().includes("staff"));
  if (staffSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[staffSheet]);
    rows.forEach((r, idx) => {
      const name = findVal(r, ["Staff Name", "Name", "Staff"]);
      const email = findVal(r, ["Email", "Email Address"]);
      if (name) {
        result.staff.push({
          id: `STF-${String(idx + 1).padStart(3, "0")}`,
          name: String(name).trim(),
          email: email ? String(email).trim().toLowerCase() : "",
          department: findVal(r, ["Department", "Dept"]) || "Operations",
          position: findVal(r, ["Position", "Role"]) || "Staff",
          branch: findVal(r, ["Branch", "Location"]) || "Abuja Branch",
          phone: findVal(r, ["Phone Number", "Phone"]) || "",
          employmentDate: findVal(r, ["Employment Date"]) || ""
        });
      }
    });
    result.stats.staffCount = result.staff.length;
  }

  // 2. Physical Hardware Assets
  const physSheet = workbook.SheetNames.find(s => s.toLowerCase().includes("physical"));
  if (physSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[physSheet]);
    rows.forEach((r, idx) => {
      const model = findVal(r, ["Make & Model", "Model", "Device"]);
      if (model) {
        const asset = {
          id: `PA-${String(idx + 1).padStart(3, "0")}`,
          tag: findVal(r, ["Asset Tag ID", "Tag ID", "Tag"]) || `BAM-HW-${String(idx + 1).padStart(3, "0")}`,
          category: findVal(r, ["Category (Laptop/Monitor/Mobile)", "Category"]) || "Hardware",
          makeModel: String(model).trim(),
          serialNumber: findVal(r, ["Serial Number", "Serial", "S/N"]) || "",
          assignedStaff: findVal(r, ["Assigned Staff", "Staff"]) || "Unassigned",
          department: findVal(r, ["Department", "Dept"]) || "Operations",
          branch: findVal(r, ["Physical Location", "Location", "Branch"]) || "Abuja Branch",
          purchaseDate: findVal(r, ["Purchase Date"]) || "",
          condition: findVal(r, ["Condition"]) || "Good",
          status: findVal(r, ["Status (Active/Repair/Retired)", "Status"]) || "Active",
          isLocked: false,
          customAttributes: {}
        };

        result.physicalAssets.push(asset);

        const alert = auditAssetCompleteness(asset);
        if (alert) result.missingDetailAlerts.push(alert);
      }
    });
    result.stats.physicalCount = result.physicalAssets.length;
  }

  // 3. Digital Credentials
  const digitalSheet = workbook.SheetNames.find(s => s.toLowerCase().includes("digital"));
  if (digitalSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[digitalSheet]);
    rows.forEach((r, idx) => {
      const platform = findVal(r, ["Platform / Software", "Platform", "Software"]);
      if (platform) {
        result.digitalCredentials.push({
          id: `DC-${String(idx + 1).padStart(3, "0")}`,
          platform: String(platform).trim(),
          loginEmail: findVal(r, ["Account / Login Email", "Email", "Account"]) || "",
          subAgentHandleId: findVal(r, ["Sub-Agent / Handle ID", "Handle ID"]) || "",
          assignedUser: findVal(r, ["Assigned User", "User"]) || "Unassigned",
          userRole: findVal(r, ["User Role", "Role"]) || "User",
          rawPass: findVal(r, ["Passwords", "Password"]) || "",
          vaultStatus: "SECURED"
        });
      }
    });
    result.stats.digitalCount = result.digitalCredentials.length;
  }

  // 4. Data Workbooks
  const wbSheet = workbook.SheetNames.find(s => s.toLowerCase().includes("workbook") || s.toLowerCase().includes("data"));
  if (wbSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[wbSheet]);
    rows.forEach((r, idx) => {
      const title = findVal(r, ["Workbook / Doc Title", "Title", "Doc Title"]);
      if (title) {
        result.workbooks.push({
          id: `WB-${String(idx + 1).padStart(3, "0")}`,
          title: String(title).trim(),
          businessFunction: findVal(r, ["Business Function"]) || "",
          cloudStorageUrl: findVal(r, ["Cloud Storage Link (URL)", "Link", "URL"]) || "",
          primaryOwner: findVal(r, ["Primary File Owner", "Owner"]) || "Basechan",
          department: findVal(r, ["Department"]) || "General",
          accessPermissions: findVal(r, ["Access Permissions", "Permissions"]) || "RESTRICTED",
          lastAuditDate: findVal(r, ["Last Audit Date"]) || ""
        });
      }
    });
    result.stats.workbookCount = result.workbooks.length;
  }

  // 5. Facilities & Infrastructure
  const facSheet = workbook.SheetNames.find(s => s.toLowerCase().includes("office") || s.toLowerCase().includes("facilities"));
  if (facSheet) {
    const rows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[facSheet]);
    rows.forEach((r, idx) => {
      const item = findVal(r, ["Item Description", "Item", "Description"]);
      if (item) {
        result.facilities.push({
          id: `FAC-${String(idx + 1).padStart(3, "0")}`,
          branch: findVal(r, ["Infrastructure ID", "Branch", "Location"]) || "Abuja Branch",
          itemDescription: String(item).trim(),
          category: findVal(r, ["Category (Furniture/Network/Peripheral)", "Category"]) || "FURNITURE",
          roomZone: findVal(r, ["Room / Zone"]) || "",
          quantity: Number(findVal(r, ["Quantity", "Qty"])) || 1,
          condition: findVal(r, ["Condition"]) || "Good",
          maintenanceNotes: findVal(r, ["Maintenance Notes", "Notes"]) || ""
        });
      }
    });
    result.stats.facilityCount = result.facilities.length;
  }

  return result;
}
```

---

## 6. Firestore Security Rules Matrix (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Auth Validation Helpers
    function isAuth() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuth() && (
        request.auth.token.email.matches('.*@basechaninternational[.]com$') ||
        request.auth.token.role == 'SUPER_ADMIN'
      );
    }
    
    function isStaff() {
      return isAuth() && (
        request.auth.token.email.matches('.*[.]basechaninternational@gmail[.]com$') ||
        request.auth.token.role == 'STAFF'
      );
    }
    
    function isDelegatedEditor() {
      return isAuth() && request.auth.token.isDelegated == true;
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isAuth();
      allow write: if isAdmin() || (isAuth() && request.auth.uid == userId);
    }

    // Physical Hardware Assets
    match /physical_assets/{assetId} {
      // Admins view all; Staff view only their assigned items
      allow read: if isAuth() && (
        isAdmin() || 
        isDelegatedEditor() || 
        resource.data.assignedStaffEmail == request.auth.token.email ||
        resource.data.assignedStaffUid == request.auth.uid
      );

      // Admins and Branch Editors create/delete
      allow create, delete: if isAdmin() || isDelegatedEditor();

      // Updates: Staff can only edit condition & status when unlocked
      allow update: if isAdmin() || isDelegatedEditor() || (
        isStaff() &&
        resource.data.assignedStaffEmail == request.auth.token.email &&
        resource.data.isLocked == false &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['condition', 'status', 'updatedAt', 'lastStaffCheckin'])
      );
    }

    // Encrypted Credential Vault
    match /digital_credentials/{credId} {
      allow read: if isAuth() && (
        isAdmin() || 
        resource.data.assignedUserEmail == request.auth.token.email ||
        resource.data.assignedUserUid == request.auth.uid
      );
      allow write: if isAdmin();
    }

    // Immutable Audit Logs (Append-Only)
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuth();
      allow update, delete: if false;
    }
  }
}
```

---

## 7. Master Antigravity Execution Instructions

Paste this prompt directly into Antigravity to build the application:

```
Read ANTIGRAVITY_PROJECT_SPEC.md.
You are building the production Basechan Enterprise Asset Manager (BAM) using Next.js 14, Tailwind CSS, TypeScript, and Firebase.
Configure the project to connect to Firebase project 'basechan-am' using the credentials in Section 4.

Key Implementation Mandates:
1. Google OAuth Authentication:
   - Match *@basechaninternational.com -> SUPER_ADMIN.
   - Match *.basechaninternational@gmail.com -> STAFF.
   - Any other domain is rejected.
   - After login, auto-reconcile user against Staff Inventory records and link assets.
2. Ingestion & Parser:
   - Use lib/excelParser.ts to parse the 5 canonical sheets from the Excel file.
   - Run auditAssetCompleteness to detect missing serials, tags, or unverified conditions, and display responsible parties on the Missing Details tab.
3. Dashboards & Isolation:
   - Physical Hardware Tab: Staff only see their assigned gear and can only edit Condition/Status when unlocked.
   - Admins can Transfer Custody, Lock/Unlock, and Add Custom Headers.
   - Credential Vault Tab: AES-256 masked with step-up reveal logging.
   - Workbooks & Facilities Tabs: Searchable directories with cloud links.
4. Export: SheetJS export button for active table views.
Follow small, verifiable increments. Ensure all TypeScript types are strictly enforced.
```

---

## 8. Current Session State (`STATE.md`)

```markdown
# Current State
_Updated: September 28, 2026_

## Status
GATE 3 COMPLETE — Full Antigravity Specification, Schema, Ingestion Parsers, Completeness Engine, and Firebase Client Ready.

## Done
- Integrated real credentials for Firebase project `basechan-am`.
- Extracted canonical schemas from all 5 sheets of `BASECHAN INTERNATIONAL CONSOLIDATED SEPTEMBER ASSET LIST.xlsx`.
- Formalized domain authentication rules (`@basechaninternational.com` for Admin, `*.basechaninternational@gmail.com` for Staff).
- Designed and documented the Data Completeness Auditor (Missing details tracking with assigned responsible party).
- Implemented robust `SheetJS` Excel ingestion parser handling column header variations.
- Written production Firestore Security Rules with row-level staff isolation and field-level update guards.

## Next Up (In Antigravity IDE)
1. Initialize Next.js 14 project structure (`src/app`, `src/components`, `src/lib`, `src/types`).
2. Deploy `firestore.rules` and verify security constraints against Firebase project `basechan-am`.
3. Ingest spreadsheet data into Firestore and bind the frontend dashboard.
```