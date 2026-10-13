# P&D 3.0 — Firebase setup (not yet connected)

**Isolation:** Only branch \`feature/pd3-premium-experience\` and separate P&D 3.0 preview. No edits to P&D 2.0, main, original estimates app, or public website.

## Owner setup (required before cloud saving works)
1. Open https://console.firebase.google.com/ and **create a new project**, for example \`pd-buildremodel-3-private\`. Select the Spark/free plan, and leave optional Google Analytics disabled unless wanted.
2. Under **Build → Authentication → Sign-in method**, enable **Email/Password**. Under **Users**, add your owner account with a strong unique password. Never send the password to ChatGPT or commit it to GitHub.
3. Under **Build → Firestore Database**, create a database. Use production mode, then publish the repository's \`firestore.rules\` rules **before any customer data is stored**. The rules isolate every user under \`users/{uid}\` and deny all other paths. Do not use open test rules.
4. Under **Project settings → Your apps**, register a **Web** app. Copy the *public web configuration* (apiKey, authDomain, projectId, appId) into \`js/pd3-firebase-config.js\` on the **3.0 branch only**. These are public identifiers; do not provide service account private keys.
5. In Authentication → Settings → Authorized domains, add \`pd3-premium-preview.onrender.com\` if it isn't listed.
6. Test login, new client, project, estimate/invoice sync, sign-out, and access from a second browser before migrating any real records. Export existing local data first.
7. Arrange independent encrypted backup/export and recovery tests before relying on Firebase as the only copy of records.

## Photos
Photos are intentionally excluded from cloud sync. Existing photo attachments are stored in the device/browser and should be separately backed up to the user's phone. Firebase will not make those images available on other devices.

## Costs
The Spark plan can start at $0 within free quotas, but quota/pricing may change. Review usage and billing alerts before upgrading. Firestore is **not** a backup system by itself.

## Current state
The cloud adapter and restrictive security rules can be prepared in GitHub without a Firebase account. Cloud sync remains **disabled** until the owner creates the Firebase project and provides the public web configuration. Existing browser records must not be silently uploaded, overwritten or erased.
