# Capability 21: Reference Architecture Library

**Domain:** Architecture Repository

## Purpose

To maintain a curated library of reference architectures, reusable building blocks, and proven patterns that accelerate solution delivery, ensure consistency, and embody architecture standards and best practices.

## Scope

- Reference architecture creation and maintenance
- Architecture building block management (ABBs and SBBs)
- Pattern library curation
- Reuse governance and promotion
- Alignment with industry reference architectures

## Key Activities

- Create and maintain reference architectures for common solution patterns (e.g., microservices, event-driven, data lake, API platform)
- Define and catalog architecture building blocks (ABBs — specification-level; SBBs — implementation-level)
- Curate and maintain a pattern library (design patterns, integration patterns, security patterns)
- Promote reuse of reference architectures and building blocks across projects
- Align internal reference architectures with industry references (cloud provider references, TOGAF foundation architectures)
- Govern the lifecycle of reference architectures (create, review, publish, update, retire)
- Assess and measure reuse of library assets
- Collect feedback from project teams to improve reference architectures

## Inputs

- Architecture principles and standards (Cap 6)
- Proven solution designs from completed projects (Cap 12)
- Industry reference architectures and cloud provider patterns
- Innovation and emerging technology assessments (Cap 25)
- Architecture review feedback

## Outputs / Deliverables

- Reference architecture documents and diagrams
- Architecture Building Block (ABB) catalog
- Solution Building Block (SBB) catalog
- Pattern library (design, integration, security, data patterns)
- Reuse guidelines and adoption guides
- Reference architecture lifecycle register

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Curates and governs the reference architecture library |
| Domain Architects | Create domain-specific reference architectures |
| Solution Architects | Consume and contribute to the library from project work |
| Architecture Manager | Oversees reuse promotion and library governance |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No reference architectures; each project starts from scratch |
| 2 | Repeatable | A few reference architectures created for common scenarios; informal reuse |
| 3 | Defined | Curated library of reference architectures and building blocks; published and accessible |
| 4 | Managed | Reuse actively tracked and promoted; library regularly updated; project feedback incorporated |
| 5 | Optimizing | Self-service reference architecture templates; automated scaffolding; community-driven contributions |

## Key Metrics / KPIs

- Number of reference architectures in the library
- Reuse rate (% of projects using reference architectures)
- Library currency (time since last update per reference architecture)
- Time-to-solution (reduction due to reuse)
- Contributor count (architects contributing to library)
- Stakeholder satisfaction with library usefulness

## Dependencies

- **Architecture Principles & Standards** (Cap 6) - Reference architectures embody standards
- **Solution Design & Patterns** (Cap 12) - Proven designs feed the library; library guides new designs
- **Architecture Content Management** (Cap 20) - Library stored and managed in the repository
- **Metamodel & Taxonomy Management** (Cap 19) - Library organized according to metamodel
- **Innovation & Technology Radar** (Cap 25) - Emerging technology drives new reference architectures

## Tools & Technologies

- Architecture repository and wiki platforms
- Architecture modelling tools
- Code and template repositories (GitHub/GitLab for infrastructure and application templates)
- Cloud provider reference architecture resources (AWS, Azure, GCP)
- Internal developer portal (Backstage)
