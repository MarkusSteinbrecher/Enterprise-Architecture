# Enterprise Architecture — Constitution

## Purpose

Analyze how Enterprise Architecture must evolve for agentic organisations, and demonstrate agent-ready EA patterns concretely via a website and proof-of-concept.

## Principles

- **Grounded in EA frameworks.** Analysis anchored to TOGAF as a structural reference, never judged or promoted.
- **Practical, not academic.** Actionable insights for EA practitioners adopting agentic approaches.
- **Show, don't just tell.** The PoC demonstrates agent-ready patterns concretely — graph repositories, MCP tools, typed relationships.
- **Evidence-based.** Research-backed claims with cited sources. All website content derives from YAML analysis pipeline.
- **Data-driven pipeline.** YAML analysis files are the source of truth → JSON export → static website. No hand-edited HTML content.

## Boundaries

**Always:**
- Derive website content from the YAML analysis pipeline
- Use TOGAF as neutral structural anchor
- Keep PoC components in the separate agentic-ea repo
- Follow HQ shared design system for website styling

**Never:**
- Mention PwC anywhere in website content
- Research autonomously without sponsor direction
- Hand-edit exported JSON data files

**Ask first:**
- Adding new EA domains or website pages
- Changes to the YAML analysis pipeline structure
- Technology choices affecting the website or PoC

## Key Decisions

| ADR | Decision | Date |
|-----|----------|------|
| [001](decisions/001-yaml-source-of-truth.md) | YAML analysis files as source of truth | 2026-03-16 |
| [002](decisions/002-vanilla-static-site.md) | Vanilla static site over framework | 2026-03-16 |
| [003](decisions/003-separate-poc-repo.md) | Separate PoC repo from knowledge base | 2026-03-16 |
