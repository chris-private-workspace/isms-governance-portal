/**
 * File: apps/api/src/audit-trail/audit-coverage.int.spec.ts
 * Purpose: One guard per audited model, plus the check that the allowlist still matches the write surface.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W13 (M3 slice 2 — coverage)
 * Owner: docs/02-architecture/07-wave1-build-plan.md §Security gate · AD-AuditCoverageOneTable-1
 *
 * Description:
 *   ⭐ THIS FILE COMPOSES AppModule, AND IT HAS TO. W13 Day 2 measured the
 *   alternative: the same AssetGroup create writes an audit row under AppModule
 *   and writes NOTHING under a graph built from AssetModule alone
 *   (before=9 after=9). AuditModule is @Global, but a global provider is only in
 *   a graph something pulled it into, and ScopedPrismaFactory takes the hook
 *   @Optional. So the plan's original shape — one coverage test inside each of
 *   the eleven module suites — would have asserted against a graph where the
 *   audit trail is switched off. Those tests could only have been permanently
 *   red, or written as `>= 0` and been AP-3.
 *
 *   Each test asserts EXACTLY ONE row, found BY THE REF CODE THIS WRITE ISSUED
 *   rather than by a count delta. Two integration suites now compose AppModule
 *   and jest runs suites in parallel workers against one database, so a
 *   before/after count on a shared table is a race. A reference code is unique
 *   per write, which makes "exactly one" a claim about this write and nothing
 *   else.
 *
 *   ⛔ WHAT THIS FILE CANNOT SAY. Every write below is a `create`, because a
 *   create is all any repository does today — W13 Day 0 found zero
 *   `client.*.update` and zero `.delete` in the whole tree. So "every audited
 *   model" means every model whose creates are audited. Updates and deletes are
 *   audited by construction (WRITE_OPERATIONS lists them) but nothing exercises
 *   that path yet, and CH-030 says so rather than letting the coverage number
 *   imply otherwise.
 *
 * Key Components:
 *   - auditRowsFor(): the by-ref-code lookup every coverage test shares
 *   - 'the allowlist still matches the write surface': the drift guard
 *
 * Created: 2026-08-14 (Phase W13)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W13) — fifteen models, one guard each
 *
 * Related:
 *   - apps/api/src/audit-trail/audit.module.ts — the allowlist and its derivation
 *   - apps/api/src/audit-trail/audit.int.spec.ts — the mechanism (chain, verify, 約束 8)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../bootstrap/app.module';
import { ActionRepository } from '../core-model/action.repository';
import { AssessmentInstanceRepository } from '../core-model/assessment-instance.repository';
import { AssessmentResponseRepository } from '../core-model/assessment-response.repository';
import { AssessmentTemplateRepository } from '../core-model/assessment-template.repository';
import { AssetRepository } from '../core-model/asset.repository';
import { AttestationRepository } from '../core-model/attestation.repository';
import { ControlRepository } from '../core-model/control.repository';
import { ControlTestRepository } from '../core-model/control-test.repository';
import { EvidenceRepository } from '../core-model/evidence.repository';
import { IssueRepository } from '../core-model/issue.repository';
import { PolicyRepository } from '../core-model/policy.repository';
import { RiskRepository } from '../core-model/risk.repository';
import { RmReportRepository } from '../core-model/rm-report.repository';
import { SoaRepository } from '../core-model/soa.repository';
import { EntityScopeResolver } from '../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../entity-scope/scoped-prisma.provider';
import { AUDITED_MODELS } from './audit.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const SG1_ASSET_GROUP = '00000000-0000-0000-0000-000000000a10';
const SG1_ASSET = '00000000-0000-0000-0000-000000000a20';
const THREAT = '00000000-0000-0000-0000-000000000a30';
const VULN = '00000000-0000-0000-0000-000000000a40';
const SG1_CONTROL = '00000000-0000-0000-0000-000000000a50';
const SG1_CONTROL_TEST = '00000000-0000-0000-0000-000000000a60';
const SG1_ISSUE = '00000000-0000-0000-0000-000000000a80';
/** W14. A seeded policy, used as an attestation subject. */
const SG1_POLICY = '00000000-0000-0000-0000-0000000000f0';
const SG1_TEMPLATE = '00000000-0000-0000-0000-000000000aa0';
const SG1_INSTANCE = '00000000-0000-0000-0000-000000000ab0';

