import { createContext, useContext } from 'react'
import type { CheckId, Finding } from '@/model'

/** One press of Validate: what it found, and what it was run on. */
export interface ValidatorRun {
  /** The workspace it ran on. A run of another workspace is never shown. */
  readonly workspaceId: string
  /** `ModelStore.revision` when it ran: any change to the model since makes it stale. */
  readonly revision: number
  /** The checks that were on. */
  readonly checks: ReadonlySet<CheckId>
  readonly findings: readonly Finding[]
}

export interface ValidatorContextValue {
  /** The last run of the workspace that is open, if it has been validated. */
  run: ValidatorRun | undefined
  /** The checks that are on now, which the next run uses. */
  enabled: ReadonlySet<CheckId>
  setEnabled: (check: CheckId, on: boolean) => void
  /** Validate the model as it is now. */
  validate: () => void
}

export const ValidatorContext = createContext<ValidatorContextValue | null>(null)

export function useValidator(): ValidatorContextValue {
  const value = useContext(ValidatorContext)
  if (!value) throw new Error('useValidator must be used inside <ValidatorProvider>')
  return value
}
