# Admin setup (Firestore)

To make users **admins**, their Firebase Auth **UID** must be listed in Firestore.

## Steps

1. Open **Firebase Console** → your project → **Firestore Database**.
2. Create or edit this document:
   - **Collection:** `config`
   - **Document ID:** `app`
3. Add a field:
   - **Field name:** `adminUids`
   - **Type:** array
   - **Values:** add these two strings (your admin UIDs):
     - `j8mNoVsPAfWu83RW2quqWhY1HI92`
     - `3chMzSlRDDRWn3bURDm1ySNOc6A2`

So the document looks like:

```
config / app
  adminUids: ["j8mNoVsPAfWu83RW2quqWhY1HI92", "3chMzSlRDDRWn3bURDm1ySNOc6A2"]
```

4. Save.

## When it applies

- **New sign-in:** If a user has no `users/{uid}` doc yet, we create one and set `role: "admin"` when their UID is in `adminUids`, otherwise `role: "viewer"`.
- **Already signed in:** If they already have a `users/{uid}` doc (e.g. with `role: "viewer"`), adding their UID to `adminUids` does **not** change that doc. Either:
  - Have an existing admin open **Manage users** and set their role to **Admin**, or
  - In Firestore, delete the document `users/{their-uid}`; on their next sign-in we’ll recreate it and, because their UID is in `adminUids`, they’ll get admin.

## Summary

- **Yes, you need to add them in Firestore** (in `config/app` → `adminUids`) for the app to treat them as admins.
- After that, either they get admin on first sign-in, or you fix existing accounts via **Manage users** or by deleting their `users/{uid}` doc.
