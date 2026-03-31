# Enterprise Architecture for the Agentic Organisation

**Format:** 20-minute presentation
**Audience:** TBD
**Narrative arc:** Setting the scene → Define the shift → Expose what breaks → Present what to build → Show first steps → Inspire with the vision

---

## Agenda

| # | Section | Time | Core Message |
|---|---------|------|--------------|
| 1 | Setting the Scene | 3 min | Separate hype from reality |
| 2 | What is an Agentic Organisation? | 2 min | Agents as workforce participants, not tools |
| 3 | Why Traditional EA Breaks | 3 min | Five specific failure modes |
| 4 | EA Reimagined: 10 New Capabilities | 5 min | What you must build that didn't exist before |
| 5 | The Maturity Journey | 3 min | Where you are, where to aim |
| 6 | Getting Started: Practical First Steps | 2 min | Monday-morning actions |
| 7 | The Vision: Living Architecture | 2 min | Close with the "so what" |

---

## Section 1: Setting the Scene — What's Real and What's Not (3 min)

*Open by grounding the audience. No fear-mongering — honest assessment of where we are.*

### What's proven and happening now

- **Models are commoditising** — performance gaps between leading models are narrowing with each release cycle. The architectural consequence: design for swap, not lock-in.
- **AI is deploying at enterprise scale** — JPMorgan has 450+ AI use cases in production, 150K employees using its internal LLM weekly, AI-attributed benefits growing 30-40% YoY (public disclosure). This is not a pilot story anymore.
- **Multi-agent systems are the emerging enterprise pattern** — specialised agents collaborating through defined protocols, deployed at scale in banking, insurance, and pharma. Not hypothetical.
- **Regulation is real and has deadlines** — EU AI Act (high-risk: August 2026), NIST AI RMF, ISO/IEC 42001, Singapore IMDA agentic AI framework (January 2026).

### What's real but early

- **Agent lifecycle management** — "the field needs the equivalent of ITIL for AI agents" but no standard exists yet.
- **Enterprise as Code** (BCG) — codifying workflows and decision rules as executable specs. "Compelling but untested at scale, with no reference implementations and low tooling maturity."
- **Agent communication protocols** (MCP, A2A, ACP) — emerging and competing, not yet settled.
- **Agent ownership** — "the major unresolved organisational design question" with three competing models and no consensus.

### What's hype or unproven

- **"Just add AI" to existing processes** — BCG's 10/20/70 rule: 70% of AI value comes from people and processes, not algorithms. Automating a bad process gives you a fast bad process.
- **Fully autonomous agents without governance** — every serious enterprise deployment uses human-in-the-loop for high-risk decisions. Full autonomy is not the near-term reality.
- **One model to rule them all** — task-specific models outperform general-purpose at lower cost. The "pick one foundation model" strategy is already obsolete.

### Key message

> The technology is real. The scale is real. The regulatory pressure is real. But the organisational readiness is not there yet — and that is where EA comes in.

---

## Section 2: What is an Agentic Organisation? (2 min)

*Define the shift clearly — this is new for most audiences.*

### Talking points

- Not "people using AI tools" — it's **agents as autonomous participants** in business processes with decision rights.
- Agents make **thousands of decisions per minute** — non-deterministic, autonomous, continuous.
- Multi-agent systems create **emergent behaviours** through chaining and collaboration.
- Model behaviour **drifts over time** without any code changes.
- Every business capability now carries a **target delivery model**: which parts are human, which parts are agent, and what are the handoff rules?

### Key message

> The shift is from humans using AI tools to humans and agents collaborating as co-workers. That fundamentally changes what Enterprise Architecture must govern.

---

## Section 3: Why Traditional EA Breaks (3 min)

*Five specific failure modes — make it concrete, not abstract.*

### 1. Speed Mismatch
Governance runs on quarters; agents deploy in weeks. Decisions are made on stale information. If your governance cycle is longer than your deployment cycle, you govern nothing.

### 2. The Codification Gap
Agents operate on explicit knowledge. Most organisations have never written down how they actually work. Implicit knowledge is invisible to agents — and that means they cannot follow your operating model if it only exists in people's heads.

