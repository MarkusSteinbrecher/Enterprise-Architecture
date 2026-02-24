# Capability 28: Architecture Compliance & Assurance

**Domain:** Governance

## Purpose

To ensure that architecture deliverables, solution designs, and implementations comply with defined architecture principles, standards, and policies, providing ongoing assurance through reviews, checks, and monitoring.

## Scope

- Architecture review processes (design reviews, solution reviews)
- Compliance assessment and auditing
- Architecture fitness functions and automated checks
- Non-compliance management and remediation
- Exception and waiver governance

## Key Activities

- Define and operate architecture review processes (gate reviews, design reviews, compliance reviews)
- Conduct solution architecture reviews against principles and standards
- Implement architecture fitness functions for automated compliance checking
- Assess compliance of implementations against approved designs
- Identify and track non-compliance items with remediation plans
- Manage exceptions and waivers (request, review, approve, track, expire)
- Map architecture compliance to regulatory requirements
- Report on compliance metrics and trends
- Conduct periodic architecture audits
- Provide feedback to improve standards based on compliance findings

## Inputs

- Architecture principles and standards (Cap 6)
- Solution architecture designs (Cap 12)
- Architecture decisions (Cap 27)
- Implementation artifacts (code, configurations, deployments)
- Regulatory requirements
- Previous compliance findings

## Outputs / Deliverables

- Architecture review reports (pass, conditional, fail)
- Compliance assessment reports
- Non-compliance register with remediation plans
- Exception / waiver register
- Compliance metrics dashboards
- Architecture audit reports
- Fitness function results

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Leads compliance assessments and reviews |
| Architecture Review Board | Governs review outcomes and exceptions |
| Solution Architects | Submit designs for review; remediate findings |
| Domain Architects | Conduct domain-specific compliance reviews |
| Compliance / Audit teams | Support regulatory compliance mapping |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal architecture reviews or compliance checks; standards exist but are not enforced |
| 2 | Repeatable | Ad-hoc reviews for major projects; basic checklists used |
| 3 | Defined | Formal review process; regular compliance assessments; non-compliance tracked |
| 4 | Managed | Reviews integrated into delivery lifecycle; fitness functions operational; exception process active |
| 5 | Optimizing | Automated compliance checking (fitness functions, CI/CD integration); continuous assurance; proactive compliance |

## Key Metrics / KPIs

- Number of architecture reviews conducted per period
- Review cycle time (submission to decision)
- Review pass / conditional / fail rate
- Non-compliance count and severity distribution
- Remediation time for non-compliance items
- Number of active exceptions / waivers
- Fitness function coverage and pass rate

## Dependencies

- **Architecture Principles & Standards** (Cap 6) - Standards are the basis for compliance
- **Architecture Decision Management** (Cap 27) - Decisions enforced through compliance
- **Solution Design & Patterns** (Cap 12) - Solutions reviewed for compliance
- **Risk & Technical Debt Management** (Cap 29) - Non-compliance creates risk
- **Architecture Review Board** (ARB) - ARB governs reviews and exceptions
- **EA Value Management** (Cap 23) - Compliance results demonstrate governance value

## Tools & Technologies

- Architecture review workflow tools (Jira, ServiceNow)
- Architecture fitness function tools (ArchUnit, Structure101, custom scripts)
- Compliance scanning tools
- GRC platforms (ServiceNow GRC, RSA Archer)
- Review templates and checklists
- CI/CD integration for automated checks
