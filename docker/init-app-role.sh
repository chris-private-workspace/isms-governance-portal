#!/bin/bash
# File: docker/init-app-role.sh
# Purpose: Create the least-privilege login role the API connects as.
# Category: Tooling / local runtime
# Scope: Phase W02 (M2)
#
# Description:
#   The bootstrap POSTGRES_USER is a SUPERUSER — measured in W02 Day-0:
#   rolsuper=t, rolbypassrls=t. A superuser bypasses row-level security
#   entirely, and FORCE ROW LEVEL SECURITY does not constrain it. So an
#   application connecting as that role has no isolation at all, no matter how
#   correct the policies are. This creates the role it should connect as
#   instead.
#
#   ⚠️ ORDERING. Postgres runs /docker-entrypoint-initdb.d/* only when the data
#   directory is empty — i.e. BEFORE any migration has run. The `isms_app`
#   privilege group is created BY the migration, so it does not exist yet at
#   this point. That is why this script only creates the login role, and the
#   migration grants membership conditionally (`IF EXISTS`). Either order
#   reaches the same end state.
#
#   ⚠️ EXISTING VOLUMES. Developers who already have a data directory will
#   never run this file. `npm run db:app-role` applies the same steps to a
#   running database; it is idempotent.
#
# Created: 2026-08-09 (Phase W02)
# Last Modified: 2026-08-09
#
# Modification History (newest-first):
#   - 2026-08-09: Initial creation (Phase W02) — least-privilege app role
set -euo pipefail

APP_USER="${POSTGRES_APP_USER:-isms_app_user}"
APP_PASSWORD="${POSTGRES_APP_PASSWORD:-isms_app_local_only}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_USER}') THEN
	    CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_PASSWORD}';
	  END IF;
	END
	\$\$;

	-- Connect privilege only. Everything else arrives via membership of the
	-- isms_app group, which the migration defines and grants table by table.
	GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_USER};

	-- Belt and braces: neither attribute is default, but both are the exact
	-- thing that would silently void every policy, so state them.
	ALTER ROLE ${APP_USER} NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

	-- If the migration already ran (existing volume, re-run via npm), pick up
	-- membership now rather than requiring a third step.
	DO \$\$
	BEGIN
	  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'isms_app') THEN
	    GRANT isms_app TO ${APP_USER};
	  END IF;
	END
	\$\$;
EOSQL

echo "[init-app-role] ${APP_USER} ready (NOSUPERUSER, NOBYPASSRLS)"
