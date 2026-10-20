# Basechan Enterprise Asset Manager (BCAM)

> **Enterprise Asset Management Platform** for physical hardware inventory, digital credential vaults, workbook documents, office facilities, staff directory, and automated compliance auditing.

Built with **Next.js 14 (App Router)**, **React**, **Tailwind CSS**, and **Firebase (Cloud Firestore & OAuth)**.

---

## 🚀 Key Modules & Features

### 1. 💻 Physical Hardware Asset Register
- **Card Grid & Table Views**: Responsive card grids and dense data tables with search and multi-attribute filters.
- **Sequential Detail Pop-ups**: In-modal forward (`>`) and backward (`<`) navigation with arrow key shortcuts to step through asset records without closing the modal.
- **Custody & Lock Controls**: Management lock toggles, repair requests, and staff custody transfer workflows.
- **Custom Field Headers**: Ability to add dynamic custom attribute key-value pairs (e.g., RAM, Storage, Serial).

### 2. 🔑 Digital Credentials Vault
- **Encrypted Credential Storage**: Secure vault storing platform logins, sub-agent handles, and role bindings.
- **Audit-Logged Passwords**: Password reveals are logged to `vault_access_logs` in Firestore with user identity and timestamp.
- **Vault Status Indicators**: `SECURED` and `UNRESTRICTED` status tags.

### 3. 📊 Data & Workbooks Register
- **Operational Files**: Registry of corporate Excel files, financial workbooks, and cloud storage links (Google Drive / OneDrive / SharePoint).
- **Owner & Audit Bindings**: Bound to primary file owners, business functions, departments, and audit dates.

### 4. 🏢 Office & Facilities Inventory
- **Branch Equipment & Infrastructure**: Categorized furniture, networking, and room/zone infrastructure across corporate locations (Abuja HQ and Benin Branch).
- **Quantity & Condition Tracking**: Unit count, allocation, and maintenance logs.

### 5. 👥 Staff Directory & Personnel Bindings
- **Personnel Profiles**: Directory of corporate staff across departments and locations.
- **Gear Bindings**: Fuzzy token matching showing the exact count of assigned laptops and physical assets per staff member.

### 6. 📋 Task Inbox & Dispatch Command
- **Admin Task Assignment**: Administrators can dispatch tasks, stocktake inspections, or repair verifications directly to staff members.
- **Real-Time Task Delivery**: Live sync via Firestore subscriptions to assigned personnel inboxes.

### 7. ⚠️ Data Completeness & Missing Details Auditor
- **Compliance Engine**: Automated audit rules identifying missing serial numbers, unassigned tags, or unverified hardware.
- **Priority Escalation**: Categorized as `CRITICAL`, `HIGH`, or `MEDIUM` urgency.

### 8. 📊 Excel Ingestion & Sync Engine
- **Bulk Spreadsheet Parsing**: Upload multi-sheet Excel workbooks (`.xlsx`) to parse assets, staff, credentials, workbooks, and facilities simultaneously into Firestore.
- **Data Export**: Export filtered views across all registers to Excel format.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Static Export)
- **UI & Styling**: [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend & Auth**: [Firebase Auth](https://firebase.google.com/docs/auth) (Google OAuth), [Cloud Firestore](https://firebase.google.com/docs/firestore)
- **Data Engine**: [SheetJS (xlsx)](https://sheetjs.com/)
- **Hosting & Deployment**: [Firebase Web Hosting](https://firebase.google.com/docs/hosting)

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/basechan-asset-manager.git
   cd basechan-asset-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build and Export for Production**:
   ```bash
   npm run build
   ```

6. **Deploy to Firebase Hosting**:
   ```bash
   npx firebase-tools deploy
   ```

---

## 🔒 Security & Access Control

Role resolution is automatically derived from authenticated Google accounts:
- **Super Admin**: `@basechaninternational.com` emails receive full organization-wide read/write/delete permissions.
- **Staff**: Explicit staff emails / `*.basechaninternational@gmail.com` receive self-service views for assigned assets and tasks.
- **Security Rules**: Enforced at the database level via `firestore.rules`.

---

## 📄 License

Copyright © Basechan International. All rights reserved.
