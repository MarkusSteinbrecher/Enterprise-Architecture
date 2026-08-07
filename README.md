# Archipelago

An **open-source Enterprise Architecture repository that runs entirely in the browser** — a static web app, all data stored locally, no backend, no login. ArchiMate 3.2-native at the core, LeanIX-class portfolio management at the surface.

> *"LeanIX-class EA portfolio management as a static web app — ArchiMate-native, local-first, git-friendly, agent-ready."*

**Status: in implementation.** Concept, design, and hi-fi prototype are done; the app is being built out issue by issue — see the [issues](../../issues).

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

## Stack

TypeScript · React · Vite · React Flow + ELKjs (generated views) · IndexedDB (local persistence) · GitHub Pages (hosting). No server.

## Development

```bash
npm install
npm run dev          # dev server
npm test             # unit tests (Vitest)
npm run lint         # ESLint
npm run build        # typecheck + production build into dist/
```

The production build targets a GitHub Pages **project** site, so it is written against
the base path `/Enterprise-Architecture/`. Build for a root deployment with
`BASE_PATH=/ npm run build`. `dist/404.html` carries the SPA redirect that keeps deep
links (`/inventory`, `/element/:id`, `/graph`) working on Pages.

Fonts (Space Grotesk, JetBrains Mono — SIL OFL 1.1) are self-hosted in
`src/assets/fonts/`; nothing is fetched from a CDN at runtime. Design tokens live in
`src/styles/tokens.css` and are copied verbatim from the design handoff — that file is
the single source of colour, and semantic ramps (layer / lifecycle / TIME) are the
report legend, not decoration.

## Repo history

This repository previously hosted *EA for the Agentic Organisation*, a knowledge base analysing how EA must evolve for organisations deploying AI agents — the research that motivates this tool. That content is preserved at the [`knowledge-base-final`](../../tree/knowledge-base-final) tag.

## License

[MIT](LICENSE).

ArchiMate® is a registered trademark of The Open Group. This project is not affiliated with or endorsed by The Open Group.
