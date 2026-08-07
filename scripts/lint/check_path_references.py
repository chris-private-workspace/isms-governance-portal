"""
File: scripts/lint/check_path_references.py
Purpose: Detect repo-root-relative paths that no longer exist — in the places check_doc_links.py
         deliberately does NOT look (inline code, fenced blocks, source-code string literals).
Category: Tooling / lint
Scope: Template v2.6.1

Description:
    check_doc_links.py answers "do the links resolve?". It blanks out fenced blocks and inline
    code first, because sample markdown inside a fence is documentation OF a link, not a link.
    That is correct for its job — and it leaves a gap.

    The gap matters because the most damaging stale path is not a link a human clicks. It is an
    INSTRUCTION an assistant follows:

        | Bug Fix | `4-changes/bug-fixes/` |     <- a table cell, inline code
        ls docs/02-architecture/planning/phase-*  <- inside a ``` fence
        help="Output dir (default: old/path)"     <- not markdown at all

    None of those are markdown links. All three tell the next session to write to, or read from,
    somewhere that no longer exists. A directory restructure passes every content-preservation
    check (nothing was lost!) while leaving instructions like these pointing at deleted paths.

    This lint therefore does the complement: it looks ONLY at repo-root-relative paths (paths
    beginning with a real top-level directory of this repo) wherever they appear — prose, tables,
    inline code, fences, and string literals in source files — and checks they exist.

    Scope is narrow ON PURPOSE. It scans the "read as current guidance" set by default (rules,
    on-demand rules, layer READMEs, process docs, scripts) rather than the whole repo, because
    those are the files whose staleness silently misdirects work. Use --all to widen.

    False positives are expected and are NOT bugs: a doc may legitimately mention a path in
    another repo, a planned-but-absent file, or an illustrative example. Mark those lines with
    the pragma rather than weakening the check:

        See `docs/03-implementation/bugs/FIX-123-example.md`  <!-- path-check: ignore -->
        TEMPLATE_OUT = "docs/09-analysis/report.md"  # path-check: ignore

Key Components:
    - Violation: NamedTuple (file, line, target). NamedTuple, NOT dataclass — tests may load
      this module via importlib file-path.
    - top_level_dirs(): derives the "looks like our path" prefix set FROM the repo itself, so
      the lint needs no per-project configuration.
    - find_violations(repo_root): pure function; unit-testable via tmp_path.

Usage:
    python scripts/lint/check_path_references.py [--root <repo_root>] [--all]

Created: 2026-08-07
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/rules-on-demand/restructure-repointing.md — the rule this lint mechanises
    - scripts/lint/check_doc_links.py — the complement (declared links, relative targets)
    - .claude/rules/verification-discipline.md — same proposition, runtime layer
"""

import argparse
import re
import sys
from pathlib import Path
from typing import NamedTuple

# Windows consoles default to cp950/cp1252 and cannot encode non-ASCII paths.
# Without this the lint CRASHES mid-report with UnicodeEncodeError — after
# printing a partial, misleadingly SMALL count that looks like a real result.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        pass

PRAGMA = "path-check: ignore"

# A path-looking token: <segment>/<more>/<file.ext> or <segment>/<dir>/
PATH_RE = re.compile(r"[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)+/?")

# Markdown link targets belong to check_doc_links.py; blank them to avoid double-reporting.
MD_LINK_TARGET_RE = re.compile(r"\]\([^)]*\)")

# Template slots and illustrative placeholders — never real paths.
PLACEHOLDER_RE = re.compile(r"[<>{}*]|XX|YY|NNN|\bYYYY\b|\.\.\.")

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build",
    ".mypy_cache", ".pytest_cache", ".ruff_cache",
}
# Same rationale as check_doc_links.py: these drawers hold content whose paths
# resolve only after it is copied to a real home.
TEMPLATE_DIR_PARTS = {"templates", "_templates", "memory-seed"}
TEMPLATE_FILE_PREFIX = "_TEMPLATE"

