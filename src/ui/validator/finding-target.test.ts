import { describe, expect, it } from 'vitest'
import type { Finding, FindingSubjectKind } from '@/model'
import { ModelStore } from '@/store/model-store'
import { clean, element, line, main, relationship, shape } from '@/test/validator-fixtures'
import { findingTarget } from './finding-target'

/** Where each kind of finding opens (#193), asked of the model as it is now. */

const about = (subjectKind: FindingSubjectKind, subjectId?: string, viewId?: string): Finding => ({
  severity: 'warning',
  code: 'test',
  message: 'Test.',
  subjectKind,
  ...(subjectId === undefined ? {} : { subjectId }),
  ...(viewId === undefined ? {} : { viewId }),
})

const to = (store: ModelStore, finding: Finding) => findingTarget(finding, store)?.to

describe('where a finding opens (#193)', () => {
  it('a relationship whose only line the nesting hides opens its source, as the line cannot be selected', () => {
    // r-assign is drawn only by c-assign, between the clerk and the role nested in it.
    const store = new ModelStore(clean())
    expect(store.viewsDrawingRelationship('r-assign').map((v) => v.id)).toEqual(['view-main'])
    expect(to(store, about('relationship', 'r-assign'))).toBe('/element/actor')
  })

  it('a relationship drawn twice opens a line the nesting does not hide', () => {
    const workspace = clean()
    workspace.views.push({
      id: 'view-flat',
      name: 'Flat',
      properties: {},
      nodes: [shape('f-actor', 'actor'), shape('f-role', 'role')],
      connections: [line('f-assign', 'r-assign', 'f-actor', 'f-role')],
    })
    expect(to(new ModelStore(workspace), about('relationship', 'r-assign'))).toBe(
      '/view/view-flat?line=f-assign',
    )
  })

  it('a relationship whose source is missing opens its target', () => {
    const workspace = clean()
    workspace.relationships.push(relationship('r-half', 'Serving', 'gone', 'process'))
    expect(to(new ModelStore(workspace), about('relationship', 'r-half'))).toBe('/element/process')
  })

  it('a relationship with neither end, or one not in the model, opens nothing', () => {
    const workspace = clean()
    workspace.relationships.push(relationship('r-none', 'Serving', 'gone', 'also-gone'))
    const store = new ModelStore(workspace)
    expect(store.relationship('r-none')).toBeDefined()
    expect(to(store, about('relationship', 'r-none'))).toBeUndefined()
    expect(to(store, about('relationship', 'r-never'))).toBeUndefined()
  })

  it('a shape or line opens nothing once it, or its view, is gone', () => {
    const store = new ModelStore(clean())
    expect(to(store, about('node', 'n-role', 'view-main'))).toBe('/view/view-main?node=n-role')
    expect(to(store, about('node', 'n-gone', 'view-main'))).toBeUndefined()
    expect(to(store, about('node', 'n-role', 'view-gone'))).toBeUndefined()
    expect(to(store, about('node', 'n-role'))).toBeUndefined()
    expect(to(store, about('connection', 'c-serves', 'view-main'))).toBe(
      '/view/view-main?line=c-serves',
    )
    // A shape's id is not a line's.
    expect(to(store, about('connection', 'n-role', 'view-main'))).toBeUndefined()
  })

  it('an element, view or folder no longer in the model opens nothing', () => {
    const workspace = clean()
    workspace.folders.push({ id: 'f', name: 'F', root: 'business' })
    const store = new ModelStore(workspace)
    expect(to(store, about('element', 'actor'))).toBe('/element/actor')
    expect(to(store, about('element', 'gone'))).toBeUndefined()
    expect(to(store, about('view', 'view-main'))).toBe('/view/view-main')
    expect(to(store, about('view', 'gone'))).toBeUndefined()
    expect(to(store, about('folder', 'f'))).toBe('/validate?folder=f')
    expect(to(store, about('folder', 'gone'))).toBeUndefined()
  })

  it('the workspace, or a finding about no one thing, opens nothing', () => {
    const store = new ModelStore(clean())
    expect(to(store, about('workspace'))).toBeUndefined()
    expect(to(store, about('element'))).toBeUndefined()
  })

  it('escapes ids, whatever they hold', () => {
    const workspace = clean()
    workspace.elements.push(element('a/b?c#d', 'BusinessObject', 'Odd'))
    main(workspace).nodes.push(shape('n&x=1', 'a/b?c#d'))
    const store = new ModelStore(workspace)
    expect(to(store, about('element', 'a/b?c#d'))).toBe('/element/a%2Fb%3Fc%23d')
    expect(to(store, about('node', 'n&x=1', 'view-main'))).toBe('/view/view-main?node=n%26x%3D1')
  })
})
