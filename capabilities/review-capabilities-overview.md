# Review: EA Capability Model - Capabilities Overview

**Review Date:** 2026-02-24
**Scope:** Deep review and validation of `capabilities-overview.md` and the 30 capability definitions + ARB
**Sources:** TOGAF ADM & Architecture Capability Framework, Zachman Framework, FEAF, DoDAF, Gartner EA, BIZBOK, DAMA-DMBOK, SABSA, ITIL, CMMI/ACMM, MIT CISR, NASCIO

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Overview File - Structural Review](#2-overview-file---structural-review)
3. [Domain Structure Validation](#3-domain-structure-validation)
4. [Capability Gap Analysis](#4-capability-gap-analysis)
5. [Overlap and Boundary Issues](#5-overlap-and-boundary-issues)
6. [Consistency and Quality Issues](#6-consistency-and-quality-issues)
7. [Comparison with Major Frameworks](#7-comparison-with-major-frameworks)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. Executive Summary

The EA Capability Model defines 30 capabilities across 8 domains, plus an Architecture Review Board (ARB) as a governance body. The model is comprehensive, well-structured, and shows strong alignment with major EA frameworks. The corrected model addresses several areas that are often missing from EA capability models, including:

- **Architecture Principles & Standards** (Cap 6) as a dedicated capability
- **EA Value Management** (Cap 23) for demonstrating EA ROI
- **Solution Design & Patterns** (Cap 12) bridging EA to delivery
- **Architecture Decision Management** (Cap 27) as explicit governance
- **Architecture Review Board** as a separate governance body with defined composition and operating model

This review focuses on remaining gaps and improvement opportunities.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Missing from overview file (structural) | 6 items | High |
| Capability gap candidates | 3 | Medium |
| Overlap/boundary issues needing clarification | 3 pairs | Medium |
| Domain structure observations | 3 items | Low-Medium |
| Framework alignment improvements | 4 items | Low-Medium |

---

## 2. Overview File - Structural Review

### 2.1 What's Good

- Clear 8-domain / 30-capability structure with linked tables
- Concise one-line descriptions for each capability
- Links to individual capability files
- Inclusion of the ARB as a distinct governance body
- Section explaining the structure of individual capability files
- Consistent template across all capabilities (Purpose, Scope, Key Activities, Inputs, Outputs, Roles, Maturity, KPIs, Dependencies, Tools)

### 2.2 Missing Elements

#### 2.2.1 No Purpose, Scope, or Audience Statement (HIGH)

The overview opens directly with the capability listing but never states:
- **Why** this capability model exists (what problem it solves)
- **Who** the target audience is (CIO, EA team, project teams, all of IT?)
- **Scope** boundaries (what is in and out of scope)
- **How** it relates to the organization's EA framework or strategy

**Recommendation:** Add a "Purpose & Scope" section at the top:

```markdown
## Purpose & Scope

### Purpose
This capability model defines the core capabilities required for a mature
Enterprise Architecture practice. It serves as:
- A **planning tool** for building and maturing the EA function
- An **assessment framework** for measuring EA maturity
- A **communication tool** for explaining EA scope to stakeholders
- A **governance input** for aligning EA investment with organizational needs

### Audience
- Chief Architects and Architecture Managers (primary)
- CIO / CTO and IT Leadership (strategic planning)
- Enterprise and Domain Architects (operational guidance)
- HR and L&D teams (skills and capability development)

### Scope
This model covers the capabilities of the Enterprise Architecture function.
It does not cover project-level solution delivery, IT operations, or
general IT management capabilities that are outside the EA mandate.
```

#### 2.2.2 No Domain Relationship Model (HIGH)

The 8 domains are listed sequentially, but there is no explanation of how they relate to each other. A reader cannot understand that:
- "Architecture Development - Common" is a cross-cutting process layer
- The four domain architectures (Business, Application, Data, Technology) are the core content
- "Architecture Repository" is a persistent knowledge/metamodel layer
- "Architecture Management" is an organizational/practice layer
- "Governance" is a control layer with the ARB as its formal body

**Recommendation:** Add a domain relationship section with a conceptual diagram:

```markdown
## Domain Relationships

The 8 domains form a layered architecture practice model:

┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE + ARB                           │
│  (Decisions, Compliance, Risk & Debt, Change & Config)       │
├─────────────────────────────────────────────────────────────┤
│               ARCHITECTURE MANAGEMENT                        │
│  (Practice & Operating Model, Value, Skills, Innovation,     │
│   Communication & Engagement)                                │
├───────────┬───────────┬───────────┬─────────────────────────┤
│ BUSINESS  │    APP    │   DATA    │     TECHNOLOGY           │
│   ARCH    │   ARCH    │   ARCH    │      ARCH                │
├───────────┴───────────┴───────────┴─────────────────────────┤
│          ARCHITECTURE DEVELOPMENT - COMMON                   │
│  (Stakeholders, Requirements, Current State, Target State,   │
│   Gap Analysis & Roadmapping, Principles & Standards)        │
├─────────────────────────────────────────────────────────────┤
│              ARCHITECTURE REPOSITORY                         │
│  (Metamodel & Taxonomy, Content Management,                  │
│   Reference Architecture Library)                            │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.3 No "How to Use This Model" Guidance (HIGH)

**Recommendation:** Add usage guidance covering:
- **As an assessment tool**: How to rate current maturity per capability (Level 1-5)
- **As a planning tool**: How to identify priority capabilities based on strategy
- **Suggested assessment process**: Who participates, how often, what the output is
- **Prioritization guidance**: Which capabilities are foundational vs. advanced

```markdown
### Capability Prioritization Tiers
- **Tier 1 - Foundation**: Stakeholder Management (1), Requirements Management (2),
  Current State Assessment (3), Architecture Principles & Standards (6),
  Metamodel & Taxonomy Management (19), EA Practice & Operating Model (22),
  Architecture Decision Management (27), Architecture Review Board
- **Tier 2 - Core**: Target State Design (4), Gap Analysis & Roadmapping (5),
  Business Capability Modelling (7), Application Portfolio Management (10),
  Data Modelling & Management (13), Infrastructure & Cloud Architecture (16),
  Security & Compliance Architecture (17), Architecture Compliance & Assurance (28),
  Risk & Technical Debt Management (29)
- **Tier 3 - Advanced**: Value Stream Mapping (8), Organization & Process Modelling (9),
  Application Integration & API Management (11), Solution Design & Patterns (12),
  Data Governance & Quality (14), Data Analytics & BI Architecture (15),
  Network & Communications Architecture (18), Architecture Content Management (20),
  Reference Architecture Library (21), EA Value Management (23),
  Architecture Skills & Talent Development (24), Innovation & Technology Radar (25),
  Architecture Communication & Engagement (26), Change & Configuration Management (30)
```

#### 2.2.4 No Version, Date, or Change History (MEDIUM)

**Recommendation:** Add a metadata header:

```markdown
| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Date | 2026-02-24 |
| Owner | [Chief Architect / Architecture Manager] |
| Status | Draft / Under Review / Approved |
| Next Review | [Quarterly recommended] |
```

#### 2.2.5 No Glossary (MEDIUM)

Terms used across capabilities without definition: technical debt, ADR, architecture fitness functions, transition architecture, heat mapping, ArchiMate, BPMN, RACI, SABSA, ATAM, TIME classification, FinOps, zero trust, metamodel, building blocks (ABB/SBB), etc.

**Recommendation:** Add a glossary section or separate glossary file.

#### 2.2.6 No Framework References (MEDIUM)

The model draws from TOGAF, CMMI, DAMA-DMBOK, and other frameworks but does not acknowledge this explicitly.

**Recommendation:** Add a "Framework Alignment" section mapping the model to TOGAF ADM phases, BIZBOK, DAMA-DMBOK, etc. (see Section 7 of this review for the mapping).

---

## 3. Domain Structure Validation

### 3.1 Overall Assessment

The 8-domain structure is well-balanced and aligns strongly with industry practice. Several design choices are particularly strong:

| Strength | Detail |
|----------|--------|
| Separation of common process | "Architecture Development - Common" recognizes cross-cutting process capabilities |
| Architecture Principles as dedicated capability | Cap 6 separates principles from standards — aligned with TOGAF Preliminary Phase |
| Dedicated Repository domain | Metamodel, Content, and Reference Library are distinct and well-scoped |
| EA Value Management | Cap 23 is a dedicated capability — addresses a critical gap in most EA models |
| ARB as separate entity | Not buried in a capability but defined with composition, operating model, and charter |

### 3.2 Domain Size Balance

| Domain | Capabilities | Assessment |
|--------|-------------|------------|
| Architecture Development - Common | 6 | Well-balanced |
| Business Architecture | 3 | Appropriate for EA scope |
| Application Architecture | 3 | Good — Solution Design bridges to delivery |
| Data Architecture | 3 | Good — aligns with DAMA-DMBOK at EA level |
| Technology Architecture | 3 | Good — Network & Communications fills a common gap |
| Architecture Repository | 3 | Well-scoped — Metamodel + Content + Reference Library |
| Architecture Management | 5 | Slightly larger — see note below |
| Governance | 4 + ARB | Appropriate |

**Observation:** Architecture Management (5 capabilities) is the largest domain. This is justified because it covers practice operations (22), value measurement (23), people development (24), technology innovation (25), and communication (26) — five genuinely distinct concerns. No consolidation is recommended.

### 3.3 Domain Naming

The name "Architecture Development - Common" is functional but could be more intuitive. Alternatives:
- **Core Architecture Process**
- **Architecture Development Lifecycle**
- **Cross-Cutting Architecture Capabilities**

This is a minor concern — the current name is accurate.

### 3.4 TOGAF ADM Phase Mapping

| TOGAF ADM Phase | Mapped Capabilities | Assessment |
|----------------|---------------------|------------|
| Preliminary (Framework & Principles) | Cap 6 (Principles & Standards), Cap 22 (Practice & Operating Model) | **Well covered** — Cap 6 is explicitly dedicated to this |
| A - Architecture Vision | Cap 4 (Target State Design — includes vision), Cap 1 (Stakeholders) | **Partially covered** — see Gap Analysis |
| B - Business Architecture | Caps 7, 8, 9 | Covered |
| C - Information Systems (App) | Caps 10, 11, 12 | Covered |
| C - Information Systems (Data) | Caps 13, 14, 15 | Covered |
| D - Technology Architecture | Caps 16, 17, 18 | Covered |
| E - Opportunities & Solutions | Caps 4, 5 (Target State + Gap Analysis) | Covered |
| F - Migration Planning | Cap 5 (Gap Analysis & Roadmapping) | Covered |
| G - Implementation Governance | Caps 27, 28, ARB | **Well covered** — ARB makes this explicit |
| H - Architecture Change Management | Cap 30 (Change & Configuration Mgmt) | Covered |
| Requirements Management (center) | Cap 2 | Covered |

---

## 4. Capability Gap Analysis

The corrected model addresses many gaps that are commonly missing from EA capability models. The remaining gaps are:

### 4.1 Remaining Gaps to Consider

#### 4.1.1 Architecture Vision as Distinct Activity (MEDIUM PRIORITY)

**Observation:** TOGAF Phase A (Architecture Vision) is a distinct, early-stage activity focused on gaining stakeholder buy-in, defining scope, and articulating the high-level architecture aspiration before detailed design begins. Currently, Cap 4 (Target State Design) includes "Develop architecture vision aligned with business strategy" as an activity, which partially addresses this. However, visioning (high-level, stakeholder buy-in focused) and detailed target state design are different activities.

**Recommendation:** Either:
- (a) Explicitly strengthen the "vision" activities in Cap 4 to clearly cover TOGAF Phase A concerns, or
- (b) Add a dedicated "Architecture Vision & Strategy Alignment" capability if the organization treats this as a distinct, senior-level activity

**Assessment:** This is a refinement, not a critical gap. The current model covers it within Cap 4.

#### 4.1.2 Platform Architecture / Shared Services (LOW-MEDIUM PRIORITY)

**Observation:** The previous version had "Platform Architecture" covering container platforms, developer experience platforms, middleware, and shared services. The corrected model replaces this with "Network & Communications Architecture" (Cap 18). While network architecture is important (and was previously missing), platform/shared services architecture is also valuable.

**What Platform Architecture would cover:**
- Container orchestration (Kubernetes) and PaaS design
- Internal developer platform (IDP) architecture
- Middleware and shared services architecture
- Developer experience (DevEx) platform design
- Service mesh architecture

**Current coverage:** Partially covered by Infrastructure & Cloud Architecture (Cap 16) which includes "cloud-native architecture patterns (containers, serverless, managed services)" and by Solution Design & Patterns (Cap 12).

**Recommendation:** Ensure Cap 16 (Infrastructure & Cloud Architecture) explicitly addresses platform and container architecture in its scope. Alternatively, consider whether Platform Architecture warrants a 4th capability in the Technology domain.

#### 4.1.3 Sustainability & Green IT Architecture (LOW PRIORITY)

**Observation:** Sustainability and environmental impact of architecture decisions is increasingly important (EU CSRD, ESG reporting, carbon-aware computing). The model does not mention sustainability.

**Recommendation:** Rather than adding a standalone capability (premature for most organizations), embed sustainability as a cross-cutting concern:
- Add sustainability principles to Cap 6 (Architecture Principles & Standards)
- Include energy efficiency criteria in Cap 16 (Infrastructure & Cloud Architecture)
- Add sustainability metrics to Cap 23 (EA Value Management)
- Include sustainability review criteria in Cap 28 (Architecture Compliance & Assurance)

### 4.2 Previously Identified Gaps Now Addressed

The corrected model resolves several gaps that are commonly flagged in EA capability model reviews:

| Previously Flagged Gap | How It's Now Addressed |
|----------------------|----------------------|
| Architecture Principles separate from Standards | Cap 6 (Architecture Principles & Standards) is a dedicated capability |
| Solution Architecture / EA-to-delivery bridge | Cap 12 (Solution Design & Patterns) explicitly covers solution architecture and bridging to delivery teams |
| EA Value Measurement / Metrics | Cap 23 (EA Value Management) is a dedicated capability with maturity assessment, ROI, and benefits tracking |
| Architecture Decision Records / Decision Governance | Cap 27 (Architecture Decision Management) is a dedicated capability |
| Architecture Review Board | Defined as a separate governance body with composition, operating model, and quorum |
| Network Architecture | Cap 18 (Network & Communications Architecture) now covers this previously common gap |
| Metamodel Management | Cap 19 (Metamodel & Taxonomy Management) is a dedicated capability |
| Architecture Building Blocks (ABB/SBB) | Cap 21 (Reference Architecture Library) explicitly addresses ABBs and SBBs |
| Technical Debt Management | Cap 29 (Risk & Technical Debt Management) combines risk and debt |
| Architecture Contracts | Partially addressed through ARB operating model and Cap 27 decision governance |

---

## 5. Overlap and Boundary Issues

### 5.1 Application Integration & API Management (Cap 11) vs. Data Analytics & BI Architecture (Cap 15)

**Issue:** Both capabilities deal with data flows and integration. Cap 11 covers application-to-application integration and APIs; Cap 15 covers data pipelines, ETL/ELT, and analytics platforms. The boundary is reasonable but could be more explicit.

**Recommendation:** Add explicit scope statements:
- Cap 11: "Focuses on **transactional, real-time** integration between applications and services (APIs, events, messaging)"
- Cap 15: "Focuses on **analytical** data integration (ETL/ELT, streaming for analytics, data lake/warehouse pipelines)"

### 5.2 Architecture Decision Management (Cap 27) vs. Architecture Compliance & Assurance (Cap 28)

**Issue:** Cap 27 governs decisions (ADRs, approval process); Cap 28 ensures compliance with standards post-decision. Both involve the ARB. Activities like "architecture review" could fit in either.

**Recommendation:** Clarify the boundary:
- Cap 27: **Before and during** design — capturing, reviewing, and approving architecture decisions
- Cap 28: **After** decisions and during/after implementation — verifying compliance with approved decisions and standards

### 5.3 Stakeholder Management (Cap 1) vs. Architecture Communication & Engagement (Cap 26)

**Issue:** Both deal with stakeholder interaction. Cap 1 identifies and analyzes stakeholders; Cap 26 communicates to them.

**Recommendation:** Clarify:
- Cap 1: The **analytical** capability — who are our stakeholders, what do they care about, how should we engage them?
- Cap 26: The **delivery** capability — how do we effectively communicate architecture to diverse audiences?

---

## 6. Consistency and Quality Issues

### 6.1 Template Consistency (GOOD)

All 30 capability files + ARB follow a consistent template with identical sections in the same order:
- Purpose, Scope, Key Activities, Inputs, Outputs/Deliverables, Roles & Responsibilities, Maturity Levels (5-level), Key Metrics/KPIs, Dependencies, Tools & Technologies

The ARB additionally includes Composition and Operating Model sections, which is appropriate.

### 6.2 Maturity Level Naming (GOOD)

All files use numbered maturity levels (1-5) with names: Initial, Repeatable, Defined, Managed, Optimizing. This is consistent and enables scoring.

**Observation:** The maturity level naming uses "Repeatable" at Level 2 rather than "Developing." This aligns with CMMI terminology, which is good. However, ensure this is a deliberate choice and consistently applied (it is).

### 6.3 Dependency Bidirectionality (NEEDS VERIFICATION)

Dependencies have been freshly defined in all capability files. A systematic bidirectionality check should be performed to ensure that if Capability A lists Capability B as a dependency, Capability B also lists Capability A. This was a significant issue in the previous version (~20 broken pairs).

**Recommendation:** Perform a systematic cross-check of all dependency declarations across all 31 files. An automated script could extract and compare all dependency pairs.

### 6.4 Maturity Level Specificity (MINOR)

Maturity descriptions vary in specificity. Some are very concrete (e.g., Cap 15 Level 5: "Real-time analytics; data mesh / data products at scale; AI/ML embedded in operations") while others are more generic (e.g., "continuous improvement"). This is generally acceptable, but all Level 5 descriptions should include at least one concrete, observable indicator.

---

## 7. Comparison with Major Frameworks

### 7.1 TOGAF Alignment

| TOGAF Concept | Current Coverage | Assessment |
|---------------|-----------------|------------|
| ADM Phases (A-H) | Well covered across Caps 1-6 and Governance | Good — minor gap on Vision (see 4.1.1) |
| Architecture Content Framework | Covered through domain capabilities | Good |
| Architecture Repository | Caps 19-21 (Metamodel, Content, Reference Library) | **Excellent** — stronger than many models |
| Architecture Capability Framework | Caps 22-26 + ARB | **Excellent** |
| Architecture Governance | Caps 27-30 + ARB | **Excellent** — ARB with operating model is strong |
| Enterprise Continuum | Cap 19 (Metamodel) + Cap 21 (Reference Library) | Good |
| Architecture Principles | Cap 6 (dedicated) | **Excellent** |
| Architecture Contracts | Partially in ARB and Cap 27 | Could be more explicit |
| Stakeholder Management | Cap 1 | Good |
| Architecture Requirements | Cap 2 | Good |
| Architecture Compliance | Cap 28 | Good |

**Overall TOGAF alignment: ~90%**. This is strong. The main enhancement would be making Architecture Contracts more explicit.

### 7.2 BIZBOK Alignment

| BIZBOK Concept | Current Coverage | Assessment |
|---------------|-----------------|------------|
| Business Capability Mapping | Cap 7 | Good |
| Value Streams | Cap 8 | Good |
| Organization Mapping | Cap 9 (Organization & Process Modelling) | **Good** — explicitly covers organizational modelling |
| Information Mapping | Cap 13 (Data Modelling & Management) | Good |
| Strategy Mapping | Cap 4 (Target State — includes strategy alignment) | Partial |
| Initiative Mapping | Cap 5 (Gap Analysis & Roadmapping) | Good |
| Stakeholder Mapping | Cap 1 | Good |

**Overall BIZBOK alignment: ~85%**. Improved from previous version due to Cap 9 explicitly covering organizational modelling.

### 7.3 DAMA-DMBOK Alignment

| DAMA-DMBOK Area | Current Coverage | Assessment |
|----------------|-----------------|------------|
| Data Governance | Cap 14 (Data Governance & Quality) | Good |
| Data Architecture | Cap 13 (Data Modelling & Management) | Good |
| Data Modelling & Design | Cap 13 | Good |
| Data Storage & Operations | Cap 16 (Infrastructure & Cloud Architecture) | Partial |
| Data Security | Cap 14 + Cap 17 | Good |
| Data Integration & Interoperability | Cap 15 (Data Analytics & BI Architecture) | Good |
| Reference & Master Data | Cap 13 (explicitly mentioned) | Good |
| Data Warehousing & BI | Cap 15 | Good |
| Metadata Management | Cap 19 (Metamodel & Taxonomy) + Cap 13 | **Good** — metamodel capability strengthens this |
| Data Quality | Cap 14 | Good |

**Overall DAMA alignment: ~85%**. The Metamodel & Taxonomy Management capability (Cap 19) strengthens metadata management coverage.

### 7.4 Gartner EA Alignment

Gartner emphasizes four key EA practices:

| Gartner Practice | Coverage | Assessment |
|-----------------|----------|------------|
| EA as Strategy Execution | Cap 4 (Target State), Cap 5 (Gap Analysis & Roadmapping) | Good |
| EA as Technology Optimization | Caps 10, 16, 17, 18 | Good |
| EA as Business Transformation | Caps 7, 8, 9 | Good |
| EA as Information/Data-centric | Caps 13, 14, 15 | Good |
| EA Value Delivery | Cap 23 (EA Value Management) | **Excellent** — dedicated capability |

### 7.5 Additional Framework Alignment

| Framework | Key Concept | Coverage | Assessment |
|-----------|------------|----------|------------|
| Zachman | "Why" dimension (Motivation) | Cap 6 (Principles), Cap 4 (Strategy alignment) | Good |
| Zachman | "Where" dimension (Network/Location) | Cap 18 (Network & Communications) | Good |
| FEAF | Security Reference Model | Cap 17 (Security & Compliance Architecture) | Good — cross-cutting scope |
| FEAF | Performance Reference Model | Cap 23 (EA Value Management) | Good |
| DoDAF | Capability Viewpoint | Cap 7 (Business Capability Modelling) | Good |
| SABSA | Security Architecture layers | Cap 17 | Good — covers all layers |

---

## 8. Recommendations Summary

### Priority 1 - Must Do (Overview File Improvements)

| # | Recommendation | Effort |
|---|---------------|--------|
| R1 | Add Purpose, Scope, and Audience section to overview | Low |
| R2 | Add Domain Relationship diagram/description to overview | Low |
| R3 | Add "How to Use This Model" section with prioritization tiers | Medium |
| R4 | Add Version, Date, Owner metadata to overview | Low |
| R5 | Add Glossary (key terms used across capabilities) | Medium |
| R6 | Add Framework References / Alignment section to overview | Low |

### Priority 2 - Should Do (Content Improvements)

| # | Recommendation | Effort |
|---|---------------|--------|
| R7 | Verify bidirectional dependencies across all 31 files | Medium |
| R8 | Clarify overlap boundaries for Cap 11/15, Cap 27/28, Cap 1/26 | Low |
| R9 | Strengthen Architecture Vision coverage in Cap 4 (or add new capability) | Low |
| R10 | Ensure Cap 16 explicitly covers platform/container/IDP architecture | Low |

### Priority 3 - Nice to Have (Future Enhancements)

| # | Recommendation | Effort |
|---|---------------|--------|
| R11 | Add Capability Dependency Matrix to overview | Medium |
| R12 | Embed sustainability as cross-cutting concern (Caps 6, 16, 23, 28) | Low |
| R13 | Make Architecture Contracts more explicit (expand Cap 27 or ARB) | Low |
| R14 | Consider adding AI/ML Architecture as demand grows | Medium |
| R15 | Consider adding Platform Architecture if not adequately covered in Cap 16 | Low |

---

## Appendix A: Review Checklist for Ongoing Maintenance

For future reviews of the capability model, use this checklist:

- [ ] All capabilities have current, accurate descriptions
- [ ] All dependency relationships are bidirectional
- [ ] Maturity indicators are specific and observable at each level
- [ ] No significant overlaps without explicit boundary statements
- [ ] Overview file has current version, date, and owner
- [ ] Framework alignment is up to date
- [ ] Glossary includes all specialized terms used
- [ ] New technology trends are reflected (AI, sustainability, quantum, etc.)
- [ ] Domain structure still makes sense for the organization
- [ ] Stakeholder feedback has been incorporated
- [ ] ARB composition and operating model reflect current organization

---

*This review was conducted through deep research and analysis of the EA capability model against TOGAF ADM, TOGAF Architecture Capability Framework, Zachman Framework, FEAF, DoDAF, Gartner EA research, BIZBOK, DAMA-DMBOK, SABSA, ITIL, CMMI/ACMM, MIT CISR, and NASCIO maturity models.*
