"""
File: scripts/lint/check_mockup_fidelity.py
Purpose: Mechanical guards against design-mockup drift — verbatim CSS copy + no
    hardcoded colour values in components.
Category: Tooling / lint
Scope: Template v2.6.1

Description:
    Two programmatic guards from the mockup→production playbook:

      1. VERBATIM COPY — the adopted stylesheet must stay a byte-identical copy
         of the canonical mockup stylesheet, apart from a small, declared number
         of header directive lines. This turns "is the CSS right?" from a
         subjective eye-comparison into a deterministic diff.

      2. NO HARDCODED COLOURS — components must consume design tokens
         (var(--token)), never an inline arbitrary colour. Any hit means
         somebody eyeballed a colour into a component, which is exactly the
         lossy translation step the playbook exists to delete.

         NOTE (W19, AD-CssToken-1): the wrapper form depends on what the
         tokens hold. This project's tokens are HEX (tokens.css:24 is
         `--primary: #2A5BD7`), so `oklch(var(--token))` would produce
         INVALID CSS that fails silently — the page renders, the colour is
         simply wrong. Only wrap in oklch() when the token stores bare
         L C H components.

    NOT CONFIGURED = SKIP. Backend-only / no-mockup projects stay green without
    carrying a stub config.

    !! This lint does NOT measure visual fidelity. !!
    It measures whether anyone bypassed the mechanism. Real fidelity is verified
    by the code-level side-by-side comparison (playbook 7.3). A shipped page with
    four fundamental drifts passed every automated gate in the source project.

Key Components:
    - Config: NamedTuple parsed from .mockup-fidelity.json.
    - Violation: NamedTuple (kind, location, detail).
    - check_verbatim_copy() / check_hardcoded_colors(): pure, unit-testable.

Usage:
    python scripts/lint/check_mockup_fidelity.py [--root <repo_root>]
    python scripts/lint/check_mockup_fidelity.py --init     # write a starter config

Config (.mockup-fidelity.json at repo root):
    {
      "canonical_css": "docs/06-reference/design_handoff_isms_grc_platform/styles/components.css",
      "adopted_css":   "frontend/src/styles-mockup.css",
      "allowed_header_diff_lines": 3,
      "ignore_diff_patterns": ["^[+-]\\\\s*--(success|warning|destructive):"],
      "component_globs": ["frontend/src/**/*.tsx"],
      "hardcoded_color_patterns": ["\\\\[oklch\\\\(", "\\\\[#[0-9a-fA-F]{3,8}\\\\]"]
    }

    ignore_diff_patterns exists because a raw line ALLOWANCE cannot tell an
    intentional, declared divergence apart from real drift.

    Real case: an adopted stylesheet deliberately DROPS the colour-token block
    that the utility bridge layer owns, to keep a single source of truth for
    those tokens. That is 79 legitimately differing lines. With only a count,
    the project must set the allowance to 79 -- which then silently permits any
    79 lines of genuine drift. Declaring WHICH lines may differ keeps the
    allowance tight for everything else, and the excluded count is printed so
    the exemption stays visible rather than becoming invisible permission.

Created: 2026-08-07
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/06-reference/mockup-to-production-frontend-playbook.md 7.4
    - docs/rules-on-demand/mockup-fidelity.md
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

CONFIG_NAME = ".mockup-fidelity.json"

DEFAULT_COLOR_PATTERNS = [
    r"\[oklch\(",  # utility arbitrary value: bg-[oklch(...)]
    r"\[#[0-9a-fA-F]{3,8}\]",  # utility arbitrary hex: text-[#1a2b3c]
    r"\[rgba?\(",  # utility arbitrary rgb
    r"\[hsla?\(",  # utility arbitrary hsl
]

STARTER_CONFIG = {
    # This project's design handoff ships THREE stylesheets under
    # docs/06-reference/design_handoff_isms_grc_platform/styles/:
    # tokens.css (design tokens), base.css (reset/elements), components.css (bulk).
    # canonical_css takes one path -- decide which is authoritative (or concatenate)
    # when the frontend lands. components.css is the largest surface, so it is the
    # default here; tokens.css drift is arguably more damaging and may deserve its
    # own run. Do NOT create .mockup-fidelity.json until adopted_css actually
    # exists, or this check fails on every run for a frontend that isn't built yet.
    "canonical_css": "docs/06-reference/design_handoff_isms_grc_platform/styles/components.css",
    "adopted_css": "frontend/src/styles-mockup.css",
    "allowed_header_diff_lines": 3,
    # Regexes matched against unified-diff lines. Empty by default: declare a
    # pattern ONLY for a divergence you have consciously decided to keep, and
    # write down why in design-system.md. Do NOT use this to silence drift.
    "ignore_diff_patterns": [],
    "component_globs": ["frontend/src/**/*.tsx", "frontend/src/**/*.jsx"],
    "hardcoded_color_patterns": DEFAULT_COLOR_PATTERNS,
}


class Config(NamedTuple):
    canonical_css: Path
    adopted_css: Path
    allowed_header_diff_lines: int
    ignore_diff_patterns: list[str]
    component_globs: list[str]
    color_patterns: list[str]


class Violation(NamedTuple):
    kind: str
    location: str
    detail: str


def load_config(repo_root: Path) -> Config | None:
    """Return the parsed config, or None when the project has no mockup."""
    path = repo_root / CONFIG_NAME
    if not path.is_file():
        return None
    raw = json.loads(path.read_text(encoding="utf-8"))
    return Config(
        canonical_css=repo_root / raw["canonical_css"],
        adopted_css=repo_root / raw["adopted_css"],
        allowed_header_diff_lines=int(raw.get("allowed_header_diff_lines", 3)),
        ignore_diff_patterns=list(raw.get("ignore_diff_patterns", [])),
        component_globs=list(raw.get("component_globs", [])),
        color_patterns=list(raw.get("hardcoded_color_patterns", DEFAULT_COLOR_PATTERNS)),
    )


def _lines(path: Path) -> list[str]:
    """Read as lines with line endings normalised (CRLF/LF is not drift)."""
    return path.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n").split("\n")


def check_verbatim_copy(cfg: Config, repo_root: Path) -> list[Violation]:
    """Layer 1 -> Layer 2 must be a verbatim copy but for declared header lines."""
    for label, path in (("canonical_css", cfg.canonical_css), ("adopted_css", cfg.adopted_css)):
        if not path.is_file():
            return [
                Violation(
                    "missing-file",
                    label,
                    f"configured path does not exist: {path}",
                )
            ]

    canonical, adopted = _lines(cfg.canonical_css), _lines(cfg.adopted_css)
    diff = [
        d
        for d in difflib.unified_diff(canonical, adopted, lineterm="", n=0)
        if d.startswith(("+", "-")) and not d.startswith(("+++", "---"))
    ]

    # Declared, intentional divergences are excluded BEFORE counting, so the
    # allowance can stay tight for everything else. See the module docstring.
    ignored = 0
    if cfg.ignore_diff_patterns:
        patterns = [re.compile(p) for p in cfg.ignore_diff_patterns]
        kept = [d for d in diff if not any(p.search(d) for p in patterns)]
        ignored = len(diff) - len(kept)
        diff = kept

    if len(diff) <= cfg.allowed_header_diff_lines:
        # Print rather than stay silent: an exemption nobody can see becomes
        # invisible permission, and grows.
        if ignored:
            print(
                f"mockup-fidelity: {ignored} declared-intentional diff line(s) "
                f"excluded by ignore_diff_patterns"
            )
        return []

    where = cfg.adopted_css.relative_to(repo_root).as_posix()
    detail = (
        f"{len(diff)} differing line(s) after excluding {ignored} declared, "
        f"allowance is {cfg.allowed_header_diff_lines}. "
        f"Layer 2 is a COPY, not a source of truth -- re-copy from "
        f"{cfg.canonical_css.relative_to(repo_root).as_posix()} (but see the "
        f"playbook 4.2 note: whole-file re-copy has declared exceptions). "
        f"First differences:\n" + "\n".join(f"      {d}" for d in diff[:10])
    )
    return [Violation("css-drift", where, detail)]


def check_hardcoded_colors(cfg: Config, repo_root: Path) -> list[Violation]:
    """No inline arbitrary colour values in components: tokens only."""
    if not cfg.component_globs or not cfg.color_patterns:
        return []

    patterns = [re.compile(p) for p in cfg.color_patterns]
    violations: list[Violation] = []
    seen: set[Path] = set()

    for glob in cfg.component_globs:
        for src in sorted(repo_root.glob(glob)):
            if not src.is_file() or src in seen:
                continue
            seen.add(src)
            rel = src.relative_to(repo_root).as_posix()
            for lineno, line in enumerate(_lines(src), start=1):
                for pattern in patterns:
                    if pattern.search(line):
                        violations.append(
                            Violation(
                                "hardcoded-color",
                                f"{rel}:{lineno}",
                                f"{line.strip()[:100]}  <- use var(--token)",
                            )
                        )
                        break

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Design-mockup fidelity guards.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument(
        "--init", action="store_true", help=f"Write a starter {CONFIG_NAME} and exit."
    )
    cli = parser.parse_args(argv)
    repo_root = Path(cli.root).resolve()

    if cli.init:
        path = repo_root / CONFIG_NAME
        if path.exists():
            print(f"mockup-fidelity: {CONFIG_NAME} already exists -- not overwriting")
            return 1
        path.write_text(json.dumps(STARTER_CONFIG, indent=2) + "\n", encoding="utf-8")
        print(f"mockup-fidelity: wrote {CONFIG_NAME} -- edit the paths to match your repo")
        return 0

    cfg = load_config(repo_root)
    if cfg is None:
        print(f"mockup-fidelity: SKIP (no {CONFIG_NAME}; run --init if this project has a mockup)")
        return 0

    violations = check_verbatim_copy(cfg, repo_root) + check_hardcoded_colors(cfg, repo_root)
    if not violations:
        print("mockup-fidelity: OK (verbatim copy intact, no hardcoded colours)")
        return 0

    print(f"mockup-fidelity: {len(violations)} violation(s):")
    for v in violations:
        print(f"  [{v.kind}] {v.location}\n      {v.detail}")
    print(
        "\n  Reminder: passing this lint does NOT mean the page matches the mockup.\n"
        "  Fidelity is verified by code-level side-by-side comparison -- see\n"
        "  docs/06-reference/mockup-to-production-frontend-playbook.md 7.3"
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
