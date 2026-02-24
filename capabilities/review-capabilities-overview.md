# Review: EA Capability Model - Capabilities Overview

**Review Date:** 2026-02-24
**Scope:** Deep review and validation of `capabilities-overview.md` and the 30 capability definitions
**Sources:** TOGAF ADM & Architecture Capability Framework, Zachman Framework, FEAF, Gartner EA, BIZBOK, DAMA-DMBOK, SABSA, ITIL, CMMI/ACMM, MIT CISR, NASCIO

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
9. [Proposed Revised Structure](#9-proposed-revised-structure)

---

## 1. Executive Summary

The EA Capability Model is well-structured with 30 capabilities across 8 domains, following a consistent template. The model covers the essential EA capability areas and provides a solid foundation. However, this deep review identifies **critical gaps**, **structural improvements**, and **quality issues** that should be addressed to bring the model to industry best-practice standards.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Missing from overview file (structural) | 7 items | High |
| Capability gaps (missing capabilities) | 6 candidates | Medium-High |
| Overlap/boundary issues | 4 pairs | Medium |
| Broken bidirectional relationships | ~20 pairs | Medium |
| Domain structure concerns | 3 issues | Medium |
| Maturity model improvements | 2 items | Low-Medium |

---

## 2. Overview File - Structural Review

### 2.1 What's Good

- Clear 8-domain / 30-capability structure with linked tables
- Concise one-line descriptions for each capability
- Links to individual capability files
- Section explaining the structure of individual capability files

### 2.2 Critical Missing Elements

The overview file is functional but lacks several elements expected in a professional EA capability model document:

#### 2.2.1 No Purpose, Scope, or Audience Statement (HIGH)

The file opens directly with "This document provides an overview..." but never states:
- **Why** this capability model exists (what problem it solves)
- **Who** the target audience is (CIO, EA team, project teams, all of IT?)
- **Scope** boundaries (what is in and out of scope)
- **How** it relates to the organization's EA framework or strategy

**Recommendation:** Add a "Purpose & Scope" section at the top with:
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

The 8 domains are listed sequentially, but there is no explanation of how they relate to each other. A reader cannot tell that:
- "Architecture Development - Common" is a cross-cutting process layer
- The four domain architectures (Business, Application, Data, Technology) are the core content
- "Architecture Repository" is a storage/knowledge layer
- "Architecture Management" is an organizational/practice layer
- "Governance" is a control layer

**Recommendation:** Add a domain relationship section with a conceptual diagram:

```markdown
## Domain Relationships

The 8 domains form a layered architecture practice model:

┌─────────────────────────────────────────────────────┐
│                   GOVERNANCE                         │
│  (Review, Compliance, Risk, Change)                  │
├─────────────────────────────────────────────────────┤
│              ARCHITECTURE MANAGEMENT                 │
│  (Practice, Communication, Maturity, Innovation,     │
│   Skills)                                            │
├──────────┬──────────┬──────────┬────────────────────┤
│ BUSINESS │   APP    │   DATA   │    TECHNOLOGY      │
│  ARCH    │   ARCH   │   ARCH   │    ARCH            │
├──────────┴──────────┴──────────┴────────────────────┤
│         ARCHITECTURE DEVELOPMENT - COMMON            │
│  (Stakeholders, Requirements, Modelling, Current     │
│   State, Target State, Roadmap)                      │
├─────────────────────────────────────────────────────┤
│             ARCHITECTURE REPOSITORY                  │
│  (Knowledge, Standards, Tooling)                     │
└─────────────────────────────────────────────────────┘

- **Architecture Development - Common**: Foundation process capabilities
  that apply across all domain architectures
- **Domain Architectures** (Business, Application, Data, Technology):
  Core content areas producing architecture artifacts
- **Architecture Repository**: Persistent storage and knowledge layer
  supporting all other domains
- **Architecture Management**: Organizational capabilities for running
  the EA practice
- **Governance**: Control capabilities ensuring quality, compliance,
  and alignment
```

#### 2.2.3 No "How to Use This Model" Guidance (HIGH)

The model provides no guidance on how organizations should actually use it. This is critical for adoption.

**Recommendation:** Add a usage section covering:
- **As an assessment tool**: How to rate current maturity per capability (scoring guidance)
- **As a planning tool**: How to identify priority capabilities based on strategy
- **As a communication tool**: How to use the model to explain EA scope
- **Suggested assessment process**: Who participates, how often, what the output is
- **Prioritization guidance**: Which capabilities are foundational vs. advanced

```markdown
## How to Use This Model

### Maturity Assessment
1. Assemble a cross-functional assessment team
2. Rate each capability from Level 1 (Initial) to Level 5 (Optimizing)
3. Identify gaps between current and target maturity levels
4. Prioritize improvement actions based on strategic alignment

### Capability Prioritization Tiers
- **Tier 1 - Foundation**: Stakeholder Management, Requirements Management,
  Current State Assessment, Architecture Knowledge Management, Standards &
  Reference Architectures, Architecture Practice Management, Architecture
  Review & Approval
- **Tier 2 - Core**: Architecture Modelling, Target State Design, Roadmap
  Development, Business Capability Modelling, Application Portfolio Management,
  Data Modelling, Infrastructure Architecture, Security Architecture,
  Compliance Management, Risk Management
- **Tier 3 - Advanced**: Value Stream Mapping, Business Process Architecture,
  Integration Architecture, Application Design, Data Governance, Data
  Integration & Analytics, Platform Architecture, Architecture Communication,
  Architecture Maturity Assessment, Innovation & Emerging Technology,
  Architecture Skills Development, Architecture Tooling, Change Management
```

#### 2.2.4 No Version, Date, or Change History (MEDIUM)

There is no version number, date, owner, or changelog. For a governance artifact, this is a significant gap.

**Recommendation:** Add a metadata header:
```markdown
| Attribute | Value |
|-----------|-------|
| Version | 1.0 |
| Date | 2026-02-24 |
| Owner | [Chief Architect / Architecture Manager] |
| Status | Draft / Under Review / Approved |
| Last Review | 2026-02-24 |
| Next Review | [Quarterly recommended] |
```

#### 2.2.5 No Glossary (MEDIUM)

Several terms are used throughout without definition: technical debt, ADR, architecture fitness functions, transition architecture, heat mapping, ArchiMate, BPMN, RACI, SABSA, ATAM, etc.

**Recommendation:** Add a glossary section or a separate glossary file, defining at minimum:
- ADR (Architecture Decision Record)
- ArchiMate
- BPMN
- Fitness Function
- Heat Map
- RACI
- Technical Debt
- Transition Architecture
- TOGAF
- Value Stream

#### 2.2.6 No Framework References (MEDIUM)

The model implicitly draws from TOGAF, CMM, and other frameworks but does not acknowledge this. This reduces credibility and traceability.

**Recommendation:** Add a "Framework Alignment" section mapping the model's domains to TOGAF ADM phases, BIZBOK, DAMA-DMBOK, etc.

#### 2.2.7 No Capability Dependency View (LOW-MEDIUM)

Dependencies are scattered across individual files and not aggregated. A dependency matrix or summary would help with planning.

**Recommendation:** Add at minimum a textual summary of key dependencies, or ideally a simplified dependency matrix.

---

## 3. Domain Structure Validation

### 3.1 Overall Assessment

The 8-domain structure is reasonable and aligns broadly with industry practice. However, there are three structural concerns:

### 3.2 Domain Size Imbalance

| Domain | Capabilities | Assessment |
|--------|-------------|------------|
| Architecture Development - Common | 6 | Appropriate |
| Business Architecture | 3 | Could be expanded |
| Application Architecture | 3 | Appropriate |
| Data Architecture | 3 | Appropriate |
| Technology Architecture | 3 | Could be expanded |
| Architecture Repository | 3 | Appropriate |
| Architecture Management | 5 | Potentially over-decomposed |
| Governance | 4 | Appropriate |

**Concern:** Architecture Management has 5 capabilities while the core architecture domains (Business, Application, Data, Technology) have only 3 each. This creates an imbalance where the "meta" capabilities (managing the practice) outweigh the core content capabilities (doing the architecture).

**Recommendation:** Consider whether Architecture Skills Development (Cap 26) and Architecture Maturity Assessment (Cap 24) could be consolidated into Architecture Practice Management (Cap 22), or alternatively whether the core domains should be expanded (see Section 4 - Gap Analysis).

### 3.3 "Architecture Development - Common" Naming

The name "Architecture Development - Common" is awkward and TOGAF-specific. Alternatives:
- **Core Architecture Process** - emphasizes these are the foundational process steps
- **Architecture Development Lifecycle** - aligns with ADM terminology
- **Cross-Cutting Architecture Capabilities** - emphasizes their cross-domain nature

**Recommendation:** Consider renaming to "Core Architecture Process" or "Architecture Development Lifecycle" for clarity.

### 3.4 Governance vs. Architecture Management Boundary

The distinction between "Governance" and "Architecture Management" is not immediately clear. In many EA frameworks, governance IS part of architecture management. The current split implies:
- Architecture Management = running the EA team/practice
- Governance = controlling architecture quality and compliance

This is a valid split, but it should be explicitly stated in the overview.

### 3.5 TOGAF ADM Phase Mapping

The model's domains map to TOGAF ADM phases as follows:

| TOGAF ADM Phase | Mapped Capabilities | Gap? |
|----------------|---------------------|------|
| Preliminary (Framework & Principles) | Cap 20 (Standards), Cap 22 (Practice Mgmt) | Partial - no explicit "EA Framework Setup" |
| A - Architecture Vision | Cap 1 (Stakeholders), Cap 2 (Requirements) | **GAP - No explicit Architecture Vision capability** |
| B - Business Architecture | Caps 7, 8, 9 | Covered |
| C - Information Systems (App) | Caps 10, 11, 12 | Covered |
| C - Information Systems (Data) | Caps 13, 14, 15 | Covered |
| D - Technology Architecture | Caps 16, 17, 18 | Covered |
| E - Opportunities & Solutions | Cap 5 (Target State), Cap 6 (Roadmap) | Partial |
| F - Migration Planning | Cap 6 (Roadmap) | **Thin - Migration Planning could be richer** |
| G - Implementation Governance | Caps 27, 28 | Partial - no "Implementation Oversight" |
| H - Architecture Change Management | Cap 30 (Change Mgmt) | Covered |
| Requirements Management | Cap 2 (Requirements) | Covered |

---

## 4. Capability Gap Analysis

### 4.1 Capabilities Recommended to ADD

#### 4.1.1 Architecture Vision & Strategy Alignment (HIGH PRIORITY)

**Gap:** There is no explicit capability for defining the overall architecture vision and ensuring strategic alignment. TOGAF Phase A (Architecture Vision) is a critical starting point. Currently, bits of this are scattered across Stakeholder Management (Cap 1), Target State Design (Cap 5), and Architecture Practice Management (Cap 22), but none of them specifically own "architecture vision."

**What it would cover:**
- Architecture vision statement creation
- Strategic alignment validation (business strategy to architecture)
- Architecture principles definition (currently in Cap 5 but should be its own concern)
- Scope and constraint definition for architecture work
- Business case development for architecture initiatives

**Recommendation:** Add as a new capability in the "Architecture Development - Common" domain, or merge into an expanded Cap 5 (renamed to "Architecture Vision & Target State Design").

#### 4.1.2 Solution Architecture (HIGH PRIORITY)

**Gap:** The model has no explicit capability for Solution Architecture - the discipline of designing end-to-end solutions that span multiple architecture domains for specific business problems or projects. Application Design (Cap 12) is the closest, but it focuses on application-level design patterns, not cross-domain solution design.

**What it would cover:**
- Solution design for programs and projects
- Cross-domain architecture integration (business + app + data + tech for a specific initiative)
- Solution option analysis and selection
- Solution architecture review and assurance
- Bridging enterprise architecture to delivery teams

**Recommendation:** Add as a new capability in the "Application Architecture" domain (or create a new "Solution Delivery" domain). This is consistently identified as a distinct EA capability in industry models and is critical for the EA-to-delivery handoff.

#### 4.1.3 Architecture Contracts & Agreements (MEDIUM PRIORITY)

**Gap:** TOGAF explicitly defines "Architecture Contracts" as formal agreements between development teams and the architecture function. This ensures that architecture decisions are actually implemented as designed. Currently, there is no mechanism in the model for formalizing commitments.

**What it would cover:**
- Architecture contract definition and management
- Service-level agreements for architecture compliance
- Architecture-to-project handoff agreements
- Contract monitoring and enforcement

**Recommendation:** This could be added as a new governance capability, or integrated into Architecture Review & Approval (Cap 27) as an expanded scope.

#### 4.1.4 Sustainability & Green IT Architecture (MEDIUM PRIORITY)

**Gap:** Sustainability and environmental impact of architecture decisions is an increasingly important concern (EU regulations, ESG reporting, carbon-aware computing). The current model has no mention of sustainability.

**What it would cover:**
- Carbon-aware architecture design
- Energy efficiency in infrastructure and application design
- Sustainability metrics and reporting for architecture
- Green IT standards and guidelines
- Circular economy principles in technology lifecycle

**Recommendation:** Add as a new capability in Technology Architecture or as a cross-cutting concern. At minimum, add sustainability considerations to existing capabilities (Infrastructure Architecture, Platform Architecture).

#### 4.1.5 AI/ML Architecture (LOW-MEDIUM PRIORITY)

**Gap:** AI and ML are becoming foundational technology capabilities, yet the model only mentions "AI/ML" in passing under Data Integration & Analytics (Cap 15) and Innovation (Cap 25). Given the transformative impact of AI, a dedicated capability may be warranted.

**What it would cover:**
- AI/ML platform architecture
- MLOps and model lifecycle management
- Responsible AI frameworks and governance
- AI integration patterns
- LLM and generative AI architecture

**Recommendation:** Currently justifiable as a sub-capability of Data Integration & Analytics or Innovation & Emerging Technology. Consider elevating to a standalone capability as AI maturity grows in the organization.

#### 4.1.6 Enterprise Continuum & Landscape Management (LOW PRIORITY)

**Gap:** TOGAF defines the "Enterprise Continuum" as the classification of architecture assets from generic (foundation) to specific (organization). The current model captures this partially through Architecture Knowledge Management (Cap 19) and Standards (Cap 20), but doesn't explicitly address the concept of managing architecture at different levels of abstraction (industry, segment, organization, project).

**Recommendation:** Not a standalone capability at this stage, but the concept should be referenced in Cap 19 and Cap 20.

### 4.2 Capabilities That Are Adequately Covered (No New Capability Needed)

| Often-cited Gap | Where It's Covered | Assessment |
|----------------|---------------------|------------|
| Cloud Architecture | Caps 16 (Infrastructure) + 18 (Platform) | Adequately covered across two capabilities |
| API Management | Cap 11 (Integration Architecture) | Adequately covered; APIs are a primary focus |
| DevOps/DevSecOps | Caps 12 (Application Design) + 18 (Platform) | Covered as activities within existing capabilities |
| Architecture Metrics & Reporting | Caps 22 (Practice Mgmt) + 24 (Maturity) | Covered; KPIs defined per capability |
| Vendor/Technology Partner Management | Cap 22 (Practice Mgmt) + Cap 25 (Innovation) | Lightly covered; could be strengthened but not a gap |
| Architecture Principles Management | Cap 5 (Target State) + Cap 20 (Standards) | Covered but split across two capabilities |
| Digital Transformation | Caps 5, 6, 25 | Cross-cutting concern, not a standalone capability |
| Enterprise Agility | Caps 22, 25, 30 | Organizational concern, not an EA-specific capability |
| Migration Planning | Cap 6 (Roadmap Development) | Covered but could be richer in migration-specific activities |

---

## 5. Overlap and Boundary Issues

### 5.1 Integration Architecture (Cap 11) vs. Data Integration & Analytics (Cap 15)

**Issue:** Both deal with data flows and integration patterns. Cap 11 focuses on application-to-application integration while Cap 15 focuses on data pipeline and analytics integration. The boundary is reasonable but not explicit enough.

**Impact:** Teams may be confused about which capability owns data flow mapping, ETL/ELT design, or API-based data exchange.

**Recommendation:** Add explicit boundary statements to both capability files:
- Cap 11: "Focuses on **real-time, transactional** integration between applications and services (APIs, events, messaging)"
- Cap 15: "Focuses on **analytical, batch, and streaming** data integration for reporting, BI, and data science"

### 5.2 Architecture Review & Approval (Cap 27) vs. Compliance Management (Cap 28)

**Issue:** Both involve checking adherence to standards. Cap 27 is point-in-time reviews; Cap 28 is ongoing compliance monitoring. However, activities like "architecture compliance checking" appear in both.

**Recommendation:** Clarify that Cap 27 is the **proactive, gate-based** review process (before/during design) while Cap 28 is the **reactive, ongoing** compliance monitoring process (after implementation, continuous).

### 5.3 Architecture Knowledge Management (Cap 19) vs. Standards & Reference Architectures (Cap 20)

**Issue:** Standards and reference architectures ARE architecture knowledge. Cap 19 manages the repository; Cap 20 manages the prescriptive content. The distinction is valid but could confuse users.

**Recommendation:** Add a clarifying note: "Cap 19 manages **how** architecture knowledge is stored, organized, and shared. Cap 20 manages **what** prescriptive content (standards, patterns, reference architectures) is defined and governed."

### 5.4 Stakeholder Management (Cap 1) vs. Architecture Communication (Cap 23)

**Issue:** Both deal with stakeholder engagement. Cap 1 identifies and analyzes stakeholders; Cap 23 communicates to them. The boundary is logical but activities overlap (e.g., "stakeholder engagement planning" vs. "audience-specific communication planning").

**Recommendation:** Clarify that Cap 1 is the **analytical** capability (who are our stakeholders, what do they care about?) while Cap 23 is the **delivery** capability (how do we communicate architecture to them effectively?).

---

## 6. Consistency and Quality Issues

### 6.1 Broken Bidirectional Relationships (~20 pairs) (HIGH)

A systematic check of all relationship declarations across the 30 files reveals approximately 20 cases where Capability A references Capability B, but Capability B does not reference Capability A. Key examples:

| Capability A (references B) | Capability B (missing reference back to A) |
|-----------------------------|-------------------------------------------|
| Cap 1 (Stakeholder Mgmt) | Cap 30 (Change Mgmt) - missing back-ref |
| Cap 1 (Stakeholder Mgmt) | Cap 27 (Review & Approval) - missing back-ref |
| Cap 2 (Requirements Mgmt) | Cap 27 (Review & Approval) - missing back-ref |
| Cap 7 (Business Capability Modelling) | Cap 23 (Communication) - missing back-ref |
| Cap 8 (Value Stream Mapping) | Cap 4 (Current State Assessment) - missing back-ref |
| Cap 8 (Value Stream Mapping) | Cap 6 (Roadmap Development) - missing back-ref |
| Cap 9 (Business Process Architecture) | Cap 28 (Compliance Mgmt) - missing back-ref |
| Cap 10 (App Portfolio Mgmt) | Cap 6 (Roadmap Development) - missing back-ref |
| Cap 11 (Integration Architecture) | Cap 20 (Standards) - missing back-ref |
| Cap 13 (Data Modelling) | Cap 19 (Knowledge Mgmt) - missing back-ref |
| Cap 13 (Data Modelling) | Cap 12 (Application Design) - missing back-ref |
| Cap 14 (Data Governance) | Cap 29 (Risk Mgmt) - missing back-ref |
| Cap 16 (Infrastructure Arch) | Cap 12 (Application Design) - missing back-ref |
| Cap 18 (Platform Arch) | Cap 17 (Security Arch) - missing back-ref |
| Cap 22 (Practice Mgmt) | Cap 1 (Stakeholder Mgmt) - missing back-ref |
| Cap 24 (Maturity Assessment) | Cap 21 (Tooling) - missing back-ref |
| Cap 24 (Maturity Assessment) | Cap 6 (Roadmap Development) - missing back-ref |
| Cap 25 (Innovation) | Cap 5 (Target State Design) - missing back-ref |
| Cap 25 (Innovation) | Cap 20 (Standards) - missing back-ref |
| Cap 27 (Review & Approval) | Cap 23 (Communication) - missing back-ref |
| Cap 30 (Change Mgmt) | Cap 4 (Current State Assessment) - missing back-ref |

**Recommendation:** Systematically review all 30 files and add missing back-references to ensure every declared relationship is bidirectional.

### 6.2 Maturity Levels Not Numbered (LOW-MEDIUM)

The maturity levels use names (Initial, Developing, Defined, Managed, Optimizing) but are not explicitly numbered (Level 1-5). This makes scoring and comparison harder.

**Recommendation:** Number the levels explicitly in all files:

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | ... |
| 2 | Developing | ... |
| 3 | Defined | ... |
| 4 | Managed | ... |
| 5 | Optimizing | ... |

### 6.3 Maturity Level Descriptions Are Inconsistent in Depth

Some capabilities have very specific maturity indicators (e.g., Cap 15 mentions "data mesh" at Level 5) while others are generic (e.g., "continuous improvement"). The depth of maturity descriptions should be more consistent.

**Recommendation:** Ensure each maturity level provides at least one concrete, observable indicator specific to that capability.

---

## 7. Comparison with Major Frameworks

### 7.1 TOGAF Alignment

| TOGAF Concept | Current Coverage | Gap |
|---------------|-----------------|-----|
| ADM Phases (A-H) | Well covered across Caps 1-6 and Governance | Phase A (Vision) is weak |
| Architecture Content Framework | Covered through individual domain capabilities | Good |
| Architecture Repository | Covered by domain 6 (Caps 19-21) | Good |
| Architecture Capability Framework | Covered by domains 7-8 | Good |
| Architecture Governance | Covered by domain 8 | Architecture Contracts missing |
| Enterprise Continuum | Partially in Caps 19-20 | Could be more explicit |
| Architecture Principles | Split across Caps 5 and 20 | Should be consolidated |
| Stakeholder Management | Cap 1 | Good |
| Architecture Requirements | Cap 2 | Good |
| Architecture Compliance | Cap 28 | Good |

**Overall TOGAF alignment: ~85%**. Key gaps are Architecture Vision and Architecture Contracts.

### 7.2 BIZBOK (Business Architecture Body of Knowledge) Alignment

| BIZBOK Concept | Current Coverage | Gap |
|---------------|-----------------|-----|
| Business Capability Mapping | Cap 7 | Good |
| Value Streams | Cap 8 | Good |
| Organization Mapping | Partially in Cap 7 | Could be more explicit |
| Information Mapping | Cap 13 (Data Modelling) | Good |
| Strategy Mapping | Not explicitly covered | **GAP - Strategy-to-architecture alignment** |
| Initiative Mapping | Cap 6 (Roadmap) | Partial |
| Product Mapping | Not covered | Minor gap |
| Stakeholder Mapping | Cap 1 | Good |

**Overall BIZBOK alignment: ~75%**. Key gap is explicit strategy-to-architecture alignment.

### 7.3 DAMA-DMBOK (Data Management) Alignment

| DAMA-DMBOK Area | Current Coverage | Gap |
|----------------|-----------------|-----|
| Data Governance | Cap 14 | Good |
| Data Architecture | Cap 13 | Good |
| Data Modelling & Design | Cap 13 | Good |
| Data Storage & Operations | Cap 16 (Infrastructure) | Partial |
| Data Security | Cap 14 + Cap 17 | Good |
| Data Integration & Interoperability | Cap 15 | Good |
| Document & Content Management | Not covered | Minor gap |
| Reference & Master Data | Cap 14 (mentioned) | Good |
| Data Warehousing & BI | Cap 15 | Good |
| Metadata Management | Cap 14 (mentioned) | Could be more explicit |
| Data Quality | Cap 14 | Good |

**Overall DAMA alignment: ~80%**. Coverage is solid for an EA-level model.

### 7.4 Gartner EA Alignment

Gartner emphasizes four key EA practices:
1. **EA as Strategy Execution** - Partially covered (gap in explicit strategy alignment)
2. **EA as Technology Optimization** - Well covered (Caps 10, 16, 17, 18)
3. **EA as Business Transformation** - Partially covered (Caps 7, 8, 9)
4. **EA as Information/Data-centric** - Well covered (Caps 13, 14, 15)

Gartner also emphasizes **EA Value Delivery** and **Business Outcome Architecture** as critical capabilities that are not explicitly present in the model.

---

## 8. Recommendations Summary

### Priority 1 - Must Do (Overview File)

| # | Recommendation | Effort |
|---|---------------|--------|
| R1 | Add Purpose, Scope, and Audience section | Low |
| R2 | Add Domain Relationship diagram/description | Low |
| R3 | Add "How to Use This Model" section with prioritization tiers | Medium |
| R4 | Add Version, Date, Owner metadata | Low |
| R5 | Add Glossary (key terms used across capabilities) | Medium |
| R6 | Add Framework References / Alignment section | Low |

### Priority 2 - Should Do (Capability Gaps)

| # | Recommendation | Effort |
|---|---------------|--------|
| R7 | Add Architecture Vision & Strategy Alignment capability (or expand Cap 5) | Medium |
| R8 | Add Solution Architecture capability | Medium |
| R9 | Fix all ~20 broken bidirectional relationships | Medium |
| R10 | Clarify overlap boundaries (Caps 11/15, 27/28, 19/20, 1/23) | Low |
| R11 | Number maturity levels (1-5) in all capability files | Low |

### Priority 3 - Nice to Have

| # | Recommendation | Effort |
|---|---------------|--------|
| R12 | Add Architecture Contracts capability (or expand Cap 27) | Low |
| R13 | Add Sustainability/Green IT capability (or integrate into existing) | Medium |
| R14 | Add Capability Dependency Matrix to overview | Medium |
| R15 | Rename "Architecture Development - Common" to clearer name | Low |
| R16 | Consider rebalancing Architecture Management domain (5 caps → consolidate) | Medium |
| R17 | Strengthen AI/ML coverage (expand Cap 15 or add new capability) | Medium |

---

## 9. Proposed Revised Structure

Based on the findings above, here is a proposed revised structure for the capability model:

### Option A: Incremental Improvement (Recommended)

Keep the current 8-domain structure but add 2 new capabilities and restructure slightly:

```
1. Architecture Development - Common (7 capabilities)
   1.  Stakeholder Management
   2.  Requirements Management
   3.  Architecture Modelling
   4.  Current State Assessment
   5.  Architecture Vision & Target State Design  ← EXPANDED (merged vision + target)
   6.  Roadmap & Migration Planning               ← RENAMED (strengthened migration)
   7.  Solution Architecture                      ← NEW

2. Business Architecture (3 capabilities)
   8.  Business Capability Modelling
   9.  Value Stream Mapping
   10. Business Process Architecture

3. Application Architecture (3 capabilities)
   11. Application Portfolio Management
   12. Integration Architecture
   13. Application Design

4. Data Architecture (3 capabilities)
   14. Data Modelling
   15. Data Governance
   16. Data Integration & Analytics

5. Technology Architecture (3-4 capabilities)
   17. Infrastructure Architecture
   18. Security Architecture
   19. Platform Architecture
   20. Sustainability & Green IT Architecture      ← NEW (optional)

6. Architecture Repository (3 capabilities)
   21. Architecture Knowledge Management
   22. Standards & Reference Architectures
   23. Architecture Tooling

7. Architecture Management (4 capabilities)
   24. Architecture Practice Management            ← ABSORBS maturity assessment
   25. Architecture Communication
   26. Innovation & Emerging Technology
   27. Architecture Skills Development

8. Governance (4 capabilities)
   28. Architecture Review, Contracts & Approval   ← EXPANDED (includes contracts)
   29. Compliance Management
   30. Risk Management
   31. Change Management
```

**Total: 31-32 capabilities** (up from 30)

### Option B: More Significant Restructure

Reorganize into 6 broader domains:

```
1. Architecture Strategy & Planning
2. Architecture Development (Business, Application, Data, Technology)
3. Solution Delivery Architecture
4. Architecture Repository & Standards
5. Architecture Practice & People
6. Architecture Governance & Risk
```

This flattens the structure and groups more logically by activity type rather than organizational structure.

### Recommendation

**Option A is recommended** because it preserves the existing investment in documentation while addressing the critical gaps. Option B would require rewriting all 30 capability files and is only warranted if the current structure proves fundamentally inadequate.

---

## Appendix A: Review Checklist for Ongoing Maintenance

For future reviews of the capability model, use this checklist:

- [ ] All capabilities have current, accurate descriptions
- [ ] All relationships are bidirectional
- [ ] Maturity indicators are specific and observable
- [ ] No significant overlaps without explicit boundary statements
- [ ] Overview file has current version, date, and owner
- [ ] Framework alignment is up to date
- [ ] Glossary includes all specialized terms
- [ ] New technology trends are reflected (AI, sustainability, etc.)
- [ ] Domain structure still makes sense for the organization
- [ ] Stakeholder feedback has been incorporated

---

*This review was conducted through analysis of the capability model against TOGAF ADM, TOGAF Architecture Capability Framework, Zachman Framework, FEAF, Gartner EA research, BIZBOK, DAMA-DMBOK, SABSA, ITIL, CMMI/ACMM, MIT CISR, and NASCIO maturity models.*
