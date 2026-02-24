# Capability 2: Requirements Management

**Domain:** Architecture Development - Common

## Purpose

To systematically elicit, document, analyze, prioritize, and manage architecture requirements — including functional requirements, non-functional requirements (quality attributes), constraints, and assumptions — ensuring traceability from business needs to architecture decisions.

## Scope

- Architecture requirement elicitation and documentation
- Functional and non-functional requirement management
- Constraint and assumption tracking
- Traceability between requirements and architecture artifacts
- Requirement change control

## Key Activities

- Elicit requirements through stakeholder interviews, workshops, and document analysis
- Classify requirements (functional, non-functional, constraints, assumptions)
- Document requirements using standard templates
- Prioritize requirements (e.g., MoSCoW, weighted scoring)
- Establish traceability between requirements and architecture decisions/artifacts
- Manage requirement changes through a controlled process
- Validate requirements with stakeholders
- Resolve conflicting requirements

## Inputs

- Stakeholder concerns and viewpoints
- Business strategy and objectives
- Regulatory and compliance requirements
- Existing system documentation
- Industry standards and benchmarks

## Outputs / Deliverables

- Architecture requirements specification
- Requirements traceability matrix
- Non-functional requirements (NFR) catalog
- Constraints and assumptions register
- Requirements change log

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Defines architecture-level requirements |
| Business Analyst | Elicits and documents detailed requirements |
| Solution Architect | Translates requirements into solution-level specs |
| Domain Architects | Define domain-specific requirements |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Requirements gathered informally; no traceability |
| 2 | Repeatable | Requirements documented per project; basic templates used |
| 3 | Defined | Standard requirements process; traceability matrix maintained; NFR catalog exists |
| 4 | Managed | Requirements actively managed with change control; coverage and quality metrics tracked |
| 5 | Optimizing | Requirements reuse across initiatives; automated traceability; predictive impact analysis |

## Key Metrics / KPIs

- Percentage of requirements with traceability to architecture artifacts
- Requirements change rate
- Number of unresolved requirement conflicts
- Requirements coverage (% of stakeholder concerns addressed)
- NFR compliance rate in delivered solutions

## Dependencies

- **Stakeholder Management** (Cap 1) - Requirements derived from stakeholder concerns
- **Current State Assessment** (Cap 3) - Current state informs gap-based requirements
- **Target State Design** (Cap 4) - Requirements drive target state definition
- **Architecture Compliance & Assurance** (Cap 28) - Requirements validated during compliance checks

## Tools & Technologies

- Requirements management tools (Jira, DOORS, Azure DevOps)
- Traceability matrices (spreadsheets, dedicated tools)
- Workshop and collaboration tools
- Quality attribute workshop (QAW) techniques
