/**
 * File: apps/api/src/modules/assessment/assessment.int.spec.ts
 * Purpose: Pin the three guards this slice adds — the composite keys, the SoD
 *   CHECK, and the trigger that makes template_version a snapshot rather than a claim.
 * Category: Test (integration — needs docker/compose.yml running)
 * Scope: Phase W09 (M1 slice 6)
 * Owner: docs/02-architecture/05-platform-foundation-services.md §Shared assessment engine · CLAUDE.md 約束 8 · guardrail 6
 *
 * Description:
 *   The four scope tests 約束 8 asks for, ×3 tables, plus the three mechanisms
 *   that are new here.
 *
 *   ⭐ Tests 5-7 are the ones that say the SNAPSHOT is real. D12 recorded the
 *   risk plainly: nothing in this codebase increments `version`, so a copy that
 *   is only ever exercised at version 1 proves nothing. Test 6 bumps a template
 *   to 2 in place and asserts the instance records 2 — the mechanism becomes
 *   falsifiable even though no production path yet produces a second version.
 *
 *   ⭐ Test 8 is the oracle test for the snapshot trigger, and it exists because
 *   the trigger could easily have created one: a RAISE for an unreachable
 *   template would answer "that id exists but is not yours" differently from
 *   "no such id". COALESCE-then-let-the-key-refuse is what keeps them identical.
 *
 *   ⚠️ Day 3 targets: N1 = drop the responses->evidence key (test 12 must go
 *   green) · N2 = neutralise an INSERT policy (test 15) · N4 = drop the SoD
 *   CHECK (test 9 ONLY) · N5 = drop the instances->templates key (test 10).
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09)
 */
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AssessmentInstanceRepository,
  SegregationOfDutiesError,
} from '../../core-model/assessment-instance.repository';
import { AssessmentResponseRepository } from '../../core-model/assessment-response.repository';
import { AssessmentTemplateRepository } from '../../core-model/assessment-template.repository';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { AssessmentModule } from './assessment.module';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const HK1 = '00000000-0000-0000-0000-0000000000c1';
const SG1_TEMPLATE = '00000000-0000-0000-0000-000000000aa0';
const HK1_TEMPLATE = '00000000-0000-0000-0000-000000000aa1';
const SG1_INSTANCE = '00000000-0000-0000-0000-000000000ab0';
const HK1_INSTANCE = '00000000-0000-0000-0000-000000000ab1';
// ⚠️ a70/a71, NOT a60/a61 — the latter are the control_test ids that evidence
// LINKS to. The first version of this file used those, and test 12 passed on an
// id that exists nowhere rather than on a cross-entity one. Test 13 is what
// caught it: a refusal test is only meaningful beside a positive that shares its
// mechanism (AD-BorrowedRefusal-1, pre-empted by construction this time).
const SG1_EVIDENCE = '00000000-0000-0000-0000-000000000a70';
const HK1_EVIDENCE = '00000000-0000-0000-0000-000000000a71';
const USER = '00000000-0000-0000-0000-0000000000d0';
const SUBJECT = '00000000-0000-0000-0000-000000000a20';

/** An id that exists nowhere. The other half of every oracle assertion below. */
const ABSENT = '00000000-0000-0000-0000-0000dead0000';

const DEFINITION = { sections: [{ id: 's1', questions: [{ id: 'q1', type: 'yes_no_na' }] }] };

