# Capability 15: Data Flow Modelling

**Domain:** Architecture Development – Data Architecture

**Tagline:** Map and optimize how data moves between systems, applications, and processes across the enterprise.

## Definition

Data Flow Modelling involves documenting and analyzing how data moves, transforms, and integrates across systems, applications, and business processes. It captures data sources, destinations, transformation logic, integration points, and dependencies.

## Objectives

Create comprehensive visibility of data lineages and movement across the enterprise and beyond to support integration planning, impact analysis, and data governance. Identify data transformation requirements, integration patterns, and dependencies. Enable effective troubleshooting and optimization of data flows.

## Tasks

1. **Identify data sources and destinations** across systems, applications, and external partners.
2. **Document data flows and transformations** between systems, documenting how data moves from source to target.
3. **Define integration points and patterns** (e.g., real-time, batch, API, ETL/ELT, messaging).
4. **Establish data lineage** showing origin, movement, and transformation of data throughout lifecycle (esp. regulatory or business-critical data).
5. **Identify dependencies and impacts** - what happens if a data source or flow is changed or unavailable.
6. **Validate data flows** with stakeholders (data owners, integration architects, application teams).
7. **Maintain and update** data flow models as integrations evolve.

## Inputs

- Business processes and requirements
- Application architecture and integration landscape
- Data architecture models (logical/physical)
- Existing interface, API and integration documentation
- Data quality and governance requirements

## Outputs

- Data flow diagrams (context, detailed level)
- Data lineage documentation
- Data transformation, dependency and impact analysis
- Interface specifications.

## Roles

- Data Architect (A)
- Application Architect
- Data Owner/Steward
- Lead Enterprise Architect

## Common Issues with an Immature Capability

- Undocumented or poorly documented integrations.
- Lack of data lineage visibility, preventing impact analysis.
- Point-to-point integrations ("spaghetti"), less integration patterns or governance.
- Unknown data transformations, data quality and reconciliation problems.

## Pragmatic Approach – Essentials That Are Needed for Success

- Start with high-impact critical data flows that support key business processes.
- Use visual models (data flow diagrams) at different levels of detail.
- Document both the "what" and "how" - what data flows, and how it's transformed.
- Identify and standardize integration patterns - avoid point-to-point spaghetti.
- Link to business processes and applications to show business context and impact.
- Collaborate with integration and application teams.
- Perform impact analysis before making changes to data flows or integrations.

## Additional Information

- Data Flow Diagrams (DFD)
- TOGAF Data Architecture
- Data Lineage and Impact Analysis
