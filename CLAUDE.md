# Enterprise Architecture for the Agentic Organisation

## Project Objective

Building a knowledge base on how Enterprise Architecture must evolve for Agentic Organisations leveraging AI. The goal is to analyze traditional EA capabilities through the lens of AI-native transformation and produce actionable guidance for organizations adopting agentic approaches.

## End Deliverable

A **website** presenting findings — mapping traditional EA capabilities to their AI-augmented equivalents, identifying gaps, and proposing new capabilities required for agentic organisations.

## Key Principles

- **Grounded in established EA frameworks**: Analysis anchored to industry-standard EA concepts and structure
- **Practical, not academic**: Focus on actionable insights for EA practitioners
- **AI/Agentic transformation focus**: Every capability examined through the lens of "what changes when AI agents are part of the enterprise?"
- **Evidence-based**: Research-backed claims with cited sources
- **TOGAF as neutral reference**: Used as structural anchor, never judged or promoted
- **No PwC mentions**: Anywhere in website content

## Repository Structure

```
/
├── CLAUDE.md                  # This file — project instructions
├── BACKLOG.md                 # Activity tracking and backlog
├── .gitignore                 # Ignores local-docs/, Documentation/
├── local-docs/                # Local reference docs, git-ignored
├── Documentation/             # All analysis content (git-ignored, source material)
│   ├── analysis/              # 36 YAML analysis files (source of truth for website content)
│   │   ├── phase-*.yaml       # ADM phase analyses (Type A)
│   │   ├── *.yaml             # Governance, Repository, Roles, Risk analyses (Type A)
│   │   └── *-concept.yaml     # New AO concepts (Type B)
│   ├── analysis-approach.md   # Analysis methodology and status tracking
│   ├── domains/               # 5 domain analysis files (development, governance, repository, roles, risk)
│   ├── findings/              # 9 research findings
│   ├── new-capabilities/      # 10 new capability definitions
│   ├── recommendations.md     # 12 recommendations
│   ├── ea-capability-model.md # 30 EA capabilities overview
│   └── togaf-reference-map.yaml
└── website/                   # Static website (the deliverable)
    ├── index.html             # Home/Research page
    ├── ea-development-method.html
    ├── ea-governance.html
    ├── ea-repository.html
    ├── ea-roles-skills.html
    ├── risk-security.html
    ├── css/style.css          # Single CSS file, design tokens aligned with Research Agent
    ├── js/app.js              # Single JS file, all navigation/tabs/assessment logic
    └── data/                  # JSON data files driving all content
        ├── site.json          # Navigation structure, site metadata
        ├── home.json          # Home page stats, findings
        ├── ea-development-method.json  # 8 subtopics
        ├── ea-governance.json          # 7 subtopics
        ├── ea-repository.json          # 7 subtopics
        ├── ea-roles-skills.json        # 7 subtopics
        ├── risk-security.json          # 7 subtopics
        ├── recommendations.json        # 12 recommendations
        └── new-capabilities.json       # 10 new capabilities
```

## Website Architecture

- **Tech stack**: Vanilla HTML + CSS + JavaScript, no frameworks, no build step
- **Data-driven**: All content in JSON files, loaded by `app.js`
- **GitHub Pages compatible**: Runs from any static file server
- **Local dev**: `python3 -m http.server 8080` from `website/` directory

### Page Layout (concept pages)
- **Top nav**: Dark navy sticky bar with page links + external "Insight" link
- **Sidebar**: Dark navy, sticky, lists subtopics for current page
- **Main content**: Two tabs — Overview and Assessment
- **Overview tab**: Comparison table with dark heading rows per subtopic (topic name + summaries with `<mark>` highlights for key AI changes), expandable to full detail in two columns (Traditional EA | EA for the Agentic Organisation)
- **Assessment tab**: All subtopics' maturity questions on one page, 1-5 scale, localStorage persistence, contextual recommended actions

### Design Tokens
- `--bg: #f7f8fa`, `--surface: #fff`, `--text: #1a1a2e`, `--accent: #2563eb`
- Sidebar + column headers + topic heading rows use `var(--text)` dark navy background
- AI change highlights use `<mark>` with yellow on dark background

## YAML Analysis Pipeline

The website content is derived from element-level TOGAF analysis stored in `Documentation/analysis/`. This is the source of truth.

### Two File Types
- **Type A** (24 files): Direct TOGAF source analysis. Every element (objectives, inputs, steps, outputs, techniques) classified with a verdict: `unchanged` | `modified` | `replaced` | `new`
- **Type B** (12 files, `-concept` suffix): New AO concepts with no TOGAF chapter. Lighter structure: gap description, rationale, elements, summary

### Pipeline: YAML → Website JSON
1. **Analyse**: Read TOGAF source, classify each element, write YAML
2. **Derive**: Synthesise YAML into website JSON (comparison table columns)
3. **Review**: Run persona pipeline (CEO, SA, BA, CTO, PM → Head of EA rewrite)
4. **Update**: Final content goes into `website/data/*.json`

### Coverage (1,062 elements across 36 files)
- 5% unchanged, 81% modified, <1% replaced, 14% new (Type A)
- 167 additional elements from Type B new concepts

## Conventions

- All analysis/source content goes in `Documentation/` (git-ignored)
- Local source documents go in `local-docs/` (git-ignored)
- Website deliverable goes in `website/`
- Do not perform research autonomously — only when explicitly asked
- File names use lowercase kebab-case
- JSON data files use `ai_impact.summary` with `<mark>` tags for key change phrases
