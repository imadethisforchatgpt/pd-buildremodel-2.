-- Isolated P&D 3.0 cloud database. Never run against P&D 2.0.
CREATE TABLE IF NOT EXISTS pd3_users (
 id uuid PRIMARY KEY,
 email text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pd3_sessions (
 token_hash text PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES pd3_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pd3_sessions_user_idx ON pd3_sessions(user_id);
CREATE TABLE IF NOT EXISTS pd3_clients (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES pd3_users(id) ON DELETE CASCADE,
 name text NOT NULL,
 phone text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 billing_address text NOT NULL DEFAULT '',
 jobsite_address text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pd3_clients_owner_idx ON pd3_clients(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS pd3_projects (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES pd3_users(id) ON DELETE CASCADE,
 client_id uuid NOT NULL,
 name text NOT NULL,
 status text NOT NULL DEFAULT 'Planning',
 jobsite_address text NOT NULL DEFAULT '',
 measurements text NOT NULL DEFAULT '',
 materials text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 warranty text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT pd3_projects_client_owner_fk FOREIGN KEY (client_id)
   REFERENCES pd3_clients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS pd3_projects_owner_idx ON pd3_projects(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS pd3_documents (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES pd3_users(id) ON DELETE CASCADE,
 client_id uuid,
 project_id uuid,
 kind text NOT NULL CHECK (kind IN ('estimate','invoice')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (client_id) REFERENCES pd3_clients(id) ON DELETE SET NULL,
 FOREIGN KEY (project_id) REFERENCES pd3_projects(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS pd3_documents_owner_idx ON pd3_documents(user_id, updated_at DESC);
