# P&D 3.0 — private cloud API (isolated)

This is a **new, independent** cloud backend for P&D 3.0 only. It does not use or change the 2.0 database, service, Git branch, or original application.

## Not yet production-ready
The P&D 3.0 website currently stores records locally. This API must be deployed separately with a private Postgres instance and tested before real client information is entered. Do not expose it publicly until the initial owner account has been configured securely.

## Deployment checklist
1. Provision a **separate** PostgreSQL instance and private web service; confirm monthly pricing before creation.
2. Set \`DATABASE_URL\`, \`PD3_APP_ORIGIN=https://pd3-premium-preview.onrender.com\`, and \`PD3_BOOTSTRAP_TOKEN\` (long random value) as secret environment variables on the API service. Never commit credentials.
3. Run \`schema.sql\` against only the new P&D 3.0 database. Use a TLS-protected connection as supported by the hosting environment.
4. Run \`npm ci\` (after lockfile creation) or \`npm install\` and \`npm start\` from \`pd3-cloud\`. Require HTTPS at the public reverse proxy.
5. Create the first account with \`POST /api/setup\` and the one-time bootstrap token. **Immediately remove the bootstrap token** after successful setup.
6. Wire the existing 3.0 browser UI to the cloud API only after testing account login, tenant isolation, client CRUD, project CRUD, document migration, backups, and logout.
7. Implement encrypted object storage for photos before cloud photo sync; **do not** upload IndexedDB images to the JSON API.

## Safety
- Same-origin cookies are HttpOnly, Secure and SameSite=Lax.
- Mutating endpoints reject cross-origin requests and require JSON.
- All records are scoped to the authenticated owner in SQL queries.
- Existing browser data is not migrated or erased automatically.
- Export is owner-authenticated JSON; set up database backups independently.
- Password hashing uses Node's scrypt with a random salt. No plaintext password or API secrets are stored in Git.
