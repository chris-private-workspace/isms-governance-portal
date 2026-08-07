"""
File: scripts/lint/check_doc_links.py
Purpose: Detect broken relative links between Markdown docs.
Category: Tooling / lint
Scope: Template v2.6.1

Description:
    A doc-heavy process rots through broken links first: a file gets moved or
    renamed, and every pointer to it silently becomes a dead end. Readers then
    stop trusting the navigation, which is the whole value of the layout.

    This lint walks every *.md and checks that each relative link target
    exists. It deliberately IGNORES four things that look like links but
    are not:

    1. Fenced code blocks (``` ... ```) — sample markdown inside a code fence
       is documentation OF a link format, not a link.
    2. HTML comments (<!-- ... -->) — template instructions.
    3. Inline code spans (`...`) — e.g. Python generics `Sequence[T]` parse as
       a markdown link to the naked eye of a regex.
    4. Targets containing <angle-bracket placeholders> or {brace} patterns —
       those are template slots (`plan.md`, `<topic>.md`), which by
       definition do not exist yet.

    It also skips templates by default — both the _templates/ drawer and any
    _TEMPLATE-*.md file: templates contain relative paths that resolve only
    AFTER the file is copied to its real home (a phase checklist template links
    to ./plan.md, which is correct from docs/01-planning/<phase-dir>/, not from
    docs/01-planning/_templates/phase/).

Key Components:
    - Violation: NamedTuple (file, line, target). NamedTuple, NOT dataclass —
      tests may load this via importlib file-path.
    - strip_noncontent(): blanks out fences / comments / inline code.
    - find_violations(repo_root): pure function; unit-testable via tmp_path.

Usage:
    python scripts/lint/check_doc_links.py [--root <repo_root>] [--include-templates]

Created: 2026-08-07
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/INFORMATION-FLOW.md — the navigation this lint protects
    - docs/rules-on-demand/lint-detector-authoring.md
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

# Escape hatch for links that point outside the repo ON PURPOSE (e.g. a doc
# referencing an assistant's memory directory that lives under the user's home).
# Written as an HTML comment: `[x](../elsewhere.md)  <!-- doc-links: ignore -->`
PRAGMA = "doc-links: ignore"

# [text](target) where target is not an anchor / URL
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`\n]*`")

# Targets that are template slots, not real paths.
PLACEHOLDER_RE = re.compile(r"[<>{}]|XX|NNN|\bYYYY\b")

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
# Directories whose relative links resolve only AFTER their contents are copied
# to a real home. memory-seed/MEMORY.md links to memory/<file>.md — correct from
# the project root it seeds, meaningless from inside the seed drawer.
TEMPLATE_DIR_PARTS = {"templates", "_templates", "memory-seed"}
TEMPLATE_FILE_PREFIX = "_TEMPLATE"

# Historical records. Their links were correct WHEN WRITTEN; rewriting them
# would falsify the record. Keep this set IDENTICAL to check_path_references.py's
# HISTORY_DIR_PARTS — when the two lints disagreed about what counts as "not
# current guidance", the difference surfaced as ~30 findings in one lint only.
HISTORY_DIR_NAMES = {"_archive", "archived", "archive", "sample", "Example",
                     "archive-v2", "archive-v3", "vendor", "third_party"}

# Path fragments marking closed work whose links are no longer maintained.
# Empty by default — add e.g. "docs/01-planning/W" once enough phases have
# closed that their stale links drown the live-guidance findings.
HISTORY_GLOB_PARTS: tuple[str, ...] = ()


def is_history(rel_posix: str) -> bool:
    if any(part in rel_posix for part in HISTORY_GLOB_PARTS):
        return True
    return bool(set(rel_posix.split("/")[:-1]) & HISTORY_DIR_NAMES)


class Violation(NamedTuple):
    file: str
    line: int
    target: str


def strip_noncontent(text: str) -> str:
    """Blank out fences / comments / inline code, preserving line numbers."""

    def blank(m: re.Match[str]) -> str:
        # keep newlines so line numbers stay accurate
        return re.sub(r"[^\n]", " ", m.group(0))

    text = FENCE_RE.sub(blank, text)
    text = COMMENT_RE.sub(blank, text)
    text = INLINE_CODE_RE.sub(blank, text)
    return text


def find_violations(
    repo_root: Path, include_templates: bool = False, include_history: bool = False
) -> list[Violation]:
    """Return every broken relative markdown link under repo_root."""
    violations: list[Violation] = []

    for md in sorted(repo_root.rglob("*.md")):
        rel = md.relative_to(repo_root)
        parts = set(rel.parts)
        if parts & SKIP_DIRS:
            continue
        if not include_history and is_history(rel.as_posix()):
            continue
        if not include_templates and (
            parts & TEMPLATE_DIR_PARTS or md.name.startswith(TEMPLATE_FILE_PREFIX)
        ):
            continue

        raw_lines = md.read_text(encoding="utf-8", errors="replace").splitlines()
        content = strip_noncontent("\n".join(raw_lines))
        for lineno, line in enumerate(content.splitlines(), start=1):
            # Read the pragma from the ORIGINAL line: strip_noncontent() blanks
            # out HTML comments, which is exactly how the pragma is written.
            if PRAGMA in raw_lines[lineno - 1]:
                continue
            for m in LINK_RE.finditer(line):
                raw = m.group(1).strip()
                if raw.startswith(
                    # "/docs/x" is an absolute link into an external doc site and
                    # "sandbox:" is an LLM tool-output URI — neither is a repo path.
                    ("http://", "https://", "mailto:", "sandbox:", "#", "/")
                ):
                    continue
                target = raw.split("#")[0].strip()
                if not target or PLACEHOLDER_RE.search(target):
                    continue
                if not (md.parent / target).resolve().exists():
                    violations.append(
                        Violation(md.relative_to(repo_root).as_posix(), lineno, target)
                    )

    return violations


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Broken relative markdown link check.")
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument(
        "--include-history",
        action="store_true",
        help="Also check archived / sample directories (their links were correct "
        "when written; normally out of scope).",
    )
    parser.add_argument(
        "--include-templates",
        action="store_true",
        help="Also check templates/ (their relative paths resolve post-copy, so "
        "they normally report false positives).",
    )
    cli = parser.parse_args(argv)

    violations = find_violations(Path(cli.root), cli.include_templates, cli.include_history)
    if not violations:
        print("doc-links: OK (no broken relative links)")
        return 0

    print(f"doc-links: {len(violations)} broken link(s):")
    for v in violations:
        print(f"  {v.file}:{v.line} -> {v.target}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
