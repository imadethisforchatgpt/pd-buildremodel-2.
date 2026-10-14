# P&D 3.0 launch review — October 13, 2026 (America/Chicago)

Scope: feature/pd3-premium-experience only, Render srv-db6r9mmk1f9s73b8m5p0. No changes to P&D 2.0, main, original app, or public website.

## Verified

- Desktop and iPhone-sized Chromium navigation, premium layout, estimate save/reopen/conversion, invoice editing, payment history/credit, editable 50/50 terms and prepared-by identity.
- US Letter PDF output, single-page invoice and four-page long invoice without omitted line items.
- Client and project create/edit forms; full backup export including local photos and record restore.
- Synthetic two-browser cloud transport: opt-in isolation, synchronization, offline conflicts, sign-out isolation. This is not a live Firebase verification.
- Firestore Standard emulator: user isolation, revision and schema validation, unrelated paths and deletion denied.
- JavaScript syntax and whitespace checks.

## Corrections from final sweep

- Preserve previously paid amounts when an imported invoice has an empty or partial detailed payment ledger.
- Reject null/non-object records and invalid project collections before backup restoration.
- Clear an obsolete draft when a full backup explicitly contains no draft.
- Route legacy restore controls through validated restoration and a pre-restore backup.
- Show an explicit NOT SAVED message if guest browser storage fails.

## Launch gates still open

Cloud activation remains disabled. Publish and independently verify the rules in the real Firebase project, owner authentication, authorized domains and restricted Firebase web API key. Test actual sign-in/out, two-device synchronization and offline recovery before enabling. The initial cloud snapshot is limited to 700 KB of record JSON; photos remain local. Browser tests do not establish native iPhone Safari behavior or offline cold-start availability.

Target app subdomain assumed: app.pdbuildremodel.com. No DNS or domain association changed in this review. Verify available Render custom-domain allowance before adding it; no paid upgrades authorized. Associate only the P&D 3.0 service. Set the app CNAME to pd3-premium-preview.onrender.com, validate DNS and HTTPS, and add the exact app domain to Firebase Authentication when activating cloud. Preserve root/www/MX records.

The new domain has separate localStorage and IndexedDB. Before moving devices: download a full backup from each device that contains unique records/photos; test restoration on the new domain, compare record/payment counts and open photo documents. Do not disable or redirect the original preview until recovery is verified. Do not silently merge backups from different devices.

Reference: https://render.com/docs/custom-domains
