import { describe, expect, it } from 'vitest'
import {
  CHECKS,
  CHECK_IDS,
  runChecks,
  runValidator,
  validate,
  validateRelationship,
  type CheckId,
  type ElementNode,
  type ElementType,
  type Workspace,
} from '@/model'
import { clean, element, line, main, relationship, shape } from '@/test/validator-fixtures'

/**
 * Archi 5.10's eight checks (#193). Archi's command line has no validator, so
 * nothing here diffs against Archi's output: each check has a fixture built to
 * trip it and no other, and a near miss built to trip nothing, from what the
 * checker's bytecode does (`javap -c` on
 * `com.archimatetool.hammer_5.10.0.202605271610.jar`).
 */

/** Which checks found something: the property every fixture is about. */
function tripped(workspace: Workspace): CheckId[] {
  return [...new Set(runChecks(workspace).map((finding) => finding.check!))]
}

function findingsOf(workspace: Workspace, check: CheckId) {
  return runChecks(workspace, new Set([check]))
}

describe("Archi's eight checks (#193)", () => {
  it('finds nothing in the clean model, Archipelago included', () => {
    // Present first: the fixture really draws what it says, so "nothing found" means something.
    expect(main(clean()).nodes).toHaveLength(4)
    expect(runValidator(clean())).toEqual([])
  })

  it('pins each check to the severity of the issue type its Archi checker creates', () => {
    const severities = Object.fromEntries(CHECKS.map((check) => [check.id, check.severity]))
    expect(severities).toEqual({
      'invalid-relations': 'error',
      junctions: 'error',
      'duplicate-elements': 'warning',
      'unused-elements': 'warning',
      'unused-relations': 'warning',
      viewpoint: 'warning',
      'empty-views': 'advice',
      nesting: 'advice',
    })
  })

  it("runs in the order of Archi's Validator.validate", () => {
    expect(CHECK_IDS).toEqual([
      'invalid-relations',
      'unused-elements',
      'unused-relations',
      'empty-views',
      'viewpoint',
      'nesting',
      'duplicate-elements',
      'junctions',
    ])
  })

  describe('InvalidRelationsChecker', () => {
    it('reports a drawn relationship ArchiMate does not allow, and nothing else', () => {
      const workspace = clean()
      expect(
        validateRelationship('BusinessActor', 'Composition', 'ApplicationComponent').valid,
      ).toBe(false)
      workspace.relationships.push(relationship('r-bad', 'Composition', 'actor', 'app'))
      main(workspace).connections.push(line('c-bad', 'r-bad', 'n-actor', 'n-app'))
      expect(tripped(workspace)).toEqual(['invalid-relations'])
      expect(findingsOf(workspace, 'invalid-relations')).toEqual([
        expect.objectContaining({
          severity: 'error',
          code: 'relationship.invalid',
          subjectId: 'r-bad',
          subjectKind: 'relationship',
        }),
      ])
    })

    it('leaves a relationship between elements of types ArchiMate does not have to Archipelago', () => {
      const workspace = clean()
      workspace.elements.push(
        { ...element('x1', 'BusinessObject', 'One'), type: 'Gadget' as ElementType },
        { ...element('x2', 'BusinessObject', 'Two'), type: 'Gadget' as ElementType },
      )
      workspace.relationships.push(relationship('r-x', 'Serving', 'x1', 'x2'))
      main(workspace).nodes.push(shape('n-x1', 'x1'), shape('n-x2', 'x2'))
      main(workspace).connections.push(line('c-x', 'r-x', 'n-x1', 'n-x2'))
      expect(runValidator(workspace).map((f) => f.code)).toEqual([
        'element.unknown-type',
        'element.unknown-type',
      ])
    })

    it('is the check validate() has always run, so the importers still see it', () => {
      const workspace = clean()
      workspace.relationships.push(relationship('r-bad', 'Composition', 'actor', 'app'))
      expect(validate(workspace).errors.map((f) => f.code)).toEqual(['relationship.invalid'])
    })
  })

  describe('JunctionsChecker', () => {
    /**
     * A junction joining Flows, inside a Grouping. `isValidRelationship` lets
     * a Grouping's Aggregation of a junction through, so every relationship is
     * valid; `JunctionsChecker` compares every relationship's `eClass` with no
     * such exception, so it alone reports the junction.
     */
    function grouped(): Workspace {
      const workspace = clean()
      workspace.elements.push(
        element('j', 'Junction', ''),
        element('next', 'BusinessProcess', 'Pay claim'),
        element('group', 'Grouping', 'Payments'),
      )
      workspace.relationships.push(
        relationship('r-in', 'Flow', 'process', 'j'),
        relationship('r-out', 'Flow', 'j', 'next'),
        relationship('r-holds', 'Aggregation', 'group', 'j'),
      )
      main(workspace).nodes.push(
        shape('n-j', 'j'),
        shape('n-next', 'next'),
        shape('n-group', 'group'),
      )
      main(workspace).connections.push(
        line('c-in', 'r-in', 'n-process', 'n-j'),
        line('c-out', 'r-out', 'n-j', 'n-next'),
        line('c-holds', 'r-holds', 'n-group', 'n-j'),
      )
      return workspace
    }

    it('reports a junction whose relationships are of two types, once, and nothing else', () => {
      const workspace = grouped()
      expect(tripped(workspace)).toEqual(['junctions'])
      expect(findingsOf(workspace, 'junctions')).toEqual([
        expect.objectContaining({
          severity: 'error',
          code: 'junction.mixed-types',
          subjectId: 'j',
          subjectKind: 'element',
        }),
      ])
    })

    it('does not report a junction whose relationships are all of one type', () => {
      const workspace = grouped()
      workspace.relationships = workspace.relationships.filter((r) => r.id !== 'r-holds')
      main(workspace).connections = main(workspace).connections.filter((c) => c.id !== 'c-holds')
      main(workspace).nodes = main(workspace).nodes.filter((n) => n.id !== 'n-group')
      workspace.elements = workspace.elements.filter((e) => e.id !== 'group')
      expect(main(workspace).nodes.some((n) => n.id === 'n-j')).toBe(true)
      expect(tripped(workspace)).toEqual([])
    })
  })

  describe('DuplicateElementChecker', () => {
    function withProcess(name: string, type: ElementType = 'BusinessProcess'): Workspace {
      const workspace = clean()
      workspace.elements.push(element('other', type, name))
      main(workspace).nodes.push(shape('n-other', 'other'))
      return workspace
    }

    it('reports both elements of one type that share a name, and nothing else', () => {
      const workspace = withProcess('Handle claim')
      expect(tripped(workspace)).toEqual(['duplicate-elements'])
      expect(findingsOf(workspace, 'duplicate-elements')).toEqual([
        expect.objectContaining({ severity: 'warning', subjectId: 'process' }),
        expect.objectContaining({ severity: 'warning', subjectId: 'other' }),
      ])
    })

    // isDuplicate: StringUtils.safeString(a).equals(safeString(b)) && a.eClass() == b.eClass().
    it.each([
      ['another case', 'handle claim'],
      ['a trailing space', 'Handle claim '],
      ['a leading space', ' Handle claim'],
    ])('compares names exactly, so a name differing by %s is no duplicate', (_, name) => {
      const workspace = withProcess(name)
      expect(workspace.elements.map((e) => e.name)).toContain(name)
      expect(tripped(workspace)).toEqual([])
    })

    it('compares the type exactly, so a function named like a process is no duplicate', () => {
      expect(tripped(withProcess('Handle claim', 'BusinessFunction'))).toEqual([])
    })

    it('counts two unnamed elements of one type as duplicates, as safeString makes them', () => {
      const workspace = clean()
      workspace.elements.push(
        element('a', 'BusinessObject', ''),
        element('b', 'BusinessObject', ''),
      )
      main(workspace).nodes.push(shape('n-a', 'a'), shape('n-b', 'b'))
      expect(findingsOf(workspace, 'duplicate-elements').map((f) => f.subjectId)).toEqual([
        'a',
        'b',
      ])
    })

    it('leaves elements of a type ArchiMate does not have to Archipelago’s own finding', () => {
      const workspace = clean()
      workspace.elements.push(
        { ...element('x1', 'BusinessObject', 'Odd'), type: 'Gadget' as ElementType },
        { ...element('x2', 'BusinessObject', 'Odd'), type: 'Gadget' as ElementType },
      )
      main(workspace).nodes.push(shape('n-x1', 'x1'), shape('n-x2', 'x2'))
      expect(runValidator(workspace).map((f) => f.code)).toEqual([
        'element.unknown-type',
        'element.unknown-type',
      ])
    })

    it('never counts two junctions as duplicates', () => {
      const workspace = clean()
      workspace.elements.push(element('j1', 'Junction', ''), element('j2', 'Junction', ''))
      main(workspace).nodes.push(shape('n-j1', 'j1'), shape('n-j2', 'j2'))
      expect(runChecks(workspace, new Set(['unused-elements', 'duplicate-elements']))).toEqual([])
    })

    it("reports in the order of Archi's pairwise scan: each group whole, at its first member", () => {
      const workspace = clean()
      workspace.elements.push(
        element('a1', 'BusinessObject', 'A'),
        element('b1', 'BusinessObject', 'B'),
        element('b2', 'BusinessObject', 'B'),
        element('a2', 'BusinessObject', 'A'),
      )
      expect(findingsOf(workspace, 'duplicate-elements').map((f) => f.subjectId)).toEqual([
        'a1',
        'a2',
        'b1',
        'b2',
      ])
    })
  })

  describe('UnusedElementsChecker', () => {
    it('reports an element no view draws, and nothing else', () => {
      const workspace = clean()
      workspace.elements.push(element('lonely', 'BusinessObject', 'Claim form'))
      expect(tripped(workspace)).toEqual(['unused-elements'])
      expect(findingsOf(workspace, 'unused-elements')).toEqual([
        expect.objectContaining({
          severity: 'warning',
          code: 'element.unused',
          subjectId: 'lonely',
          subjectKind: 'element',
        }),
      ])
    })

    it('does not report an element drawn in one view only', () => {
      const workspace = clean()
      workspace.elements.push(element('lonely', 'BusinessObject', 'Claim form'))
      workspace.views.push({
        id: 'view-other',
        name: 'Other',
        properties: {},
        nodes: [shape('n-lonely', 'lonely')],
        connections: [],
      })
      expect(tripped(workspace)).toEqual([])
    })
  })

  describe('UnusedRelationsChecker', () => {
    it('reports a relationship no view draws, and nothing else', () => {
      const workspace = clean()
      expect(validateRelationship('ApplicationComponent', 'Serving', 'BusinessRole').valid).toBe(
        true,
      )
      workspace.relationships.push(relationship('r-hidden', 'Serving', 'app', 'role'))
      expect(tripped(workspace)).toEqual(['unused-relations'])
      expect(findingsOf(workspace, 'unused-relations')).toEqual([
        expect.objectContaining({
          severity: 'warning',
          code: 'relationship.unused',
          subjectId: 'r-hidden',
          subjectKind: 'relationship',
        }),
      ])
    })

    it('names an unnamed relationship by what it joins, and a named one by its name', () => {
      const workspace = clean()
      workspace.relationships.push(relationship('r-hidden', 'Serving', 'app', 'role'), {
        ...relationship('r-named', 'Serving', 'app', 'actor'),
        name: 'Self-service',
      })
      expect(findingsOf(workspace, 'unused-relations').map((f) => f.message)).toEqual([
        'Serving from "Claims system" to "Claims handler" is not used in a view.',
        '"Self-service" is not used in a view.',
      ])
    })

    it('does not report a relationship whose only line the nesting hides', () => {
      // c-assign joins the clerk to the role nested in it: hidden on the canvas (#96), drawn all the same.
      expect(main(clean()).connections.map((c) => c.id)).toContain('c-assign')
      expect(findingsOf(clean(), 'unused-relations')).toEqual([])
    })
  })

  describe('ViewpointChecker', () => {
    function organization(...nodes: ElementNode[]): Workspace {
      const workspace = clean()
      workspace.views.push({
        id: 'view-org',
        name: 'Org chart',
        viewpoint: 'Organization',
        properties: {},
        nodes,
        connections: [],
      })
      return workspace
    }

    it("reports each shape whose type the view's viewpoint does not allow, and nothing else", () => {
      const workspace = organization(shape('o-actor', 'actor'), shape('o-app', 'app'))
      expect(tripped(workspace)).toEqual(['viewpoint'])
      expect(findingsOf(workspace, 'viewpoint')).toEqual([
        expect.objectContaining({
          severity: 'warning',
          code: 'view.viewpoint-concept',
          subjectId: 'o-app',
          subjectKind: 'node',
          viewId: 'view-org',
        }),
      ])
    })

    it('reports a shape nested at any depth', () => {
      const workspace = organization(shape('o-actor', 'actor'), shape('o-app', 'app', 'o-actor'))
      workspace.relationships.push(relationship('r-app-assigned', 'Assignment', 'actor', 'app'))
      main(workspace).connections.push(line('c-app-assigned', 'r-app-assigned', 'n-actor', 'n-app'))
      expect(findingsOf(workspace, 'viewpoint').map((f) => f.subjectId)).toEqual(['o-app'])
    })

    it('does not report the types every viewpoint allows, nor a view whose viewpoint is unknown', () => {
      const workspace = organization(shape('o-actor', 'actor'))
      workspace.elements.push(element('j', 'Junction', ''), element('g', 'Grouping', 'Team'))
      workspace.views[1]!.nodes.push(shape('o-j', 'j'), shape('o-g', 'g'))
      workspace.views.push({
        id: 'view-future',
        name: 'From a newer tool',
        viewpoint: 'Something Archi 6 adds',
        properties: {},
        nodes: [shape('f-app', 'app')],
        connections: [],
      })
      expect(workspace.views[1]!.nodes).toHaveLength(3)
      expect(findingsOf(workspace, 'viewpoint')).toEqual([])
    })

    it('leaves a shape of a type ArchiMate does not have to Archipelago’s own finding', () => {
      const workspace = organization(shape('o-odd', 'odd'))
      workspace.elements.push({
        ...element('odd', 'BusinessObject', 'Odd'),
        type: 'Gadget' as ElementType,
      })
      expect(runValidator(workspace).map((f) => f.code)).toEqual(['element.unknown-type'])
    })

    it('never reports a relationship, though Archi has a message for one', () => {
      // Organization allows neither a process nor the application serving it; the line is not reported.
      const workspace = organization(shape('o-process', 'process'), shape('o-app', 'app'))
      workspace.views[1]!.connections.push(line('o-serves', 'r-serves', 'o-app', 'o-process'))
      expect(findingsOf(workspace, 'viewpoint').map((f) => f.subjectKind)).toEqual(['node', 'node'])
    })
  })

  describe('EmptyViewsChecker', () => {
    it('reports a view with nothing in it, and nothing else', () => {
      const workspace = clean()
      workspace.views.push({
        id: 'view-empty',
        name: 'Blank',
        properties: {},
        nodes: [],
        connections: [],
      })
      expect(tripped(workspace)).toEqual(['empty-views'])
      expect(findingsOf(workspace, 'empty-views')).toEqual([
        expect.objectContaining({
          severity: 'advice',
          code: 'view.empty',
          subjectId: 'view-empty',
          subjectKind: 'view',
        }),
      ])
    })

    it('does not report a view holding only a note, as getChildren() is not empty', () => {
      const workspace = clean()
      workspace.views.push({
        id: 'view-note',
        name: 'To do',
        properties: {},
        nodes: [
          {
            id: 'note',
            kind: 'note',
            text: 'Draw this',
            bounds: { x: 0, y: 0, width: 1, height: 1 },
          },
        ],
        connections: [],
      })
      expect(workspace.views).toHaveLength(2)
      expect(tripped(workspace)).toEqual([])
    })
  })

  describe('NestedElementsChecker', () => {
    it('reports a shape nested in one whose element it has no relationship with, and nothing else', () => {
      const workspace = clean()
      main(workspace).nodes.find((n) => n.id === 'n-process')!.parent = 'n-actor'
      expect(tripped(workspace)).toEqual(['nesting'])
      expect(findingsOf(workspace, 'nesting')).toEqual([
        expect.objectContaining({
          severity: 'advice',
          code: 'view.nesting-without-relationship',
          subjectId: 'n-process',
          subjectKind: 'node',
          viewId: 'view-main',
        }),
      ])
    })

    it('does not report a nesting backed by a Composition', () => {
      const workspace = clean()
      workspace.elements.push(element('part', 'ApplicationComponent', 'Claims engine'))
      workspace.relationships.push(relationship('r-part', 'Composition', 'app', 'part'))
      main(workspace).nodes.push(shape('n-part', 'part', 'n-app'))
      main(workspace).connections.push(line('c-part', 'r-part', 'n-app', 'n-part'))
      expect(main(workspace).nodes.find((n) => n.id === 'n-part')?.parent).toBe('n-app')
      expect(tripped(workspace)).toEqual([])
    })

    it('does not report a nesting backed by a Specialization from the child to the parent', () => {
      const workspace = clean()
      workspace.elements.push(element('kind', 'ApplicationComponent', 'Claims portal'))
      workspace.relationships.push(relationship('r-kind', 'Specialization', 'kind', 'app'))
      main(workspace).nodes.push(shape('n-kind', 'kind', 'n-app'))
      main(workspace).connections.push(line('c-kind', 'r-kind', 'n-kind', 'n-app'))
      expect(tripped(workspace)).toEqual([])
    })

    it("accepts a nesting type the wrong way round when no line draws it, as Archi's model test does", () => {
      const workspace = clean()
      workspace.elements.push(element('whole', 'ApplicationComponent', 'Claims suite'))
      // The suite is composed of the system, but the system's shape holds the suite's.
      workspace.relationships.push(relationship('r-whole', 'Composition', 'whole', 'app'))
      main(workspace).nodes.push(shape('n-whole', 'whole', 'n-app'))
      expect(runChecks(workspace, new Set(['nesting']))).toEqual([])
    })

    it('reports that same nesting when a line draws it the wrong way round', () => {
      const workspace = clean()
      workspace.elements.push(element('whole', 'ApplicationComponent', 'Claims suite'))
      workspace.relationships.push(relationship('r-whole', 'Composition', 'whole', 'app'))
      main(workspace).nodes.push(shape('n-whole', 'whole', 'n-app'))
      main(workspace).connections.push(line('c-whole', 'r-whole', 'n-whole', 'n-app'))
      expect(findingsOf(workspace, 'nesting').map((f) => f.subjectId)).toEqual(['n-whole'])
    })

    it('reports a nesting whose shapes a line of another type joins, whatever else the model holds', () => {
      const workspace = clean()
      // The role's Assignment backs its nesting in the clerk; a drawn Association between them still trips it.
      workspace.relationships.push(relationship('r-assoc', 'Association', 'actor', 'role'))
      main(workspace).connections.push(line('c-assoc', 'r-assoc', 'n-actor', 'n-role'))
      expect(tripped(workspace)).toEqual(['nesting'])
      expect(findingsOf(workspace, 'nesting').map((f) => f.subjectId)).toEqual(['n-role'])
    })

    it("never reports a junction's shape", () => {
      const workspace = clean()
      workspace.elements.push(element('j', 'Junction', ''))
      workspace.relationships.push(relationship('r-j', 'Assignment', 'role', 'j'))
      main(workspace).nodes.push(shape('n-j', 'j', 'n-process'))
      main(workspace).connections.push(line('c-j', 'r-j', 'n-role', 'n-j'))
      expect(main(workspace).nodes.find((n) => n.id === 'n-j')?.parent).toBe('n-process')
      expect(findingsOf(workspace, 'nesting')).toEqual([])
    })

    it('leaves a shape whose element is missing to Archipelago’s own finding', () => {
      const workspace = clean()
      main(workspace).nodes.push(
        shape('n-ghost', 'ghost', 'n-actor'),
        shape('n-in-ghost', 'role', 'n-ghost'),
      )
      // The ghost's shape is nested in the clerk's, and the role's in the ghost's.
      expect(runValidator(workspace).map((f) => f.code)).toEqual(['view.dangling-element'])
    })

    it('does not look through a group: only a shape directly inside an element counts', () => {
      const workspace = clean()
      main(workspace).nodes.push({
        id: 'box',
        kind: 'group',
        name: 'Box',
        parent: 'n-actor',
        bounds: { x: 0, y: 0, width: 1, height: 1 },
      })
      main(workspace).nodes.find((n) => n.id === 'n-process')!.parent = 'box'
      expect(findingsOf(workspace, 'nesting')).toEqual([])
    })
  })

  describe('switching checks off', () => {
    it('runs only the checks it is given, and always runs Archipelago’s own', () => {
      const workspace = clean()
      workspace.elements.push(element('lonely', 'BusinessObject', 'Claim form'))
      workspace.views.push({
        id: 'view-empty',
        name: 'Blank',
        properties: {},
        nodes: [],
        connections: [],
      })
      workspace.relationships.push(relationship('r-dangling', 'Serving', 'app', 'gone'))
      const all = runValidator(workspace).map((f) => f.check ?? f.code)
      expect(all).toEqual(
        expect.arrayContaining(['relationship.dangling-target', 'unused-elements', 'empty-views']),
      )
      const some = runValidator(workspace, new Set(['empty-views'])).map((f) => f.check ?? f.code)
      expect(some).toContain('empty-views')
      expect(some).toContain('relationship.dangling-target')
      expect(some).not.toContain('unused-elements')
    })
  })
})
