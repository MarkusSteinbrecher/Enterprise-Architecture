import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  completenessDetail,
  deriveLifecyclePhase,
  tagColourToken,
  typeLabel,
  type LifecyclePhase,
  type PortfolioProfile,
  type RelationshipType,
} from '@/model'
import { newId, useModelSelector, useModelStoreContext } from '@/store'
import { TypeCodeBadge } from '@/ui/common/TypeCodeBadge'
import { CompletenessRing } from '@/ui/common/meters'
import { AddRelationDialog } from './AddRelationDialog'
import { NeighbourhoodGraph } from './NeighbourhoodGraph'
import {
  AssessmentSection,
  DocumentationSection,
  LifecycleSection,
  PropertiesSection,
  RelationsSection,
  SectionHeading,
  type ProfilePatch,
  type RelationEntry,
} from './sections'
import './factsheet.css'

/**
 * The element fact sheet (handoff "Screen 2") — read and maintain one element.
 *
 * Edits go through the store's command stack, so undo works and the save-state
 * indicator counts them. Text fields commit on blur rather than per keystroke:
 * one command per edit reads as one line of history, which is what the HISTORY
 * timeline is for.
 */

const TABS = ['Overview', 'Relations', 'Assessment', 'Quality'] as const

export function ElementScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { store, role } = useModelStoreContext()
  const [editing, setEditing] = useState(false)
  const [addingRelation, setAddingRelation] = useState<RelationshipType | undefined>(undefined)

  const at = useMemo(() => Date.now(), [])

  const view = useModelSelector(
    (s) => {
      const element = s.element(id)
      if (!element) return undefined
      const relationships = s.relationshipsOf(id)
      const entries: RelationEntry[] = relationships.flatMap((relationship) => {
        const otherId = relationship.source === id ? relationship.target : relationship.source
        const other = s.element(otherId)
        if (!other) return []
        return [
          {
            relationship,
            other,
            direction: relationship.source === id ? ('outgoing' as const) : ('incoming' as const),
          },
        ]
      })
      return {
        element,
        relationships,
        entries,
        completeness: completenessDetail(element, { relationCount: relationships.length }),
        history: s.historyFor(id),
        candidates: s.elementList().filter((candidate) => candidate.id !== id),
        elementById: (other: string) => s.element(other),
        tagToken: (tag: string) => tagColourToken(s.snapshot(), tag),
      }
    },
    [id],
  )

  if (!view) {
    return (
      <div className="sheet">
        <p className="sheet__missing">
          No element with the id <code>{id}</code> is in this workspace. It may have been deleted,
          or the link may be from another model.
        </p>
      </div>
    )
  }

  const { element, entries, completeness, history } = view
  const phase = deriveLifecyclePhase(element.profile?.lifecycle, at)
  const readOnly = role === 'reader'
  // The breadcrumb returns to the inventory with the filters the user arrived with.
  const backToInventory = `/inventory${(location.state as { fromInventory?: string } | null)?.fromInventory ?? ''}`

  /**
   * `undefined` in the patch clears the field, and clearing means removing the
   * key. Assigning a falsy stand-in instead is what made "Not assessed" store
   * `functionalFit: 0` — rejected by the app's own published schema, dropped
   * without a problem report by the exchange writer, and counted as *filled* by
   * completeness, so clearing a field raised the score.
   */
  const patchProfile = (patch: ProfilePatch) => {
    store.updateElement(element.id, (draft) => {
      const profile: PortfolioProfile = { ...draft.profile }
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) delete profile[key as keyof PortfolioProfile]
        else Object.assign(profile, { [key]: value })
      }
      return { ...draft, profile }
    })
  }

  const setLifecycleDate = (target: LifecyclePhase, value: string) => {
    store.updateElement(element.id, (draft) => {
      const lifecycle = { ...draft.profile?.lifecycle }
      if (value) lifecycle[target] = value
      else delete lifecycle[target]
      return { ...draft, profile: { ...draft.profile, lifecycle } }
    })
  }

  /**
   * This is the first UI in the app that lets anyone author a tag, which is what
   * makes two latent problems reachable.
   *
   * The comma is the live one. `profileToProperties` writes tags as
   * `tags.join(', ')` and the reader splits on `,`, so a tag named
   * `Core, regulated` round-trips through the exchange format as two tags with
   * `problems: []` — silent loss, and every saved filter naming the original then
   * matches nothing. The durable fix is an escaped encoding in `src/io`, which is
   * what #36/#37 is doing to that exact writer; inventing a second encoding here
   * would leave two to reconcile at merge. So this refuses to author the input
   * that breaks it, and says why rather than quietly rewriting the name.
   *
   * The other is registration: a tag has to reach `workspace.tagGroups` or it is
   * unfilterable and uncoloured (finding 7).
   */
  const addTag = () => {
    const tag = window.prompt('Add a tag')?.trim()
    if (!tag) return
    if (tag.includes(',')) {
      window.alert(
        `A tag cannot contain a comma — the exchange format separates tags with one, so “${tag}” would come back as two. Try a name without it.`,
      )
      return
    }
    store.registerTag(tag)
    store.updateElement(element.id, (draft) => ({
      ...draft,
      profile: {
        ...draft.profile,
        tags: [...new Set([...(draft.profile?.tags ?? []), tag])],
      },
    }))
  }

  const removeTag = (tag: string) => {
    store.updateElement(element.id, (draft) => ({
      ...draft,
      profile: {
        ...draft.profile,
        tags: (draft.profile?.tags ?? []).filter((existing) => existing !== tag),
      },
    }))
  }

  const lastModified = history[0] ? new Date(history[0].at).toISOString().slice(0, 10) : '—'

  return (
    <div className="sheet">
      <div className="sheet__header">
        <div className="sheet__breadcrumb">
          <Link to={backToInventory}>INVENTORY</Link>
          <span aria-hidden="true">/</span>
          <span>{typeLabel(element.type)}</span>
          <span aria-hidden="true">/</span>
          <span>{element.id}</span>
        </div>

        <div className="sheet__title-row">
          <div className="sheet__identity">
            <TypeCodeBadge type={element.type} size={38} fontSize={12} />
            <div style={{ minWidth: 0 }}>
              {editing ? (
                <input
                  className="sheet__title-input"
                  aria-label="Name"
                  defaultValue={element.name}
                  onBlur={(event) => {
                    const name = event.target.value.trim()
                    if (name && name !== element.name) {
                      store.updateElement(element.id, (draft) => ({ ...draft, name }))
                    }
                  }}
                />
              ) : (
                <h1 className="sheet__title">{element.name}</h1>
              )}
              <div className="sheet__meta">
                <span className="sheet__type">{typeLabel(element.type)}</span>
                <span className="sheet__meta-divider" aria-hidden="true" />
                {(element.profile?.tags ?? []).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-chip${editing ? ' tag-chip--removable' : ''}`}
                    onClick={editing ? () => removeTag(tag) : undefined}
                    aria-label={editing ? `Remove tag ${tag}` : undefined}
                  >
                    <span
                      className="tag-chip__dot"
                      style={{ background: view.tagToken(tag) }}
                      aria-hidden="true"
                    />
                    {tag}
                  </button>
                ))}
                {editing && (
                  <button type="button" className="tag-chip tag-chip--add" onClick={addTag}>
                    + tag
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="sheet__actions">
            <div
              className="sheet__ring"
              title={
                completeness.missing.length
                  ? `Missing: ${completeness.missing.map((c) => c.label).join(', ')}`
                  : 'Everything expected of this element type is filled in'
              }
            >
              <CompletenessRing score={completeness.score} />
              <span className="sheet__ring-text">
                <span className="sheet__ring-value">{completeness.score}%</span>
                <span className="sheet__ring-caption">COMPLETE</span>
              </span>
            </div>
            <button
              type="button"
              className="button"
              onClick={() => navigate(`/graph?focus=${element.id}`)}
            >
              Trace in graph
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={readOnly}
              onClick={() => setEditing((was) => !was)}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          </div>
        </div>

        {/*
          No tab roles until there is something to switch. `role="tablist"` with
          no `role="tabpanel"` and no `aria-controls` promises a widget that is
          not there — three of the four tabs are disabled stubs, so the honest
          markup is the buttons alone (UI spec open question 2).
        */}
        <div className="sheet__tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-current={tab === 'Overview' ? 'page' : undefined}
              className={`sheet__tab${tab === 'Overview' ? ' sheet__tab--active' : ''}`}
              // Relations and Assessment already live on Overview; these stay
              // stubs until the quality seal exists (UI spec open question 2).
              title={tab === 'Overview' ? undefined : 'Everything lives on Overview for now'}
              disabled={tab !== 'Overview'}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet__body">
        <div className="sheet__main">
          <DocumentationSection
            documentation={element.documentation}
            editing={editing}
            onChange={(documentation) =>
              store.updateElement(element.id, (draft) => ({ ...draft, documentation }))
            }
          />
          <LifecycleSection
            type={element.type}
            profile={element.profile}
            phase={phase}
            editing={editing}
            onChange={setLifecycleDate}
          />
          <AssessmentSection
            type={element.type}
            profile={element.profile}
            editing={editing}
            onChange={patchProfile}
          />
          <RelationsSection
            entries={entries}
            editing={editing}
            onOpen={(other) => navigate(`/element/${other}`)}
            onAdd={(type) => setAddingRelation(type)}
            onRemove={(relationshipId) => store.removeRelationship(relationshipId)}
          />
          <PropertiesSection element={element} lastModified={lastModified} />
          {editing && (
            <button
              type="button"
              className="button"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => setAddingRelation('Serving')}
            >
              + Relation
            </button>
          )}
        </div>

        <aside className="sheet__rail">
          <section>
            <SectionHeading label="Neighbourhood" />
            <NeighbourhoodGraph
              element={element}
              relationships={view.relationships}
              elementById={view.elementById}
              onSelect={(other) => navigate(`/element/${other}`)}
            />
            <button
              type="button"
              className="rail__button"
              onClick={() => navigate(`/graph?focus=${element.id}`)}
            >
              Open full graph →
            </button>
          </section>

          <section>
            <SectionHeading label="Appears in" />
            <p className="appears-in__empty">
              No saved views yet. Reports save their definitions here in phase 2.
            </p>
          </section>

          <section>
            <SectionHeading label="History" />
            {history.length === 0 ? (
              <p className="appears-in__empty">No changes to this element in this session.</p>
            ) : (
              history.map((entry, index) => (
                <div key={entry.id} className="history__entry">
                  <div className="history__marker">
                    <span className="history__square" />
                    {index < history.length - 1 && <span className="history__line" />}
                  </div>
                  <div>
                    <div className="history__text">{entry.label}</div>
                    <div className="history__meta">
                      {new Date(entry.at).toISOString().slice(0, 10)} · {entry.author}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>

      {addingRelation && (
        <AddRelationDialog
          source={element}
          candidates={view.candidates}
          initialType={addingRelation}
          onCancel={() => setAddingRelation(undefined)}
          onAdd={(type, targetId, direction) => {
            store.addRelationship({
              id: newId('rel'),
              type,
              source: direction === 'outgoing' ? element.id : targetId,
              target: direction === 'outgoing' ? targetId : element.id,
              properties: {},
            })
            setAddingRelation(undefined)
          }}
        />
      )}
    </div>
  )
}