describe('assessment module (integration)', () => {
  let moduleRef: TestingModule;
  let resolver: EntityScopeResolver;
  let factory: ScopedPrismaFactory;
  let templates: AssessmentTemplateRepository;
  let instances: AssessmentInstanceRepository;
  let responses: AssessmentResponseRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [AssessmentModule] }).compile();
    await moduleRef.init();
    resolver = moduleRef.get(EntityScopeResolver);
    factory = moduleRef.get(ScopedPrismaFactory);
    templates = moduleRef.get(AssessmentTemplateRepository);
    instances = moduleRef.get(AssessmentInstanceRepository);
    responses = moduleRef.get(AssessmentResponseRepository);
  });

  const clientFor = async (codes: string[], rollUp = false) =>
    factory.forScope(
      await resolver.resolve({ subjectId: 'int-test', assignedEntityCodes: codes, rollUp }),
    );

  const newTemplate = async (codes: string[] = ['SG1'], orgEntityId = SG1) =>
    templates.create(await clientFor(codes), {
      orgEntityId,
      name: 'RCSA',
      subjectType: 'risk',
      definition: DEFINITION,
    });

  const newInstance = async (over: Record<string, unknown> = {}, codes: string[] = ['SG1']) =>
    instances.create(await clientFor(codes), {
      orgEntityId: SG1,
      templateId: SG1_TEMPLATE,
      subjectType: 'risk',
      subjectId: SUBJECT,
      period: new Date('2026-01-01T00:00:00Z'),
      ...over,
    } as Parameters<AssessmentInstanceRepository['create']>[1]);

  afterAll(async () => {
    await moduleRef.close();
  });

  // === US-1: the tables behave the way the specification describes ===========

  it('1. the server issues each ref_code; the caller has no way to supply one', async () => {
    const template = await newTemplate();
    const instance = await newInstance();
    const response = await responses.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      instanceId: SG1_INSTANCE,
      questionId: 'q1',
      answer: { value: 'yes' },
    });

    expect(template.refCode).toMatch(/^ASTM-SG1-\d{6}$/);
    expect(instance.refCode).toMatch(/^ASIN-SG1-\d{6}$/);
    expect(response.refCode).toMatch(/^ASRP-SG1-\d{6}$/);
  });

  it('2. a new instance is scheduled — no later state is an input', async () => {
    const row = await newInstance();

    // §4's first state. Every other value is reached by a transition this slice
    // does not have.
    expect(row.status).toBe('scheduled');
  });

  it('3. a template stores its definition byte-for-byte, unvalidated', async () => {
    // ⛔ This is the AP-3 question answered honestly: nothing checks the shape,
    // so a definition with no questions at all is accepted. 02a specifies no
    // structure, and a validator here would enforce a guess.
    const row = await templates.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      name: 'Empty on purpose',
      subjectType: 'entity',
      definition: { anything: [1, 2, 3] },
    });

    expect(row.definition).toEqual({ anything: [1, 2, 3] });
  });

  it('4. an answer to a question that was never asked is ACCEPTED', async () => {
    // The cost of `definition` being a document rather than a table, stated as a
    // passing test rather than left for someone to discover. If a questions table
    // ever exists, this test is the one that must be changed to a rejection.
    const row = await responses.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      instanceId: SG1_INSTANCE,
      questionId: 'q-does-not-exist',
      answer: null,
    });

    expect(row.questionId).toBe('q-does-not-exist');
  });

  // === US-1: template_version is a snapshot, not a claim =====================

  it('5. the caller cannot state template_version — the database takes it', async () => {
    const row = await newInstance({ templateVersion: 99 });

    // 99 is not on CreateAssessmentInstanceInput; this is what a caller who
    // sends it achieves. The seeded SG1 template is at version 1.
    expect(row.templateVersion).toBe(1);
  });

  it('6. ⭐ the snapshot copies what it finds, and it is not always 1', async () => {
    const sg1 = await clientFor(['SG1']);

    // D12: nothing in this codebase increments `version`, so a copy exercised
    // only at 1 would be indistinguishable from a hard-coded 1. Bump it here so
    // the mechanism is falsifiable before a publish path exists.
    await sg1.$executeRawUnsafe(
      `UPDATE assessment_templates SET version = 2 WHERE id = '${SG1_TEMPLATE}'`,
    );
    try {
      const row = await newInstance();
      expect(row.templateVersion).toBe(2);
    } finally {
      await sg1.$executeRawUnsafe(
        `UPDATE assessment_templates SET version = 1 WHERE id = '${SG1_TEMPLATE}'`,
      );
    }
  });

  it('7. an existing snapshot is not re-taken when the row is updated', async () => {
    const sg1 = await clientFor(['SG1']);
    const row = await newInstance();

    await sg1.$executeRawUnsafe(
      `UPDATE assessment_templates SET version = 5 WHERE id = '${SG1_TEMPLATE}'`,
    );
    try {
      await sg1.assessmentInstance.update({
        where: { id: row.id },
        data: { status: 'in_progress' },
      });
      const [after] = await sg1.assessmentInstance.findMany({ where: { id: row.id } });

      // The trigger is BEFORE INSERT only. Re-taking it here would quietly
      // re-point an answered assignment at whatever the template says today.
      expect(after?.templateVersion).toBe(1);
    } finally {
      await sg1.$executeRawUnsafe(
        `UPDATE assessment_templates SET version = 1 WHERE id = '${SG1_TEMPLATE}'`,
      );
    }
  });

  it('8. ⭐ the trigger opens no oracle: unreachable and absent are identical', async () => {
    const sg1 = await clientFor(['SG1']);

    const unreadable = await instances
      .create(sg1, {
        orgEntityId: SG1,
        templateId: HK1_TEMPLATE,
        subjectType: 'risk',
        subjectId: SUBJECT,
        period: new Date(),
      })
      .catch((e: unknown) => e);
    const absent = await instances
      .create(sg1, {
        orgEntityId: SG1,
        templateId: ABSENT,
        subjectType: 'risk',
        subjectId: SUBJECT,
        period: new Date(),
      })
      .catch((e: unknown) => e);

    expect(unreadable).toBeInstanceOf(UnknownReferenceError);
    expect(absent).toBeInstanceOf(UnknownReferenceError);
    // A RAISE inside the trigger would have made these differ — 23514 or P0001
    // for the unreachable one, 23503 for the absent one. COALESCE is what keeps
    // both on the foreign key's single answer.
    expect((absent as Error).message).toBe((unreadable as Error).message);
  });

  // === US-3: segregation of duties ==========================================

  it('9. ⭐ a reviewer who is also the assignee is refused — DAY 3 N4 TARGET', async () => {
    await expect(
      newInstance({ assigneeUserId: USER, reviewerUserId: USER }),
    ).rejects.toBeInstanceOf(SegregationOfDutiesError);
  });

  it('9b. either half alone is permitted — the rule needs two names to compare', async () => {
    const assigneeOnly = await newInstance({ assigneeUserId: USER });
    const reviewerOnly = await newInstance({ reviewerUserId: USER });

    // An instance may be scheduled before anyone is named. A CHECK that forced
    // both to be present would turn a duty separation into a mandatory field.
    expect(assigneeOnly.reviewerUserId).toBeNull();
    expect(reviewerOnly.assigneeUserId).toBeNull();
  });

  it('9c. the SoD refusal is NOT a 404-shaped error', async () => {
    const error = await newInstance({ assigneeUserId: USER, reviewerUserId: USER }).catch(
      (e: unknown) => e,
    );

    // guardrail 6: the caller supplied both ids and is being told a rule it can
    // read forbids that pairing. Collapsing it into the scope refusals would hide
    // a control from the person who has to satisfy it, and conceal nothing.
    expect(error).not.toBeInstanceOf(ScopeRefusedError);
    expect(error).not.toBeInstanceOf(UnknownReferenceError);
  });

  // === US-2: the reference guards ===========================================

  it('10. SG1 may NOT assign HK1’s template, and nothing lands — DAY 3 N5 TARGET', async () => {
    const before = (await instances.list(await clientFor(['SG1']))).length;

    await expect(newInstance({ templateId: HK1_TEMPLATE })).rejects.toBeInstanceOf(
      UnknownReferenceError,
    );

    expect(await instances.list(await clientFor(['SG1']))).toHaveLength(before);
  });

  it('11. a legitimate instance cannot be re-pointed at another entity’s template', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.assessmentInstance.update({
        where: { id: SG1_INSTANCE },
        data: { templateId: HK1_TEMPLATE },
      }),
    ).rejects.toThrow(/foreign key constraint/i);

    const [row] = await sg1.assessmentInstance.findMany({ where: { id: SG1_INSTANCE } });
    expect(row?.templateId).toBe(SG1_TEMPLATE);
  });

  it('12. ⭐ a response may NOT cite another entity’s evidence — DAY 3 N1 TARGET', async () => {
    // The anchor W09 added to `evidence` is what refuses this. Drop
    // assessment_responses_evidence_id_org_entity_id_fkey and this must go green.
    await expect(
      responses.create(await clientFor(['SG1']), {
        orgEntityId: SG1,
        instanceId: SG1_INSTANCE,
        questionId: 'q1',
        answer: { value: 'yes' },
        evidenceId: HK1_EVIDENCE,
      }),
    ).rejects.toBeInstanceOf(UnknownReferenceError);
  });

  it('13. a response may cite its OWN entity’s evidence', async () => {
    const row = await responses.create(await clientFor(['SG1']), {
      orgEntityId: SG1,
      instanceId: SG1_INSTANCE,
      questionId: 'q1',
      answer: { value: 'yes' },
      evidenceId: SG1_EVIDENCE,
    });

    // The negative above is only meaningful if the positive works — otherwise
    // test 12 would pass with the column permanently broken.
    expect(row.evidenceId).toBe(SG1_EVIDENCE);
  });

  // === US-2: the four scope tests 約束 8 asks for, on each table =============

  it('14. cross-entity READ returns nothing, on all three tables', async () => {
    const hk1 = await clientFor(['HK1']);

    const t = (await templates.list(hk1)).map((r) => r.id);
    const i = (await instances.list(hk1)).map((r) => r.id);

    expect(t).toContain(HK1_TEMPLATE);
    expect(t).not.toContain(SG1_TEMPLATE);
    expect(i).toContain(HK1_INSTANCE);
    expect(i).not.toContain(SG1_INSTANCE);
  });

  it('15. ⭐ the templates INSERT policy refuses on its own — DAY 3 N2 TARGET', async () => {
    const sg1 = await clientFor(['SG1']);

    // Two bypasses, both required: no issueRefCode (so W04's counter policy
    // cannot answer) and createMany (so no RETURNING, so the READ policy cannot
    // answer). A template references nothing, so unlike W08 there is no third
    // stand-in to eliminate — which makes this the cleanest of the four.
    await expect(
      sg1.assessmentTemplate.createMany({
        data: [
          {
            orgEntityId: HK1,
            refCode: 'ASTM-HK1-PLANTED-1',
            name: 'planted',
            subjectType: 'risk',
            definition: DEFINITION,
          },
        ],
      }),
    ).rejects.toThrow(/row-level security/i);

    const hk1 = await templates.list(await clientFor(['HK1']));
    expect(hk1.map((r) => r.refCode)).not.toContain('ASTM-HK1-PLANTED-1');
  });

  it('16. cross-entity WRITE through each repository is refused, and nothing lands', async () => {
    const sg1 = await clientFor(['SG1']);
    const before = (await templates.list(await clientFor(['HK1']))).length;

    await expect(
      templates.create(sg1, {
        orgEntityId: HK1,
        name: 'planted',
        subjectType: 'risk',
        definition: DEFINITION,
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);
    await expect(
      instances.create(sg1, {
        orgEntityId: HK1,
        templateId: HK1_TEMPLATE,
        subjectType: 'control',
        subjectId: SUBJECT,
        period: new Date(),
      }),
    ).rejects.toBeInstanceOf(ScopeRefusedError);

    expect(await templates.list(await clientFor(['HK1']))).toHaveLength(before);
  });

  it('17. none of the three can be deleted — refused by privilege, before RLS', async () => {
    const sg1 = await clientFor(['SG1']);

    await expect(
      sg1.assessmentInstance.deleteMany({ where: { id: SG1_INSTANCE } }),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      sg1.assessmentTemplate.deleteMany({ where: { id: SG1_TEMPLATE } }),
    ).rejects.toThrow(/permission denied/i);

    expect((await sg1.assessmentInstance.findMany({ where: { id: SG1_INSTANCE } })).length).toBe(1);
  });

  it('18. a roll-up scope sees its authorised subtree and no further', async () => {
    const sg = await clientFor(['SG'], true);
    const ids = (await templates.list(sg)).map((r) => r.id);

    expect(ids).toContain(SG1_TEMPLATE);
    expect(ids).not.toContain(HK1_TEMPLATE);
  });
});
