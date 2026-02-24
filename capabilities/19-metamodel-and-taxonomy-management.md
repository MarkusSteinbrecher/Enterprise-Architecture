# Capability 19: Metamodel & Taxonomy Management

**Domain:** Architecture Repository

## Purpose

To define and maintain the architecture metamodel (the "model of models") and classification schemes (taxonomies) that provide a common structure, vocabulary, and framework for all architecture content, ensuring consistency and interoperability across architecture artifacts.

## Scope

- Architecture metamodel definition and governance
- Taxonomy and classification scheme management
- Viewpoint and view definitions
- Architecture language and notation standards
- Metamodel alignment with frameworks (TOGAF, ArchiMate)

## Key Activities

- Define and maintain the enterprise architecture metamodel (entities, relationships, attributes)
- Establish and govern taxonomies and classification schemes for architecture artifacts
- Define architecture viewpoints and views for different stakeholder audiences
- Select and standardize architecture modelling languages and notations (e.g., ArchiMate, UML, BPMN)
- Align metamodel with architecture frameworks (TOGAF Content Metamodel, ArchiMate)
- Govern metamodel changes through a controlled process
- Ensure tools and repositories conform to the metamodel
- Define naming conventions and controlled vocabularies
- Train architects on metamodel usage and standards

## Inputs

- Architecture framework selections (TOGAF, ArchiMate, etc.)
- Stakeholder viewpoint requirements
- Existing architecture content and models
- Industry metamodel standards
- Tool capabilities and constraints

## Outputs / Deliverables

- Enterprise architecture metamodel documentation
- Taxonomy and classification scheme documents
- Viewpoint catalog (stakeholder viewpoints and their content)
- Architecture language and notation standards
- Naming conventions and controlled vocabulary
- Metamodel governance process documentation

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Enterprise Architect | Leads metamodel definition and governance |
| Architecture Manager | Oversees metamodel adoption and compliance |
| Tool Administrator | Configures tools to conform to the metamodel |
| Domain Architects | Contribute domain-specific metamodel elements |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | No formal metamodel; architects use their own structures and vocabulary |
| 2 | Repeatable | Basic entity types and relationships defined; limited adoption |
| 3 | Defined | Enterprise metamodel documented; aligned with ArchiMate/TOGAF; tools configured to metamodel |
| 4 | Managed | Metamodel actively governed; changes controlled; consistent use across architecture team |
| 5 | Optimizing | Metamodel drives tool integration and automation; federated contributions; continuously refined |

## Key Metrics / KPIs

- Metamodel coverage (% of architecture content types defined)
- Metamodel conformance rate (% of artifacts conforming to metamodel)
- Taxonomy adoption rate
- Number of viewpoints defined and actively used
- Time since last metamodel review

## Dependencies

- **Architecture Content Management** (Cap 20) - Content managed according to the metamodel
- **Reference Architecture Library** (Cap 21) - Reference architectures structured by metamodel
- **Architecture Principles & Standards** (Cap 6) - Metamodel and notation are architecture standards
- **Solution Design & Patterns** (Cap 12) - Solution designs conform to metamodel
- **Architecture Communication & Engagement** (Cap 26) - Viewpoints enable stakeholder communication

## Tools & Technologies

- Architecture modelling tools (Archi, Sparx EA, LeanIX, Mega, Ardoq)
- ArchiMate modelling tools
- Taxonomy management tools
- Metamodel documentation tools (wiki, Confluence)
- TOGAF Content Metamodel reference
