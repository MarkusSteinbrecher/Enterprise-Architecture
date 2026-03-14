# EA Repository — CLI Reference for Agents

This document defines how agent personas access the EA Repository. All agents should use the `ea` CLI for programmatic access. The website (browser-side) continues using the REST API for interactive browsing.

## Binary & Databases

```
Binary: /Users/markus/Code/EA Repository/ea-repository/ea
```

Two client databases:

| Client | Database | Elements | Relationships |
|--------|----------|----------|---------------|
| Swiss Bank | `ea_repository.db` | 48 | 45 |
| **Energy Client** | `data/energy-company.db` | 212 | 107 |

Default to the **Energy Client** unless the user specifies otherwise.

### Usage

```bash
EA_BIN="/Users/markus/Code/EA Repository/ea-repository/ea"
EA_DB="/Users/markus/Code/EA Repository/ea-repository/data/energy-company.db"

"$EA_BIN" --db "$EA_DB" --format json <command> [flags]
```

## Connectivity Check

```bash
"$EA" stats
```

If this returns JSON with `layers` and `summary`, the repository is available.

## Read Commands

### Model Statistics

```bash
"$EA" stats
```

Returns layer breakdown (element counts, source systems) and summary totals:

```json
{
  "layers": [
    { "layer": "Strategy", "element_count": 3, "sources": "manual" },
    { "layer": "Business", "element_count": 17, "sources": "manual" },
    { "layer": "Application", "element_count": 14, "sources": "servicenow,manual" },
    { "layer": "Technology", "element_count": 12, "sources": "servicenow,aws" },
    { "layer": "Physical", "element_count": 2, "sources": "manual" }
  ],
  "summary": {
    "total_elements": 48,
    "total_relationships": 45,
    "auto_sources": 2,
    "manual_elements": 29,
    "auto_collected_elements": 19,
    "identity_mappings": 7
  }
}
```

### List Elements

```bash
"$EA" element list                              # All elements
"$EA" element list --layer Business             # Filter by layer
"$EA" element list --layer Strategy --type Capability  # Filter by layer + type
"$EA" element list --type BusinessProcess       # Filter by type only
"$EA" element list --source servicenow          # Filter by source system
"$EA" element list --limit 10                   # Limit results
```

Element JSON shape:

```json
{
  "id": "b-cap-001",
  "type": "Capability",
  "name": "Client Management",
  "description": "Ability to manage client lifecycle",
  "layer": "Strategy",
  "source_system": "manual",
  "properties": {},
  "created_at": "2026-03-01T08:03:08Z",
  "updated_at": "2026-03-01T08:03:08Z",
  "created_by": "system",
  "updated_by": "system"
}
```

### Get Element by ID

```bash
"$EA" element get b-cap-001
```

### List Relationships

```bash
"$EA" relationship list                              # All relationships
"$EA" relationship list --source b-cap-001           # From a specific element
"$EA" relationship list --target b-proc-001          # To a specific element
"$EA" relationship list --type Serving               # Filter by type
"$EA" relationship list --limit 10                   # Limit results
```

Relationship JSON shape:

```json
{
  "id": "r-001",
  "type": "Realization",
  "name": "Client Management → Client Onboarding",
  "source_element": "b-cap-001",
  "target_element": "b-proc-001",
  "source_system": "manual",
  "properties": {},
  "source_name": "Client Management",
  "source_type": "Capability",
  "target_name": "Client Onboarding",
  "target_type": "BusinessProcess"
}
```

### Search

```bash
"$EA" search "client"                                # Search elements + relationships
"$EA" search "payment" --scope elements              # Elements only
"$EA" search "serving" --scope relationships          # Relationships only
```

Search result shape (elements):

```json
{
  "id": "b-obj-001",
  "kind": "element",
  "type": "BusinessObject",
  "name": "Client",
  "description": "Client master data entity",
  "layer": "Business"
}
```

Search result shape (relationships):

```json
{
  "id": "r-020",
  "kind": "relationship",
  "type": "Access",
  "name": "reads/writes client data"
}
```

### Validate

```bash
"$EA" validate
```

Checks all relationships against ArchiMate metamodel rules. Returns per-relationship status:

```json
{
  "relationship_id": "r-020",
  "source_name": "Client Onboarding",
  "source_type": "BusinessProcess",
  "relationship_type": "Access",
  "target_name": "Client",
  "target_type": "BusinessObject",
  "validation_status": "VALID"
}
```

Relationships with `"validation_status": "INVALID"` violate ArchiMate rules.

## Write Commands

### Create Element

```bash
"$EA" element create --type Principle --name "AI-First Design" --desc "All new capabilities should be designed for AI agent consumption from the start"
"$EA" element create --type Goal --name "Reduce manual EA reviews by 50%" --properties '{"source":"preliminary-phase","timeframe":"12-months"}'
```

