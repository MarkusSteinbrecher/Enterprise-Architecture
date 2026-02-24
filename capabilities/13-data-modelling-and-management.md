# Capability 13: Data Modelling & Management

**Domain:** Data Architecture

## Purpose

To design and maintain data models at all levels of abstraction (conceptual, logical, physical) and to manage data assets across the enterprise, establishing a common data vocabulary and enabling effective data utilization.

## Scope

- Conceptual, logical, and physical data modelling
- Data dictionary and business glossary management
- Master data and reference data management
- Data asset inventory and cataloging
- Data lifecycle management

## Key Activities

- Create conceptual data models (business entities and high-level relationships)
- Develop logical data models (detailed attributes, keys, normalization, relationships)
- Design physical data models (database-specific schemas, partitioning, indexing)
- Maintain the enterprise data dictionary and business glossary
- Define and manage master data entities and reference data
- Catalog data assets and their lineage
- Manage data lifecycle (creation, storage, usage, archival, deletion/retention)
- Apply data modelling standards and naming conventions
- Perform data model reviews and validation
- Dimensional modelling for analytics (star/snowflake schemas)

## Inputs

- Business requirements and process definitions
- Existing data stores, schemas, and databases
- Data standards and naming conventions (Cap 6)
- Industry data models and standards
- Regulatory data requirements (GDPR, etc.)
- Business capability and value stream models (Caps 7, 8)

## Outputs / Deliverables

- Conceptual data models
- Logical data models
- Physical data models
- Enterprise data dictionary / business glossary
- Master data entity definitions
- Data asset catalog
- Data lineage documentation
- Dimensional models (for analytics use cases)

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Data Architect | Leads data modelling and data asset management |
| Data Modeller | Creates and maintains detailed data models |
| Data Steward | Owns data definitions and business glossary |
| Database Administrator | Implements physical data models |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal data models; data structures created ad-hoc per application |
| 2 | Repeatable | Key data entities modelled for major systems; basic data dictionary exists |
| 3 | Defined | Enterprise data model maintained; standard modelling practices and naming conventions applied |
| 4 | Managed | Data models actively govern schema changes; comprehensive data catalog; master data managed |
| 5 | Optimizing | Automated data model generation and validation; data catalog self-maintaining; data mesh principles applied |

## Key Metrics / KPIs

- Data model coverage (% of key entities modelled)
- Data dictionary completeness
- Data model currency (last update date)
- Number of data model violations / non-conformances
- Master data quality scores
- Data asset catalog completeness

## Dependencies

- **Data Governance & Quality** (Cap 14) - Data models support governance policies
- **Data Analytics & BI Architecture** (Cap 15) - Models inform analytics design
- **Solution Design & Patterns** (Cap 12) - Data models influence application data layers
- **Architecture Content Management** (Cap 20) - Data models stored in architecture repository
- **Application Integration & API Management** (Cap 11) - Data contracts for integration

## Tools & Technologies

- Data modelling tools (ERwin, PowerDesigner, dbdiagram.io, SqlDBM)
- Data catalog tools (Alation, Collibra, Apache Atlas)
- Master data management platforms (Informatica MDM, Reltio)
- Data dictionary management tools
- Data lineage tools (MANTA, Atlan)
