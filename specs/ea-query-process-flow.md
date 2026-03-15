# Spec: `ea query process-flow` subcommand

## Summary

New CLI subcommand that composes existing traversal primitives to return an ordered, enriched process flow for a parent BusinessProcess element.

## Command

```
ea query process-flow <parent-process-id> [--format json|table]
```

## Algorithm

1. **Get parent element** — must be `BusinessProcess`
2. **Find children** via `Composition` relationships (source = parent)
3. **Order children** by `Triggering` relationships between them (topological sort)
4. **For each child**, gather:
   - Assigned roles via `Assignment` relationships (source = BusinessRole, target = child)
   - Serving applications via `Serving` relationships (source = ApplicationComponent, target = child)
   - Accessed data via `Access` relationships (source = child, target = BusinessObject)
5. **Return** ordered list with enriched context

## Output shape (JSON)

```json
{
  "process": {
    "id": "e-proc-001",
    "name": "Transformer Order-to-Delivery",
    "properties": { "owner": "Transformers BU", "ai_impact": { ... } }
  },
  "steps": [
    {
      "order": 1,
      "element": { "id": "e-proc-002", "name": "Transformer Design" },
      "roles": [
        { "id": "e-role-007", "name": "Solution Architect" },
        { "id": "e-role-011", "name": "R&D Engineer" }
      ],
      "applications": [
        { "id": "e-app-010", "name": "Transformer Design System" },
        { "id": "e-app-053", "name": "AutoCAD / Inventor" },
        { "id": "e-app-051", "name": "Teamcenter PLM" }
      ],
      "data_objects": [
        { "id": "e-obj-009", "name": "Design Specification", "access": "write" },
        { "id": "e-obj-015", "name": "Bill of Materials", "access": "write" }
      ],
      "triggers_next": "e-proc-003"
    },
    {
      "order": 2,
      "element": { "id": "e-proc-003", "name": "Material Procurement" },
      "...": "..."
    }
  ],
  "triggering_events": [
    { "id": "e-evt-003", "name": "Order Received", "triggers": "e-proc-019" }
  ]
}
```

## Table format

```
# Transformer Order-to-Delivery (e-proc-001)
# Owner: Transformers BU

Step  Process                    Roles                         Applications                    Data (access)
────  ─────────────────────────  ────────────────────────────  ──────────────────────────────  ─────────────────────────
1     Transformer Design         Solution Architect, R&D Eng   TDS, AutoCAD, Teamcenter        Design Spec (W), BOM (W)
2     Material Procurement       Procurement Manager           SAP S/4HANA, SAP Ariba          BOM (R), Spare Part (R)
3     Transformer Assembly       Plant Manager, HSE Manager    MES Ludvika, SAP PLM            Transformer (W)
4     Factory Acceptance Test    Quality Inspector             SAP QM, PQ Analyzer             Test Certificate (W)
5     Heavy Transport            —                             SAP TM                          Transformer (R)
```

## Implementation notes

- Traversal logic exists in `query.go` (`TraverseRelated`, `FindPath`)
- Topological sort: find Triggering rels where both source and target are children of parent, build DAG, sort
- If no Triggering relationships exist between children, fall back to alphabetical
- Include `ai_impact` properties from parent and each child in JSON output
- Estimated effort: ~4-6 hours
