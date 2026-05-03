# Website Architecture

The deliverable is a static website served from `docs/` via GitHub Pages.

## Tech stack

- Vanilla HTML + CSS + JavaScript, no frameworks, no build step.
- Data-driven: all content in JSON files (`docs/data/*.json`), loaded by `docs/js/app.js`.
- Local dev: `python3 -m http.server 8080` from `docs/`.
- GitHub Pages compatible.

## Navigation

- **Top nav:** dark navy sticky bar with page links, Industries dropdown, search icon, and external "Insight" link.
- **Industries dropdown:** entries in `site.json` with a `children` array render as hover dropdowns on desktop, flat indented links on mobile.
- **Hamburger menu:** on mobile (≤768px) nav links collapse into a vertical drawer toggled by hamburger icon; search icon stays visible.
- **Search:** magnifying glass icon (or `/` keyboard shortcut) opens a full-width overlay with instant client-side search across all JSON data files.

## Page types

### Concept pages
EA Development, Governance, Repository, Roles & Skills, Risk & Security.
- **Sidebar:** dark navy, sticky, lists subtopics for the current page.
- **Main content:** two tabs — Overview and Assessment.
  - **Overview tab:** comparison table with dark heading rows per subtopic (topic name + summaries with `<mark>` highlights for key AI changes). Expandable to full detail in two columns (Traditional EA | EA for the Agentic Organisation).
  - **Assessment tab:** all subtopics' maturity questions on one page, 1–5 scale, localStorage persistence, contextual recommended actions.

### Industry pages
Re/Insurance, Banking, Pharma.
- Page type `"industry"` in JSON triggers `initIndustryPage()`.
- Structure: findings grid, case studies with expandable details, comparison sections.
- Adding a new industry = 1 HTML file + 1 JSON data file + 1 entry in `site.json` `children` array.

### Overview page
Key findings, impact matrix (3 objectives × 5 dimensions), domain summaries (linked cards per EA domain), ten new capabilities grid.

## Design tokens

- `--bg: #f7f8fa`, `--surface: #fff`, `--text: #1a1a2e`, `--accent: #2563eb`
- Sidebar + column headers + topic heading rows use `var(--text)` dark navy background.
- AI change highlights use `<mark>` with yellow on dark background.

## JSON data conventions

- `ai_impact.summary` uses `<mark>` tags for key change phrases.
- Industry JSON files use `page_type: "industry"` with `findings`, `case_studies`, and `sections` arrays.
- File naming: lowercase kebab-case.
