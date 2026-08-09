/**
 * File: apps/api/src/entity-scope/rls-direct.int.spec.ts
 * Purpose: Prove the database refuses on its own, with the application removed.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W02 (entity-scoping spike)
 * Owner: docs/rules-on-demand/multi-tenant-data.md:294-299
 *
 * Description:
 *   No Nest, no Prisma, no extension — a raw `pg` connection issuing SQL. That
 *   is the whole design: `07:55` requires access-control tests to cover the app
 *   layer "and — critically — the database/RLS layer", and a test that reaches
 *   the database through the code under test cannot tell which of the two
 *   refused. Here only one layer is present, so if a row comes back that should
 *   not, the policy is wrong.
 *
 *   It also covers the case no application test can reach: what a connection
 *   sees before anything has scoped it. ADR-0010 removed physical isolation, so
 *   these policies are the only barrier left between OpCos.
 *
 * Created: 2026-08-09 (Phase W02)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (Phase W02)
 */
import { Client } from 'pg';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';

/** A connection is per-test on purpose: `app.entity_scope` becomes *defined*
 *  once set on a session, and sharing one would carry that between cases. */
async function connect(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  return client;
}

describe('row-level security, with the application removed', () => {
  it('connects as a role the policies actually apply to', async () => {
    const client = await connect();
    try {
      const { rows } = await client.query(
        'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
      );
      // Restated here as well as in global setup: this file is the one that
      // would look most convincing while proving nothing.
      expect(rows[0].rolsuper).toBe(false);
      expect(rows[0].rolbypassrls).toBe(false);
    } finally {
      await client.end();
    }
  });

  // Which entities are visible, not how many rows: the application suite leaves
  // a retired policy behind (soft delete keeps the row), and a count assertion
  // would couple these two files' execution order together. Filtering retired
  // rows is also what a production query does — 02a's soft-delete rule means an
  // unfiltered SELECT was never representative of anything.
  const visibleEntities = async (client: Client): Promise<string[]> => {
    const { rows } = await client.query(
      'SELECT DISTINCT org_entity_id FROM policies WHERE retired_at IS NULL ORDER BY 1',
    );
    return rows.map((r) => r.org_entity_id);
  };

  it('shows only the scoped entity', async () => {
    const client = await connect();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);

      expect(await visibleEntities(client)).toEqual([SG1]);
    } finally {
      await client.end();
    }
  });

  it('shows both when the scope names both — roll-up is addition, not a bypass', async () => {
    const client = await connect();
    try {
      await client.query(`SET app.entity_scope = '${SG1},${HK1}'`);

      expect(await visibleEntities(client)).toEqual([SG1, HK1].sort());
    } finally {
      await client.end();
    }
  });

  it('refuses an insert into an entity outside the scope', async () => {
    const client = await connect();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(
        client.query(
          `INSERT INTO policies (id, org_entity_id, title, updated_at)
           VALUES (gen_random_uuid(), '${HK1}', 'planted directly', now())`,
        ),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('cannot delete at all — soft delete is a privilege, not a convention', async () => {
    const client = await connect();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      await expect(client.query('DELETE FROM policies')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('raises on a connection that has never been scoped', async () => {
    const client = await connect();
    try {
      // 42704: the GUC does not exist yet on this session.
      await expect(client.query('SELECT * FROM policies')).rejects.toMatchObject({ code: '42704' });
    } finally {
      await client.end();
    }
  });

  it('raises — not returns nothing — when the scope is set but empty', async () => {
    const client = await connect();
    try {
      await client.query("SET app.entity_scope = ''");
      // The case Day-0 measured as safe and Day-2 found was not: once the GUC
      // exists, current_setting stops raising, and before migration
      // 20260809171812 this query returned zero rows. Zero rows reads as "this
      // OpCo has no policies" — a false assurance on an ISMS platform.
      await expect(client.query('SELECT * FROM policies')).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.end();
    }
  });

  it('leaves org_entities readable, because it defines scope rather than carrying it', async () => {
    const client = await connect();
    try {
      await client.query(`SET app.entity_scope = '${SG1}'`);
      const { rows } = await client.query('SELECT count(*)::int AS n FROM org_entities');

      expect(rows[0].n).toBe(5);
    } finally {
      await client.end();
    }
  });
});
