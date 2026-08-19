# Fixture: E5 stale `PR-pending` — both directions

**Purpose**: The negative control for `check_status_markers.py` E5, and its
positive control, deliberately kept as siblings.

**Category / Scope**: Tooling / lint fixture · W23
**Created**: 2026-08-19
**Status**: Active — ⛔ **must stay broken**

---

## ⛔ Do not "fix" `W99-fixture-closed/`

Its `retrospective.md` carries a merge marker that is still pending while its
`plan.md` says `closed`. That contradiction is the defect E5 exists to catch,
and `self_test()` fails loudly if it stops being caught. Tidying it up would
disable the check without turning anything red — the exact failure this whole
phase is about.

## ⛔ Do not delete `W98-fixture-active/` either

It carries **the same marker** against a plan that is still `active`. That is
what every legitimate closeout looks like at the moment it is written: the
closeout documents are authored *before* the merge (`git-workflow.md:222`).

`self_test()` asserts E5 stays **silent** here. Without this half, a
`stale_pending()` that flagged every marker it saw would pass the positive
control, ship, and go red on every closeout until somebody switched the check
off (plan R4 / `AD-MetaVerificationBug-1`).

## Layout

```
docs/01-planning/W99-fixture-closed/plan.md            status: closed
docs/01-planning/W99-fixture-closed/retrospective.md   **PR**: #TBD   -> MUST fire
docs/01-planning/W98-fixture-active/plan.md            status: active
docs/01-planning/W98-fixture-active/retrospective.md   **PR**: #TBD   -> MUST NOT fire
```

The tree mirrors the real repo layout because `stale_pending()` resolves the
owning artifact from the path. `W98` / `W99` are used precisely because the real
project will not reach them for years, so the fixture can never collide with a
live phase.

⚠️ The live scan never sees these files: `E5_SKIP_PARTS` excludes
`__fixtures__`, and the real `TRACKS` globs are rooted at the repo, not here.

---

## Modification History

- 2026-08-19: Initial creation (W23) — E5 negative gate
