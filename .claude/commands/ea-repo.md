# EA Repository — Agent Skill

You have access to the **EA Repository**, an ArchiMate 3.2-compliant architecture repository with a CLI interface. Use it to query, search, validate, and create architecture elements and relationships.

## Setup

Two databases are available:

| Client | Database path | Description |
|--------|--------------|-------------|
| Swiss Bank | `/Users/markus/Code/EA Repository/ea-repository/data/swiss-bank.db` | 48 elements, 45 relationships — banking sample |
| Energy Client | `/Users/markus/Code/EA Repository/ea-repository/data/energy-company.db` | 212 elements, 107 relationships — energy company (Hitachi Energy-inspired) |

Set the alias for your target client. Default to the **Energy Client** unless the user specifies otherwise:

```bash
EA_BIN="/Users/markus/Code/EA Repository/ea-repository/ea"
EA_DB="/Users/markus/Code/EA Repository/ea-repository/data/energy-company.db"
```

All commands follow this pattern:

```bash
"$EA_BIN" --db "$EA_DB" --format json <command> [flags]
```

Start every session by running `stats` to confirm connectivity and understand the model:

```bash
"$EA_BIN" --db "$EA_DB" --format json stats
```

## Read Commands

### List elements
```bash
"$EA_BIN" --db "$EA_DB" --format json element list                              # All elements
"$EA_BIN" --db "$EA_DB" --format json element list --layer Strategy             # By layer
"$EA_BIN" --db "$EA_DB" --format json element list --layer Strategy --type Capability  # By layer + type
"$EA_BIN" --db "$EA_DB" --format json element list --type BusinessProcess       # By type
"$EA_BIN" --db "$EA_DB" --format json element list --limit 10                   # Limit results
```

### Get element by ID
```bash
"$EA_BIN" --db "$EA_DB" --format json element get <element-id>
```

### List relationships
```bash
"$EA_BIN" --db "$EA_DB" --format json relationship list                         # All
"$EA_BIN" --db "$EA_DB" --format json relationship list --source <element-id>   # From element
"$EA_BIN" --db "$EA_DB" --format json relationship list --target <element-id>   # To element
"$EA_BIN" --db "$EA_DB" --format json relationship list --type Serving          # By type
```

### Search across elements and relationships
```bash
"$EA_BIN" --db "$EA_DB" --format json search "query"                            # Both
"$EA_BIN" --db "$EA_DB" --format json search "query" --scope elements           # Elements only
"$EA_BIN" --db "$EA_DB" --format json search "query" --scope relationships      # Relationships only
```

### Validate metamodel compliance
```bash
"$EA_BIN" --db "$EA_DB" --format json validate
```

### Model statistics
```bash
"$EA_BIN" --db "$EA_DB" --format json stats
```

## Write Commands

### Create element
```bash
"$EA_BIN" --db "$EA_DB" --format json element create \
  --type <ArchiMateType> \
  --name "Element Name" \
  --desc "Description" \
  --properties '{"key": "value"}'
```

### Create relationship
```bash
"$EA_BIN" --db "$EA_DB" --format json relationship create \
  --type <RelationType> \
  --source <source-element-id> \
  --target <target-element-id> \
  --name "Relationship description"
```

### Update element
```bash
"$EA_BIN" --db "$EA_DB" --format json element update <element-id> \
  --name "New Name" --desc "New description"
```

### Delete element (cascades relationships)
```bash
"$EA_BIN" --db "$EA_DB" --format json element delete <element-id>
```

## ArchiMate 3.2 Metamodel Reference

### Layers & Element Types

| Layer | Types (aspect) |
|-------|---------------|
| **Strategy** | `Capability` (behavior), `Resource` (passive), `ValueStream` (behavior), `CourseOfAction` (active) |
| **Business** | Active: `BusinessActor`, `BusinessRole`, `BusinessCollaboration`, `BusinessInterface` / Behavior: `BusinessProcess`, `BusinessFunction`, `BusinessInteraction`, `BusinessEvent`, `BusinessService` / Passive: `BusinessObject`, `Contract`, `Representation` / Composite: `Product` |
| **Application** | Active: `ApplicationComponent`, `ApplicationCollaboration`, `ApplicationInterface` / Behavior: `ApplicationFunction`, `ApplicationInteraction`, `ApplicationProcess`, `ApplicationEvent`, `ApplicationService` / Passive: `DataObject` |
| **Technology** | Active: `Node`, `Device`, `SystemSoftware`, `TechnologyCollaboration`, `TechnologyInterface`, `CommunicationNetwork`, `Path` / Behavior: `TechnologyFunction`, `TechnologyProcess`, `TechnologyInteraction`, `TechnologyEvent`, `TechnologyService` / Passive: `Artifact` |
| **Physical** | Active: `Equipment`, `Facility`, `DistributionNetwork` / Passive: `Material` |
| **Motivation** | `Stakeholder`, `Driver`, `Assessment`, `Goal`, `Outcome`, `Principle`, `Requirement`, `Constraint`, `Value`, `Meaning` |
| **Implementation** | `WorkPackage`, `Deliverable`, `ImplementationEvent`, `Plateau`, `Gap` |
| **Other** | `Location`, `Grouping` |

### Relationship Types (11 core)

