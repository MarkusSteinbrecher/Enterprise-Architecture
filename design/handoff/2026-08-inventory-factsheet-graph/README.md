# Handoff: Archipelago — Inventory, Fact Sheet, Dependency Graph

**Target repo:** the new product repo per `design/specs/open-ea-repository-concept.md` §9 (ADR-003 precedent: PoCs/products separate from the knowledge base).
**Suggested location:** `design/handoff/2026-08-inventory-factsheet-graph/`
**Source of truth for scope:** `design/specs/open-ea-repository-design-brief.md` (screens 1, 2, 8) and `open-ea-repository-concept.md` §4–6.

## Contents

| File | What it is |
|---|---|
| `README.md` | this implementation spec — component-level, self-sufficient |
| `open-ea-repository-ui-spec.md` | design decisions + rationale + ADR candidates, written to `design/specs/` conventions — drop it there |
| `Archipelago.dc.html`, `support.js` | the running prototype; open the HTML directly in a browser |
| `screens/*.png` | reference captures (see below) |

## Reference screens

| File | State |
|---|---|
| `screens/1-inventory-table-light.png` | Inventory, table view, no filters, light |
| `screens/2-fact-sheet-light.png` | Fact sheet — Home & Away Policy Administration, light |
| `screens/3-graph-light.png` | Dependency graph, colour = Layer, time point 2026, no focus |
| `screens/4-graph-traced-light.png` | Graph with Claim Handling focused — tracing + side panel |
| `screens/5-command-palette.png` | ⌘K palette over the graph |
| `screens/6-graph-dark.png` | Dependency graph, dark theme |

Captured at ~1283px CSS width. The app is desktop-first (≥1280px per the brief); below ~1180px the inventory table scrolls horizontally rather than dropping columns.

## Overview

Hi-fi prototype of the three priority surfaces of the Archipelago EA repository:

1. **Inventory** — faceted element list (table + card view) over the whole workspace.
2. **Element fact sheet** — one element with its portfolio profile, relations, properties, and history.
3. **Dependency graph** — layered ArchiMate view with dependency tracing, a colour-view switcher, and a time-point slider.

Plus the global chrome: workspace switcher, command palette (⌘K), local/unsaved save-state cue, model-health footer, light + dark theme.

Data in the prototype is an ArchiSurance-flavoured model: 29 elements, 47 relationships, coordinates hand-placed for the graph.

## About the design files

`Archipelago.dc.html` in this bundle is a **design reference written as a single HTML file** — a prototype of the intended look and behaviour, not production code. It uses a bespoke streaming-template runtime and inline styles only; do not port that structure.

The task is to **recreate these screens in the product's real environment**: TypeScript + React + Vite, per concept §5.1. Use the codebase's own component model, its CSS approach, React Flow + ELKjs for generated views, and its model layer (in-memory typed graph, `Element`/`Relationship`/`View`/`Workspace`) as defined in the concept. Where the prototype fakes something (hand-placed graph coordinates, static history entries), replace it with the real engine.

## Fidelity

**High-fidelity.** Colours, typography, spacing, borders, and interaction states below are final and should be matched. The layer/lifecycle/TIME semantic colours are load-bearing — they are the report legend, not decoration.

Deliberate deviation to preserve: this app does **not** use the knowledge-base site's tokens (`docs/css/style.css`: Inter, `#2563eb`, 0.75rem radii, soft shadows). The app identity is zero-radius, hairline-bordered, monospace-labelled, copper accent. Keep them separate.

---

## Design tokens

Defined as CSS custom properties on `:root`, overridden under `[data-theme="dark"]`.

### Chrome — light

| Token | Value | Use |
|---|---|---|
| `--paper` | `#FAFAFB` | app background, content wells |
| `--surface` | `#FFFFFF` | panels, header, nav, cards, table |
| `--panel` | `#F3F4F6` | row hover, inactive fills, chip bars |
| `--panel2` | `#EAEDF0` | meter/progress track |
| `--bd` | `#E1E4E8` | hairline borders, row dividers |
| `--bd2` | `#C4CAD1` | emphasised borders, graph edges, arrowheads |
| `--ink` | `#0E1116` | primary text |
| `--ink2` | `#59616A` | secondary text |
| `--ink3` | `#8C939B` | mono labels, meta, counts |
| `--accent` | `#A85B32` (copper) | primary action, focus/trace, active nav mark |
| `--accent2` | `#2C6E77` (slate teal) | secondary data colour (technical fit, health bar) |

