import {
  ACCESS_TYPES,
  BUSINESS_CRITICALITY_LABELS,
  ELEMENT_TYPE_NAMES,
  FOLDER_ROOTS,
  FONT_STYLES,
  INFLUENCE_STRENGTHS,
  JUNCTION_KINDS,
  LIFECYCLE_PHASES,
  RELATIONSHIP_TYPE_NAMES,
  SCHEMA_VERSION,
  TEXT_ALIGNMENTS,
  TEXT_POSITIONS,
  TIME_CLASSIFICATIONS,
  TYPE_SPECIFIC_ATTRIBUTES,
} from '@/model'

/**
 * The published JSON Schema for the canonical workspace format.
 *
 * Built from the metamodel rather than hand-written, so the type enumerations
 * cannot drift from `element-types.ts`. `design/archipelago-workspace.schema.json`
 * is the generated artifact — `npm run schema` rewrites it and a test fails if the
 * checked-in copy is stale.
 *
 * The schema matters beyond validation: concept §3.1 names AI agents as a
 * consumer of the model, and a published schema with stable ids is what lets one
 * maintain a workspace without reading our source.
 */

export const SCHEMA_ID =
  'https://markussteinbrecher.github.io/Enterprise-Architecture/schema/archipelago-workspace.schema.json'

