"""
File: scripts/lint/check_sca_allowlist.py
Purpose: Gate `npm audit` through an allowlist whose expiry dates are mechanically enforced.
Category: Tooling / lint
Scope: CH-039

Description:
    `npm audit --audit-level=low` is a hard pass/fail with no way to accept a
    single advisory. security-scan.yml's own triage rule is
    「修 / 豁免（寫理由 + 到期日）/ 誤報（寫理由）」, and the middle option had
    no instrument -- so the only ways to unblock a PR were to weaken the
    threshold globally or to leave the job red, and that file names both as
    wrong (a permanently red job erodes red-means-broken; a lowered threshold
    is 假綠).

    This detector supplies the missing instrument. It runs `npm audit --json`,
    subtracts the allowlisted advisories, and fails on anything left.

    ⭐ THE POINT IS THE EXPIRY, NOT THE ALLOWLIST. An acceptance with a date
    nobody checks is just a silent exemption with extra words -- and
    `.gitleaks.toml` in this repo says the same thing about allowlists that
    take effect quietly. So an entry whose `expires` has passed is a HARD
    FAILURE in its own right, reported separately from the vulnerability:
    the gate goes red on the day the decision was due for review, whether or
    not the advisory is still present. Renewing it is an edit someone has to
    justify, which is the entire mechanism.

    ⚠️ SCOPE BOUNDARY, stated because the name is wider than the proof: this
    checks that every FINDING is either absent or consciously accepted and
    still in date. It says nothing about whether the acceptance was correct.
    The reason field is prose; no machine reads it.

Key Components:
    - load_allowlist: parse .sca-allowlist.json, validating shape and dates
    - run_audit: `npm audit --json`, tolerating its non-zero exit on findings
    - main: expiry check first, then findings minus allowlist

Created: 2026-08-17 (CH-039)
Last Modified: 2026-08-17

Modification History (newest-first):
    - 2026-08-17: Initial creation (CH-039) — GHSA-ggr8-5vv4-36mx blocked W19's PR

Related:
    - .sca-allowlist.json — the entries, their reasons and their expiry dates
    - .github/workflows/security-scan.yml — the SCA job that calls this
    - .gitleaks.toml — the same discipline applied to the secret scanner
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

ALLOWLIST = ".sca-allowlist.json"


def load_allowlist(root: Path) -> list[dict]:
    path = root / ALLOWLIST
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("accepted", [])
    for i, e in enumerate(entries):
        missing = [k for k in ("advisory", "package", "reason", "expires", "owner") if not e.get(k)]
        if missing:
            raise SystemExit(f"{ALLOWLIST}: entry {i} is missing {missing} -- every field is required")
        try:
            date.fromisoformat(e["expires"])
        except ValueError as exc:
            raise SystemExit(f"{ALLOWLIST}: entry {i} has an unparsable expires: {exc}") from exc
    return entries


def run_audit(root: Path) -> dict:
    # npm audit exits non-zero when it finds anything, which is not an error here.
    proc = subprocess.run(
        ["npm", "audit", "--json", "--audit-level=low"],
        cwd=root,
        capture_output=True,
        text=True,
        shell=(sys.platform == "win32"),
    )
    if not proc.stdout.strip():
        raise SystemExit(f"sca-allowlist: npm audit produced no output\n{proc.stderr[:400]}")
    return json.loads(proc.stdout)


def advisories_of(vuln: dict) -> set[str]:
    """The GHSA ids behind one vulnerability entry, which npm nests under `via`."""
    out = set()
    for via in vuln.get("via", []):
        if isinstance(via, dict) and via.get("url"):
            out.add(via["url"].rstrip("/").split("/")[-1])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    root = Path(args.root).resolve()

    entries = load_allowlist(root)
    today = date.today()
    violations: list[str] = []

    # Expiry first, and independent of whether the advisory still fires. An
    # acceptance that outlived its review date is the failure being guarded
    # against, so it must not be able to hide behind an upstream fix.
    accepted: set[str] = set()
    for e in entries:
        if date.fromisoformat(e["expires"]) < today:
            violations.append(
                f"{ALLOWLIST}: acceptance of {e['advisory']} ({e['package']}) EXPIRED on "
                f"{e['expires']} -- re-decide and update `expires`, or remove the entry. "
                f"owner={e['owner']}"
            )
        else:
            accepted.add(e["advisory"])

    report = run_audit(root)
    unaccepted: list[str] = []
    for name, vuln in sorted(report.get("vulnerabilities", {}).items()):
        ids = advisories_of(vuln)
        if not ids:
            continue
        remaining = ids - accepted
        if remaining:
            unaccepted.append(
                f"{name} ({vuln.get('severity')}): {', '.join(sorted(remaining))} "
                f"range={vuln.get('range')}"
            )

    if unaccepted:
        violations.extend(f"unaccepted vulnerability: {u}" for u in unaccepted)

    if violations:
        print(f"sca-allowlist: {len(violations)} violation(s):")
        for v in violations:
            print(f"  {v}")
        return 1

    n = len(accepted)
    note = f", {n} accepted and in date" if n else ""
    print(f"sca-allowlist: OK (no unaccepted vulnerabilities{note})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