| Type | Direction | Category | Semantics |
|------|-----------|----------|-----------|
| `Composition` | directed | Structural | Source is composed of target (strongest structural) |
| `Aggregation` | directed | Structural | Source groups target; target can exist independently |
| `Assignment` | directed | Structural | Active structure → behavior (who performs what) |
| `Realization` | directed | Structural | Concrete → abstract (implementation of) |
| `Serving` | directed | Dependency | Source provides functionality used by target |
| `Access` | directed | Dependency | Behavior reads/writes passive structure |
| `Influence` | directed | Dependency | Source influences target motivation element. Modifier: `++`, `+`, `0`, `-`, `--` |
| `Triggering` | directed | Dynamic | Temporal/causal ordering between behaviors |
| `Flow` | directed | Dynamic | Transfer of content (data, goods, money) between behaviors |
| `Specialization` | directed | Other | Inheritance/subtype relationship |
| `Association` | undirected | Other | Fallback — only when no other type applies |

### Key Cross-Layer Relationship Patterns

```
Strategy:
  Capability --Realization--> BusinessProcess/Function/Service
  ValueStream --Realization--> BusinessProcess
  Resource --Assignment--> BusinessActor/Role

Business → Application:
  ApplicationService --Serving--> BusinessProcess/Function/Role
  ApplicationComponent --Realization--> BusinessProcess (rare)
  DataObject --Realization--> BusinessObject

Application → Technology:
  TechnologyService --Serving--> ApplicationComponent
  Node/SystemSoftware --Serving--> ApplicationComponent
  Artifact --Realization--> DataObject

Physical → Technology:
  Facility --Assignment--> Node/Device

Motivation:
  Driver --Influence--> Goal/Capability/Principle
  Goal --Realization--> Capability (what delivers the goal)
  Principle --Realization--> Requirement/Constraint
  Stakeholder --Association--> Goal/Driver
```

### ID Conventions

IDs follow the pattern `<client-prefix>-<layer-abbrev>-<type-abbrev>-<sequence>`:

**Energy Client** prefix: `e-`
- Capabilities: `e-cap-001`
- Value Streams: `e-vs-001`
- Resources: `e-res-001`
- Actors: `e-actor-001`
- Roles: `e-role-001`
- Services: `e-svc-001`
- Processes: `e-proc-001`
- Objects: `e-obj-001`
- Functions: `e-func-001`
- Events: `e-evt-001`
- Applications: `e-app-001`
- App Services: `e-asvc-001`
- Data Objects: `e-data-001`
- Nodes: `e-node-001`
- System Software: `e-sw-001`
- Tech Services: `e-tsvc-001`
- Networks: `e-net-001`
- Facilities: `e-fac-001`
- Stakeholders: `e-stkh-001`
- Goals: `e-goal-001`
- Drivers: `e-drv-001`
- Principles: `e-princ-001`
- Relationships: `e-r-001`

**Swiss Bank** prefix: `b-` (elements) / `a-` (application) / `r-` (relationships)

### Energy Client — Capability Map

```
Energy Solutions & Services (e-cap-000)
├── Grid Automation (e-cap-001)
│   ├── SCADA & Energy Management (e-cap-010)
│   ├── Distribution Management (e-cap-011)
│   ├── Grid Monitoring & Analytics (e-cap-012)
│   ├── Protection & Control (e-cap-013)
│   └── Communication Networks (e-cap-014)
├── Grid Integration (e-cap-002)
│   ├── HVDC Systems (e-cap-020)
│   ├── FACTS & Power Quality (e-cap-021)
│   ├── Offshore Wind Connection (e-cap-022)
│   ├── Grid Interconnection (e-cap-023)
│   └── Energy Storage Integration (e-cap-024)
├── High Voltage Products (e-cap-003)
│   ├── Circuit Breaker Manufacturing (e-cap-030)
│   ├── Gas-Insulated Switchgear (e-cap-031)
│   ├── Instrument Transformers (e-cap-032)
│   ├── Bushings & Surge Arresters (e-cap-033)
│   └── Generator Circuit Breakers (e-cap-034)
├── Transformers (e-cap-004)
│   ├── Power Transformer Engineering (e-cap-040)
│   ├── Transformer Manufacturing (e-cap-041)
│   ├── Traction Transformers (e-cap-042)
│   ├── Transformer Testing & Quality (e-cap-043)
│   └── Transformer Lifecycle Management (e-cap-044)
├── Service & Operations (e-cap-005)
│   ├── Field Service Operations (e-cap-050)
│   ├── Predictive Maintenance (e-cap-051)
│   ├── Asset Performance Management (e-cap-052)
│   ├── Spare Parts & Logistics (e-cap-053)
│   └── Digital Services (e-cap-054)
├── Research & Development (e-cap-060)
├── Supply Chain Management (e-cap-061)
├── Sales & Customer Management (e-cap-062)
├── Project Delivery (e-cap-063)
├── Health, Safety & Environment (e-cap-064)
├── Sustainability & Decarbonisation (e-cap-065)
├── Cybersecurity (e-cap-066)
├── Regulatory & Compliance (e-cap-067)
├── People & Talent Management (e-cap-068)
├── Finance & Controlling (e-cap-069)
├── Digital & IT (e-cap-070)
└── Quality Management (e-cap-071)
```

## Write-Back Protocol

When creating elements as part of deliverable work:

1. **Propose** — List elements under `proposed_elements:` in deliverable YAML
2. **Approve** — Ask sponsor for approval before writing to the repository
3. **Create** — Run `element create` commands and capture returned IDs
4. **Cross-reference** — Update deliverable YAML with created element IDs

## Serving the Web UI

To start the web UI and REST API for the energy client:

```bash
"$EA_BIN" --db "$EA_DB" serve --addr :3000
```

Then browse to `http://localhost:3000` for the element explorer.