### 3. Non-Determinism
Same input, different output. Static risk matrices produce meaningless scores for systems whose failure probability depends on runtime context. Traditional assessment tools were designed for deterministic systems.

### 4. Missing Constructs
Traditional EA has no concept of agent registries, guardrails, model portfolios, or AI FinOps. The metamodel simply does not have the elements to describe what you are building.

### 5. Cascade Risk
Multi-agent interactions create emergent risks. A critical agent can make thousands of bad decisions before anyone notices. Milestone-based reviews discover failures months after business damage has occurred.

### Key message

> Traditional EA is not wrong — it is incomplete. The frameworks survive, but they need new constructs, new speed, and new thinking about non-deterministic systems.

---

## Section 4: EA Reimagined — 10 New Capabilities (5 min)

*The core of the presentation. What to build that has no traditional EA equivalent. Grouped into four themes.*

### Theme A: Govern the Agent Workforce

**Agent Lifecycle Management**
"The equivalent of ITIL for AI agents." Onboarding, active, under-review, retraining, retired. Every agent has a defined owner, lifecycle state, and operational SLAs.

**Agent Registry and Observability**
Central catalogue: identity, owner, purpose, autonomy level, data access, health status. Distributed tracing across multi-agent chains. Reasoning traces, tool call monitoring, cost per interaction.

**Agent Communication Architecture**
The defining architectural bet for 2026-2028. Design protocol-independent abstraction across MCP, A2A, ACP. "Build the registry and tracing before deploying the second agent."

### Theme B: Govern the Models

**Model Portfolio Management**
Design for swap, not lock-in. Continuous benchmarking against newer alternatives. Vendor diversification strategy. Task-specific models outperform general-purpose at lower cost.

**AI FinOps**
Per-token inference costs, GPU compute budgets, cost allocation by business unit, circuit breakers for cost anomalies. Only 10% of organisations have mature AI FinOps practices.

### Theme C: Automate Compliance

**Continuous Architecture Compliance**
From periodic reviews to policy-as-code (OPA, Cedar, Kyverno) embedded in CI/CD pipelines. Gartner predicts 70% of enterprises will integrate compliance-as-code by 2026.

**Sovereignty-by-Design**
First-order design input, not post-hoc compliance. Data residency, model provenance, inference location. "Build AI infrastructure in the right place or rebuild it later."

### Theme D: Bridge the Value Gap

**Enterprise as Code**
Codify implicit operating models as executable specs readable by both humans and agents. Dual expression: human-readable policy plus machine-executable guardrail.

**AI Infrastructure Readiness Assessment**
Structured assessment framework: compute, network, storage, integration capacity. Infrastructure readiness — not model capability — is the binding constraint on enterprise AI adoption.

**AI Value Progression Management**
Phase 1 (productivity) to Phase 2 (revenue). 70% of AI's potential comes from revenue processes, but most portfolios target productivity. Align portfolio composition with leadership expectations.

### Key message

> These ten capabilities have no equivalent in traditional EA. You cannot govern an agentic organisation without them.

---

## Section 5: The Maturity Journey (3 min)

*Show the audience where they likely are and where to aim. Based on synthesis of ACMM, Gartner ITScore, GAO EAMMF, and MIT CISR.*

### Six Assessment Dimensions
Governance, Process, People, Repository, Value, **AI Readiness**

### Five Levels (AI Readiness focus)

| Level | Name | AI Readiness Signature |
|-------|------|----------------------|
| 1 — Initial | Ad hoc | No AI strategy. Teams experiment without oversight. No agent registry. |
| 2 — Developing | Emerging | High-level AI strategy. Pilots tracked. Basic principles. Skills in data science, not architecture. |
| 3 — Defined | Standardised | Agent registry established. Model governance defined. AI risk embedded in reviews. First AI/Agent Architect. |
| 4 — Managed | Measured | Agent lifecycle mature. Multi-model portfolio governance. AI FinOps operational. Human-agent patterns standardised. |
| 5 — Optimising | Self-managing | True agentic enterprise. Sovereign AI. EA governs agent ecosystem as naturally as the application landscape. |

