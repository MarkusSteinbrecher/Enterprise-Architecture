# Capability 20: Data Gathering & Data Quality

**Domain:** Architecture Repository

**Tagline:** Ensure architecture decisions are based on reliable, complete and up-to-date data.

## Definition

Establishing and operating processes to systematically collect, validate and maintain architecture data across the organization, ensuring a high level of data quality, completeness and consistency in the architecture repository.

## Objectives

Ensure that the architecture repository contains accurate, complete and current data as the foundation for all architecture activities. Define clear data ownership, collection processes and quality standards. Minimize manual data gathering effort through integration with existing data sources.

## Tasks

1. **Define the data scope and data model** for the architecture repository (what entities, attributes and relationships are needed).
2. **Identify and connect data sources** (e.g. CMDB, ITSM, HR systems, project portfolio tools).
3. **Establish data collection processes** – automated feeds where possible, structured manual input where necessary.
4. **Define data quality rules,** validation checks and quality KPIs (e.g. completeness, accuracy, timeliness).
5. **Assign data owners and stewards** responsible for maintaining data in their domain.
6. **Conduct regular data quality reviews** and remediation cycles.

## Inputs

- EA data model and repository structure
- Existing data sources (CMDB, ITSM, PPM, HR, etc.)
- Data quality requirements from stakeholders
- Architecture governance policies

## Outputs

- Populated and up-to-date architecture repository
- Data quality reports and scorecards
- Data ownership matrix
- Documented data collection processes and integration interfaces

## Roles

- EA Repository Manager / EA Analyst (R)
- Lead Enterprise Architect (A)
- Data Owners / Stewards (C)
- Domain Architects (C)

## Common Issues with an Immature Capability

- Repository data is outdated, incomplete or inconsistent because no one owns it.
- Data is gathered manually via spreadsheets, leading to high effort and errors.
- No clear definition of what data is needed, resulting in either too much noise or critical gaps.

## Pragmatic Approach – Essentials That Are Needed for Success

- Start small – focus on the data needed for your top 3–5 dashboards and views first.
- Assign clear data owners – without ownership, data quality will always degrade.
- Automate data feeds from existing sources (CMDB, ITSM) before asking people to fill in data manually.
- Establish a simple quality rhythm: quarterly reviews with data owners to validate and refresh.

## Additional Information

- TOGAF Architecture Repository
- DMBOK – Data Quality Management
- Integration patterns (API, ETL, manual import)
