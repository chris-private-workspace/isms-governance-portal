"""
File: scripts/session_bootstrap.py
Purpose: SessionStart hook — inject the project's CURRENT coordinates
    (active phase + git state + slim summary) into every session.
Category: Tooling / AI collaboration
Scope: Template v2.6.1

Description:
    CLAUDE.md is always-loaded but deliberately static — the phase you are
    on, the branch you are on and what shipped last week change faster than
    a navigator file should. Writing them INTO CLAUDE.md is exactly how a
    navigator file grows to 77KB.

    This hook supplies the volatile half at session start instead:

      1. SESSION_SUMMARY.md verbatim, if the project keeps one
      2. Active phase(s), auto-detected from `status:` frontmatter — so the
         answer comes from the artifacts themselves and cannot go stale the
         way a hand-maintained line in CLAUDE.md does
      3. Branch, working-tree state, last few commits

    Deliberately SLIM: every byte here is paid on every single session.
    If you find yourself wanting to add a section, it probably belongs in
    docs/ with a pointer from CLAUDE.md.

Usage:
    python scripts/session_bootstrap.py [--root <repo_root>]

    Wire it in .claude/settings.json:
        "SessionStart": [{ "matcher": "startup|compact",
                           "hooks": [{ "type": "command",
                                       "command": "python scripts/session_bootstrap.py" }] }]

    The "compact" matcher matters: after a compaction the standing
    instructions survive far better than the current coordinates do.

Created: 2026-08-07
Last Modified: 2026-08-07

Modification History (newest-first):
    - 2026-08-07: Initial creation from claude-code-dev-template v2.6.1

Related:
    - docs/12-ai-assistant/01-prompts/SESSION_SUMMARY.template.md
    - docs/01-planning/PROCESS.md §6 Session Start Protocol
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Optional by design -- projects that keep no summary simply get the auto-detected
# sections. Absence is not an error.
SUMMARY_REL = "docs/12-ai-assistant/01-prompts/SESSION_SUMMARY.md"  # path-check: ignore
FM_STATUS = re.compile(r"^status:[ \t]*([^\s#]+)", re.MULTILINE)
OPEN_STATES = {"active", "draft", "proposed", "approved", "in_progress"}
MAX_SUMMARY_CHARS = 4_000


def _git(repo_root: Path, *args: str) -> str:
    try:
        out = subprocess.run(
            ["git", *args],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return out.stdout.strip() if out.returncode == 0 else ""


def frontmatter_status(path: Path) -> str | None:
    """`status:` from the leading YAML block only (not from fenced examples)."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    m = FM_STATUS.search(text[3:end])
    return m.group(1).strip().strip("`\"'").lower() if m else None


def active_phases(repo_root: Path) -> list[tuple[str, str]]:
    """(phase folder, status) for every phase whose plan is not closed."""
    found = []
    for plan in sorted(repo_root.glob("docs/01-planning/W*/plan.md")):
        status = frontmatter_status(plan)
        if status in OPEN_STATES:
            found.append((plan.parent.name, status))
    return found


def build_report(repo_root: Path) -> str:
    lines: list[str] = ["# Session bootstrap (auto-injected)"]

    summary = repo_root / SUMMARY_REL
    if summary.is_file():
        text = summary.read_text(encoding="utf-8", errors="replace").strip()
        if len(text) > MAX_SUMMARY_CHARS:
            # Truncate rather than skip: a summary that outgrew its budget is
            # itself worth surfacing, but not worth paying for in full.
            text = (
                text[:MAX_SUMMARY_CHARS]
                + f"\n\n...[truncated at {MAX_SUMMARY_CHARS} chars — "
                f"SESSION_SUMMARY.md is meant to fit on one page]"
            )
        lines += ["", text]

    lines += ["", "## Active phase (from `status:` frontmatter)"]
    phases = active_phases(repo_root)
    if phases:
        lines += [f"- `{name}` — status `{status}`" for name, status in phases]
        if len(phases) > 1:
            lines.append(
                "- ⚠️ 多於一個 phase 未收尾 —— 確認哪個才是真的 active"
                "（跑 `python scripts/lint/check_status_markers.py`）"
            )
    else:
        lines.append(
            "- **無 active phase。** 收到多日任務要先開 phase kickoff（PROCESS R1）；"
            "小改動走 `/change` 或 `/fix`。"
        )

    branch = _git(repo_root, "rev-parse", "--abbrev-ref", "HEAD") or "(unknown)"
    dirty = _git(repo_root, "status", "--porcelain")
    log = _git(repo_root, "log", "--oneline", "-5")

    lines += ["", "## Git", f"- branch `{branch}` · 工作樹 "
              + (f"dirty（{len(dirty.splitlines())} 個檔）" if dirty else "clean")]
    if log:
        lines += ["", "```", log, "```"]

    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Inject session coordinates.")
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repo root (default: one level above scripts/).",
    )
    cli = parser.parse_args(argv)
    print(build_report(Path(cli.root)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
