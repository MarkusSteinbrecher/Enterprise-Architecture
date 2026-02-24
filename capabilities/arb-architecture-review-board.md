# Architecture Review Board (ARB)

**Domain:** Governance

## Purpose

To serve as the formal governance body responsible for architecture oversight, review, and approval of significant architecture decisions, designs, exceptions, and changes, ensuring enterprise-wide architecture coherence and quality.

## Scope

- Architecture decision review and approval
- Architecture design review (significant / high-impact solutions)
- Standards exception and waiver governance
- Architecture dispute resolution
- Strategic architecture direction input

## Composition

| Role | Participation |
|------|--------------|
| Chief Architect (Chair) | Permanent member; chairs the ARB |
| Enterprise Architects | Permanent members |
| Domain Architects (Business, Application, Data, Technology) | Permanent members |
| Security Architect | Permanent member |
| Invited Solution Architects | Attend to present and defend designs |
| Business representatives | Attend for business-impacting decisions |
| CIO / CTO (Sponsor) | Executive sponsor; escalation point |

## Key Activities

- Review and approve/reject significant architecture decisions
- Review solution architectures for compliance with principles, standards, and target state
- Govern exception and waiver requests to architecture standards
- Resolve architecture disputes and conflicting recommendations
- Provide strategic input on architecture direction and priorities
- Review and approve architecture roadmap changes
- Review architecture compliance reports and findings
- Commission architecture assessments or reviews where needed
- Communicate ARB decisions and rationale

## Operating Model

| Aspect | Detail |
|--------|--------|
| Meeting frequency | Bi-weekly or monthly (based on demand) |
| Decision model | Consensus-seeking with Chair having final authority |
| Quorum | Minimum of Chair + 3 domain architects |
| Escalation path | CIO / CTO for strategic disputes |
| Decision record | All decisions documented as ADRs and communicated |

## Inputs

- Architecture decision proposals (ADRs for review)
- Solution architecture review submissions
- Exception / waiver requests
- Architecture compliance reports (Cap 28)
- Risk assessments (Cap 29)
- Architecture roadmap updates (Cap 5)

## Outputs / Deliverables

- ARB meeting minutes
- Decision records (approved, rejected, deferred with rationale)
- Review outcomes (pass, conditional pass, fail with findings)
- Exception / waiver approvals with conditions and expiry
- Action items and follow-ups
- ARB effectiveness reports

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal ARB; decisions made without governance |
| 2 | Repeatable | ARB established but meets irregularly; scope unclear |
| 3 | Defined | ARB has charter, regular cadence, and clear scope; decisions documented |
| 4 | Managed | ARB effective and respected; decisions drive architecture quality; backlog managed |
| 5 | Optimizing | ARB operates as a lightweight, high-value governance mechanism; adaptive cadence; decisions accelerate delivery |

## Key Metrics / KPIs

- Number of reviews conducted per period
- Review turnaround time (submission to decision)
- Decision outcomes distribution (approved, conditional, rejected, deferred)
- Number of exceptions / waivers granted and their status
- ARB member attendance and engagement
- Stakeholder satisfaction with ARB process
- Decision quality (reversal rate, escalation rate)

## Dependencies

- **Architecture Decision Management** (Cap 27) - ARB is the primary decision governance body
- **Architecture Compliance & Assurance** (Cap 28) - ARB governs compliance outcomes and exceptions
- **Architecture Principles & Standards** (Cap 6) - ARB enforces principles and standards
- **Risk & Technical Debt Management** (Cap 29) - ARB considers risk in decisions
- **EA Practice & Operating Model** (Cap 22) - ARB is part of the EA operating model

## Tools & Technologies

- ARB workflow and scheduling tools
- Decision record platforms (Confluence, Jira, ADR tools)
- Architecture presentation and modelling tools
- Meeting management tools (Teams, Zoom, calendar tools)
- ARB dashboard and metrics tracking
