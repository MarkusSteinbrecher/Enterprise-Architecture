import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { runValidator, type CheckId } from '@/model'
import { useModelSelector, useModelStore } from '@/store'
import { readEnabledChecks, writeEnabledChecks } from './check-preferences'
import { ValidatorContext, type ValidatorRun } from './context'

/**
 * Holds the last validation and the checks that are on (#193), above the
 * screens, so the list is still there after a finding has been opened and the
 * command palette's "Validate model" runs the same thing the Validate button
 * does.
 *
 * The checks are kept here as well as in storage: where storage is blocked, a
 * check switched off stays off for the rest of the visit, for the palette too.
 */
export function ValidatorProvider({ children }: { children: ReactNode }) {
  const store = useModelStore()
  const workspaceId = useModelSelector((s) => s.id)
  const [last, setLast] = useState<ValidatorRun | undefined>(undefined)
  const [enabled, setEnabledState] = useState<ReadonlySet<CheckId>>(readEnabledChecks)

  const setEnabled = useCallback(
    (check: CheckId, on: boolean) => {
      const next = new Set(enabled)
      if (on) next.add(check)
      else next.delete(check)
      writeEnabledChecks(next)
      setEnabledState(next)
    },
    [enabled],
  )

  const validate = useCallback(() => {
    setLast({
      workspaceId: store.id,
      revision: store.revision,
      checks: enabled,
      findings: runValidator(store.snapshot(), enabled),
    })
  }, [store, enabled])

  // A run of the workspace that was open before an Open file or a switch says nothing about this one.
  const run = last?.workspaceId === workspaceId ? last : undefined

  const value = useMemo(
    () => ({ run, enabled, setEnabled, validate }),
    [run, enabled, setEnabled, validate],
  )
  return <ValidatorContext.Provider value={value}>{children}</ValidatorContext.Provider>
}
