"""
File: scripts/lint/check_fixture_prose.py
Purpose: Two guards against fixture prose becoming a forged governance artifact.
Category: Tooling / lint
Scope: Phase W24

Description:
    AD-FixtureProseBecomesForgedEvidence-1: W19 shipped 30 screens of invented
    governance language — named sign-offs, SHA-256 ledgers, "Tamper-evident",
    "Record locked". Harmless while every row was invented. W22 wired /risks to
    the API and the drive-through found that prose signing a REAL risk. It was
    cleaned off that one page by hand. The same prose is still on the others,
    and the next page to be wired repeats the whole thing.

    RULE 1 — a record-claim fixture must not reach a surface that reads the API.

        Set A, "surfaces that read the API": files under the configured surface
        globs that import from @/lib/api/ or call fetch( directly. Both, because
        Day 0 measured three direct-fetch surfaces, one of which is AppShell —
        the shell is a surface by this definition and it renders on 25 screens.

        Set B, "record-claim exports": exports in the fixture files tagged with
        @record-claim in a comment above them. Tagging is manual and that is the
        point: whether a constant makes a claim ABOUT ONE RECORD is a judgement
        the fixture's author can make and a regex cannot.

        Both sets are CLOSED. That is the whole design. Searching for governance
        WORDING instead would be an open set — Tamper-evident, Ratified by, Next
        review are the ones we thought of today — and W23 measured what enumerating
        an open set costs: it missed 44% of live markers.

    RULE 2 — this platform must not claim certifications it does not hold.

        A closed list of certification claims, which must not appear anywhere in
        the web source. Entity Zero (guardrail 2) holds no certificate; a screen
        saying otherwise is a forged claim about the platform itself, and W21 put
        29 routes on a public URL.

        ⚠️ THIS RULE IS AN OPEN SET AND WILL MISS THINGS. It is accepted here for
        one reason: what it guards is a short list of certification names that
        does not grow on its own, unlike governance prose. Do not read a green
        run as "no false claims exist".

        ⚠️ AND IT MUST NOT MATCH THE FRAMEWORK NAME. `SOC 2` appears 15 times in
        this repo as a control-framework reference (`fw: 'SOC 2', ref: 'CC6.1'`),
        which is exactly what a GRC platform is for. The list matches
        certification LEVELS ("SOC 2 Type II"), never framework names.

    !! WHAT THIS LINT DOES NOT MEASURE. !!
    It does not read prose and judge whether it is honest. It checks whether
    anyone bypassed the two mechanisms. A screen can pass both rules and still
    be full of invented governance language — that is what the drive-through and
    the named checklist item are for (checklist.md.tpl, Day 2).

    Type positions are allowed. `ReturnType<typeof riskSignOff>` keeps a shape
    without rendering a value, and that is precisely how W22 neutralised
    /risks/[id]: the arrays are empty, the types still name the builders.

Key Components:
    - Config: parsed from .fixture-prose.json at the repo root
    - Violation: NamedTuple (rule, location, detail)
    - record_claim_exports() / api_surfaces() / check_rule1() / check_rule2():
      pure, unit-testable, no filesystem access inside them

Usage:
    python scripts/lint/check_fixture_prose.py [--root <repo_root>]
    python scripts/lint/check_fixture_prose.py --self-test

Created: 2026-08-19 (Phase W24)
Last Modified: 2026-08-19

Modification History (newest-first):
    - 2026-08-19: Initial creation (Phase W24) — CH-044

Related:
    - scripts/lint/check_mockup_fidelity.py — the detector shape this follows
    - docs/09-analysis/fixture-prose-inventory-20260819.md — the standing inventory
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

CONFIG_NAME = ".fixture-prose.json"

# `export const NAME`, `export function NAME`, `export class NAME`, `export interface NAME`
EXPORT_RE = re.compile(r"^\s*export\s+(?:const|let|function|class|interface|type)\s+(\w+)")

# A tag anywhere in the comment block that precedes an export.
TAG = "@record-claim"

# Positions where naming a fixture export does NOT render it. Kept deliberately
# small: every entry here is a hole, so each one has to earn its place.
TYPE_POSITION_RES = [
    re.compile(r"ReturnType<\s*typeof\s+\w+\s*>"),
    re.compile(r"\(?\s*typeof\s+\w+\s*\)?\s*\[\s*number\s*\]"),
    re.compile(r"^\s*import\s+type\s*\{[^}]*\}", re.MULTILINE),
]

# Import lines are not renderings. W22 left three imports in place on a page
# whose values it had emptied, and that file is the reference implementation.
IMPORT_BLOCK_RE = re.compile(r"^\s*import\s+(?:type\s+)?\{[^}]*\}\s*from\s*['\"][^'\"]+['\"];?", re.MULTILINE)
SINGLE_IMPORT_RE = re.compile(r"^\s*import\s+[\w*\s,{}]+\s*from\s*['\"][^'\"]+['\"];?", re.MULTILINE)


class Violation(NamedTuple):
    rule: str
    location: str
    detail: str

    def render(self) -> str:
        return f"  [{self.rule}] {self.location}\n      {self.detail}"


class Config(NamedTuple):
    surface_globs: list[str]
    fixture_globs: list[str]
    api_markers: list[str]
    self_claims: list[str]
    self_claim_globs: list[str]
    self_claim_allow: list[str]

    @staticmethod
    def load(root: Path) -> "Config | None":
        path = root / CONFIG_NAME
        if not path.is_file():
            return None
        raw = json.loads(path.read_text(encoding="utf-8"))
        return Config(
            surface_globs=raw.get("surface_globs", []),
            fixture_globs=raw.get("fixture_globs", []),
            api_markers=raw.get("api_markers", []),
            self_claims=raw.get("self_claims", []),
            self_claim_globs=raw.get("self_claim_globs", []),
            self_claim_allow=raw.get("self_claim_allow", []),
        )


def record_claim_exports(source: str) -> list[str]:
    """Export names carrying @record-claim in the comment block above them.

    The tag has to be within the preceding comment run — a blank line or a
    statement between the tag and the export ends the association, so a tag
    cannot silently cover the next twenty exports.
    """
    names: list[str] = []
    tagged = False
    for line in source.splitlines():
        stripped = line.strip()
        if TAG in stripped:
            tagged = True
            continue
        match = EXPORT_RE.match(line)
        if match:
            if tagged:
                names.append(match.group(1))
            tagged = False
            continue
        # Comment lines keep an open tag alive; anything else closes it.
        if tagged and not (
            stripped.startswith("*") or stripped.startswith("//") or stripped.startswith("/*")
        ):
            tagged = False
    return names


def reads_api(source: str, markers: list[str]) -> bool:
    """Whether this file talks to the API, by any of the configured markers."""
    return any(marker in source for marker in markers)


def strip_non_rendering(source: str) -> str:
    """Blank out the positions where naming an export does not render it."""
    out = source
    for pattern in TYPE_POSITION_RES:
        out = pattern.sub(" ", out)
    out = IMPORT_BLOCK_RE.sub(" ", out)
    out = SINGLE_IMPORT_RE.sub(" ", out)
    return out


def check_rule1(surface_path: str, surface_src: str, claims: dict[str, str]) -> list[Violation]:
    """Record-claim exports appearing in a value position on an API surface."""
    body = strip_non_rendering(surface_src)
    found: list[Violation] = []
    for name, origin in sorted(claims.items()):
        if re.search(rf"\b{re.escape(name)}\b", body):
            found.append(
                Violation(
                    "rule1",
                    f"{surface_path}",
                    f"renders `{name}` (a @record-claim fixture from {origin}) on a screen "
                    f"that reads the API. It would be making that claim about a real record.",
                )
            )
    return found


COMMENT_BLOCK_RE = re.compile(r"/\*.*?\*/", re.DOTALL)
COMMENT_LINE_RE = re.compile(r"//[^\n]*")


def strip_comments(source: str, path: str) -> str:
    """Remove comments before looking for claims. Nobody reads a comment on screen.

    ⚠️ THIS WAS FOUND BY THE GUARD, ON ITS FIRST REAL RUN. The two violations it
    reported were the comments explaining why the claim had just been REMOVED
    from login/page.tsx and AppShell.tsx — a rule that cannot tell "this platform
    is SOC 2 Type II certified" from "we deleted the line saying that" makes the
    correct fix un-documentable.

    ⚠️ Approximate, not a parser: a `//` inside a string literal takes the rest
    of that line with it. Accepted, because the failure mode is a MISSED claim in
    an unusual line, not a false alarm on a correct one — and rule 2's header
    already says it will miss things. JSON is left alone; it has no comments and
    its `_`-prefixed keys are data.
    """
    if path.endswith(".json"):
        return source
    return COMMENT_LINE_RE.sub(" ", COMMENT_BLOCK_RE.sub(" ", source))


def check_rule2(path: str, source: str, claims: list[str], allow: list[str]) -> list[Violation]:
    """Certification claims about this platform, anywhere in the web source."""
    found: list[Violation] = []
    body = strip_comments(source, path)
    for claim in claims:
        if claim in body and not any(a in body for a in allow if a):
            found.append(
                Violation(
                    "rule2",
                    path,
                    f'claims "{claim}" for this platform. Entity Zero holds no certificate '
                    f"(guardrail 2), and these screens are on a public URL.",
                )
            )
    return found


def collect(root: Path, globs: list[str]) -> list[Path]:
    seen: list[Path] = []
    for pattern in globs:
        for path in sorted(root.glob(pattern)):
            if path.is_file() and path not in seen:
                seen.append(path)
    return seen


def run(root: Path) -> tuple[int, str]:
    config = Config.load(root)
    if config is None:
        return 1, f"{CONFIG_NAME} not found at {root}. This project requires it."

    claims: dict[str, str] = {}
    for path in collect(root, config.fixture_globs):
        rel = path.relative_to(root).as_posix()
        for name in record_claim_exports(path.read_text(encoding="utf-8")):
            claims[name] = rel

    violations: list[Violation] = []
    surfaces = 0
    for path in collect(root, config.surface_globs):
        source = path.read_text(encoding="utf-8")
        if not reads_api(source, config.api_markers):
            continue
        surfaces += 1
        violations += check_rule1(path.relative_to(root).as_posix(), source, claims)

    scanned = 0
    for path in collect(root, config.self_claim_globs):
        scanned += 1
        source = path.read_text(encoding="utf-8")
        violations += check_rule2(
            path.relative_to(root).as_posix(), source, config.self_claims, config.self_claim_allow
        )

    if violations:
        print(f"fixture-prose: {len(violations)} violation(s)")
        for v in violations:
            print(v.render())
        return 1, (
            f"fixture-prose: {len(violations)} violation(s) "
            f"({surfaces} API surface(s), {len(claims)} record-claim export(s))"
        )

    return 0, (
        f"fixture-prose: OK ({surfaces} API surface(s) x {len(claims)} record-claim export(s); "
        f"{scanned} file(s) checked for platform self-claims)"
    )


def self_test() -> int:
    """Both rules, both directions. A guard with no negative case is a guess."""
    failures: list[str] = []

    # --- rule 1: the tag associates with the NEXT export only ---------------
    src = (
        "/** @record-claim this one makes a claim about one record. */\n"
        "export const riskSignOff = [];\n"
        "\n"
        "export const RISK_CATEGORY_META = {};\n"
    )
    got = record_claim_exports(src)
    if got != ["riskSignOff"]:
        failures.append(f"tag association: expected ['riskSignOff'], got {got}")

    # --- rule 1 POSITIVE: a value position fires ---------------------------
    surface = "import { riskSignOff } from '@/data/x';\nconst rows = riskSignOff(risk);\n"
    v = check_rule1("p.tsx", surface, {"riskSignOff": "data/x.ts"})
    if len(v) != 1:
        failures.append(f"rule1 value position: expected 1 violation, got {len(v)}")

    # --- rule 1 NEGATIVE: W22's actual neutralisation stays silent ----------
    # Without this half, a rule that flagged every mention would pass the
    # positive case, ship, and go red on the one file that did it right.
    surface = (
        "import { riskSignOff } from '@/data/x';\n"
        "const signOff: ReturnType<typeof riskSignOff> = [];\n"
    )
    v = check_rule1("p.tsx", surface, {"riskSignOff": "data/x.ts"})
    if v:
        failures.append(f"rule1 type position: expected silence, got {len(v)}")

    # --- rule 2 POSITIVE ---------------------------------------------------
    v = check_rule2("a.json", '"x": "SOC 2 Type II certified"', ["SOC 2 Type II"], [])
    if len(v) != 1:
        failures.append(f"rule2: expected 1 violation, got {len(v)}")

    # --- rule 2 NEGATIVE: the framework reference must NOT fire -------------
    # 15 real occurrences in this repo look like this.
    v = check_rule2("a.ts", "{ fw: 'SOC 2', ref: 'CC6.1' }", ["SOC 2 Type II"], [])
    if v:
        failures.append(f"rule2 framework ref: expected silence, got {len(v)}")

    # --- rule 2 NEGATIVE: a comment ABOUT the claim must NOT fire -----------
    # The guard's own first run reported exactly this, on the two files where
    # the claim had just been removed and the removal explained.
    v = check_rule2("a.tsx", "// was claiming SOC 2 Type II, which is false\n", ["SOC 2 Type II"], [])
    if v:
        failures.append(f"rule2 comment: expected silence, got {len(v)}")

    v = check_rule2("a.tsx", "/* it said SOC 2 Type II here */\nconst x = 1;\n", ["SOC 2 Type II"], [])
    if v:
        failures.append(f"rule2 block comment: expected silence, got {len(v)}")

    # --- rule 2 NEGATIVE: JSON keeps its text, comments or not -------------
    v = check_rule2("a.json", '{"k": "SOC 2 Type II"}', ["SOC 2 Type II"], [])
    if len(v) != 1:
        failures.append(f"rule2 json: expected 1 violation, got {len(v)}")

    for line in failures:
        print(f"  FAIL {line}")
    if failures:
        print(f"self-test: {len(failures)} failure(s)")
        return 1
    print("self-test: OK (9 assertions, both rules, both directions)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="repo root")
    parser.add_argument("--self-test", action="store_true", help="run the built-in cases")
    cli = parser.parse_args()

    if cli.self_test:
        return self_test()

    code, summary = run(Path(cli.root).resolve())
    print(summary)
    return code


if __name__ == "__main__":
    sys.exit(main())
