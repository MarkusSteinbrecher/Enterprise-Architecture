# Tech Radar Research

*Research date: 2026-03-08*

## What Is a Tech Radar?

A **technology radar** is a visual, opinionated guide that maps an organization's current and future technology landscape. It originated from informal "Cool Tech" discussions at [ThoughtWorks](https://www.thoughtworks.com/radar) in 2008-2009, with the first public version published in January 2010 (now on Volume 32+). The concept draws on the metaphor of a radar screen, where each technology appears as a "blip" positioned on concentric rings within categorized quadrants.

A tech radar makes a technology portfolio transparent, eases cross-functional technology discussions, reduces complexity, helps detect risks, and ensures technology decisions align with strategic goals. It is a **living document** that should be updated at least every 6 months.

### Tech Radar vs. Gartner Hype Cycle

The Gartner Hype Cycle (introduced 1995) tracks market hype over time across five phases. The tech radar is fundamentally different:
- **Prescriptive** ("adopt this, hold that") rather than **descriptive** ("this is at peak hype")
- **Practitioner-driven** rather than analyst-driven
- **Free and open** rather than paid
- **More granular** and actionable

### Structure

A tech radar typically has two key dimensions:

**Four Quadrants** (categories of technology):
- **Techniques** — processes, methodologies, architectural patterns
- **Tools** — software tools for development, testing, deployment
- **Platforms** — infrastructure, cloud services, databases
- **Languages & Frameworks** — programming languages, libraries, frameworks

**Four Rings** (maturity/recommendation level, from outside in):
- **Hold** — Proceed with caution; not recommended for new projects
- **Assess** — Worth exploring to understand potential impact
- **Trial** — Proven in limited use; safe for non-critical projects
- **Adopt** — Safe default choice; proven and broadly recommended

Each technology is represented as a **blip** placed in a quadrant and ring. Blips also have a **motion indicator** showing whether they are new, unchanged, or have moved rings since the last edition.

---

## Notable Existing Tech Radars

### Tier 1 — Industry Standards