### Chrome — dark (`[data-theme="dark"]`)

`--paper #0B0E12` · `--surface #111519` · `--panel #171B21` · `--panel2 #1E242B` · `--bd #232A31` · `--bd2 #343D46` · `--ink #E7EAED` · `--ink2 #98A1AA` · `--ink3 #6B747D` · `--accent #CE7C4E` · `--accent2 #5AA3AD`

### ArchiMate layer colours (respect the notation convention)

| Layer | Light stroke | Light fill | Dark stroke | Dark fill |
|---|---|---|---|---|
| Business | `#A8891C` | `#FAF5E4` | `#D5B441` | `#221E10` |
| Application | `#3A6EA5` | `#EBF1F8` | `#6C9ED6` | `#121A24` |
| Technology | `#42774E` | `#EAF2EC` | `#6FA97C` | `#111D16` |
| Data / passive | `#66748A` | `#EEF1F5` | `#93A3B8` | `#151A20` |
| Motivation | `#7B5EA7` | `#F1EDF8` | `#A98BD6` | `#1A1626` |
| Migration | `#95547F` | `#F8EDF4` | `#C57FAC` | `#22161E` |

### Lifecycle phase colours

| Phase | Light | Dark |
|---|---|---|
| Plan | `#8C939B` | `#7C858E` |
| Phase In | `#3A6EA5` | `#6C9ED6` |
| Active | `#42774E` | `#6FA97C` |
| Phase Out | `#A8891C` | `#D5B441` |
| End of Life | `#AC4436` | `#D96C5C` |

### TIME classification colours

Tolerate `#66748A` / `#93A3B8` · Invest `#2C6E77` / `#5AA3AD` · Migrate `#A8891C` / `#D5B441` · Eliminate `#AC4436` / `#D96C5C`

### Tag colours

Core → `--accent2` · Differentiating → `--accent` · Supporting → `--pas` · Cloud target → `--app` · GDPR → `--mot` · Vendor risk → lifecycle EOL red.

### Typography

- **Display / UI:** `'Space Grotesk'` 400/500/600/700, fallback `system-ui, sans-serif`.
- **Mono (all labels, counts, IDs, codes, chips):** `'JetBrains Mono'` 400/500/600, fallback `monospace`.

Scale as used:

| Role | Spec |
|---|---|
| Screen title (`h1`) | 17px / 1.2, 600, `letter-spacing:-.01em` |
| Fact-sheet title | 22px / 1.15, 600, `-.015em` |
| Section label | 9.5px, 500, mono, `letter-spacing:.1em`, uppercase, `--ink3` |
| Table column header | 9.5px, 500, mono, `.06em`, `--ink3` |
| Table cell — name | 12.5px / 1.2, 500 |
| Table cell — secondary | 11.5px, 400, `--ink2` |
| Body copy | 13.5px / 1.65, 400, `max-width:66ch`, `text-wrap:pretty` |
| Nav item | 12.5px, 400 (500 when active) |
| Mono chip / badge | 9–10px, 500, mono |
| Type code badge | 8.5px, 500, mono |

### Geometry

- **Border radius: 0 everywhere.** No exceptions, no rounded pills.
- **Shadows: none**, except the command palette: `0 24px 60px -20px rgba(0,0,0,.45)`.
- Borders are always `1px solid var(--bd)`; emphasised `var(--bd2)`.
- Header height `46px`; left nav `208px`; inventory filter rail `238px`; fact-sheet right rail `296px`; graph side panel `288px`.
- Table row height: `--rowh` = `38px` balanced / `31px` compact.
- Horizontal content padding: `20px` (inventory), `24px` (fact sheet), `14px` (nav/rails).
- Section gap in fact sheet: `26px`.
- Scrollbars: 10px, thumb `--bd2`, transparent track.

