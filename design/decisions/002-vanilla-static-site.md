# ADR-002: Vanilla Static Site Over Framework

**Date:** 2026-03-16
**Status:** Accepted

## Context

The EA website presents research findings, comparison tables, assessment tools, and a graph explorer. It's a knowledge base, not a web app.

## Options Considered

1. **Vanilla HTML + JS + CSS** — No build step. Single `app.js` routes by page type. JSON data loaded at runtime. Served from `docs/` via GitHub Pages.
2. **SvelteKit** — Used in Insight frontend. Component model, good DX. But adds build tooling for a content site.
3. **Static site generator (Astro/11ty)** — Template-driven, good for content. But page type variety (18 types) would require many custom templates.

## Decision

**Vanilla static site.** No build step means deploy = push to GitHub. The single `app.js` handles 18 page types with dedicated renderers. JSON data is fetched client-side. The HQ shared design system provides visual consistency via CSS custom properties.

## Consequences

- Zero build tooling — edit and push
- Single `app.js` (5,800 lines) handles all routing and rendering
- 18 page type renderers give flexibility per content type
- No component reuse model — some rendering code duplicated
- GitHub Pages deployment is trivial (serve `docs/`)
- Assessment answers persist in localStorage (no backend needed)
