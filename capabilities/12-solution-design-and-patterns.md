# Capability 12: Solution Design & Patterns

**Domain:** Application Architecture

## Purpose

To create well-architected solution designs and maintain a catalog of reusable design patterns, ensuring applications are scalable, maintainable, secure, and aligned with enterprise architecture standards.

## Scope

- Solution architecture design for projects and programs
- Design pattern definition and catalog management
- Technology stack selection guidance
- Non-functional requirement realization
- Solution architecture review

## Key Activities

- Create solution architecture designs for projects (spanning business, app, data, tech layers)
- Define and maintain a catalog of reusable design patterns (architectural, integration, security, data)
- Guide technology stack selection aligned with standards (Cap 6)
- Realize non-functional requirements (performance, scalability, availability, security) in solution designs
- Apply cloud-native and modern design patterns (microservices, serverless, event-driven)
- Conduct solution architecture reviews (peer review, ARB review)
- Document solution architecture decisions (ADRs)
- Define deployment and DevOps architecture patterns
- Promote reuse of patterns and building blocks across solutions
- Bridge enterprise architecture guidance to delivery teams

## Inputs

- Architecture requirements (functional and non-functional) (Cap 2)
- Architecture principles and standards (Cap 6)
- Reference architecture library (Cap 21)
- Integration patterns (Cap 11)
- Security architecture patterns (Cap 17)
- Application portfolio context (Cap 10)

## Outputs / Deliverables

- Solution architecture documents
- Design pattern catalog
- Technology stack recommendations
- Non-functional requirements realization documentation
- Solution ADRs (Architecture Decision Records)
- Deployment architecture diagrams
- Solution architecture review reports

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Solution Architect | Creates solution-level architecture designs |
| Application Architect | Defines application design patterns |
| Enterprise Architect | Ensures alignment with enterprise standards |
| Tech Lead / Lead Developer | Implements and validates design patterns |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No standard solution design process; ad-hoc patterns |
| 2 | Repeatable | Basic design patterns used; some solution architecture documents produced |
| 3 | Defined | Standard solution design process; pattern catalog maintained; solution reviews conducted |
| 4 | Managed | Consistent solution architecture quality; pattern reuse tracked; design quality metrics measured |
| 5 | Optimizing | Self-service solution templates; automated design validation; pattern library continuously evolved |

## Key Metrics / KPIs

- Solution architecture review pass rate
- Design pattern reuse rate
- Number of patterns in catalog
- Architecture standards compliance rate in solutions
- NFR compliance rate in delivered solutions
- Solution architecture coverage (% of projects with solution architecture)

## Dependencies

- **Application Portfolio Management** (Cap 10) - Solutions contribute to the portfolio
- **Application Integration & API Management** (Cap 11) - Integration patterns used in designs
- **Security & Compliance Architecture** (Cap 17) - Security patterns embedded in designs
- **Architecture Principles & Standards** (Cap 6) - Standards guide solution design
- **Reference Architecture Library** (Cap 21) - Reference architectures guide solution designs
- **Architecture Decision Management** (Cap 27) - Solution decisions documented and governed

## Tools & Technologies

- Architecture modelling tools (C4 model, UML, Sparx EA)
- Diagramming tools (draw.io, Lucidchart, Miro)
- Pattern catalogs and documentation platforms
- Code analysis and architecture conformance tools (ArchUnit, Structure101)
- Cloud architecture design tools (AWS Well-Architected Tool, Azure Advisor)
