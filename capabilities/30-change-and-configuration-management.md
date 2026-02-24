# Capability 30: Change & Configuration Management

**Domain:** Governance

## Purpose

To manage changes to architecture baselines, configurations, and artifacts through a controlled process, ensuring architecture integrity is maintained and changes are assessed for impact, approved, communicated, and tracked.

## Scope

- Architecture change request management
- Architecture baseline management and versioning
- Change impact assessment across architecture domains
- Configuration management of architecture artifacts
- Post-implementation review of architecture changes

## Key Activities

- Define and operate an architecture change management process
- Manage architecture change requests (submit, assess, approve, implement, close)
- Assess the cross-domain impact of proposed architecture changes
- Maintain architecture baselines and version history
- Manage configuration of architecture artifacts (models, documents, decisions)
- Coordinate architecture changes with IT change management (ITIL CAB)
- Track change implementation status
- Conduct post-implementation reviews of architecture changes
- Manage emergency architecture change procedures
- Communicate changes to affected stakeholders
- Maintain architecture change calendar

## Inputs

- Architecture change requests (from projects, strategy changes, incidents)
- Architecture baselines and current state (Cap 3)
- Stakeholder impact analysis
- Risk assessments (Cap 29)
- Roadmap and transition plans (Cap 5)
- Architecture review outcomes (Cap 28)

## Outputs / Deliverables

- Change request log / register
- Change impact assessment reports
- Updated architecture baselines
- Architecture version history
- Post-implementation review reports
- Change metrics and reports
- Change calendar
- Change communication notices

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Leads architecture change assessment and approval |
| Architecture Manager | Manages change process and configuration |
| Domain Architects | Assess domain-specific change impacts |
| Solution Architects | Submit and implement changes |
| Change Manager / CAB | Coordinates with IT change management |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Architecture changes uncontrolled; no versioning or baselines |
| 2 | Repeatable | Basic change tracking for major changes; architecture versions maintained informally |
| 3 | Defined | Formal change management process; baselines maintained; impact assessment standard |
| 4 | Managed | Change governance active; cross-domain impact analysis; all changes tracked; post-implementation reviews |
| 5 | Optimizing | Automated impact analysis; continuous change flow; architecture drift detected and managed automatically |

## Key Metrics / KPIs

- Number of architecture changes per period
- Change approval cycle time
- Change success rate (implemented without issues)
- Emergency change rate (lower is better)
- Architecture baseline currency
- Architecture drift incidents
- Post-implementation review completion rate

## Dependencies

- **Current State Assessment** (Cap 3) - Baseline updated after changes
- **Gap Analysis & Roadmapping** (Cap 5) - Roadmap changes managed through change control
- **Risk & Technical Debt Management** (Cap 29) - Changes assessed for risk impact
- **Architecture Compliance & Assurance** (Cap 28) - Significant changes reviewed for compliance
- **Architecture Decision Management** (Cap 27) - Change decisions documented as ADRs
- **Architecture Communication & Engagement** (Cap 26) - Changes communicated to stakeholders

## Tools & Technologies

- Change management tools (ServiceNow, Jira)
- Configuration management and versioning tools (Git, Confluence versioning)
- Architecture modelling tools (for impact visualization and baseline management)
- ITIL change management platforms
- Impact analysis tools