### Audience engagement

> "Level 1 test: can you answer 'how many applications do we have?' with confidence? Now ask yourself: 'how many agents do we have?'"

### Key message

> Most organisations are at Level 1-2 for AI Readiness. Level 3 is the realistic first milestone — that is where agent registry and model governance become real.

---

## Section 6: Getting Started — Practical First Steps (2 min)

*Concrete, Monday-morning actions. Not a roadmap — a starting list.*

1. **Assess your maturity** — score yourself honestly across 6 dimensions, especially AI Readiness.
2. **Establish three principles** — including one on responsible AI / human-in-the-loop for high-risk decisions.
3. **Create the agent registry** — before deploying your second agent. Catalogue what is already running.
4. **Add the AI/Agent Architect role** — bridge between AI platform teams and EA.
5. **Pick one process for Enterprise as Code** — codify it as an executable spec. Prove the pattern.
6. **Match governance speed to deployment speed** — if governance takes longer than deployment, you are governing nothing.

### Operating model recommendation

Hybrid: centralise AI standards and agent governance, federate domain architecture decisions. Policy-as-code enables central enforcement without bottlenecks.

### Key message

> You do not need a two-year programme. You need five concrete actions and the discipline to follow through.

---

## Section 7: The Vision — Living Architecture (2 min)

*Close with aspiration — what the end state looks like.*

### The shift

| Traditional EA | Agentic EA |
|---------------|-----------|
| Produces documents that become stale the moment they are published | The repository is the living architecture — graph-based, auto-collected, always current |
| Architects are document authors | Architects are repository curators and agent supervisors |
| Compliance is periodic and manual | Compliance is continuous and automated |
| Architecture reviews are meetings | Architecture decisions are data-driven and agent-assisted |
| New deployments require heavyweight process | New agent deployments follow the same well-understood path as applications |

### The end state

- Architecture compliance becomes largely self-managing — agents detect and resolve violations.
- Architecture documentation updates itself when systems change.
- EA metrics sit on the executive dashboard alongside financial and operational KPIs.
- The boundary between "architecture" and "AI operations" has dissolved.

### Closing line

> "Enterprise Architecture is no longer optional infrastructure cost — it is the control plane for enterprise AI adoption."

---

## Sources and References

### Cited in the repo with attribution
- BCG — 10/20/70 rule; "Enterprise as Code" concept
- Gartner ITScore for Enterprise Architecture
- Gartner — 70% compliance-as-code prediction by 2026
- US GAO Enterprise Architecture Management Maturity Framework
- MIT CISR Enterprise AI Maturity Model
- CSA and Google Cloud (2025) — governance maturity as predictor of AI readiness
- ISO/IEC 38500, COBIT 2019, ISO/IEC 42001
- EU AI Act, NIST AI RMF
- Singapore IMDA Model AI Governance Framework for Agentic AI (January 2026)
- SFIA v9, Forrester (2025), O'Reilly (2025)

### Verifiable from public sources
- JPMorgan Chase: 450+ AI use cases, $20B tech spend, 150K LLM users (earnings calls, CEO statements)
- Swiss Re: 50%+ workforce on Palantir platform
- AstraZeneca: ChatInvent agentic system in production

### Needs external source verification
- "1 in 5 AI initiatives achieve ROI; 1 in 50 deliver transformation" — used in repo without attribution
- "22% of organisations have AI-ready architectures" — used in repo without attribution
- "23% can connect AI to business data without changes" — used in repo without attribution
- "30-50% faster AI adoption with clean architectures" — described as "acceleration paradox", unattributed
- "40-70% compliance cost reduction with policy-as-code" — Gartner referenced nearby but not directly for this number

---

## Open Questions

- [ ] Target audience — who specifically is this for? (CxO, EA practitioners, IT leadership?)
- [ ] Should we include industry-specific examples (banking, pharma, insurance) or keep it cross-industry?
- [ ] Slide design direction — minimal/text-light or data-rich?
- [ ] Do we want a handout or leave-behind document?
- [ ] Track down external sources for the unverified statistics before using them on slides