| Radar | Type | Key Differentiator |
|-------|------|--------------------|
| [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) | Opinionated, curated | The original. Published twice yearly by their TAB (Technology Advisory Board). Crowdsourced from global consultants working on real projects. Independent — no vendor influence. |
| [CNCF Radar](https://radar.cncf.io/) | Community-driven, cloud-native | Focused on cloud-native ecosystem. Based on end-user community surveys. |

### Tier 2 — Company/Industry-Specific

| Radar | Focus | Notes |
|-------|-------|-------|
| [Zalando Tech Radar](https://opensource.zalando.com/tech-radar/) | E-commerce engineering | Started as Excel in 2015 during AWS migration; governed by Principal Engineers; MIT-licensed d3.js v7 viz ([GitHub](https://github.com/zalando/tech-radar)) |
| [AOE Technology Radar](https://www.aoe.com/techradar/) | Digital solutions | 200+ technology assessments; open-source generator |
| [BMW Technology Trend Radar](https://www.bmwgroup.com/en/innovation/technology-trend-radar.html) | Automotive | Cross-industry tech trends mapped by maturity |
| [Unit8 Data & AI Radar](https://radar.unit8.com/) | Data & AI | Focused on analytics, ML, and AI tooling |
| [LTIMindtree Tech Radar 2025](https://www.ltimindtree.com/tech-radar-2025/) | Enterprise IT | Covers agentic AI, FinOps, green computing |
| [Venturus 2025/2026 Radar](https://www.venturus.org.br/en/radar-tech) | Brazilian tech | Uses Watch/Important/Urgent/Critical rings |
| [Eviden Tech Radar](https://eviden.com/publications/tech-radar/) | Enterprise digital | Edge AI, AIOps, cloud-native focus |
| [StartUs Insights Technology Radar 2026](https://www.startus-insights.com/innovators-guide/technology-radar/) | Startup/innovation | Data-driven with startup scouting |
| [Spotify (internal)](https://backstage.spotify.com/partners/spotify/plugin/techradar/) | Developer experience | Uses tech radar internally; built the Backstage Tech Radar Plugin for their developer portal |
| [Devoteam TechRadar](https://techradar.devoteam.com/) | Multi-domain | 150 technologies across AI, Cloud, Cybersecurity, Data, GreenOps |
| [Porsche Digital](https://opensource.porsche.com/blog/tech-radar) | Automotive digital | Forked AOE's open-source radar; contributed improvements upstream |

For a comprehensive list of company radars, see [WorkingSoftware.dev's collection](https://www.workingsoftware.dev/inspirational-technology-radar-examples/).

### ThoughtWorks Methodology (Gold Standard)

The ThoughtWorks radar methodology is worth understanding in detail as the benchmark:

1. **Crowdsourcing** — Global teams nominate technologies they've encountered on client projects
2. **TAB Review** — The Technology Advisory Board (senior tech leaders including CTO Rachel Laycock, Chief Scientist Martin Fowler) meets for a 4-day face-to-face session. Each blip is debated and voted on; no consensus = no blip. A final "rescue round" lets each TAB member champion one blip.
3. **Themes** — Patterns across blips form overarching themes for each edition
4. **Writing** — Each blip gets a champion who writes the description; internal feedback loop follows
5. **Independence** — No vendor influence; not published for revenue. They don't accept vendor requests.
6. **Lifecycle** — Blips only appear for one edition unless they move rings (captures movement, not static state). Unchanged blips for two consecutive editions are "faded."
7. **Scale** — 32+ volumes since 2010. ThoughtWorks released a documentary in 2025: "Inside the Technology Radar"

---

## Open-Source Tools for Building Tech Radars

### Most Popular

| Tool | Stars | Tech Stack | Key Features |
|------|-------|------------|--------------|
| [ThoughtWorks BYOR](https://github.com/thoughtworks/build-your-own-radar) | ~3k+ | JavaScript/D3.js | The official "Build Your Own Radar". Reads from Google Sheets or CSV. Docker support. Hosted version at [thoughtworks.com/radar/byor](https://www.thoughtworks.com/radar/byor) |
| [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar) | ~1k+ | TypeScript/React | Full static site generator. Quadrants, rings, dashboard, item history, search. Most feature-rich. |
| [qiwi/tech-radar](https://github.com/qiwi/tech-radar) | — | JavaScript | Fully automated generator. Supports JSON, CSV, YAML. Custom color schemes. |

### Other Options

| Tool | Notes |
|------|-------|
| [bdargan/techradar](https://github.com/bdargan/techradar) | Simple SVG rendering from JSON |
| [Kadaster Labs Tech Radar](https://github.com/kadaster-labs/tech-radar) | Fork of ThoughtWorks BYOR with Excel/JSON support |
| [dprgarner/tech-radar-generator](https://github.com/dprgarner/tech-radar-generator) | CLI + Node API, outputs static HTML/JS |
| [Apptension Tech Radar](https://www.apptension.com/blog-posts/why-we-created-tech-radar-the-ins-and-outs-of-our-open-sourced-tech-solution) | Uses Contentful CMS for editing |
| [IT-Labs Tech Radar](https://github.com/IT-Labs/tech-radar) | Another community option |
| [Backstage Tech Radar Plugin](https://backstage.spotify.com/partners/spotify/plugin/techradar/) | Integrates into Spotify's Backstage developer portal; supports custom API backends, markdown descriptions, timeline entries |
| [Zalando Tech Radar](https://github.com/zalando/tech-radar) | Lightweight MIT-licensed d3.js v7 visualization; simple static HTML |
| [ThoughtWorks BYOR Voting App](https://github.com/thoughtworks/byor-voting-web-app) | Companion voting web app for collaborative radar creation |
| [setchy/thoughtworks-tech-radar-volumes](https://github.com/setchy/thoughtworks-tech-radar-volumes) | CLI + complete dataset of all ThoughtWorks radar volumes (JSON, CSV) |

---

## Commercial AI-Powered Tech Radar Platforms

### ITONICS Innovation OS
- **Website**: [itonics-innovation.com](https://www.itonics-innovation.com/technology-radar)
- **AI Features**: AI co-pilot (PRISM), trend alerts, recommendations, "Speed of Change" scoring that tracks which technologies are rising/peaking/fading
- **Data**: 200+ curated trends from analyst team + external integrations
- **Views**: Radar, Kanban, roadmaps, lists, embeddable
- **Clients**: Enterprise-focused, free trial available
- **Pricing**: Quote-based (enterprise)

### Mapegy SCOUT
- **Website**: [mapegy.com](https://www.mapegy.com/technology-radar)
- **AI Features**: LLM/NLP-driven data mining across patents, publications, news, podcasts, standards. ML-powered ranking and classification.
- **Data**: Millions of documents — web, research, patents, standards, podcasts
- **Clients**: Siemens, Bosch, BMW, Accenture (100+ blue-chip clients)
- **Pricing**: Quote-based (enterprise)

### Trendtracker.ai
- **Website**: [trendtracker.ai](https://www.trendtracker.ai/blog-posts/what-happens-when-your-trend-radar-goes-ai-powered)
- **AI Features**: NLP and ML to extract, categorize, and connect emerging signals. Scores trends based on current impact and projected future strength. "Always-on" automated monitoring.
- **Positioning**: Lighter-weight than ITONICS/Mapegy; focused on trend signal detection

### Comparison

| Feature | ITONICS | Mapegy SCOUT |
|---------|---------|--------------|
| **AI approach** | Co-pilot, trend alerts, Speed of Change | LLM/NLP data mining & analysis |
| **Data sources** | Curated analyst content + integrations | Patents, publications, news, podcasts |
| **Visualization** | Radar, Kanban, roadmaps | Radar, thematic maps, portfolio matrix |
| **Startup scouting** | Yes | Yes (top 500 per field) |
| **Differentiator** | Structured workflow + collaboration | Raw data intelligence + breadth |

---

## Academic Research

**"Using AI to Facilitate Technology Management – Designing an Automated Technology Radar"**
- Published: 2020, Procedia CIRP ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S221282712030723X))
- Proposes an architecture that automatically:
  1. Collects data from relevant sources
  2. Assesses technology maturity level using AI
  3. Visualizes results on a radar map
- This is the most directly relevant academic work on AI-automated tech radars

---

## What Makes a Good Tech Radar?

### Best Practices

1. **Keep it alive** — Update at least every 6 months. A stale radar is worse than no radar.
2. **Base it on real experience** — ThoughtWorks' strength is that every blip comes from actual project experience, not speculation.
3. **Be opinionated** — A radar that tries to be neutral adds no value. Clear Adopt/Hold recommendations are the point.
4. **Maintain governance** — Have a defined group (like ThoughtWorks' TAB or Zalando's Principal Engineers) responsible for curation.
5. **Be transparent** — Publish your methodology. Explain *why* something moved rings.
6. **Include motion** — Show what changed since the last edition. New blips, ring changes, and removals tell the story.
7. **Right granularity** — Early ThoughtWorks radars had overly broad entries like "user-centred design." They learned to be specific and actionable.
8. **Publish openly** — Internal-only radars miss community feedback and credibility. Zalando, Porsche, and AOE all publish publicly.
9. **Customize quadrants** — The standard 4 quadrants are a starting point, not a mandate.
10. **Archive thoughtfully** — Fade items that haven't changed rather than letting the radar grow unbounded.

### Common Pitfalls

1. **One-time exercise** — without continuous updates it quickly becomes irrelevant
2. **Hype-driven** — chasing every new framework without evidence
3. **No "Hold" items** — avoiding controversy by only recommending, never deprecating
4. **Too many blips** — overwhelming rather than guiding
5. **No actionability** — placing technologies on rings without clear guidance on what teams should *do*
6. **Ignoring the financial lens** — not connecting technology choices to cost implications
7. **No governance at scale** — as organizations grow, maintaining coherence becomes harder

---

## Opportunity: Building an AI-Powered Tech Radar

### What's Missing in the Market

1. **Open-source AI radar** — All AI-powered radars are commercial/enterprise SaaS. There's no open-source tool that combines AI with radar generation.
2. **Automated signal detection** — Most radars still rely on manual curation (even ThoughtWorks). AI could automate the initial signal detection.
3. **Real-time updates** — Traditional radars publish quarterly/biannually. AI could enable continuous monitoring.
4. **Democratized access** — ITONICS and Mapegy charge enterprise prices. An AI-powered tool accessible to smaller teams/individuals would fill a gap.
5. **Personalization** — Current radars are one-size-fits-all. AI could tailor recommendations to a specific company's tech stack and context.

### How AI Could Enhance Each Stage

| Stage | Traditional | AI-Enhanced |
|-------|------------|-------------|
| **Signal Detection** | Manual nomination by engineers | NLP scanning of GitHub trends, HN, Reddit, Stack Overflow, arxiv, blog posts, job postings |
| **Categorization** | Manual quadrant/ring placement | LLM-based classification using adoption metrics (npm downloads, GitHub stars velocity, job market demand) |
| **Maturity Assessment** | Expert opinion | Multi-signal scoring: community growth rate, production usage indicators, ecosystem maturity, security track record |
| **Trend Analysis** | Snapshot-in-time | Time series analysis showing technology trajectory (rising/plateauing/declining) |
| **Description Writing** | Manual write-up per blip | LLM-generated summaries with key trade-offs, comparisons, and use cases |
| **Personalization** | Same radar for everyone | Context-aware recommendations based on company's existing stack, team skills, and domain |
| **Alerting** | None (periodic publication) | Real-time notifications when relevant technologies change status |

### Potential Data Sources for an AI Radar

| Source | Signal |
|--------|--------|
| **GitHub** | Stars velocity, contributor growth, issue activity, release cadence |
| **npm/PyPI/crates.io** | Download trends, version frequency |
| **Stack Overflow** | Question volume trends, answer quality |
| **Hacker News / Reddit** | Sentiment, discussion volume |
| **Job postings** (LinkedIn, Indeed) | Demand signal for technologies |
| **arxiv / research papers** | Academic interest, breakthrough indicators |
| **Conference talks** | Technology buzz at major conferences |
| **Blog posts / Dev.to / Medium** | Practitioner adoption signals |
| **Security advisories** (CVE, NVD) | Risk signals |
| **Company tech blogs** | Enterprise adoption indicators |

### Architecture Sketch for an AI Tech Radar

```
┌─────────────────────────────────────────────────────┐
│                    DATA INGESTION                     │
│  GitHub API │ npm │ HN │ Reddit │ SO │ Job Boards    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  SIGNAL PROCESSING                    │
│  - NLP extraction & entity recognition               │
│  - Trend detection (time series)                     │
│  - Sentiment analysis                                │
│  - Adoption metric calculation                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 AI CLASSIFICATION                     │
│  - LLM-based quadrant assignment                     │
│  - Multi-signal ring placement scoring               │
│  - Trajectory prediction (rising/stable/declining)   │
│  - Confidence scoring                                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              HUMAN-IN-THE-LOOP REVIEW                 │
│  - Expert override/adjustment                        │
│  - Community voting                                  │
│  - Editorial commentary                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  VISUALIZATION                        │
│  - Interactive radar (D3.js / React)                 │
│  - Historical comparison (diff between editions)     │
│  - Drill-down with AI-generated summaries            │
│  - Personalized filtered views                       │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions to Consider

1. **Fully automated vs. AI-assisted?** — Pure automation risks low-quality assessments. A hybrid model (AI proposes, humans review) is likely more valuable and trustworthy.
2. **General vs. domain-specific?** — A general radar competes with ThoughtWorks. Domain-specific radars (e.g., "AI/ML Radar", "Frontend Radar", "DevOps Radar") could be more differentiated.
3. **Open-source vs. SaaS?** — An open-source core with optional hosted/premium features could build community while generating revenue.
4. **Update frequency** — Traditional: biannual. AI-enabled: monthly or continuous with change notifications.
5. **Trust and transparency** — Show the AI's reasoning and data sources. Let users see *why* a technology is rated where it is.

---

## Summary

| Aspect | Current State | Opportunity |
|--------|--------------|-------------|
| **Best radar** | ThoughtWorks (quality, trust, methodology) | Hard to beat on curation quality |
| **Best open-source tool** | ThoughtWorks BYOR + AOE generator | Neither has AI capabilities |
| **Best AI commercial** | ITONICS + Mapegy | Expensive, enterprise-only |
| **Gap in market** | No AI-powered open/affordable radar | AI-assisted radar with transparency and personalization |
| **Biggest challenge** | Trust — people trust human-curated radars | Human-in-the-loop + transparent scoring can address this |
