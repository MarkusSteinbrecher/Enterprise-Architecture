# Archipelago

An **open-source Enterprise Architecture repository that runs entirely in the browser** — a static web app, all data stored locally, no backend, no login. ArchiMate 3.2-native at the core, LeanIX-class portfolio management at the surface.

> *"LeanIX-class EA portfolio management as a static web app — ArchiMate-native, local-first, git-friendly, agent-ready."*

**Status: pre-implementation.** Concept, design, and hi-fi prototype are done; implementation is tracked in the [issues](../../issues).

## What it does (when built)

- **Inventory** applications, capabilities, processes, data, and technology as typed ArchiMate 3.2 elements and relationships.
- **Assess** them: lifecycle phases, functional/technical fit, business criticality, TIME classification, costs on relationships.
- **Visualise** the portfolio through auto-generated reports: dependency graph, capability map, landscape, roadmap, matrix, portfolio bubble.
- **Own your data**: everything lives in your browser (IndexedDB) and in files you export — canonical JSON for git, ArchiMate Model Exchange Format for tool interop (Archi round-trip), Excel for spreadsheets.

## Design & specification

| Document | What it is |
|---|---|
| [`design/specs/open-ea-repository-concept.md`](design/specs/open-ea-repository-concept.md) | Full concept: vision, prior-art survey, metamodel, architecture, report engine, delivery plan |
| [`design/specs/open-ea-repository-design-brief.md`](design/specs/open-ea-repository-design-brief.md) | Design brief: personas, screens, look & feel |
| [`design/specs/open-ea-repository-ui-spec.md`](design/specs/open-ea-repository-ui-spec.md) | UI spec: design position, structural decisions, ADR candidates |
| [`design/handoff/2026-08-inventory-factsheet-graph/`](design/handoff/2026-08-inventory-factsheet-graph/) | Hi-fi design handoff: tokens, component-level spec, running prototype, reference screens |

Open `design/handoff/2026-08-inventory-factsheet-graph/Archipelago.dc.html` directly in a browser to see the prototype.

## Planned stack

TypeScript · React · Vite · React Flow + ELKjs (generated views) · IndexedDB (local persistence) · GitHub Pages (hosting). No server.

## Repo history

This repository previously hosted *EA for the Agentic Organisation*, a knowledge base analysing how EA must evolve for organisations deploying AI agents — the research that motivates this tool. That content is preserved at the [`knowledge-base-final`](../../tree/knowledge-base-final) tag.

## License

[MIT](LICENSE).

ArchiMate® is a registered trademark of The Open Group. This project is not affiliated with or endorsed by The Open Group.
