# Capability 20: Architecture Content Management

**Domain:** Architecture Repository

## Purpose

To manage architecture artifacts, documents, models, and knowledge in a structured, searchable, and governed repository, ensuring architecture content is accessible, current, versioned, and reusable.

## Scope

- Architecture repository operations and governance
- Architecture artifact lifecycle management (create, review, publish, archive, retire)
- Architecture decision record (ADR) management
- Version control and change history
- Search, discovery, and knowledge sharing

## Key Activities

- Operate and maintain the architecture repository
- Define and enforce repository governance (structure, naming, quality, access control)
- Manage the lifecycle of architecture artifacts (drafts, reviews, publication, archival)
- Maintain architecture decision records (ADRs)
- Ensure version control and change history for all artifacts
- Enable search and discovery of architecture content
- Capture and disseminate lessons learned
- Manage access permissions and content ownership
- Integrate repository with architecture modelling tools
- Produce repository health and usage reports

## Inputs

- Architecture deliverables from all domains and projects
- Architecture decision records
- Lessons learned from projects and initiatives
- Metamodel and taxonomy definitions (Cap 19)
- Architecture review outcomes

## Outputs / Deliverables

- Architecture repository (operational)
- Architecture artifact catalog (searchable index)
- ADR repository
- Lessons learned repository
- Repository governance documentation
- Repository health and usage reports
- Architecture content quality reports

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Architecture Repository Manager | Manages repository operations and governance |
| Enterprise Architect | Contributes and reviews architecture content |
| All Architects | Contribute artifacts and maintain their content |
| Tool Administrator | Manages repository tooling and integrations |

## Maturity Levels

| Level | Name | Description |
|-------|------|-------------|
| 1 | Initial | Knowledge is tribal; content scattered in personal files, emails, and SharePoint |
| 2 | Repeatable | Shared file storage for architecture content; basic folder structure |
| 3 | Defined | Centralized architecture repository; standard templates and processes; ADRs managed |
| 4 | Managed | Repository actively maintained; search and discovery effective; usage tracked; content quality governed |
| 5 | Optimizing | AI-assisted discovery; self-maintaining repository; federated contributions; knowledge graph |

## Key Metrics / KPIs

- Repository usage (access rate, unique users)
- Number of architecture artifacts cataloged
- Content currency (% of artifacts updated within defined period)
- Time to find architecture information
- ADR count and coverage (% of significant decisions with ADRs)
- Contributor participation rate

## Dependencies

- **Metamodel & Taxonomy Management** (Cap 19) - Content organized according to metamodel
- **Reference Architecture Library** (Cap 21) - Reference architectures stored in repository
- **Architecture Principles & Standards** (Cap 6) - Standards stored as content
- **Architecture Communication & Engagement** (Cap 26) - Repository supports communication
- **Architecture Skills & Talent Development** (Cap 24) - Repository used for learning and onboarding

## Tools & Technologies

- Architecture repository platforms (Confluence, SharePoint, Notion, Backstage)
- Architecture modelling tools with repository features (LeanIX, Ardoq, Sparx EA)
- ADR management tools (adr-tools, Log4brains, Markdown in Git)
- Wiki and documentation platforms
- Knowledge management and search tools
