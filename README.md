# Asset Manager

A professional web app to manage employees, licenses, laptops, monitors, and other assets. Built with **React**, **TypeScript**, and **Firebase**.

## Features

- **Authentication** – Sign in with Firebase Auth (Email/Password). User creation is admin-only, so any signed-in user has full access.
- **12 built-in sections**: All Emp, All Emp License, All dept groups, All Laptop, Non Laptop users, Laptop courier details, Under ticket- Laptops, Backup, Windows MAC address, MAC - MAC address, DL Groups, All Monitors.
- **Custom sections** – Add new sections and define columns in Settings.
- **Search & filters** – Full-text search and per-column filters on each section.
- **Import / Export** – CSV and Excel (xlsx) import and export per section.
- **Pastel UI** – Clean, professional pastel theme.

## Setup

### 1. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 2. Firebase

The app uses your existing Firebase project (`iamneo-assetmanager`).

- **Authentication**: Enable **Email/Password** sign-in in [Firebase Console](https://console.firebase.google.com) → Authentication → Sign-in method. Create users there (e.g. Authentication → Users → Add user); only those accounts can sign in.
- **Firestore**: Create a database (if not already). Deploy rules from this repo (e.g. paste `firestore.rules` in Firestore → Rules, or `firebase deploy --only firestore:rules`).

## Scripts

- `npm run dev` – Start dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build

## Project structure

- `src/firebase.ts` – Firebase config and instances
- `src/types/sections.ts` – Section and column types; built-in section definitions
- `src/services/` – Auth and Firestore CRUD
- `src/context/AuthContext.tsx` – Auth state
- `src/hooks/useSections.ts` – Load and cache sections
- `src/components/` – Layout, DataTableSection, RecordModal, ImportExport
- `src/pages/` – Login, Dashboard, SectionPage, Settings
