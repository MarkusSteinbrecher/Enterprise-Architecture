import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CHECKS,
  FINDING_SEVERITIES,
  findCheck,
  type Check,
  type CheckId,
  type Finding,
  type FindingSeverity,
  type FindingSubjectKind,
} from '@/model'
import { useModelSelector, useModelStore } from '@/store'
import { useValidator } from './context'
import { findingTarget } from './finding-target'
import './validator.css'

/**
 * The validator (#193): Archi's Validator view, with its eight checks and
 * Archipelago's own findings, as a list you can click through.
 *
 * - It runs on demand, as Archi's Validate button does, and says as soon as
 *   the model changes that the list is out of date.
 * - Findings are grouped by severity (Archi's Errors, Warnings and Advice),
 *   then by check, each with its count.
 * - Each of Archi's checks can be switched off, as on its Validator preference
 *   page; Archipelago's own always run.
 * - Each finding opens its subject (`findingTarget`).
 */

const SEVERITY_TITLES: Record<FindingSeverity, string> = {
  error: 'Errors',
  warning: 'Warnings',
  advice: 'Advice',
}

const SUBJECT_LABELS: Record<FindingSubjectKind, string> = {
  element: 'element',
  relationship: 'relationship',
  view: 'view',
  node: 'shape',
  connection: 'line',
  folder: 'folder',
  workspace: 'workspace',
}

/** How many findings a group lists before it offers the rest. 5,000 unused elements are one group. */
export const GROUP_PAGE = 100

interface Group {
  readonly key: string
  /** The Archi check, or `undefined` for one of Archipelago's own codes. */
  readonly check: Check | undefined
  readonly code: string
  readonly findings: Finding[]
}

interface Section {
  readonly severity: FindingSeverity
  readonly groups: Group[]
  readonly count: number
}

/** By severity, then by check: Archi's in the order its validator runs them, then Archipelago's codes as they first appear. */
function sections(findings: readonly Finding[]): Section[] {
  const order = new Map<CheckId, number>(CHECKS.map((check, index) => [check.id, index]))
  return FINDING_SEVERITIES.map((severity) => {
    const groups = new Map<string, Group>()
    for (const finding of findings) {
      if (finding.severity !== severity) continue
      const key = finding.check ? `check:${finding.check}` : `code:${finding.code}`
      const group = groups.get(key)
      if (group) group.findings.push(finding)
      else {
        groups.set(key, {
          key,
          check: finding.check ? findCheck(finding.check) : undefined,
          code: finding.code,
          findings: [finding],
        })
      }
    }
    const rank = (group: Group) =>
      group.check ? (order.get(group.check.id) ?? 0) : Number.POSITIVE_INFINITY
    const sorted = [...groups.values()].sort((a, b) => rank(a) - rank(b))
    return {
      severity,
      groups: sorted,
      count: sorted.reduce((sum, group) => sum + group.findings.length, 0),
    }
  }).filter((section) => section.count > 0)
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

function sameChecks(a: ReadonlySet<CheckId>, b: ReadonlySet<CheckId>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id))
}