export function buildWorkspaceJsonSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_ID,
    title: 'Archipelago workspace',
    description:
      'Canonical native format of an Archipelago workspace: an ArchiMate 3.2 model plus the portfolio profile overlay. Written with sorted keys and deterministic array order so that two exports of the same model are byte-identical.',
    type: 'object',
    required: ['schemaVersion', 'id', 'name', 'elements', 'relationships'],
    additionalProperties: false,
    properties: {
      schemaVersion: {
        type: 'integer',
        minimum: 1,
        description: `Format version. This build writes ${SCHEMA_VERSION}.`,
      },
      id: { type: 'string', minLength: 1 },
      name: { type: 'string' },
      elements: { type: 'array', items: { $ref: '#/$defs/element' } },
      relationships: { type: 'array', items: { $ref: '#/$defs/relationship' } },
      views: {
        type: 'array',
        description: 'Hand-drawn diagrams. (Schema 1 used this key for saved reports.)',
        items: { $ref: '#/$defs/view' },
      },
      folders: { type: 'array', items: { $ref: '#/$defs/folder' } },
      reports: {
        type: 'array',
        description: 'Saved report definitions.',
        items: { $ref: '#/$defs/report' },
      },
      tagGroups: { type: 'array', items: { $ref: '#/$defs/tagGroup' } },
      propertyTypes: {
        type: 'object',
        description:
          'Exchange-format types declared for property keys held here as text (currency, date, time), so a model that arrives typed leaves typed. Keys whose type the value itself carries (boolean, number) are not listed.',
        additionalProperties: { enum: ['boolean', 'currency', 'date', 'number', 'time'] },
      },
    },
    $defs: {
      element: {
        type: 'object',
        required: ['id', 'type', 'name'],
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            description:
              'Stable identifier. Must be usable as an xs:ID so the model survives an exchange-format round trip.',
            pattern: '^[A-Za-z_][A-Za-z0-9_.-]*$',
          },
          type: { enum: [...ELEMENT_TYPE_NAMES] },
          name: { type: 'string' },
          documentation: { type: 'string' },
          junctionKind: {
            enum: [...JUNCTION_KINDS],
            description:
              'And/or flavour of a Junction, which the exchange format spells as two concrete types (AndJunction, OrJunction). Absent means "and". Meaningless on any other element type.',
          },
          properties: { $ref: '#/$defs/properties' },
          profile: { $ref: '#/$defs/portfolioProfile' },
          folder: { $ref: '#/$defs/folderRef' },
        },
      },
      relationship: {
        type: 'object',
        required: ['id', 'type', 'source', 'target'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1, pattern: '^[A-Za-z_][A-Za-z0-9_.-]*$' },
          type: { enum: [...RELATIONSHIP_TYPE_NAMES] },
          source: { type: 'string', description: 'id of the source element' },
          target: { type: 'string', description: 'id of the target element' },
          name: { type: 'string' },
          isDirected: {
            type: 'boolean',
            description:
              'Association only. true draws a half-arrowhead at the target; absent (or false) is undirected.',
          },
          modifier: {
            type: 'string',
            minLength: 1,
            description: `Influence only. The strength: ${INFLUENCE_STRENGTHS.join(', ')}, or any other text such as a number on a scale.`,
          },
          properties: { $ref: '#/$defs/properties' },
          profile: { $ref: '#/$defs/relationshipProfile' },
          folder: { $ref: '#/$defs/folderRef' },
        },
        allOf: [
          onlyOnType({ required: ['isDirected'] }, TYPE_SPECIFIC_ATTRIBUTES.isDirected),
          onlyOnType({ required: ['modifier'] }, TYPE_SPECIFIC_ATTRIBUTES.modifier),
          onlyOnType(
            { required: ['profile'], properties: { profile: { required: ['accessType'] } } },
            TYPE_SPECIFIC_ATTRIBUTES.accessType,
          ),
        ],
      },
      properties: {
        type: 'object',
        description: 'Free-form ArchiMate properties.',
        additionalProperties: { type: ['string', 'number', 'boolean'] },
      },
      portfolioProfile: {
        type: 'object',
        description:
          'LeanIX-style assessment overlay. Serialises as namespaced ArchiMate properties in the exchange format, so it survives a round trip through any certified tool.',
        additionalProperties: false,
        properties: {
          lifecycle: {
            type: 'object',
            description:
              'The date each phase starts, ISO 8601. The current phase is derived from these at a time point and is never stored.',
            additionalProperties: false,
            properties: Object.fromEntries(
              LIFECYCLE_PHASES.map((phase) => [
                phase,
                { type: 'string', format: 'date', examples: ['2027-01-01'] },
              ]),
            ),
          },
          functionalFit: { type: 'integer', minimum: 1, maximum: 4 },
          technicalFit: { type: 'integer', minimum: 1, maximum: 4 },
          businessCriticality: {
            type: 'integer',
            minimum: 1,
            maximum: 4,
            description: BUSINESS_CRITICALITY_LABELS.map((l, i) => `${i + 1} = ${l}`).join(', '),
          },
          timeClassification: { enum: [...TIME_CLASSIFICATIONS] },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      relationshipProfile: {
        type: 'object',
        description:
          'Fields carried by the relationship itself — cost, support type and validity dates belong on the edge, not on either endpoint.',
        additionalProperties: false,
        properties: {
          annualCost: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          supportType: { type: 'string' },
          validFrom: { type: 'string', format: 'date' },
          validTo: { type: 'string', format: 'date' },
          accessType: { enum: [...ACCESS_TYPES], description: 'Access relationships only.' },
        },
      },
      folderRef: {
        type: 'string',
        description:
          'id of the folder this object is filed in. Absent means the default group for its kind.',
      },
      folder: {
        type: 'object',
        description:
          'User organisation of the model tree; no semantics. Exactly one of parent and root is set.',
        required: ['id', 'name'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          name: { type: 'string' },
          documentation: { type: 'string' },
          parent: { type: 'string', description: 'id of the enclosing folder' },
          root: {
            enum: [...FOLDER_ROOTS],
            description: 'The fixed top-level group a top-level folder sits in.',
          },
        },
        oneOf: [{ required: ['parent'] }, { required: ['root'] }],
      },
      view: {
        type: 'object',
        description: 'A hand-drawn diagram.',
        required: ['id', 'name'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1 },
          name: { type: 'string' },
          documentation: { type: 'string' },
          viewpoint: { type: 'string', description: 'ArchiMate viewpoint name.' },
          folder: { $ref: '#/$defs/folderRef' },
          properties: { $ref: '#/$defs/properties' },
          nodes: { type: 'array', items: { $ref: '#/$defs/viewNode' } },
          connections: { type: 'array', items: { $ref: '#/$defs/viewConnection' } },
        },
      },
      bounds: {
        type: 'object',
        description: 'Position relative to the parent node (or the view), and size.',
        required: ['x', 'y', 'width', 'height'],
        additionalProperties: false,
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
        },
      },
      appearance: {
        type: 'object',
        description: "Overrides of the notation's default look. Absent fields mean the default.",
        additionalProperties: false,
        properties: {
          fillColor: { $ref: '#/$defs/colour' },
          lineColor: { $ref: '#/$defs/colour' },
          lineWidth: { type: 'number', exclusiveMinimum: 0 },
          fontName: { type: 'string', minLength: 1 },
          fontSize: { type: 'number', exclusiveMinimum: 0 },
          fontColor: { $ref: '#/$defs/colour' },
          fontStyle: { type: 'array', items: { enum: [...FONT_STYLES] } },
          textAlignment: { enum: [...TEXT_ALIGNMENTS] },
          textPosition: { enum: [...TEXT_POSITIONS] },
        },
      },
      colour: { type: 'string', pattern: '^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$' },
      viewNode: {
        type: 'object',
        description: 'A diagram object: a drawn element, a note, a group or a view reference.',
        required: ['id', 'kind', 'bounds'],
        properties: {
          id: { type: 'string', minLength: 1, description: 'Unique within its view.' },
          kind: { enum: ['element', 'note', 'group', 'view-ref'] },
          bounds: { $ref: '#/$defs/bounds' },
          parent: { type: 'string', description: 'id of the enclosing node in the same view' },
          appearance: { $ref: '#/$defs/appearance' },
          element: { type: 'string', description: "kind 'element': id of the element drawn" },
          text: { type: 'string', description: "kind 'note'" },
          name: { type: 'string', description: "kind 'group'" },
          documentation: { type: 'string', description: "kind 'group'" },
          view: { type: 'string', description: "kind 'view-ref': id of the view referenced" },
        },
        additionalProperties: false,
        allOf: [
          requiredForKind('element', 'element'),
          requiredForKind('note', 'text'),
          requiredForKind('group', 'name'),
          requiredForKind('view-ref', 'view'),
        ],
      },
      viewConnection: {
        type: 'object',
        description: 'A drawn relationship, or a plain line between notes and groups.',
        required: ['id', 'kind', 'source', 'target'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', minLength: 1, description: 'Unique within its view.' },
          kind: { enum: ['relationship', 'line'] },
          source: { type: 'string', description: 'id of the source node' },
          target: { type: 'string', description: 'id of the target node' },
          bendpoints: {
            type: 'array',
            description: 'Route corners from source to target, in view coordinates.',
            items: {
              type: 'object',
              required: ['x', 'y'],
              additionalProperties: false,
              properties: { x: { type: 'number' }, y: { type: 'number' } },
            },
          },
          appearance: { $ref: '#/$defs/appearance' },
          relationship: {
            type: 'string',
            description: "kind 'relationship': id of the relationship drawn",
          },
          name: { type: 'string', description: "kind 'line'" },
        },
        allOf: [requiredForKind('relationship', 'relationship')],
      },
      report: {
        type: 'object',
        description: 'A saved report definition.',
        required: ['id', 'name', 'kind'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          kind: {
            enum: ['graph', 'capability-map', 'landscape', 'matrix', 'roadmap', 'portfolio'],
          },
          baseType: { enum: [...ELEMENT_TYPE_NAMES] },
          filter: {
            type: 'object',
            properties: {
              facets: { type: 'array', items: { type: 'string' } },
              mode: { enum: ['AND', 'OR', 'NOT'] },
              query: { type: 'string' },
            },
          },
          cluster: { type: 'string' },
          drilldown: { type: 'string' },
          colorView: { enum: ['layer', 'lifecycle', 'time'] },
          timePoint: { type: 'integer' },
        },
      },
      tagGroup: {
        type: 'object',
        required: ['id', 'name', 'tags'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          multiSelect: { type: 'boolean' },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string' },
                colourToken: {
                  type: 'string',
                  description: 'CSS custom property carrying the tag colour.',
                },
              },
            },
          },
        },
      },
    },
  }
}

/** "When `kind` is `kind`, `field` is required." */
function requiredForKind(kind: string, field: string): Record<string, unknown> {
  return { if: { properties: { kind: { const: kind } } }, then: { required: [field] } }
}

/** A relationship matching `carries` must be of `type` (#84). */
function onlyOnType(carries: Record<string, unknown>, type: string): Record<string, unknown> {
  return { if: carries, then: { properties: { type: { const: type } } } }
}

/** The schema as it is written to disk. */
export function workspaceJsonSchemaText(): string {
  return `${JSON.stringify(buildWorkspaceJsonSchema(), null, 2)}\n`
}
