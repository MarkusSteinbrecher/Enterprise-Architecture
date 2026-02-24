# Review: EA Capability Model – Capabilities Overview

**Review Date:** 2026-02-24
**Scope:** Deep review and validation of the 30 capability definitions + ARB extracted from the EA Capability Model PDF
**Sources:** TOGAF ADM & Architecture Capability Framework, Zachman Framework, FEAF, DoDAF, Gartner EA, BIZBOK, DAMA-DMBOK, SABSA, ITIL, CMMI/ACMM

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Model Structure Review](#2-model-structure-review)
3. [Domain Structure Validation](#3-domain-structure-validation)
4. [Capability Gap Analysis](#4-capability-gap-analysis)
5. [Overlap and Boundary Issues](#5-overlap-and-boundary-issues)
6. [Consistency and Quality Issues](#6-consistency-and-quality-issues)
7. [Comparison with Major Frameworks](#7-comparison-with-major-frameworks)
8. [Recommendations Summary](#8-recommendations-summary)

---

## 1. Executive Summary

The EA Capability Model defines 30 capabilities across 8 domains, plus an Architecture Review Board (ARB) as a governance body. The model is pragmatic, well-structured, and covers the essential activities needed to set up and improve Enterprise Architecture in an organisation.

### Model Structure

| Domain | Capabilities | Numbers |
|--------|-------------|---------|
| Architecture Development – Common | 6 | 1–6 |
| Architecture Development – Business Architecture | 3 | 7–9 |
| Architecture Development – Application Architecture | 3 | 10–12 |
| Architecture Development – Data Architecture | 3 | 13–15 |
| Architecture Development – Technology Architecture | 3 | 16–18 |
| Architecture Repository | 3 | 19–21 |
| Architecture Management | 5 | 22–26 |
| Architecture Governance, Communication & Change | 4 + ARB | 27–30 + ARB |

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Structural completeness | Good | — |
| Capability gap candidates | 4 | Medium |
| Overlap/boundary issues needing clarification | 3 pairs | Medium |
| Template consistency | Excellent | — |
| Framework alignment opportunities | 4 items | Low–Medium |

---

## 2. Model Structure Review

### 2.1 What's Good

- Clear 8-domain / 30-capability structure
- Pragmatic, action-oriented taglines for each capability
- Consistent template across all capabilities: Definition, Objectives, Tasks, Inputs, Outputs, Roles, Common Issues, Pragmatic Approach, Additional Information
- Inclusion of the ARB as a distinct governance body with Composition and Operating Model
- "NEW PROPOSED DRAFT" markers on Cap 18 (Virtualization Architecture Modelling) and Cap 19 (Dashboards, Views, Reports) show maturity awareness

### 2.2 Suggestions for the Overview

#### 2.2.1 No Purpose, Scope, or Audience Statement

The overview opens directly with the capability listing but never states:
- **Why** this capability model exists (what problem it solves)
- **Who** the target audience is (CIO, EA team, project teams?)
- **Scope** boundaries (what is in and out of scope)

**Recommendation:** Add a "Purpose & Scope" section at the top of `capabilities-overview.md`.

#### 2.2.2 No Domain Relationship Model

The 8 domains are listed sequentially, but there is no explanation of how they relate to each other. A reader cannot immediately understand that:
- "Architecture Development – Common" contains cross-cutting process capabilities
- The four domain architectures (Business, Application, Data, Technology) are the core content layers
- "Architecture Repository" is a persistent data/knowledge layer
- "Architecture Management" is an organisational/practice layer
- "Governance, Communication & Change" is a control and engagement layer with the ARB as its formal body

**Recommendation:** Add a domain relationship section explaining the layered model.

#### 2.2.3 No Version, Date, or Change History

**Recommendation:** Add metadata (version, date, owner, status) to support governance of the model itself.

#### 2.2.4 No Glossary

Terms used across capabilities without definition: ArchiMate, BPMN, RACI, TOGAF, ADR, heat mapping, FinOps, zero trust, metamodel, etc.

**Recommendation:** Add a glossary section or separate glossary file.

---

## 3. Domain Structure Validation

### 3.1 Overall Assessment

The 8-domain structure is well-balanced and aligns with industry practice.

| Strength | Detail |
|----------|--------|
| Separation of common process | "Architecture Development – Common" recognises cross-cutting capabilities (Vision, Roadmap, Transformation, Requirements, Views, Technology Evaluation) |
| Balanced domain architectures | Business, Application, Data, Technology each have 3 capabilities |
| Dedicated Repository domain | Dashboards/Views, Data Quality, and Repository Maintenance are distinct concerns |
| ARB as separate entity | Not buried in a capability but defined with Composition and Operating Model |

### 3.2 Domain Size Balance

| Domain | Capabilities | Assessment |
|--------|-------------|------------|
| Architecture Development – Common | 6 | Well-balanced — covers cross-cutting concerns |
| Business Architecture | 3 | Appropriate — Value Drivers, Capability, Process |
| Application Architecture | 3 | Good — Validation, App/Solution Modelling, Integration |
| Data Architecture | 3 | Good — Business Objects, Data Architecture, Data Flow |
| Technology Architecture | 3 | Good — System, Network, Virtualization |
| Architecture Repository | 3 | Well-scoped — Dashboards, Data Quality, Maintenance |
| Architecture Management | 5 | Largest domain — justified (see note) |
| Governance, Communication & Change | 4 + ARB | Appropriate |

**Note on Architecture Management (5 capabilities):** This is the largest domain. It is justified because it covers five genuinely distinct concerns: Organisation Development (22), EA Performance Management (23), EA Process Development (24), EA Knowledge Management (25), and Stakeholder Management (26).

### 3.3 TOGAF ADM Phase Mapping

| TOGAF ADM Phase | Mapped Capabilities | Assessment |
|----------------|---------------------|------------|
| Preliminary (Framework & Principles) | Cap 27 (Standards, Policies, Principles, Guidelines), Cap 22 (Organisation Development) | **Covered** |
| A – Architecture Vision | Cap 1 (Architecture Vision Development) | **Well covered** — dedicated capability |
| B – Business Architecture | Cap 7 (Strategic Value Driver Definition), Cap 8 (Capability Definition), Cap 9 (Process Modelling) | **Covered** |
| C – Information Systems (App) | Cap 10 (Architecture Validation), Cap 11 (Application / Solution Architecture Modelling), Cap 12 (Integration Architecture Modelling) | **Covered** |
| C – Information Systems (Data) | Cap 13 (Business Object Modelling), Cap 14 (Data Architecture Modelling), Cap 15 (Data Flow Modelling) | **Covered** |
| D – Technology Architecture | Cap 16 (System Architecture Modelling), Cap 17 (Network Architecture Modelling), Cap 18 (Virtualization Architecture Modelling) | **Covered** |
| E – Opportunities & Solutions | Cap 2 (Architecture Roadmap Development), Cap 5 (Architecture View Creation) | **Covered** |
| F – Migration Planning | Cap 3 (Transformation Planning) | **Covered** |
| G – Implementation Governance | Cap 30 (Architecture Compliance Evaluation), ARB | **Covered** |
| H – Architecture Change Management | Cap 29 (Communication & Change Management) | **Covered** |
| Requirements Management (centre) | Cap 4 (Architecture Requirements Management) | **Covered** |

---

## 4. Capability Gap Analysis

### 4.1 Potential Gaps to Consider

#### 4.1.1 Security Architecture (MEDIUM PRIORITY)

**Observation:** The model does not include a dedicated Security Architecture capability. Security concerns are implicitly addressed across multiple capabilities (e.g., Cap 17 Network Architecture mentions secure connectivity, Cap 18 Virtualization mentions security risks), but there is no explicit capability covering:
- Security architecture principles and patterns
- Identity and access management architecture
- Security compliance and risk assessment from an architecture perspective
- Zero trust architecture design

**Recommendation:** Consider adding a Security Architecture capability in the Technology Architecture domain, or explicitly embedding security as a cross-cutting concern in the existing technology capabilities and Cap 27 (Standards, Policies, Principles, Guidelines).

#### 4.1.2 Architecture Decision Management (MEDIUM PRIORITY)

**Observation:** The model covers Standards, Policies, Principles, Guidelines (Cap 27) and Architecture Compliance Evaluation (Cap 30), but does not explicitly address the capture and governance of individual architecture decisions (e.g., Architecture Decision Records / ADRs).

**Recommendation:** Consider strengthening Cap 27 to explicitly include decision capture and ADR management, or add decision governance as a task in the ARB operating model.

#### 4.1.3 Platform Architecture / Shared Services (LOW–MEDIUM PRIORITY)

**Observation:** Container platforms, developer experience platforms, middleware, and shared services are partially covered by Cap 16 (System Architecture Modelling) and Cap 18 (Virtualization Architecture Modelling), but no capability explicitly addresses platform engineering and internal developer platforms (IDPs).

**Recommendation:** Ensure Cap 16 or Cap 18 explicitly addresses platform and container architecture. Alternatively, consider whether Platform Architecture warrants a 4th capability in the Technology domain.

#### 4.1.4 Sustainability & Green IT Architecture (LOW PRIORITY)

**Observation:** Sustainability and environmental impact of architecture decisions (EU CSRD, ESG reporting, carbon-aware computing) are not mentioned in the model.

**Recommendation:** Rather than adding a standalone capability, embed sustainability as a cross-cutting concern:
- Add sustainability principles to Cap 27 (Standards, Policies, Principles, Guidelines)
- Include energy efficiency criteria in Cap 16 (System Architecture Modelling)
- Add sustainability metrics to Cap 23 (EA Performance Management)

---

## 5. Overlap and Boundary Issues

### 5.1 Architecture Vision Development (Cap 1) vs. Architecture Roadmap Development (Cap 2)

**Observation:** Both capabilities deal with future-state planning. Cap 1 focuses on creating a high-level view of the desired architecture, while Cap 2 focuses on the roadmap to get there. The boundary is logical but could benefit from explicit scope statements.

**Recommendation:** Clarify:
- Cap 1: **What** — defining the target architecture vision and gaining stakeholder buy-in
- Cap 2: **How** — planning the sequenced path (roadmap) from current state to the vision

### 5.2 Architecture Requirements Management (Cap 4) vs. Architecture View Creation (Cap 5)

**Observation:** Cap 4 captures and manages requirements; Cap 5 creates views to communicate architecture to stakeholders. Both involve stakeholder interaction. Requirements inform views, and views can surface new requirements.

**Recommendation:** Clarify:
- Cap 4: The **analytical** capability — capturing, structuring, and tracking architecture requirements
- Cap 5: The **communication** capability — creating visual representations that address specific stakeholder concerns

### 5.3 Standards, Policies, Principles, Guidelines (Cap 27) vs. Architecture Compliance Evaluation (Cap 30)

**Observation:** Cap 27 defines the guardrails; Cap 30 evaluates compliance with them. Both involve the ARB. The boundary is clear in principle but could overlap in practice.

**Recommendation:** Clarify:
- Cap 27: **Before** — defining, maintaining, and communicating the rules
- Cap 30: **After** — evaluating whether implementations adhere to the rules

---

## 6. Consistency and Quality Issues

### 6.1 Template Consistency (EXCELLENT)

All 30 capability files follow a consistent template with identical sections in the same order:
- Definition, Objectives, Tasks, Inputs, Outputs, Roles, Common Issues with an Immature Capability, Pragmatic Approach – Essentials That Are Needed for Success, Additional Information

The ARB additionally includes Composition and Operating Model sections, which is appropriate for a governance body.

### 6.2 Role Format Variation (MINOR)

Most capability files use RACI-style annotations (e.g., "Enterprise Architect (R)", "CIO (A)"), but a few files (e.g., Cap 7 Strategic Value Driver Definition) list roles without RACI indicators. This should be made consistent.

**Recommendation:** Ensure all capability files use RACI annotations for roles.

### 6.3 Draft Status (NOTED)

Capabilities 18 (Virtualization Architecture Modelling) and 19 (Dashboards, Views, Reports) are marked as "*NEW PROPOSED DRAFT*". These should be reviewed and either promoted to full status or explicitly tracked as needing further validation.

### 6.4 Dependency Cross-References (NEEDS VERIFICATION)

The current capability files do not include explicit dependency sections listing related capabilities. Adding cross-references would help readers understand how capabilities relate to each other.

**Recommendation:** Consider adding a "Dependencies" or "Related Capabilities" section to each file, and ensure bidirectional consistency.

---

## 7. Comparison with Major Frameworks

### 7.1 TOGAF Alignment

| TOGAF Concept | Current Coverage | Assessment |
|---------------|-----------------|------------|
| ADM Phases (A–H) | Well covered across all domains (see Section 3.3) | **Good** |
| Architecture Content Framework | Covered through domain architecture capabilities (7–18) | **Good** |
| Architecture Repository | Cap 19 (Dashboards, Views, Reports), Cap 20 (Data Gathering & Data Quality), Cap 21 (Repository Support & Maintenance) | **Good** |
| Architecture Capability Framework | Cap 22–26 (Architecture Management domain) | **Good** |
| Architecture Governance | Cap 27–30 + ARB | **Good** |
| Architecture Principles | Cap 27 (Standards, Policies, Principles, Guidelines) | **Covered** |
| Architecture Contracts | Partially in ARB operating model | Could be more explicit |
| Stakeholder Management | Cap 1 (Vision – stakeholder engagement) + Cap 26 (Stakeholder Management) | **Good** |
| Architecture Requirements | Cap 4 (Architecture Requirements Management) | **Covered** |
| Architecture Compliance | Cap 30 (Architecture Compliance Evaluation) | **Covered** |

**Overall TOGAF alignment: ~85%.** Strong coverage. Main enhancements: make Architecture Contracts and Security Architecture more explicit.

### 7.2 BIZBOK Alignment

| BIZBOK Concept | Current Coverage | Assessment |
|---------------|-----------------|------------|
| Business Capability Mapping | Cap 8 (Capability Definition) | **Covered** |
| Value Streams | Cap 7 (Strategic Value Driver Definition) | **Partially covered** |
| Organisation Mapping | Cap 9 (Process Modelling – includes organisational aspects) | **Partially covered** |
| Information Mapping | Cap 13 (Business Object Modelling) | **Covered** |
| Strategy Mapping | Cap 1 (Architecture Vision Development – strategy alignment) | **Covered** |
| Initiative Mapping | Cap 2 (Architecture Roadmap Development), Cap 3 (Transformation Planning) | **Covered** |
| Stakeholder Mapping | Cap 26 (Stakeholder Management) | **Covered** |

**Overall BIZBOK alignment: ~80%.** Good coverage for an EA capability model. Value stream mapping could be more explicit.

### 7.3 DAMA-DMBOK Alignment

| DAMA-DMBOK Area | Current Coverage | Assessment |
|----------------|-----------------|------------|
| Data Governance | Not explicitly covered as standalone | **Gap** – could be addressed in Cap 14 or Cap 27 |
| Data Architecture | Cap 14 (Data Architecture Modelling) | **Covered** |
| Data Modelling & Design | Cap 13 (Business Object Modelling), Cap 14 (Data Architecture Modelling) | **Covered** |
| Data Integration & Interoperability | Cap 15 (Data Flow Modelling), Cap 12 (Integration Architecture Modelling) | **Covered** |
| Reference & Master Data | Partially in Cap 13 | **Partial** |
| Data Warehousing & BI | Not explicitly covered | **Gap** at EA level (may be out of scope) |
| Metadata Management | Partially in Cap 20 (Data Gathering & Data Quality) | **Partial** |
| Data Quality | Cap 20 (Data Gathering & Data Quality) | **Covered** |

**Overall DAMA alignment: ~70%.** Appropriate for an EA-level model. Data governance and metadata management could be strengthened.

### 7.4 Gartner EA Alignment

Gartner emphasises four key EA practices:

| Gartner Practice | Coverage | Assessment |
|-----------------|----------|------------|
| EA as Strategy Execution | Cap 1 (Vision), Cap 2 (Roadmap), Cap 3 (Transformation Planning) | **Good** |
| EA as Technology Optimisation | Cap 6 (New Technology Evaluation), Caps 16–18 (Technology Architecture) | **Good** |
| EA as Business Transformation | Cap 7 (Value Drivers), Cap 8 (Capability Definition), Cap 9 (Process Modelling) | **Good** |
| EA as Information/Data-centric | Cap 13–15 (Data Architecture domain) | **Good** |
| EA Value Delivery | Cap 23 (EA Performance Management) | **Covered** |

---

## 8. Recommendations Summary

### Priority 1 – Overview Improvements

| # | Recommendation | Effort |
|---|---------------|--------|
| R1 | Add Purpose, Scope, and Audience section to overview | Low |
| R2 | Add Domain Relationship diagram/description to overview | Low |
| R3 | Add Version, Date, Owner metadata to overview | Low |
| R4 | Add Glossary (key terms used across capabilities) | Medium |

### Priority 2 – Content Improvements

| # | Recommendation | Effort |
|---|---------------|--------|
| R5 | Consider adding Security Architecture as cross-cutting concern or dedicated capability | Medium |
| R6 | Strengthen Architecture Decision Management (in Cap 27 or ARB) | Low |
| R7 | Ensure RACI annotations are consistent across all capability files | Low |
| R8 | Clarify overlap boundaries for Cap 1/2, Cap 4/5, Cap 27/30 | Low |
| R9 | Add cross-capability dependency references | Medium |
| R10 | Finalise draft status on Cap 18 and Cap 19 | Low |

### Priority 3 – Future Enhancements

| # | Recommendation | Effort |
|---|---------------|--------|
| R11 | Consider Platform Architecture capability as technology evolves | Low |
| R12 | Embed sustainability as cross-cutting concern (Caps 16, 23, 27) | Low |
| R13 | Make Architecture Contracts more explicit (expand ARB) | Low |
| R14 | Strengthen data governance coverage (Cap 14 or new) | Medium |
| R15 | Add "How to Use This Model" guidance with prioritisation tiers | Medium |

---

## Appendix: Capability Quick Reference

| # | Capability | Domain |
|---|-----------|--------|
| 1 | Architecture Vision Development | Architecture Development – Common |
| 2 | Architecture Roadmap Development | Architecture Development – Common |
| 3 | Transformation Planning | Architecture Development – Common |
| 4 | Architecture Requirements Management | Architecture Development – Common |
| 5 | Architecture View Creation | Architecture Development – Common |
| 6 | New Technology Evaluation | Architecture Development – Common |
| 7 | Strategic Value Driver Definition | Business Architecture |
| 8 | Capability Definition | Business Architecture |
| 9 | Process Modelling | Business Architecture |
| 10 | Architecture Validation | Application Architecture |
| 11 | Application / Solution Architecture Modelling | Application Architecture |
| 12 | Integration Architecture Modelling | Application Architecture |
| 13 | Business Object Modelling | Data Architecture |
| 14 | Data Architecture Modelling | Data Architecture |
| 15 | Data Flow Modelling | Data Architecture |
| 16 | System Architecture Modelling | Technology Architecture |
| 17 | Network Architecture Modelling | Technology Architecture |
| 18 | Virtualization Architecture Modelling *DRAFT* | Technology Architecture |
| 19 | Dashboards, Views, Reports *DRAFT* | Architecture Repository |
| 20 | Data Gathering & Data Quality | Architecture Repository |
| 21 | Repository Support & Maintenance | Architecture Repository |
| 22 | Organisation Development | Architecture Management |
| 23 | EA Performance Management | Architecture Management |
| 24 | EA Process Development | Architecture Management |
| 25 | EA Knowledge Management | Architecture Management |
| 26 | Stakeholder Management | Architecture Management |
| 27 | Standards, Policies, Principles, Guidelines | Governance, Communication & Change |
| 28 | Architecture Training | Governance, Communication & Change |
| 29 | Communication & Change Management | Governance, Communication & Change |
| 30 | Architecture Compliance Evaluation | Governance, Communication & Change |
| — | Architecture Review Board (ARB) | Governance, Communication & Change |

---

*This review was conducted through analysis of the EA Capability Model against TOGAF ADM, TOGAF Architecture Capability Framework, Zachman Framework, FEAF, DoDAF, Gartner EA research, BIZBOK, DAMA-DMBOK, SABSA, ITIL, and CMMI/ACMM.*
