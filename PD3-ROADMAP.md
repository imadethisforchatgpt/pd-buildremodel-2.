# P&D 3.0 — Premium Experience (isolated experiment)

## Ownership and isolation
- Development branch: `feature/pd3-premium-experience`.
- Starting point: `backup/pd2-before-experiment-2026-10-12` (snapshot at branch creation).
- P&D 2.0's active branch `feature/document-workflows-stage-1` is managed by another conversation. Never push, merge, reset, rebase, or deploy that branch from this workstream.
- Do not alter `main`, the original P&D Estimates & Invoices application, the public P&D website, the P&D 2.0 test service, or the existing P&D 2.0 preview service.
- Create a distinct P&D 3.0 hosting service and isolated data only after the setup has been reviewed. Never point the existing 2.0 Render service at this branch.
- Keep the original app's data, browser storage, and IndexedDB photos untouched. Git branches are not backups of browser-stored customer records.
- If changes from 2.0 are later wanted, review and selectively cherry-pick or port only approved features after comparing diffs and testing.

## Product vision
P&D 3.0 should feel as approachable as the original P&D Estimates & Invoices app while preserving useful advanced capabilities. The original is the reference for navigation, menus, workflow simplicity, and visual polish. Do not treat the original as a source-code replica unless its source is explicitly accessible and authorized.

## Design principles
1. Fast, obvious navigation on mobile and desktop; no hidden core actions.
2. Start an estimate in one clear path. Keep advanced options contextual or collapsible.
3. Premium, restrained styling, with excellent typography, accessibility, touch targets and legible financial figures.
4. Separate planned installments from actual payments. Never confuse a schedule with received money.
5. Consistent and printable estimates, invoices, photo descriptions, and client-ready documents.
6. Preserve client records and existing working behaviors while iterating; design changes require regression checks.
7. Make undo/cancel/back actions clear. Avoid accidental destructive operations.

## Work sequence
- [x] Establish isolated GitHub branch from the preserved backup.
- [x] Inspect navigation and core flows in the current code.
- [ ] Review reference app's actual UI with authorized screenshots or direct inspection.
- [x] Implement first-pass P&D 3.0 identity, desktop sidebar, iPhone navigation, and dedicated dashboard.
- [ ] Streamline estimate, invoice, and payment flows beyond the inherited functionality.
- [ ] Improve client management and document/photos workflows.
- [x] Add isolated automated mobile/desktop, persistence, estimate, invoice and payment smoke tests.\n- [ ] Confirm those tests pass and review generated screenshots and document output.
- [x] Use separate 3.0 localStorage, IndexedDB photo storage, and estimate draft recovery keys.\n- [ ] Deploy to a separate P&D 3.0 preview after the Render workspace is confirmed.
- [ ] Compare original, 2.0 and 3.0 with the owner before considering a winner.

## Release rule
No version is promoted, replaced, merged into `main`, or connected to a production subdomain without explicit owner approval.
