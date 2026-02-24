# Capability 3: Current State Assessment

**Domain:** Architecture Development - Common

## Purpose

To systematically document, analyze, and assess the existing ("as-is") architecture landscape across business, application, data, and technology domains, establishing a reliable baseline for gap analysis and target state planning.

## Scope

- Discovery and inventory of current architecture components
- Assessment of current state health, fitness, and alignment
- Technical debt identification
- Dependency and impact analysis
- Baseline documentation

## Key Activities

- Discover and inventory existing architecture components (applications, data stores, infrastructure, business processes)
- Assess current state against business objectives and strategy alignment
- Identify and classify technical debt
- Map dependencies across architecture layers
- Conduct health checks and fitness assessments (e.g., application health scoring)
- Document the baseline architecture using standard models and notations
- Perform SWOT analysis of current architecture
- Identify risks, bottlenecks, and pain points

## Inputs

- Existing documentation, system inventories, and CMDBs
- Application and technology portfolios
- Business process documentation
- Monitoring, performance, and operational data
- Stakeholder interviews and surveys

## Outputs / Deliverables

- Current state architecture models (baseline)
- Architecture inventory / catalog (applications, data, technology, business capabilities)
- Technical debt register
- Dependency maps
- SWOT / fitness assessment reports
- Baseline architecture document

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Leads current state assessment across domains |
| Domain Architects | Assess their specific domains (business, app, data, tech) |
| Solution Architects | Provide solution-level current state input |
| IT Operations | Provide operational data and infrastructure details |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal baseline; knowledge is tribal and fragmented |
| 2 | Repeatable | Partial inventories maintained; assessments done per project |
| 3 | Defined | Comprehensive baseline documented across domains; regular assessment cycles |
| 4 | Managed | Automated discovery tools in use; continuous baseline maintenance; technical debt actively tracked |
| 5 | Optimizing | Real-time architecture observability; predictive health analysis; automated drift detection |

## Key Metrics / KPIs

- Percentage of architecture landscape documented
- Baseline currency (time since last update)
- Number of identified technical debt items and severity distribution
- Assessment coverage across domains
- Accuracy of baseline (validated against actual state)

## Dependencies

- **Requirements Management** (Cap 2) - Current state informs requirement gaps
- **Target State Design** (Cap 4) - Current state is the starting point for target design
- **Gap Analysis & Roadmapping** (Cap 5) - Gap analysis compares current to target
- **Application Portfolio Management** (Cap 10) - Application portfolio is part of current state
- **Risk & Technical Debt Management** (Cap 29) - Current state assessment feeds risk identification

## Tools & Technologies

- Discovery and inventory tools (ServiceNow, Device42)
- Architecture modelling tools (Archi, Sparx EA, LeanIX)
- CMDB and asset management tools
- Application portfolio analysis tools
- Monitoring and observability platforms