### Create Relationship

```bash
"$EA" relationship create --type Association --source <element-id> --target <element-id> --name "describes relationship"
```

### Write-Back Protocol

1. Agent proposes elements to create (listed in deliverable YAML under `proposed_elements:`)
2. Agent asks sponsor for approval before writing
3. On approval, create elements and capture returned IDs
4. Cross-reference created element IDs in the deliverable

**Write-eligible deliverables:**

| Deliverable | Elements created |
|-------------|-----------------|
| Principles Catalog | `Principle` elements in Motivation layer |
| Business Principles, Goals & Drivers | `Goal`, `Driver`, `Stakeholder` elements |
| Governance Framework | `Constraint`, `Requirement` elements (optional) |
| EA Capability Architecture | `Capability` elements in Strategy layer (optional) |

## ArchiMate 3.2 Metamodel

### Layers & Element Types

| Layer | Types |
|-------|-------|
| **Strategy** | `Capability`, `Resource`, `ValueStream`, `CourseOfAction` |
| **Business** | `BusinessActor`, `BusinessRole`, `BusinessCollaboration`, `BusinessInterface`, `BusinessProcess`, `BusinessFunction`, `BusinessInteraction`, `BusinessEvent`, `BusinessService`, `BusinessObject`, `Contract`, `Representation`, `Product` |
| **Application** | `ApplicationComponent`, `ApplicationCollaboration`, `ApplicationInterface`, `ApplicationFunction`, `ApplicationInteraction`, `ApplicationProcess`, `ApplicationEvent`, `ApplicationService`, `DataObject` |
| **Technology** | `Node`, `Device`, `SystemSoftware`, `TechnologyCollaboration`, `TechnologyInterface`, `CommunicationNetwork`, `Path`, `TechnologyFunction`, `TechnologyProcess`, `TechnologyInteraction`, `TechnologyEvent`, `TechnologyService`, `Artifact` |
| **Physical** | `Equipment`, `Facility`, `DistributionNetwork`, `Material` |
| **Motivation** | `Stakeholder`, `Driver`, `Assessment`, `Goal`, `Outcome`, `Principle`, `Requirement`, `Constraint`, `Value`, `Meaning` |
| **Implementation** | `WorkPackage`, `Deliverable`, `ImplementationEvent`, `Plateau`, `Gap` |

### Relationship Types (11)

| Type | Category | Semantics |
|------|----------|-----------|
| `Composition` | Structural | Source is composed of target |
| `Aggregation` | Structural | Source groups target |
| `Assignment` | Structural | Active structure → behavior (who does what) |
| `Realization` | Structural | Concrete realizes abstract |
| `Serving` | Dependency | Source provides functionality to target |
| `Access` | Dependency | Behavior reads/writes passive structure |
| `Influence` | Dependency | Source influences motivation element (modifier: `++`/`+`/`0`/`-`/`--`) |
| `Triggering` | Dynamic | Causal/temporal ordering of behavior |
| `Flow` | Dynamic | Transfer of content between behaviors |
| `Specialization` | Other | Inheritance/subtype |
| `Association` | Other | Fallback when no other type applies |

### Key Cross-Layer Patterns

- `Capability` --Realization--> `BusinessProcess`/`BusinessFunction`/`BusinessService`
- `ApplicationService` --Serving--> `BusinessProcess`/`BusinessRole`
- `DataObject` --Realization--> `BusinessObject`
- `Node`/`SystemSoftware` --Serving--> `ApplicationComponent`
- `Facility` --Assignment--> `Node`/`Device`
- `Driver` --Influence--> `Goal`/`Capability`

Full metamodel reference: `/Users/markus/Code/EA Repository/ea-repository/Documentation/archimate-metamodel.yaml`

## Sample Datasets

### Swiss Bank (`ea_repository.db`)
- **48 elements** across 5 layers (Strategy: 3, Business: 17, Application: 14, Technology: 12, Physical: 2)
- **45 relationships** (Serving, Realization, Access, Assignment, Composition, Flow)
- Source systems: manual (29), ServiceNow (12), AWS (7)
- Key entities: Avaloq core banking, Digital Banking Portal, AML/KYC Platform, CRM (Salesforce)

### Energy Client (`data/energy-company.db`)
- **212 elements** across 6 layers (Strategy: 56, Business: 84, Application: 28, Technology: 18, Physical: 5, Motivation: 21)
- **107 relationships** (Composition, Realization, Serving, Access, Influence, Assignment)
- Hitachi Energy-inspired: 5 business units, 43 capabilities (3-level hierarchy), 10 global locations
- Key systems: Lumada APM, MicroSCADA, Network Manager, SAP S/4HANA, Salesforce CRM
- Seed file: `scripts/seed-energy-client.sql`
