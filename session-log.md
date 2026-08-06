# Session Log

## 2026-08-06 — Open EA Repository concept & plan

Researched and authored the concept for an open-source, browser-based EA repository (ArchiMate 3.2-native, LeanIX-class portfolio features, GitHub Pages + local browser storage). Four parallel research passes: OSS EA tool landscape (no active open-source LeanIX equivalent exists; FINOS Waltz closest in spirit; Archi/exchange-format the interop anchors), browser ArchiMate/diagram libraries (React Flow + ELKjs recommended, LikeC4 as architecture blueprint, all ArchiMate-specific JS libs must be vendored), LeanIX meta model v4 deep-dive (report system reduces to five primitives; edge properties must be first-class), and browser persistence (in-memory model + IndexedDB snapshots beats SQLite WASM at this scale; files as source of truth).

Deliverable: `design/specs/open-ea-repository-concept.md` — vision, prior-art survey, metamodel (ArchiMate core + portfolio-profile overlay), architecture, report engine, LeanIX parity map, risks, 3-phase delivery plan, 5 ADR candidates. Next step: sponsor review of the concept, then bootstrap the new repo (phase 0) per ADR-003 separate-repo precedent.
