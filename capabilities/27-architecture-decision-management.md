# Capability 27: Architecture Decision Management

**Domain:** Governance

## Purpose

To systematically capture, track, govern, and communicate architecture decisions and their rationale, ensuring decisions are transparent, traceable, consistent with principles and standards, and revisitable when context changes.

## Scope

- Architecture decision capture and documentation (ADRs)
- Decision governance process (proposal, review, approval, appeal)
- Decision tracking and lifecycle management
- Decision impact analysis
- Decision communication and transparency

## Key Activities

- Define the architecture decision management process (proposal → review → decision → communication)
- Capture architecture decisions using Architecture Decision Records (ADRs)
- Document decision context, options considered, rationale, and consequences
- Govern decisions through the Architecture Review Board (ARB) or delegated authority
- Assess the impact of proposed decisions across architecture domains
- Track decision status and lifecycle (proposed, accepted, deprecated, superseded)
- Ensure decisions are consistent with architecture principles and standards (Cap 6)
- Communicate decisions to affected stakeholders
- Review and revisit decisions when context changes
- Maintain a searchable decision log / register

## Inputs

- Architecture proposals and design documents
- Architecture principles and standards (Cap 6)
- Impact analysis from domain architects
- Stakeholder concerns and requirements
- Risk assessments (Cap 29)
- Target state architecture (Cap 4)

## Outputs / Deliverables

- Architecture Decision Records (ADRs)
- Decision log / register
- Decision impact assessments
- Decision governance process documentation
- Decision communication notices
- Decision review reports

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Architecture Review Board (ARB) | Reviews and approves significant architecture decisions |
| Chief Architect | Approves strategic-level decisions |
| Enterprise Architect | Manages decision process and ADR quality |
| Solution Architects | Propose decisions and document ADRs |
| Domain Architects | Assess domain-specific impacts |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Decisions made informally; no documentation; rationale lost over time |
| 2 | Repeatable | Some decisions documented; ADRs used for major decisions |
| 3 | Defined | Formal decision governance process; ADRs standard practice; decision register maintained |
| 4 | Managed | All significant decisions tracked with ADRs; impact analysis required; decisions communicated systematically |
| 5 | Optimizing | Decision analytics (patterns, velocity, quality); automated impact analysis; decision knowledge base |

## Key Metrics / KPIs

- Number of ADRs created per period
- Decision cycle time (proposal to approval)
- Percentage of significant decisions with ADRs
- Decision reversal / supersede rate
- Decision compliance with principles and standards
- Stakeholder awareness of decisions

## Dependencies

- **Architecture Principles & Standards** (Cap 6) - Decisions assessed against principles
- **Architecture Compliance & Assurance** (Cap 28) - Decisions enforced through compliance
- **Architecture Review Board** (ARB) - ARB governs decision approvals
- **Risk & Technical Debt Management** (Cap 29) - Risk assessment informs decisions
- **Architecture Content Management** (Cap 20) - ADRs stored in the architecture repository
- **Target State Design** (Cap 4) - Target state context for decisions

## Tools & Technologies

- ADR management tools (adr-tools, Log4brains, Markdown in Git)
- Architecture governance platforms
- Decision registers and tracking tools (Jira, Confluence)
- Architecture modelling tools (for impact analysis)
- Collaboration platforms for decision reviews