---

## Screen 1 — Inventory

**Purpose:** the workhorse. Find, filter, scan, and open any element in the workspace.

**Layout:** `grid-template-columns: 238px 1fr` inside the main area.

### Filter rail (left, `--surface`, right hairline)

Top to bottom:

1. `SAVED SEARCHES` label, then four rows (`12px/1.3` label + mono count, right-aligned): *End-of-life applications (4)*, *Invest portfolio (4)*, *Vendor risk exposure (5)*, *Business capabilities (6)*. Clicking one replaces the facet set **and** the combinator mode.
2. Hairline divider.
3. `FILTERS` label with a `Clear` text button in `--accent` (11px) — clears facets and the name query.
4. **Combinator segmented control**, 3 equal buttons in one `1px` border box, height 23px, mono 9.5px: `AND` / `OR` / `NOT`. Active = `--accent` fill, white text. Tooltips: "Match every facet group" / "Match any selected facet" / "Exclude anything selected".
5. Four facet groups, each a mono label + option rows. Row = 11×11px square checkbox (`1px` border, `--bd2` → `--accent` when on, filled `--accent` when on), label (12px, 500 when on), right-aligned mono count. Row hover `--panel`; active row background `--panel`.
   - `LAYER`: Business, Application, Technology, Data, Motivation, Migration
   - `LIFECYCLE`: Plan, Phase In, Active, Phase Out, End of Life
   - `TIME CLASSIFICATION`: Tolerate, Invest, Migrate, Eliminate
   - `TAGS`: Core, Differentiating, Supporting, Cloud target, GDPR, Vendor risk

**Filter semantics (implement exactly):**
- Name query is always ANDed on top of facets (substring match on `name + ' ' + type`, case-insensitive).
- `AND` — group-wise: within a group the options OR together, groups AND together.
- `OR` — element matches if it satisfies any selected option in any group.
- `NOT` — element is excluded if it satisfies any selected option.
- Facet counts are global (not co-filtered) — cheap and stable while clicking.

### Header row

`Inventory` title; below it a mono line: `"{n} of {total} elements"` plus `· {k} filters ({MODE})` when facets are active. Right side: name filter input (190×27px, `--paper` fill, `1px --bd`, 12px, placeholder "Filter by name…"), a `TABLE`/`CARDS` segmented control (mono 9.5px, active = `--ink` fill with `--surface` text), and a `+ Element` button (27px, `--accent` fill, white, 11.5px/500).

### Active-filter chip bar

Only when facets are active. `--panel` strip, 9px/20px padding, chips: 22px tall, `--surface` fill, `1px --bd2`, mono 9px group key + 11px value + `×`. Click removes that facet.

### Table

Sticky header row, 29px, bottom border `--bd2`. Columns:

`grid-template-columns: minmax(0,1.7fr) 152px 112px 104px 82px 92px 74px`

| Column | Content |
|---|---|
| ELEMENT | 19×19px type-code badge (mono 8.5px, layer stroke as text + border, layer fill as background) + name, ellipsised |
| TYPE | ArchiMate type name, 11.5px `--ink2` |
| LIFECYCLE | 5×5px phase square + phase label |
| FIT F / T | two 4-segment meters, 4px wide bars, heights 6/8/10/12px, 1.5px gaps; functional filled `--ink2`, technical filled `--accent2`, empty `--panel2` |
| CRIT. | Low / Medium / High / Critical, 11.5px `--ink2` |
| TIME | mono 9.5px chip, `1px` border and text in the TIME colour, no fill |
| COMPLETE | right-aligned mono percentage + 2px bar; bar colour ≥75 green, ≥50 amber, else red |

Row: height `--rowh`, bottom hairline, hover `--panel`, selected row background `--panel`, whole row clickable → fact sheet.

Empty state, centred, 64px padding: "No elements match this filter. / Loosen a facet or switch the combinator to OR."

### Cards view

