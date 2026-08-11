import {
  BUSINESS_CRITICALITY_LABELS,
  ELEMENT_TYPE_NAMES,
  JUNCTION_KINDS,
  LIFECYCLE_PHASES,
  RELATIONSHIP_TYPE_NAMES,
  SCHEMA_VERSION,
  TIME_CLASSIFICATIONS,
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
      views: { type: 'array', items: { $ref: '#/$defs/view' } },
      tagGroups: { type: 'array', items: { $ref: '#/$defs/tagGroup' } },
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
          properties: { $ref: '#/$defs/properties' },
          profile: { $ref: '#/$defs/relationshipProfile' },
        },
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
          accessType: { enum: ['Access', 'Read', 'Write', 'ReadWrite'] },
        },
      },
      view: {
        type: 'object',
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

/** The schema as it is written to disk. */
export function workspaceJsonSchemaText(): string {
  return `${JSON.stringify(buildWorkspaceJsonSchema(), null, 2)}\n`
}
