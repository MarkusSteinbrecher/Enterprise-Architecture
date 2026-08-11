import type { Workspace } from '@/model'

/**
 * Import problems are data, not exceptions.
 *
 * A real model file is usually *mostly* right: an unknown element type, a
 * relationship pointing at something that was deleted, a diagram we do not read
 * yet. Refusing the whole file for any of those would be useless to an architect
 * with a 4,000-element export. So an import returns what it could build plus a
 * list of what it could not, and the UI shows both.
 */

export type ProblemSeverity = 'error' | 'warning' | 'info'

export interface ImportProblem {
  severity: ProblemSeverity
  /** Stable machine code, e.g. `exchange.unknown-element-type`. */
  code: string
  message: string
  /** Source file name, when the caller knows it. */
  file?: string
  /** 1-based line in the source, when the parser can locate it. */
  line?: number
  /** Identifier of the element/relationship concerned. */
  subject?: string
}

export interface ImportResult {
  /** Present unless a problem made the file unreadable. */
  workspace?: Workspace
  problems: ImportProblem[]
  /** True when a workspace was produced, whatever warnings came with it. */
  ok: boolean
}

export function problem(
  severity: ProblemSeverity,
  code: string,
  message: string,
  extra: Omit<ImportProblem, 'severity' | 'code' | 'message'> = {},
): ImportProblem {
  return { severity, code, message, ...extra }
}

export function failed(problems: ImportProblem[]): ImportResult {
  return { problems, ok: false }
}

export function succeeded(workspace: Workspace, problems: ImportProblem[] = []): ImportResult {
  return { workspace, problems, ok: true }
}

/** One-line summary for the import dialog's header. */
export function summariseProblems(problems: readonly ImportProblem[]): string {
  const errors = problems.filter((p) => p.severity === 'error').length
  const warnings = problems.filter((p) => p.severity === 'warning').length
  const skipped = problems.filter((p) => p.severity === 'info').length
  const parts: string[] = []
  if (errors) parts.push(`${errors} error${errors === 1 ? '' : 's'}`)
  if (warnings) parts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`)
  if (skipped) parts.push(`${skipped} skipped`)
  return parts.length ? parts.join(' · ') : 'No problems'
}