`repeat(auto-fill, minmax(258px,1fr))`, 12px gap, 16px/20px padding. Card: `--surface`, `1px --bd` (hover `--bd2`), 12px padding, 10px internal gap. Contents: 22px code badge, name (13px/500), mono type line, completeness % top-right; then phase dot + phase label + TIME chip; then a 2px completeness bar.

---

## Screen 2 — Element fact sheet

**Purpose:** read and maintain one element.

**Layout:** header block (`--surface`, bottom hairline, 14px/24px padding) then `grid-template-columns: minmax(0,1fr) 296px`.

### Header

- Breadcrumb, mono 11px: `INVENTORY / {type} / {element.id}` — first segment is an `--accent` link back to Inventory.
- 38×38px type-code badge (mono 12px) + title (22px/600) + meta row: type name, 1px×11px divider, tag chips (20px tall, `1px --bd`, `--panel` fill, 5px colour dot + label), then a `+ tag` button with a **dashed** `--bd2` border.
- Right cluster: 42px completeness ring (SVG, r=16, `stroke-width:4`, track `--panel2`, arc in the completeness colour, `stroke-dasharray = 2πr·pct/100`, rotated `-90deg` about centre) with the percentage (14px/600) and mono `COMPLETE` caption; `Trace in graph` button (transparent, `1px --bd2`, hover border+text `--accent`); `Edit` button (`--accent` fill).
- Tab strip: `Overview` (active — 2px `--accent` bottom border, `--ink`), `Relations`, `Assessment`, `Quality` (`--ink3`). Only Overview is built in the prototype; the others are the intended tab set.

### Main column sections (26px apart)

1. **DOCUMENTATION** — one paragraph, 13.5px/1.65, `max-width:66ch`.
2. **LIFECYCLE** — right-aligned mono note ("Current phase: Active · derived from phase dates", or "No lifecycle dates on this element type"). Then 5 equal columns, 3px gap: 6px bar (current phase in its colour, others `--panel2`), phase name (500 when current, else 400 `--ink3`), mono date (`01 Jan {year}` or `—`). **Phase is derived from the dates, not stored** — see "Lifecycle derivation".
3. **PORTFOLIO ASSESSMENT** — 1px-gap grid (`--bd` background acting as gridlines, `minmax(184px,1fr)` columns) of four cells on `--surface`, 12px/13px padding: mono key, then value (14px/500) with a 4-segment meter right-aligned (5px bars, heights 6/8/10/12).
   - `FUNCTIONAL FIT` → Insufficient / Unreasonable / Appropriate / Perfect, meter `--ink2`
   - `TECHNICAL FIT` → Inadequate / Unreasonable / Adequate / Fully adequate, meter `--accent2`
   - `BUSINESS CRITICALITY` → Low / Medium / High / Critical, meter Phase-Out amber
   - `TIME CLASSIFICATION` → value in its TIME colour, meter in the same colour
   - Unset shows "Not assessed" with an empty meter.
