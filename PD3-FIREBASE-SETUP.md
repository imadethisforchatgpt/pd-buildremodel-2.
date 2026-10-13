# P&D 3.0 — Firebase setup and verified handoff

## Scope
Use only `imadethisforchatgpt/pd-buildremodel-2.`, branch `feature/pd3-premium-experience`.
Deploy only Render service `srv-db6r9mmk1f9s73b8m5p0` in workspace `tea-db4o00jtqb8s73bgbogg`, with manual deployment.
Do not change main, P&D 2.0, the original Sites application, or the public business website.

## Existing Firebase project
Use **pdbuildremodel-e2a2e** (PDBuildRemodel), project number 615625192701.
The P&D 3.0 web app is already registered as `1:615625192701:web:7b7ae6108dd0a8eba43a94`.
Public web configuration is committed in `js/pd3-firebase-config.js`.
Do not create a replacement project or register another web app.

The owner reported Email/Password authentication enabled and a locked Realtime Database created by mistake.
These console settings have not been independently verified in this Work session.
Realtime Database is not Firestore; leave it untouched. Inspect its contents and obtain approval before any deletion.
Remain on Spark. Do not enable paid services, provision PostgreSQL, or upload photos.

## Pending console setup
1. Obtain authenticated access to the existing project through the official Firebase integration or secure browser sign-in. Never collect passwords in chat or commit administrative credentials.
2. Inspect actual Cloud Firestore status. If absent, create the default database with Standard edition, production/locked mode, preferably us-central1 when available and free-compatible.
3. Review and test `firestore.rules`, publish the rules, and verify active enforcement before uploading customer data. A repository rules file is not evidence of publication.
4. Inspect Authentication users to confirm an owner account. Any password creation is completed securely by the owner.
5. Review authorized domains and add `pd3-premium-preview.onrender.com` if needed.
6. Test with synthetic records before offering real-record migration.

## Source review — October 13, 2026
The branch head inspected was `5a28a788c58fbacf4e415d51dbfa31fabbefe676`.
The public configuration file exists, but `index.html` does not load it or a Firebase SDK.
No Firebase cloud adapter is wired into the app. Records still use `pd3_preview_records_v1`.

The prepared rules restrict supported paths to the matching authenticated UID and deny other paths.
Their collection allowlist currently covers clients, projects, estimates, invoices, payments, and settings.
The app also contains templates, feedback, businessProfile, and potentially other top-level fields.
Resolve those mappings and test the rules before integration; do not silently omit business records.

Clients, projects, and documents mostly use array positions rather than stable record IDs.
Estimate-to-invoice links include numeric `sourceEstimate` positions. Assign persistent IDs and preserve or translate links explicitly during an owner-approved migration; array positions cannot be cross-device identities.
Payments are nested in invoices and include balance/credit behavior that must survive synchronization.

Photos are stored separately in IndexedDB `pd3-preview-document-images`; document blocks hold local photo references.
The current JSON record export does not contain those image bytes. Explain this clearly and test photo backup/recovery separately.
Never upload image bytes to Firebase automatically. Preserve local attachments and PDF workflows.

## Migration and synchronization requirements
- Offer export first, review all existing fields, and test restore before migration.
- Leave the original local record snapshot intact; no automatic upload or overwrite on sign-in.
- Partition account caches and pending changes by UID; do not display another account's records.
- Preserve every supported business record, custom document field, payment entry, and local photo reference.
- Use stable IDs and idempotent writes to avoid duplicate records.
- Handle concurrent edits and stale offline changes explicitly; do not silently replace newer remote records.
- Show truthful local-save, pending, cloud-saved, offline, and error states.
- Test sign-in/out, client and project CRUD, documents and payments, two-device sync, offline recovery, export/restore, and security rejection cases.
- Keep the existing premium navigation, dashboard, 50/50 default payment terms, and Letter PDF pagination.
- Run `tests/pd3-qa.cjs`, then manually deploy only P&D 3.0 after all required checks pass.

## Work session verification
GitHub access and the isolated Render service configuration were verified.
The live premium dashboard was inspected; no app redesign was made.
All 23 checked JavaScript/inline sources passed syntax checks, and record/photo key isolation checks passed.
Full local browser QA could not run: the installed Playwright runtime lacked its browser executable and the browser download returned an invalid archive.
Firebase Console redirected to Google sign-in, which returned 502 Connection refused in the cloud browser, including after one reload.
An official Firebase integration was found and offered; its connection is pending.
Firestore creation, active rules, owner account, cloud integration, and end-to-end synchronization remain unverified.
No customer data was uploaded, no Firebase resources were deleted, and no Render deployment was triggered.
