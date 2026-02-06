# Asset Manager — Project Overview

A full-stack **asset and policy management web application** for organizations to track employees, licenses, laptops, monitors, and company policies. Built with **React 19**, **TypeScript**, **Firebase** (Auth + Firestore), and **Supabase Storage**, with role-based access and a modern UI.

---

## Links

| | |
|--|--|
| **Repository** | [github.com/PRITHVI-B-S-18/AssetManager](https://github.com/PRITHVI-B-S-18/AssetManager) |
| **Live app** | Deploy via Firebase Hosting (`npm run deploy`) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 7, React Router 7 |
| **State & data** | React Context (Auth, User Roles, Sections, Toast), TanStack Virtual (large lists) |
| **Backend / DB** | Firebase Auth (Email/Password), Cloud Firestore (real-time, offline cache) |
| **File storage** | Supabase Storage (policy PDFs, folders) |
| **Import/Export** | SheetJS (xlsx), CSV |
| **Hosting** | Firebase Hosting (SPA) |
| **Tooling** | ESLint, TypeScript strict mode |

---

## Features

### Authentication & roles

- **Email/password** sign-in and sign-up (Firebase Auth).
- **Role-based access**: **Admin** (full access) and **Viewer** (read-only). Roles stored in Firestore `users/{uid}` with `config/app` for initial admins.
- **Manage Users** (admin-only): list users, change role (viewer ↔ admin).
- **Protected routes**: unauthenticated users redirect to Login; Firestore/Sections load only after auth.

### Asset management (Firestore)

- **12 built-in sections**: All Emp, All Emp License, All dept groups, All Laptop, Non Laptop users, Laptop courier details, Under ticket- Laptops, Backup, Windows MAC address, MAC - MAC address, DL Groups, All Monitors.
- **Custom sections**: Admins can add sections and define columns in **Settings**; stored in Firestore and merged with built-ins.
- **Per-section data**: Each section has its own Firestore collection; real-time listeners with optional **paginated loading** (e.g. first 50 records, load more on demand) to reduce reads.
- **CRUD**: Add, edit, duplicate, delete records; **bulk edit** (select rows, update a column for all). For monitors/MAC sections, “Add” can mean add asset or assign user to existing.
- **Search & filter**: Full-text search across visible columns; per-column filter dropdowns (e.g. license type, laptop type) with case-insensitive deduplication.
- **Sorting**: Sort by any column (asc/desc).
- **Column visibility**: Show/hide columns per section; preference stored in `localStorage`.
- **Date handling**: Date columns support YYYY-MM-DD, DD-MMM-YY (e.g. 01-Mar-25), and Excel serial dates; Emp ID kept as string.
- **Import/Export**: CSV and Excel (xlsx) import with preview and column mapping; export per section. Import supports date formats above and string Emp ID.

### Policies (Supabase Storage)

- **Policy section**: Dedicated area for policy PDFs (sidebar → Policies).
- **Folders**: Create folders and upload PDFs into the current folder; navigate with a **Back** button and read-only **Location** (e.g. Root / HR Policies).
- **Actions**: View (new tab), **direct download** (blob download, no new tab), Delete (admin). Display name strips timestamp prefix (e.g. `Advanced_ML_Techniques_TOC.pdf`).
- **Permissions**: Viewers can view and download; admins can create folders, upload, and delete. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; bucket `policies` with public read and anon policies for list/upload/delete.

### UI/UX

- **Layout**: Sidebar (collapsible), breadcrumbs, responsive content area.
- **Theme**: Pastel, clean palette (CSS variables); cards, buttons, data tables, modals.
- **Toasts**: Success/error/info toasts for actions.
- **Confirm dialogs** for delete and destructive actions.
- **Error boundary** for React errors.

---

## Architecture

### Routing

- **Public**: `/login`, `/signup`.
- **Protected** (requires auth, then `UserRoleProvider` + `SectionsProvider`): `/` (Dashboard), `/section/:sectionId`, `/settings`, `/manage-users`, `/policies`.
- Catch-all redirects to `/`.

### State & context

- **AuthContext**: Firebase Auth state (user, loading).
- **UserRoleProvider** (UserRoleContext + roleContext.ts): Fetches/syncs user role from Firestore `users/{uid}` and `config/app`; exposes `useUserRole`, `useCanEdit`.
- **SectionsProvider**: Subscribes to Firestore `sections`; provides section list (built-in + custom) to the app.
- **ToastContext**: Global toast notifications.

### Services

- **auth.ts**: Sign in, sign up, sign out, change password.
- **firestore.ts**: Sections (list, subscribe, add, update, delete), records (subscribe, subscribePaginated, count, add, update, delete), user profile (ensure, subscribe), getUsers, setUserRole. Handles permission-denied on sign-out without logging.
- **policyStorage.ts**: List folders/files at path, create folder, upload PDF, get public URL, download blob, delete file/folder (recursive) via Supabase Storage.

### Security

- **Firestore rules**: Authenticated read for sections and section data; write only if user is not a viewer (or no user doc). Users can read/write own profile (email sync); only admins change roles or delete users. `config/app` read-only.
- **Supabase**: Policies bucket with anon policies for list/insert/delete; app restricts upload/delete to `canEdit` (admin) in the UI.

---

## Project structure

```
src/
├── App.tsx                 # Routes, ProtectedRoute, providers
├── main.tsx
├── firebase.ts             # Firebase config (env)
├── supabase.ts             # Supabase client (env)
├── index.css               # Global styles, theme
├── components/
│   ├── Layout.tsx          # Sidebar, nav, user, sign out
│   ├── DataTableSection.tsx # Section table, search, filter, sort, CRUD, import/export, bulk edit
│   ├── RecordModal.tsx     # Add/Edit record form
│   ├── BulkEditModal.tsx   # Bulk update selected rows
│   ├── ImportExport.tsx    # Import/export UI and logic
│   ├── ImportPreviewModal.tsx
│   ├── ImportProgressModal.tsx
│   ├── SectionEditModal.tsx
│   ├── ConfirmDialog.tsx
│   ├── Breadcrumbs.tsx
│   ├── Tooltip.tsx, Icons.tsx, IconDropdown.tsx
│   └── ErrorBoundary.tsx
├── context/
│   ├── AuthContext.tsx
│   ├── UserRoleContext.tsx # Provider only
│   ├── roleContext.ts      # Context value type and instance
│   ├── useUserRole.ts
│   ├── useCanEdit.ts
│   ├── SectionsContext.tsx, SectionsProvider.tsx, useSectionsContext.ts
│   ├── sectionContextValue.ts
│   └── ToastContext.tsx
├── pages/
│   ├── Login.tsx, SignUp.tsx
│   ├── Dashboard.tsx       # Section cards
│   ├── SectionPage.tsx     # Renders DataTableSection
│   ├── Settings.tsx        # Sections list, add/edit/delete section
│   ├── ManageUsers.tsx     # User list, change role (admin)
│   └── Policies.tsx        # Folders, upload, view, download, delete PDFs
├── services/
│   ├── auth.ts
│   ├── firestore.ts
│   └── policyStorage.ts
├── types/
│   └── sections.ts         # SectionConfig, BUILT_IN_SECTIONS, etc.
└── utils/
    └── dateFormat.ts       # Date parse/format, Excel serial, DD-MMM-YY
```

---

## Setup & run

1. **Clone and install**
   ```bash
   git clone https://github.com/PRITHVI-B-S-18/AssetManager.git
   cd AssetManager
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`.
   - Set Firebase vars: `VITE_FIREBASE_*` (apiKey, authDomain, projectId, etc.).
   - Set Supabase vars for Policies: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

3. **Firebase**
   - Enable Email/Password sign-in; create at least one user (or use Sign Up).
   - Create Firestore DB; deploy `firestore.rules`. Optionally set `config/app` with `adminUids: ["uid1", "uid2"]` for initial admins.

4. **Supabase (optional, for Policies)**
   - Create project; add public bucket `policies` and storage policies (see `supabase-policies-setup.md`).

5. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173).

---

## Deployment

- **Build**: `npm run build` (output in `dist/`).
- **Firebase Hosting**: `npm run deploy` (build + `firebase deploy`). SPA rewrites in `firebase.json`; Firestore rules deployed with hosting config.

---

## Portfolio highlights

- **Full-stack**: Auth, real-time DB, file storage, role-based UI, and deployment pipeline.
- **Scale-conscious**: Paginated Firestore reads, optional full fetch for search/filter, offline persistence.
- **Data handling**: Import/export (CSV/xlsx), multiple date formats, column mapping, bulk edit.
- **Dual backend**: Firebase for app data and auth; Supabase for policy PDFs (cost-effective storage).
- **UX**: Direct PDF download (no new-tab open), clean file names, folder navigation with Back, toasts, confirmations, error boundary.
- **TypeScript**: End-to-end typing; shared types for sections and records; strict mode.

You can use this document as-is in your portfolio or trim it to a shorter “Project summary” section and link to the repo and live app.