const HASH = 'sha256:2222222222222222222222222222222222222222222222222222222222222222';
const DEFINITION = { sections: [{ id: 's1', questions: [{ id: 'q1', type: 'yes_no_na' }] }] };
const SHEET = { services: ['MPS'], assets: [], threats: [], assessment: [], treatment: [] };

/**
 * The one model with a write path that is deliberately NOT audited.
 *
 * Named here rather than skipped silently, so the drift test below reports it
 * as an exclusion someone chose instead of a gap nobody noticed. The reasoning
 * lives beside the allowlist in audit.module.ts.
 */
const DELIBERATELY_UNAUDITED: ReadonlySet<string> = new Set(['RefCodeCounter']);

/**
 * Prisma write operations, mirroring WRITE_OPERATIONS in audit.recorder.ts.
 *
 * ⚠️ Duplicated because that constant is module-private, and exporting it to
 * satisfy a test would widen the recorder's surface for the test's convenience.
 * The cost is that the two can drift; the compensation is that this list is only
 * used to FIND write sites, so a missing entry here shows up as a model this
 * test says is unaudited while the recorder audits it — a red test, not a hole.
 */
const WRITE_OPS =
  'create|createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany';

describe('audit coverage (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;

  let policies: PolicyRepository;
  let assets: AssetRepository;
  let risks: RiskRepository;
  let controls: ControlRepository;
  let controlTests: ControlTestRepository;
  let evidence: EvidenceRepository;
  let issues: IssueRepository;
  let actions: ActionRepository;
  let templates: AssessmentTemplateRepository;
  let instances: AssessmentInstanceRepository;
  let responses: AssessmentResponseRepository;
  let reports: RmReportRepository;
  let soa: SoaRepository;
  let attestations: AttestationRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);

    policies = moduleRef.get(PolicyRepository);
    assets = moduleRef.get(AssetRepository);
    risks = moduleRef.get(RiskRepository);
    controls = moduleRef.get(ControlRepository);
    controlTests = moduleRef.get(ControlTestRepository);
    evidence = moduleRef.get(EvidenceRepository);
    issues = moduleRef.get(IssueRepository);
    actions = moduleRef.get(ActionRepository);
    templates = moduleRef.get(AssessmentTemplateRepository);
    instances = moduleRef.get(AssessmentInstanceRepository);
    responses = moduleRef.get(AssessmentResponseRepository);
    reports = moduleRef.get(RmReportRepository);
    soa = moduleRef.get(SoaRepository);
    attestations = moduleRef.get(AttestationRepository);
  });

  /**
   * Retirement closures, run newest-first.
   *
   * Children are created after their parents, so reversing gives children-first
   * teardown for free. RMReportVersion is absent on purpose: an issued version
   * is immutable and the database refuses the update (W10) — retiring it here
   * would make the teardown fail on a rule this repo went out of its way to
   * enforce.
   */
  const teardown: (() => Promise<unknown>)[] = [];

  afterAll(async () => {
    for (const retire of teardown.reverse()) {
      await retire();
    }
    await moduleRef.close();
  });

  /** Clause refs and labels have to stay unique for the life of the run. */
  let seq = 0;
  const uniq = (): number => (seq += 1);

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-coverage', assignedEntityCodes: codes, rollUp }),
    );

  /**
   * The audit rows this specific write produced, found by its reference code.
   *
   * ⛔ NOT a count delta. Two suites compose AppModule and jest runs them in
   * separate workers against one database, so "the table grew by one" is a race
   * between them. The reference code is issued per write and unique per entity,
   * so this asks about one write rather than about the table.
   */
  const auditRowsFor = async (refCode: string) => {
    const client = await clientFor(['SG1']);
    return client.auditLog.findMany({ where: { resourceId: refCode } });
  };

  /** Every coverage test is this assertion; only the write above it differs. */
  const expectAudited = async (refCode: string, model: string): Promise<void> => {
    const rows = await auditRowsFor(refCode);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      resourceType: model,
      operation: `${model}.create`,
      resourceId: refCode,
      orgEntityId: SG1,
      accessAllowed: true,
      // Null until M4 supplies an identity model — asserted rather than ignored,
      // because a placeholder here would answer "who did this" with a lie.
      actorId: null,
    });
  };

  // === One guard per audited model =========================================
  //
  // Each is independent on purpose: W13 Day 3's N2 removes ONE name from the
  // allowlist and expects EXACTLY the matching test to go red. A shared
  // parametrised assertion would go red as a block and prove only that the
  // allowlist is load-bearing in general, not that it is per-model.

  it('Policy', async () => {
    const row = await policies.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage policy ${uniq()}`,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.policy.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Policy');
  });

  it('AssetGroup', async () => {
    const row = await assets.createGroup(await clientFor(['SG1']), {
      orgEntityId: SG1,
      name: `coverage group ${uniq()}`,
      assetCategory: 'services',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.assetGroup.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'AssetGroup');
  });

  it('Asset', async () => {
    const row = await assets.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      name: `coverage asset ${uniq()}`,
      assetGroupId: SG1_ASSET_GROUP,
      assetCategory: 'services',
      classification: 'restricted',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.asset.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Asset');
  });

  it('Risk', async () => {
    const row = await risks.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage risk ${uniq()}`,
      assetId: SG1_ASSET,
      threatId: THREAT,
      vulnerabilityId: VULN,
      ciaType: 'cia',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.risk.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Risk');
  });

  it('Control', async () => {
    const row = await controls.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage control ${uniq()}`,
      type: 'detective',
      nature: 'manual',
      frequency: 'quarterly',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.control.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Control');
  });

  it('ControlTest', async () => {
    const row = await controlTests.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      controlId: SG1_CONTROL,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.controlTest.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'ControlTest');
  });

  it('Evidence', async () => {
    const row = await evidence.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      kind: 'screenshot',
      uriOrBlobRef: `file://int/coverage-${uniq()}.png`,
      hash: HASH,
      linkedType: 'control_test',
      linkedId: SG1_CONTROL_TEST,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.evidence.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Evidence');
  });

  it('Issue', async () => {
    const row = await issues.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage issue ${uniq()}`,
      source: 'test',
      severity: 'high',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.issue.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Issue');
  });

  it('Action', async () => {
    const row = await actions.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      issueId: SG1_ISSUE,
      description: `coverage action ${uniq()}`,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.action.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'Action');
  });

  it('AssessmentTemplate', async () => {
    const row = await templates.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      name: `coverage template ${uniq()}`,
      subjectType: 'risk',
      definition: DEFINITION,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.assessmentTemplate.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'AssessmentTemplate');
  });

  it('AssessmentInstance', async () => {
    const row = await instances.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      templateId: SG1_TEMPLATE,
      subjectType: 'risk',
      subjectId: SG1_ASSET,
      period: new Date(`2026-0${(uniq() % 9) + 1}-01T00:00:00Z`),
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.assessmentInstance.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'AssessmentInstance');
  });

  it('AssessmentResponse', async () => {
    const row = await responses.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      instanceId: SG1_INSTANCE,
      questionId: `q-coverage-${uniq()}`,
      answer: null,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.assessmentResponse.update({ where: { id: row.id }, data: { retiredAt: new Date() } }),
      ),
    );

    await expectAudited(row.refCode, 'AssessmentResponse');
  });

  it('RiskManagementReport', async () => {
    const row = await reports.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage report ${uniq()}`,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.riskManagementReport.update({
          where: { id: row.id },
          // The pointer goes first: rm_reports_current_version_id_id_fkey is
          // ON DELETE RESTRICT, and the version below can never be retired.
          data: { retiredAt: new Date(), currentVersionId: null },
        }),
      ),
    );

    await expectAudited(row.refCode, 'RiskManagementReport');
  });

  it('RMReportVersion', async () => {
    const report = await reports.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      title: `coverage report for a version ${uniq()}`,
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.riskManagementReport.update({
          where: { id: report.id },
          data: { retiredAt: new Date(), currentVersionId: null },
        }),
      ),
    );

    const row = await reports.issueVersion(await clientFor(['SG1']), {
      orgEntityId: SG1,
      reportId: report.id,
      versionLabel: `1.${uniq()}`,
      preparedBy: 'ITSC',
      approvedBy: 'ISC',
      effectiveDate: new Date('2026-08-14T00:00:00Z'),
      changeNote: 'Coverage probe',
      snapshotAt: new Date('2026-08-14T00:00:00Z'),
      sheet: SHEET,
    });
    // No teardown for the version itself — it is immutable by design (W10).

    await expectAudited(row.refCode, 'RMReportVersion');
  });

  it('StatementOfApplicability', async () => {
    const row = await soa.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      framework: 'ISO 27001',
      clauseRef: `W13.cov.${uniq()}`,
      applicable: true,
      implementationStatus: 'implemented',
    });
    teardown.push(() =>
      clientFor(['SG1']).then((c) =>
        c.statementOfApplicability.update({
          where: { id: row.id },
          data: { retiredAt: new Date() },
        }),
      ),
    );

    await expectAudited(row.refCode, 'StatementOfApplicability');
  });

  /**
   * ⭐ The sixteenth, and the first whose arrival was announced by this file's own
   * drift guard rather than by someone remembering. W14 checklist 1.1 built the
   * table and the repository, left AUDITED_MODELS alone, and watched the test
   * below go red naming "Attestation".
   *
   * ⚠️ NO TEARDOWN, unlike every entry above. `attestations` has no UPDATE grant
   * and no UPDATE policy (W14 Day 1) — an attestation records that a person signed
   * something at a moment, so a correction is a new row. The retire the other
   * fifteen perform would raise "permission denied" here, which is the decision
   * working rather than a gap in this test.
   */
  it('Attestation', async () => {
    const row = await attestations.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      subjectType: 'policy',
      subjectId: SG1_POLICY,
      result: `W14.cov.${uniq()}`,
    });

    await expectAudited(row.refCode, 'Attestation');
  });

  // === The drift guard =====================================================

  /**
   * ⛔ THIS IS THE TEST THAT STOPS W13 FROM BEING A ONE-OFF.
   *
   * R4's failure mode was never "the allowlist is wrong today" — it was that
   * every phase adding a table made the gap wider and nothing ever said so. The
   * fifteen tests above pin what is connected; this one pins what OUGHT to be,
   * by deriving the write surface from the source rather than from a list
   * somebody remembers to update.
   *
   * It reads core-model, which is where the scoped client is actually called
   * from. A repository added elsewhere would be missed — that is a real limit,
   * and it is narrowed by eslint.config.mjs, which is what keeps Prisma
   * delegates in this scope.
   */
  it('the allowlist still matches the write surface', () => {
    const dir = join(__dirname, '..', 'core-model');
    const sources = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.includes('.spec.'));

    const delegates = new Set<string>();
    for (const file of sources) {
      const text = readFileSync(join(dir, file), 'utf8');
      for (const m of text.matchAll(
        new RegExp(String.raw`client\.(\w+)\.(?:${WRITE_OPS})\(`, 'g'),
      )) {
        delegates.add(m[1]!);
      }
    }

    // Prisma's delegate is the model name with a lowercased first character, so
    // this inverts exactly that: rMReportVersion -> RMReportVersion.
    const reachable = new Set([...delegates].map((d) => d.charAt(0).toUpperCase() + d.slice(1)));

    // Non-emptiness first: an empty scan would make every assertion below hold
    // while proving the opposite of what it claims (AD-VacuousScopeTest-1).
    expect(reachable.size).toBeGreaterThan(10);

    const shouldBeAudited = [...reachable].filter((m) => !DELIBERATELY_UNAUDITED.has(m)).sort();
    const unaudited = shouldBeAudited.filter((m) => !AUDITED_MODELS.has(m));
    // A name in the list that nothing can write is the AP-3 half of the same
    // question: it would raise the coverage number without auditing anything.
    const unreachable = [...AUDITED_MODELS].filter((m) => !reachable.has(m)).sort();

    expect(unaudited).toEqual([]);
    expect(unreachable).toEqual([]);
    expect(shouldBeAudited).toEqual([...AUDITED_MODELS].sort());
  });
});
