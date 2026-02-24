# Capability 15: Data Analytics & BI Architecture

**Domain:** Data Architecture

## Purpose

To design the data integration, analytics, and business intelligence platforms and architectures that enable data-driven decision-making, self-service analytics, and advanced analytics capabilities across the enterprise.

## Scope

- Data integration architecture (ETL/ELT, streaming, batch)
- Data warehouse and data lake/lakehouse architecture
- Business intelligence and reporting architecture
- Advanced analytics and AI/ML platform architecture
- Self-service analytics enablement
- Data product design

## Key Activities

- Design data integration architecture (ETL/ELT pipelines, streaming, batch processing)
- Architect data warehouse, data lake, and data lakehouse platforms
- Design BI and reporting platform architecture
- Design advanced analytics and AI/ML platform architecture
- Enable self-service analytics and data democratization
- Define data product specifications and contracts
- Design real-time data streaming architectures
- Define data virtualization and federation approaches
- Establish data pipeline monitoring and observability
- Evaluate and select analytics platform technologies

## Inputs

- Business intelligence and analytics requirements
- Data models and data catalog (Cap 13)
- Data governance policies (Cap 14)
- Technology standards (Cap 6)
- Data source inventory
- Performance, scalability, and cost requirements

## Outputs / Deliverables

- Data integration architecture
- Data warehouse / data lake / lakehouse architecture
- BI and reporting platform architecture
- Analytics platform architecture (including AI/ML)
- Data pipeline designs
- Data flow diagrams
- Data product specifications
- Self-service analytics guidelines

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Data Architect | Leads analytics architecture design |
| Data Engineer | Designs and builds data pipelines |
| BI / Analytics Architect | Designs BI platform and reporting architecture |
| Data Scientist / ML Engineer | Provides AI/ML platform requirements |
| Analytics Product Owner | Defines analytics use cases and priorities |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Manual data extracts; siloed reporting; no central analytics platform |
| 2 | Repeatable | Basic ETL processes; centralized data warehouse; standard BI tool |
| 3 | Defined | Modern data platform (lake/lakehouse); standard integration patterns; self-service BI enabled |
| 4 | Managed | Data products defined; AI/ML platform operational; pipeline quality monitored |
| 5 | Optimizing | Real-time analytics; data mesh / data products at scale; AI/ML embedded in operations |

## Key Metrics / KPIs

- Data pipeline reliability (success rate, SLA adherence)
- Data latency (time from source to analytics availability)
- Analytics platform adoption rate
- Self-service analytics usage (% of users self-serving)
- Number of data products published
- AI/ML model deployment count and performance

## Dependencies

- **Data Modelling & Management** (Cap 13) - Data models inform analytics design
- **Data Governance & Quality** (Cap 14) - Governance ensures quality data for analytics
- **Application Integration & API Management** (Cap 11) - Data integration aligned with app integration
- **Infrastructure & Cloud Architecture** (Cap 16) - Analytics platforms hosted on infrastructure
- **Innovation & Technology Radar** (Cap 25) - AI/ML and emerging analytics capabilities

## Tools & Technologies

- ETL/ELT tools (dbt, Informatica, Talend, Fivetran)
- Data platforms (Snowflake, Databricks, BigQuery, Azure Synapse, AWS Redshift)
- Streaming platforms (Apache Kafka, Flink, Spark Streaming)
- BI tools (Tableau, Power BI, Looker, Qlik)
- AI/ML platforms (SageMaker, Vertex AI, Databricks ML, MLflow)
- Data catalog and lineage tools