4. **RELATIONS** — mono note `"{n} relations · {k} types"`. One bordered block per ArchiMate relationship type, in this fixed order: Realization, Serving, Flow, Access, Assignment, Composition, Association, Influence. Block header (31px, `--panel`, bottom hairline): type name in mono 10px, count, `+ add` link right. Rows (34px, hairline, hover `--panel`, clickable → that element's fact sheet): direction glyph `→`/`←` in a 14px mono column, 17px code badge, name, right-aligned type name.
5. **PROPERTIES** — bordered list, rows `grid-template-columns:172px 1fr`, 9px/13px padding: mono dotted key + value. Keys: `archimate.type`, `owner`, `annual.cost`, `element.id`, `last.modified`, `source`.

### Right rail (`--surface`, left hairline, 22px/18px padding, 24px gaps)

1. **NEIGHBOURHOOD** — bordered `--paper` box with a 260×176 SVG radial mini-graph: centre node r=8 filled `--accent` with the type code in mono 8.5px; up to 7 neighbours at radius 78×62 starting at −90°, r=5.5, layer fill + layer stroke, name truncated to 12 chars, label anchored outward (`start` right of centre, `end` left). Edges: 1px `--bd2`, dashed `3 2` for Flow/Access. Neighbour click switches the fact sheet. Below: full-width `Open full graph →` button.
2. **APPEARS IN** — 1px-gap list of saved views the element occurs in, each with a small clipped-shape glyph: *Application landscape*, *Claim handling flow*, *2027 target state*.
3. **HISTORY** — timeline: 5px colour square + 1px connector line in an 11px column, then entry text (12px/1.4) and mono meta (`YYYY-MM-DD · author`).

---

## Screen 3 — Dependency graph

**Purpose:** see how the landscape hangs together, and trace what one element touches.

**Layout:** `grid-template-rows: auto 1fr`; the body is `minmax(0,1fr) {panel}` where panel is `288px` when a node is focused and `0px` otherwise.

### Toolbar

- Title `Dependency graph`; mono sub-line `"{nodes} nodes · {edges} relations · time point {year}"`.
- `COLOUR` segmented control: `LAYER` / `LIFECYCLE` / `TIME` (active = `--ink` fill, `--surface` text). `Export SVG` button on the right.
- Second row: `TIME POINT` label, `<input type="range" min=2016 max=2032 step=1>` 220px wide with `accent-color: var(--accent)`, the year in mono 12px, and a mono `TODAY` reset link in `--accent`. Then a divider and the **legend** — 9×9px swatch (`1px` layer/phase/TIME stroke, 16% mix fill) + label, regenerated from the active colour view.

### Canvas

SVG `viewBox="0 0 1240 600"`, `min-width:1040px`, background `--paper`.

- **Layer bands** (toggleable): dashed `--bd` rects with a 4%-mix fill of the layer colour, plus a mono 9.5px band label at `x=26`, `letter-spacing:.12em`.
  - `BUSINESS` y 44 h 108 · `APPLICATION` y 196 h 208 · `TECHNOLOGY` y 448 h 108; all x 16 w 1208.
- **Nodes**: 150×42 rects, node centre at the stored `(gx, gy)`; a 3×42 accent-of-the-layer bar on the left edge; name in Space Grotesk 500 10.5px wrapped to two lines at ~21 chars (`x = gx + 11`); a mono 8.5px sub-label (the TIME class, or the lifecycle phase when the element has none).
- **Edges**: drawn *behind* nodes, centre to centre. Same-band edges use a quadratic curve with a ±34 perpendicular offset (down for the lower app row, up otherwise); cross-band edges are straight lines. Solid for structural relations (Realization, Serving, Assignment, Composition), dashed `4 3` for Flow / Access / Association. Base: 1px `--bd2` at 0.62 opacity with an arrowhead marker.
- **Colour views**: `layer` → layer fill/stroke; `lifecycle` → phase colour with a 13% mix fill; `time` → TIME colour with a 13% mix fill (elements with no TIME classification fall back to `--bd2`).
- **Time point**: node phase is recomputed at the slider year. Elements past end-of-life at that year get a dashed border (`3 2`) and 0.72 opacity.
- **Trace (the key interaction)**: clicking a node sets focus. Focused node gets a 2px `--accent` stroke; direct neighbours stay at full opacity; everything else drops to **0.16**. Incident edges turn `--accent`, 1.6px, opacity 1, accent arrowhead; non-incident edges drop to 0.1. Clicking the focused node again clears focus.
- Floating hint bottom-left (16px/14px inset): `--surface` box, `1px --bd`, mono 10.5px — "Click a node to trace its dependencies" or "Tracing {name}" with a `CLEAR` link.

### Side panel (on focus)

Code badge + name (14.5px/600) + mono type; `Fact sheet` (accent fill) and `Close` buttons; hairline; a 2×2 stat grid on 1px gridlines (`LIFECYCLE` at the slider year, `TIME`, `ANNUAL COST`, `COMPLETENESS`, each value coloured by its scale); then `TRACED DEPENDENCIES` — one row per relation: direction glyph, 5px layer dot, name, mono 4-letter relation-type abbreviation. Clicking a row re-focuses the graph on that element.

---

## Global chrome

### Header (46px, `--surface`, bottom hairline)

`grid-template-columns: 208px 1fr auto`.

- **Brand cell** (right hairline): 15px accent mark with `clip-path: polygon(0 0,100% 0,100% 62%,62% 100%,0 100%)`, `Archipelago` (13.5px/600, `-.01em`), and a mono `0.2` version chip in a `1px --bd` box.
- **Centre:** a search *button* (not an input) — min-width 280px, 26px, `--panel` fill, `1px --bd`, circle glyph, "Search elements, relations, actions", and a mono `⌘K` chip; hover lifts border to `--bd2` and text to `--ink2`. Then a divider and borderless `Import` / `Export` buttons that gain a `--bd` border and `--panel` fill on hover.
- **Right:** the **save-state indicator** — `1px --bd` box on `--panel` with a 6px `--accent` square, mono `LOCAL · {n} UNSAVED` (or `LOCAL · SAVED`), and an underlined mono `SAVE FILE` action. Tooltip: "Model lives in this browser. Export to a file to make it durable." Then a 26px theme toggle (half-filled circle glyph).

This indicator is called out in the design brief as a core trust differentiator: visible, calm, never a modal.

### Left nav (208px, `--surface`, right hairline, 12px vertical padding)

`WORKSPACE` label → workspace switcher button (32px, `--panel`, `1px --bd`, "ArchiSurance" + `▾`). `MODEL` label → nav items: **Inventory** (count badge), **Dependency graph**, then Capability map / Landscape / Roadmap / Matrix / Portfolio each with a mono `P2` tag, `--ink3` text, opacity .75, `cursor:default`, tooltip "Planned for phase 2". Item: 29px tall, 14px padding, 9px gap, 11px glyph square; active item gets `--panel` background, a 2px `--accent` left border, accent glyph fill, 500 weight.

Footer, pinned with `margin-top:auto` above a top hairline: `MODEL HEALTH` label, the mean completeness as `{n}` (19px/600) + "% complete", a 3px `--accent2` bar, then mono-adjacent 11px/1.5 `--ink3` copy: `"{elements} elements · {relations} relations"` and `"{n} elements missing an owner"`.

### Command palette

Fixed overlay, `background: color-mix(in oklab, var(--ink) 34%, transparent)`, content 592px wide (`max-width:92vw`) at `padding-top:12vh`, `--surface`, `1px --bd2`, the one shadow in the app, entry animation `pfade .12s ease-out` (fade + `translateY(-6px)`).

- Input row 44px: accent `›` glyph, borderless autofocused input (14px, placeholder "Jump to element, run an action…"), mono `ESC` chip.
- Results, `max-height:342px`, scroll: 19px code badge + name + right-aligned mono type. Hover `--panel`. Click opens the fact sheet.
- Empty: `Nothing matches “{query}”`, centred, `--ink3`.
- Footer strip on `--panel`: mono hints `↵ open`, `G graph`, `I inventory`, and `{n} elements indexed` right-aligned.

**Keyboard:** `⌘K`/`Ctrl+K` opens (and clears the query), `Esc` closes; when the palette is closed, bare `g` → graph, `i` → inventory. Handler is a `window` keydown listener; it must ignore the single-letter shortcuts while the palette is open and while any text input has focus (the prototype only guards the palette — fix this in the real implementation).

---

## State

Prototype component state — map onto the real store / URL state:

| Key | Type | Notes |
|---|---|---|
| `screen` | `'inventory' \| 'element' \| 'graph'` | should become a route |
| `sel` | element id | the fact-sheet subject |
| `view` | `'table' \| 'cards'` | inventory presentation |
| `q` | string | name filter |
| `facets` | `Record<'<group>:<value>', boolean>` | group keys: `layer`, `lifecycle`, `time`, `tag` |
| `mode` | `'AND' \| 'OR' \| 'NOT'` | facet combinator |
| `year` | number, default 2026 | graph time point |
| `colorView` | `'layer' \| 'lifecycle' \| 'time'` | graph colour dimension |
| `focus` | element id \| null | graph trace root |
| `palette`, `pq` | boolean, string | command palette |
| `dirty` | number | unsaved-change count for the save indicator |

Concept §7 calls for URL-parameterised report state — `colorView`, `year`, `focus`, and the facet set are the parameters worth putting in the URL first.

### Lifecycle derivation

Elements carry phase dates `{plan, in, act, out, eol}` (years in the prototype, real dates in the product). Phase at time `y`:

```
y < in  → Plan
y < act → Phase In
y < out → Active
y < eol → Phase Out
else    → End of Life
```

Elements without dates (capabilities, actors, data objects, goals) are treated as Active and show `—` for every phase date. The inventory always evaluates at today; the graph evaluates at the slider year. There is no stored `lifecycle` field — deriving it is what makes the time slider free.

### Derived values

- **Completeness colour:** ≥75 Active green · ≥50 Phase-Out amber · else EOL red.
- **Model health:** mean of element completeness, rounded.
- **Fit meters:** 4 bars, heights `4 + i*2` px for i=1..4, filled while `i <= value`.
- **TIME meter:** index of the value in `[Tolerate, Invest, Migrate, Eliminate]` + 1, coloured by the TIME colour (ordinal display only — TIME is categorical, so don't read the meter as a score).

## Interactions summary

| Trigger | Result |
|---|---|
| Inventory row / card click | fact sheet for that element |
| Breadcrumb `INVENTORY` | back to inventory (filters preserved) |
| Facet row click | toggle facet; list and counts update immediately |
| Saved search click | replaces facet set **and** combinator |
| Chip `×` | removes that one facet |
| `Clear` | clears facets and name query |
| Relation row / mini-graph node click | fact sheet for the related element |
| `Trace in graph` / `Open full graph →` | graph screen, focused on this element (no focus if it has no graph position) |
| Graph node click | focus/unfocus → dim non-neighbours, highlight incident edges, open side panel |
| Side-panel dependency row | re-focus graph on that element |
| Colour switch | recolours nodes + rebuilds legend |
| Time slider | recomputes every node's phase; EOL elements go dashed and semi-transparent |
| `SAVE FILE` | clears the unsaved count (real: File System Access API save, per concept §5.2) |
| Theme toggle | flips `data-theme` on `<html>` |

Transitions: none except the palette entrance. This is intentional — the tool should feel instant, not animated. Hover states are border/background changes only.

## Not built here

Capability map, Landscape, Roadmap, Matrix, Portfolio bubble (design brief screens 3–7); import/export dialogs; first-run empty state (*Start empty · Import a file · Explore the demo*); the second-tab takeover warning; inline table editing; the `Relations` / `Assessment` / `Quality` tabs. The shared report chrome (title, filter bar, cluster/view pickers, legend, export, side panel) established on the graph screen is the pattern those five reports should follow.

## Assets

None. No image files, no icon library — every glyph is a CSS box, `clip-path` shape, or SVG primitive. Fonts are Google Fonts (`Space Grotesk`, `JetBrains Mono`); self-host them in the product for offline/static-hosting reasons.

## Prototype data

29 elements / 47 relationships, ArchiSurance-flavoured: 5 capabilities, 1 business process, 2 actors, 11 application components, 4 data objects, 4 technology elements, 1 goal, 1 work package. Element ids follow `cap-*`, `proc-*`, `act-*`, `app-*`, `obj-*`, `tec-*`, `goal-*`, `wp-*`. Replace with the real ArchiSurance exchange-format import; the graph coordinates (`gx`, `gy`) are hand-placed stand-ins for ELKjs output.

## Files

- `Archipelago.dc.html` — the prototype (template + logic + tokens in one file). Open directly in a browser. `support.js` must sit alongside it.
- `open-ea-repository-ui-spec.md` — the spec-repo version: scope, design position, structural decisions, ADR candidates (UI-1…UI-8), and open questions.
- `screens/` — six reference captures, listed above.

### Two known prototype-only gaps

1. Single-letter shortcuts (`g`, `i`) only check whether the command palette is open — they must also be suppressed while a text input has focus.
2. Graph node positions are hand-placed `(gx, gy)` values. They are stand-ins for ELKjs `layered` output and carry no design intent beyond "three bands, apps in two rows".