# The "read as current guidance" set — files whose staleness misdirects future work.
DEFAULT_GLOBS = (
    "CLAUDE.md",
    ".claude/rules/*.md",
    "docs/README.md",
    "docs/*/README.md",
    "docs/rules-on-demand/*.md",
    "docs/01-planning/PROCESS.md",
    "docs/INFORMATION-FLOW.md",
    "scripts/**/*.py",
)

SCANNABLE_SUFFIXES = {
    ".md", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".sh", ".yaml", ".yml", ".toml", ".json",
}


class Violation(NamedTuple):
    file: str
    line: int
    target: str


def top_level_dirs(repo_root: Path) -> set[str]:
    """Real top-level directories — the prefixes that make a token 'one of ours'.

    Derived from the repo rather than hardcoded, so the lint needs no configuration and
    automatically covers whatever layout the project actually has.
    """
    out: set[str] = set()
    for child in repo_root.iterdir():
        if child.is_dir() and child.name not in SKIP_DIRS:
            out.add(child.name)
    return out


def _iter_files(repo_root: Path, scan_all: bool) -> list[Path]:
    if scan_all:
        found = [
            p for p in repo_root.rglob("*")
            if p.is_file() and p.suffix in SCANNABLE_SUFFIXES
        ]
    else:
        found = []
        for pattern in DEFAULT_GLOBS:
            found.extend(p for p in repo_root.glob(pattern) if p.is_file())

    keep: list[Path] = []
    for p in found:
        parts = set(p.relative_to(repo_root).parts)
        if parts & SKIP_DIRS:
            continue
        if parts & TEMPLATE_DIR_PARTS or p.name.startswith(TEMPLATE_FILE_PREFIX):
            continue
        keep.append(p)
    return sorted(set(keep))


def find_violations(repo_root: Path, scan_all: bool = False) -> list[Violation]:
    """Return every repo-root-relative path reference that does not exist."""
    repo_root = repo_root.resolve()
    prefixes = top_level_dirs(repo_root)
    violations: list[Violation] = []

    for path in _iter_files(repo_root, scan_all):
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue

        for lineno, line in enumerate(text.splitlines(), start=1):
            if PRAGMA in line:
                continue
            # Markdown link targets are check_doc_links.py's job.
            line = MD_LINK_TARGET_RE.sub(lambda m: " " * len(m.group(0)), line)

            for m in PATH_RE.finditer(line):
                # A match starting right after "/" is the TAIL of a longer token
                # PATH_RE could not span (it stops at "(" etc.). Prose uses "/"
                # as an enumerator: "NO migration/wire(26)/frontend/loop.py"
                # means four absent things, not a path — but its tail matches.
                if m.start() > 0 and line[m.start() - 1] == "/":
                    continue
                token = m.group(0).rstrip(".,;:)]}\"'`")
                head = token.split("/", 1)[0]
                if head not in prefixes:
                    continue
                if PLACEHOLDER_RE.search(token):
                    continue
                # Bare dir mentions without a trailing slash are too ambiguous to judge
                # (prose says "the docs/09-analysis layer"); require a file or explicit dir.
                if not token.endswith("/") and "." not in token.rsplit("/", 1)[-1]:
                    continue
                if not (repo_root / token).exists():
                    violations.append(
                        Violation(path.relative_to(repo_root).as_posix(), lineno, token)
                    )

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Stale repo-root-relative path references in guidance files."
    )
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument(
        "--all",
        action="store_true",
        help="Scan every text file, not just the default guidance set.",
    )
    cli = parser.parse_args(argv)

    violations = find_violations(Path(cli.root), cli.all)
    if not violations:
        print("path-references: OK (every repo-relative path in guidance files resolves)")
        return 0

    print(f"path-references: {len(violations)} stale reference(s):")
    for v in violations:
        print(f"  {v.file}:{v.line} -> {v.target}")
    print(f"  (intentional? add '{PRAGMA}' on the line)")
    return 1


if __name__ == "__main__":
    sys.exit(main())
