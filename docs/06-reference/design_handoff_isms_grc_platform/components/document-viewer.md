# DocumentViewer (policy detail)

`fragments/screens/10-policy-detail.html`

## Why it exists

Policy files across the region are **not in a uniform format**. The platform therefore standardises
only the record fields and treats the attached file as authoritative: the page states this, and the
file is read in place or downloaded rather than re-rendered as platform content.

## Layout

```
┌──────────────┬───────────────────────────────────────────────┐
│ side menu    │ title + Open in new tab / Download            │
│ 280px sticky │ standardised summary block                    │
│              │ ┌───────────────────────────────────────────┐ │
│ DOCUMENT     │ │ viewer toolbar                            │ │
│ PUBLICATION  │ ├───────────────────────────────────────────┤ │
│ TABLE OF     │ │ page canvas (scrollable, zoomable)        │ │
│  CONTENTS    │ └───────────────────────────────────────────┘ │
│ VERSION      │ attestation │ linked controls                 │
│  HISTORY     │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

## Side menu (280px, sticky)

Four blocks, each with an 11px uppercase heading:

1. **Document** — title, document number, version, status, category, owner
2. **Publication** — published date, file upload date, next review, attestation
3. **Table of contents** — one row per section: number, title, page in mono on the right.
   Clicking jumps the viewer to that page; the row for the current page is highlighted
   (`--primary-tint` background, `--primary-ink` text).
4. **Version history** — version, date, note, author; current version marked.

## Toolbar

Left: file name (mono), format badge (PDF / DOCX), size, page count, upload date.
Right: print, download, page back/forward with `n / total` in mono, zoom out/in with the percentage.

## Page canvas

- Background `--surface-3`, 20px padding, page sheet on `--surface` with `--shadow`.
- Zoom range 60–200%, 20% steps.
- **Zoom must scale layout, not only paint.** The design uses CSS `zoom` so the scroll container
  sizes itself to the scaled page. If you use `transform: scale()` instead, set
  `transform-origin: top left` and give the wrapper a layout width of `page × zoom` — otherwise the
  left edge of the page becomes unreachable at any scroll position.
- Warning strip above the canvas when the file needs a caveat (converted preview, non-searchable scan).

## Production note

Replace the facsimile page rendering with a real embedded viewer (PDF.js or the platform's document
service) inside the same frame and toolbar. Keep the side menu, the toolbar contents and the
"attached file is authoritative" framing — those are the design decisions, not the rendering.
