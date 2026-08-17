# Fixture — stale SHA anchor

> Self-test input for `scripts/lint/check_sha_anchors.py`. **Not documentation.**
> It lives under `scripts/` rather than `docs/` so the real scan never sees it.
>
> ⛔ Do not "clean this up". The detector refuses to run without it, and the
> whole point of the file is that it contains a defect.

## Must be caught — a live reference to a commit that resolves to nothing

The neutralisation predictions were locked into commit `deadbee` before any of
them were executed.

## Must be let through — the line is ABOUT the SHA being dead

Rebase merge rewrote it: `deadbee` → `cafe123`, so the old value is a dead
value and this sentence is the record of that.

## Must be let through — a template row, not a reference

| YYYY-MM-DD | example entry | `a385180` |

## Must be let through — too long to be a git abbreviation

Migration `20260812131655`, CI run `31299823765`, checksum `ac8d1b35` — all hex,
none of them 7 characters, none of them commits.
