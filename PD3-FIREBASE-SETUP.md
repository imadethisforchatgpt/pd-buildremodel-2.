# P&D 3.0 cloud integration — activation pending

## Isolation and project
Only branch `feature/pd3-premium-experience` in `imadethisforchatgpt/pd-buildremodel-2.`.
Only Render service `srv-db6r9mmk1f9s73b8m5p0`, manual deploy, workspace `tea-db4o00jtqb8s73bgbogg`.
Never modify P&D 2.0, main, the original Sites application, or the public website.
Use existing Firebase project `pdbuildremodel-e2a2e`; remain on Spark. Do not delete the mistakenly created Realtime Database or provision paid services.

## Current release
The local app includes full device backup/restore and truthful save status.
Firebase adapter code is implemented but **disabled** by `PD3_FIREBASE_CLOUD_ENABLED = false`.
No Firebase SDK loads and no customer records upload in this release.
The owner reported creating Standard Firestore in production mode on October 13; actual database creation, selected region, published rules, Auth configuration, authorized domains, and API-key restrictions still need verification.
Google administrator sign-in remains blocked by account verification/password issues. Do not solicit passwords or codes in chat.

## Cloud protocol
Version 1 stores the complete records JSON in `users/{uid}/settings/workspace-v1`.
An atomic workspace preserves all existing collections and custom fields, invoice payments/credits, settings, and array-based document links.
There is no destructive per-record migration and no implicit array reordering.
Firestore transactions compare monotonically increasing revisions. Stale offline/concurrent writes fail into explicit conflict recovery; mutation IDs prevent duplicate commits after uncertain acknowledgements.
This initial protocol has a **700 KB UTF-8 record snapshot limit**, excluding photos. Exceeding the limit retains local records and displays an error. Larger workspaces require a tested per-record protocol before activation for those datasets.
Firebase Rules restrict this exact path to the matching UID, validate the envelope, require server timestamps and sequential revisions, prohibit deletion, and deny all other paths.
JSON business fields are validated by the client; rules cannot parse the JSON payload. A signed-in account can modify its own data. No collaborator/admin roles are granted.

## User behavior after activation
Settings contains P&D email/password sign-in and account creation, separate from Google Console login.
Opening cloud records is opt-in; browser-only `pd3_preview_records_v1` remains intact.
Account caches, drafts, and local photo databases are partitioned by UID.
No photo bytes are sent to Firebase. Another device needs its own local photos or a full backup restore.
Existing guest records can be exported, reviewed, and copied once to an empty cloud workspace. Original guest records/photos remain intact.
Offline changes persist locally and retry upon reconnect. Concurrent changes pause saving, retain device records, and offer export plus opening the latest cloud snapshot. No automatic last-write-wins replacement.
Simultaneous tabs pause synchronization and save conflict copies under account-specific keys.
Sign-out restores guest records without deleting account pending changes.
Full backups include records, local photo bytes, and the active local draft; restore downloads the previous full backup first and requires explicit approval before replacement. Legacy record-only backups remain supported.
A backup only includes photos on that device; it cannot recover another device's missing images.

## Required activation checks
1. Verify the existing default Firestore database is Standard and project billing remains Spark.
2. Publish the exact current `firestore.rules`, verify active enforcement, and retain deny-all until then. A GitHub file is not evidence of publication.
3. Verify Email/Password enabled. The owner can create a P&D account privately in the app after activation. Do not reuse or request Google passwords.
4. Review authorized domain `pd3-premium-preview.onrender.com` and restrict the public web API key to required Firebase APIs; never enable Gemini or paid unrelated APIs on this key.
5. Use synthetic accounts/records to test real-project sign-in/out, own-account reads/writes, cross-account rejection, two-device sync, offline conflict recovery, payments, and backup restore.
6. Only after these pass, enable the cloud flag and manually deploy the isolated P&D 3.0 service. Offer the owner export/recovery review before importing real records.

## Validation
`node tests/pd3-cloud-core.cjs`: lossless record/payment round trips, stale offline conflict, idempotent retry, photo exclusion, byte limits, backup validation.
`node tests/pd3-cloud-qa.cjs`: browser adapter tests using a synthetic SDK/transport; no connection to the live Firebase project.
`npx -y firebase-tools@latest emulators:exec --config firebase.pd3-emulators.json --only firestore --project demo-pd3-rules 'node tests/pd3-firestore-rules.cjs'`: actual Standard Firestore emulator security-rule tests, Java 21 required.
`node tests/pd3-qa.cjs`: premium desktop/iPhone design, estimates, invoice editing, payments, and long US Letter PDF pagination.
`PD3_CHROMIUM_EXECUTABLE` optionally selects an installed browser for local QA; CI downloads its pinned browser.
These local checks do not prove live Firebase is configured. Production activation remains pending.
