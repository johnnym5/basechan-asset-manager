# BCAM Security Architecture & Access Control

## 1. Authentication & Identity
- **Provider:** Firebase Authentication (Google OAuth 2.0).
- **Domain Verification:** Corporate accounts ending in `@basechaninternational.com` are assigned `SUPER_ADMIN` role; staff accounts matching `*basechaninternational@gmail.com` are assigned `STAFF` role. All other accounts are rejected as `UNAUTHORIZED`.
- **Session Management:** OAuth tokens are managed directly by Firebase Auth SDK with secure persistence and auto-refresh.

## 2. Authorization & Least-Privilege Rules
- **Data Layer Enforcement:** Authorization is enforced at the Firestore Security Rules layer (`firestore.rules`). Client UI state does not replace security rules.
- **Role Hierarchy:**
  - `SUPER_ADMIN`: Full organization-wide read, write, archive, and configuration access across all collections.
  - `STAFF`: Scoped read/write access based on direct assignment or explicit `access_grants` (e.g. `assigned`, `branch`, or `all` scope per resource).
- **Report & Template Boundaries:**
  - `weeklyReports`: Staff can only read and edit their own reports in `DRAFT` or `LATE_UNLOCKED` status. `SUBMITTED` reports are frozen and read-only to staff.
  - `reportTemplates`: Global admin template (`global_admin`) can only be modified by admins. Staff can only create/edit personal templates (`reportTemplates/{uid}`).
  - `monthlyPackages`: Restricted to the package owner or admin.
  - `lateUnlockRequests`: Managed exclusively by `SUPER_ADMIN`.

## 3. Credential Vault Security
- **Secret Isolation:** Passwords and API secrets are stored separately in `credential_secrets/{credentialId}`.
- **Step-Up Audit Logging:** Revealing a secret requires a write to `vault_access_logs` (recording actor UID, email, role, credential ID, and timestamp).
- **Listing Prohibited:** `allow list: if false;` on `credential_secrets` prevents bulk retrieval or database dumping.
- **Sanitization:** Secret fields (`rawPass`, `secret`) are explicitly stripped from activity logs and Excel exports.

## 4. Audit Logging
- **`audit_logs` Collection:** Append-only log of system activity.
- **Read Scoping:** Restricted to admins, the actor who generated the event (`actorUid == request.auth.uid`), or users in the explicit `visibilityUids` array.
- **Immutability:** Updates and deletions on `audit_logs` are strictly denied by Firestore rules.
