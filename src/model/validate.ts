import { findElementType, isElementType, typeLabel } from './element-types'
import { isRelationshipType } from './relationship-types'
import { validateRelationship } from './validity'
import { LIFECYCLE_PHASES } from './profile'
import { parseLifecycleDate } from './lifecycle'
import type { Workspace } from './workspace'

/**
 * Whole-model validation. Findings are structured rather than thrown so the UI
 * can list them against the element or relationship they concern, and so an
 * import can report problems without refusing the file.
 */

export type FindingSeverity = 'error' | 'warning'

export interface Finding {
  severity: FindingSeverity
  /** Stable machine code, e.g. `relationship.dangling-source`. */
  code: string
  message: string
  /** Element or relationship the finding concerns, when it has one. */
  subjectId?: string
  subjectKind?: 'element' | 'relationship' | 'workspace'
}

export interface ValidationReport {
  findings: Finding[]
  errors: Finding[]
  warnings: Finding[]
  valid: boolean
}

export function validate(workspace: Workspace): ValidationReport {
  const findings: Finding[] = []
  const seenElementIds = new Set<string>()
  const seenRelationshipIds = new Set<string>()

  for (const element of workspace.elements) {
    if (seenElementIds.has(element.id)) {
      findings.push({
        severity: 'error',
        code: 'element.duplicate-id',
        message: `Two elements share the id "${element.id}".`,
        subjectId: element.id,
        subjectKind: 'element',
      })
    }
    seenElementIds.add(element.id)

    if (!isElementType(element.type)) {
      findings.push({
        severity: 'error',
        code: 'element.unknown-type',
        message: `"${element.type}" is not an ArchiMate 3.2 element type.`,
        subjectId: element.id,
        subjectKind: 'element',
      })
    }

    if (!element.name.trim()) {
      findings.push({
        severity: 'warning',
        code: 'element.no-name',
        message: `Element ${element.id} has no name.`,
        subjectId: element.id,
        subjectKind: 'element',
      })
    }

    const dates = element.profile?.lifecycle
    if (dates) {
      for (const phase of LIFECYCLE_PHASES) {
        const raw = dates[phase]
        if (raw !== undefined && Number.isNaN(parseLifecycleDate(raw))) {
          findings.push({
            severity: 'warning',
            code: 'element.unparseable-date',
            message: `"${raw}" is not a usable date for the ${phase} phase of ${element.name || element.id}.`,
            subjectId: element.id,
            subjectKind: 'element',
          })
        }
      }
      // Dates that run backwards make the derived phase meaningless.
      const ordered = LIFECYCLE_PHASES.map((phase) => parseLifecycleDate(dates[phase])).filter(
        (ms) => !Number.isNaN(ms),
      )
      for (let i = 1; i < ordered.length; i += 1) {
        const previous = ordered[i - 1]
        const current = ordered[i]
        if (previous !== undefined && current !== undefined && current < previous) {
          findings.push({
            severity: 'warning',
            code: 'element.lifecycle-out-of-order',
            message: `Lifecycle dates on ${element.name || element.id} are out of order — the derived phase will not be meaningful.`,
            subjectId: element.id,
            subjectKind: 'element',
          })
          break
        }
      }
    }
  }

  // Indexed once: endpoint lookup is the hot path at 5,000 elements.
  const elementsById = new Map(workspace.elements.map((element) => [element.id, element]))

  for (const relationship of workspace.relationships) {
    if (seenRelationshipIds.has(relationship.id)) {
      findings.push({
        severity: 'error',
        code: 'relationship.duplicate-id',
        message: `Two relationships share the id "${relationship.id}".`,
        subjectId: relationship.id,
        subjectKind: 'relationship',
      })
    }
    seenRelationshipIds.add(relationship.id)

    if (!isRelationshipType(relationship.type)) {
      findings.push({
        severity: 'error',
        code: 'relationship.unknown-type',
        message: `"${relationship.type}" is not an ArchiMate 3.2 relationship type.`,
        subjectId: relationship.id,
        subjectKind: 'relationship',
      })
      continue
    }

    const source = elementsById.get(relationship.source)
    const target = elementsById.get(relationship.target)

    if (!source) {
      findings.push({
        severity: 'error',
        code: 'relationship.dangling-source',
        message: `Relationship ${relationship.id} points from "${relationship.source}", which is not in the model.`,
        subjectId: relationship.id,
        subjectKind: 'relationship',
      })
    }
    if (!target) {
      findings.push({
        severity: 'error',
        code: 'relationship.dangling-target',
        message: `Relationship ${relationship.id} points to "${relationship.target}", which is not in the model.`,
        subjectId: relationship.id,
        subjectKind: 'relationship',
      })
    }
    if (!source || !target) continue

    if (source.id === target.id && relationship.type !== 'Association') {
      findings.push({
        severity: 'warning',
        code: 'relationship.self-reference',
        message: `${typeLabel(source.type)} "${source.name}" has a ${relationship.type} relationship to itself.`,
        subjectId: relationship.id,
        subjectKind: 'relationship',
      })
    }

    if (findElementType(source.type) && findElementType(target.type)) {
      const result = validateRelationship(source.type, relationship.type, target.type)
      if (!result.valid) {
        findings.push({
          severity: 'error',
          code: 'relationship.invalid',
          message:
            `${relationship.type} from "${source.name}" to "${target.name}" is not permitted. ${result.reason ?? ''}`.trim(),
          subjectId: relationship.id,
          subjectKind: 'relationship',
        })
      }
    }
  }

  if (workspace.schemaVersion <= 0) {
    findings.push({
      severity: 'error',
      code: 'workspace.bad-schema-version',
      message: `Schema version ${workspace.schemaVersion} is not usable.`,
      subjectKind: 'workspace',
    })
  }

  const errors = findings.filter((f) => f.severity === 'error')
  const warnings = findings.filter((f) => f.severity === 'warning')
  return { findings, errors, warnings, valid: errors.length === 0 }
}