export function ValidatorScreen() {
  const { run, enabled, setEnabled, validate } = useValidator()
  const revision = useModelSelector((store) => store.revision)
  const grouped = useMemo(() => (run ? sections(run.findings) : []), [run])
  const changed = run !== undefined && run.revision !== revision
  const rechecked = run !== undefined && !sameChecks(run.checks, enabled)

  return (
    <div className="validator">
      <div className="validator__inner">
        <header className="validator__header">
          <div className="section-label">Model</div>
          <div className="validator__title-row">
            <h1 className="validator__title">Validator</h1>
            <button type="button" className="button button--primary" onClick={validate}>
              Validate
            </button>
          </div>
          <p className="validator__lead">
            Archi’s eight checks, and Archipelago’s own for what a model file can get wrong. It runs
            when you ask, on the model as it is then.
          </p>
          {run && (
            <p className="validator__summary mono" aria-label="Last run">
              {run.findings.length === 0
                ? '0 findings'
                : FINDING_SEVERITIES.map((severity) => {
                    const count = run.findings.filter((f) => f.severity === severity).length
                    return severity === 'advice'
                      ? `${count} advice`
                      : plural(count, severity === 'error' ? 'error' : 'warning')
                  }).join(' · ')}
            </p>
          )}
          {(changed || rechecked) && (
            <p className="validator__stale" role="status">
              {changed
                ? 'The model has changed since this run. Validate again to see where it stands.'
                : 'The checks have changed since this run. Validate again to apply them.'}
            </p>
          )}
        </header>

        <div className="validator__body">
          <div className="validator__results">
            {!run ? (
              <p className="validator__empty">
                Not validated yet. Press Validate, or run “Validate model” from the command palette.
              </p>
            ) : grouped.length === 0 ? (
              <p className="validator__empty">No problems found.</p>
            ) : (
              grouped.map((section) => (
                <SeveritySection key={section.severity} section={section} revision={revision} />
              ))
            )}
          </div>

          <aside className="validator__checks" aria-labelledby="validator-checks">
            <h2 className="section-label validator__checks-title" id="validator-checks">
              Rules to check
            </h2>
            <ul className="validator__check-list">
              {CHECKS.map((check) => (
                <li key={check.id}>
                  <label className="validator__check">
                    <input
                      type="checkbox"
                      checked={enabled.has(check.id)}
                      onChange={(event) => setEnabled(check.id, event.target.checked)}
                    />
                    <span className="validator__check-label">{check.label}</span>
                    <span className="validator__check-severity mono">{check.severity}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="validator__check-note">
              Archipelago’s own checks always run. The choice is remembered in this browser.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}

function SeveritySection({ section, revision }: { section: Section; revision: number }) {
  const id = `validator-${section.severity}`
  return (
    <section className="validator__section" aria-labelledby={id}>
      <h2 className="validator__h2" id={id}>
        <span>{SEVERITY_TITLES[section.severity]}</span>
        <span className="validator__count mono">{section.count}</span>
      </h2>
      {section.groups.map((group) => (
        <CheckGroup key={group.key} group={group} revision={revision} />
      ))}
    </section>
  )
}

function CheckGroup({ group, revision }: { group: Group; revision: number }) {
  const store = useModelStore()
  const [shown, setShown] = useState(GROUP_PAGE)
  /**
   * Where each listed finding opens, asked of the model as it is now: a
   * subject deleted since the run has nowhere to open. Once per model
   * revision, not on every render, as a relationship's target searches the
   * views that draw it.
   */
  const targets = useMemo(
    () => group.findings.slice(0, shown).map((finding) => findingTarget(finding, store)),
    // `revision` is the model changing inside `store`, which stays the same object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group, shown, store, revision],
  )
  /**
   * "Show more" goes away once pressed, and focus with it: it moves to the
   * first finding it showed, where reading carries on.
   */
  const [showedFrom, setShowedFrom] = useState<number | null>(null)
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (showedFrom === null) return
    const row = list.current?.children[showedFrom]?.firstElementChild
    if (row instanceof HTMLElement) row.focus()
    setShowedFrom(null)
  }, [showedFrom])
  const title = group.check ? group.check.name : group.code
  const rest = group.findings.length - shown
  return (
    <div
      className="validator__group"
      role="group"
      aria-label={`${title}, ${group.findings.length}`}
    >
      <h3 className="validator__h3">
        {group.check ? <span>{title}</span> : <span className="mono">{title}</span>}
        <span className="validator__source mono">{group.check ? 'Archi' : 'Archipelago'}</span>
        <span className="validator__count mono">{group.findings.length}</span>
      </h3>
      <ul className="validator__list" ref={list}>
        {group.findings.slice(0, shown).map((finding, index) => {
          const target = targets[index]
          const kind = finding.subjectKind ? SUBJECT_LABELS[finding.subjectKind] : undefined
          const body = (
            <>
              <span className="validator__message">{finding.message}</span>
              <span className="validator__meta mono">
                {kind}
                {kind && ' · '}
                {finding.code}
                {!target && finding.subjectId !== undefined && ' · no longer in the model'}
              </span>
            </>
          )
          return (
            <li key={`${finding.code}:${finding.subjectId ?? ''}:${index}`}>
              {target ? (
                <Link
                  className="validator__finding"
                  to={target.to}
                  aria-label={`${finding.message} Opens the ${target.opens}.`}
                >
                  {body}
                </Link>
              ) : (
                <div className="validator__finding validator__finding--inert" tabIndex={-1}>
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          className="button validator__more"
          onClick={() => {
            setShowedFrom(shown)
            setShown(group.findings.length)
          }}
        >
          Show {plural(rest, 'more finding', 'more findings')}
        </button>
      )}
    </div>
  )
}
