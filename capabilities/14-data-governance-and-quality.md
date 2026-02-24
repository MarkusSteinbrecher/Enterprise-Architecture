# Capability 14: Data Governance & Quality

**Domain:** Data Architecture

## Purpose

To establish and operate policies, standards, roles, and processes that ensure data quality, security, privacy, ownership, and accountability across the enterprise, treating data as a strategic asset.

## Scope

- Data governance framework and operating model
- Data ownership and stewardship
- Data quality management
- Data classification and sensitivity
- Data privacy and protection (GDPR, CCPA, etc.)
- Data lifecycle policies

## Key Activities

- Define and operate a data governance framework and charter
- Assign data ownership and stewardship (per domain / entity)
- Establish a data governance board / council
- Define and enforce data quality rules and standards
- Implement data quality profiling, cleansing, and monitoring
- Classify data by sensitivity and criticality
- Define and enforce data privacy and protection policies (GDPR, CCPA compliance)
- Manage data lifecycle policies (retention, archival, deletion)
- Track data lineage and provenance
- Define and manage master data governance
- Report on data governance metrics and health

## Inputs

- Regulatory and compliance requirements (GDPR, CCPA, industry-specific)
- Business data requirements
- Data architecture and models (Cap 13)
- Data quality assessments and profiling results
- Industry data governance frameworks (DAMA-DMBOK)
- Architecture principles and standards (Cap 6)

## Outputs / Deliverables

- Data governance framework and charter
- Data policies and standards
- Data ownership / stewardship matrix (RACI)
- Data quality reports and dashboards
- Data classification scheme
- Data lifecycle policies
- Data privacy impact assessments (DPIAs)
- Master data governance processes
- Data lineage documentation

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Chief Data Officer / Data Governance Lead | Leads the data governance program |
| Data Stewards | Own data quality and definitions within their domain |
| Data Architect | Provides architectural guidance on data governance |
| Data Quality Analyst | Profiles and monitors data quality |
| Privacy Officer / DPO | Ensures data privacy compliance |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal data governance; data quality is inconsistent and unmanaged |
| 2 | Repeatable | Basic data policies exist; data ownership partially assigned for key systems |
| 3 | Defined | Formal governance framework operational; data stewards active; quality measured and reported |
| 4 | Managed | Data governance board operational; policies enforced; quality improving; privacy compliance demonstrated |
| 5 | Optimizing | Automated data quality management; proactive governance; data-driven culture; continuous compliance |

## Key Metrics / KPIs

- Data quality scores (accuracy, completeness, timeliness, consistency)
- Percentage of data assets with assigned ownership
- Data policy compliance rate
- Number of data-related incidents / breaches
- Regulatory compliance audit results
- Data catalog adoption rate
- Data governance maturity score

## Dependencies

- **Data Modelling & Management** (Cap 13) - Governance policies applied through data models
- **Data Analytics & BI Architecture** (Cap 15) - Governance ensures quality data for analytics
- **Security & Compliance Architecture** (Cap 17) - Data classification informs security controls
- **Architecture Compliance & Assurance** (Cap 28) - Data governance supports compliance assurance
- **Risk & Technical Debt Management** (Cap 29) - Data risks managed through governance

## Tools & Technologies

- Data governance platforms (Collibra, Alation, Informatica Axon)
- Data quality tools (Informatica Data Quality, Great Expectations, Soda)
- Data catalog tools (Alation, Collibra, Apache Atlas)
- Data lineage tools (MANTA, Atlan)
- Privacy management tools (OneTrust, BigID)
