import { describe, expect, it } from 'vitest'
import type { Workspace } from '@/model'
import { importArchimate } from './archimate-native'
import openDay from './fixtures/archi-legacy-open-day.archimate?raw'
import type { ImportResult } from './problems'

/**
 * Files an older Archi wrote, read as Archi 5.10 reads them (#105).
 *
 * The rename table is `ConverterExtendedMetadata.TYPE_MAP` in Archi's own
 * source (see `LEGACY_TYPES`). The fixture is the "Open Day" example that
 * shipped with Archi 2.0.0, vendored unmodified with its MIT notice
 * (`archi-legacy-open-day.NOTICE.md`). Archi 5.10.0 opened it and saved it with
 * 27 elements, 39 relationships, 4 views and 47 connections, dropping nothing.
 *
 * Archi applies the table to every file it loads, whatever the namespace: the
 * same file moved into the current namespace came out of Archi converted just
 * the same. So does this reader (sponsor's call on #105, replacing the issue's
 * fourth criterion, which assumed otherwise).
 */

function workspaceOf(result: ImportResult): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

const codes = (result: ImportResult) => result.problems.map((p) => p.code)
const message = (result: ImportResult, code: string) =>
  result.problems.find((p) => p.code === code)?.message

const LEGACY = 'http://www.bolton.ac.uk/archimate'
const CURRENT = 'http://www.archimatetool.com/archimate'

/** A model holding `elements` in one folder, in the namespace given. */
function model(namespace: string, elements: string, version = '2.6.0'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="${namespace}" name="M" id="m" version="${version}">
  <folder name="Other" id="f-other" type="other">
${elements}
  </folder>
</archimate:model>`
}

const typeOf = (workspace: Workspace, id: string) =>
  workspace.elements.find((e) => e.id === id)?.type ??
  workspace.relationships.find((r) => r.id === id)?.type

describe('Archi 2.0.0’s Open Day example (#105)', () => {
  const result = importArchimate(openDay)
  const workspace = workspaceOf(result)

  it('is a legacy-namespace file in the old vocabulary, as checked in', () => {
    expect(openDay).toContain(`xmlns:archimate="${LEGACY}"`)
    expect(openDay.match(/archimate:UsedByRelationship/g)).toHaveLength(15)
    expect(openDay.match(/archimate:RealisationRelationship/g)).toHaveLength(4)
    expect(openDay.match(/xsi:type="archimate:DiagramModel"/g)).toHaveLength(4)
    expect(openDay.match(/ relationship="/g)).toHaveLength(47)
  })

  it('reads what Archi 5.10 reads: 27 elements, 39 relationships, 4 views, 47 connections', () => {
    expect(result.ok).toBe(true)
    expect(workspace.elements).toHaveLength(27)
    expect(workspace.relationships).toHaveLength(39)
    expect(workspace.views).toHaveLength(4)
    expect(workspace.views.flatMap((view) => view.nodes)).toHaveLength(54)
    expect(workspace.views.flatMap((view) => view.connections)).toHaveLength(47)
    const serving = workspace.relationships.filter((r) => r.type === 'Serving')
    const realization = workspace.relationships.filter((r) => r.type === 'Realization')
    expect(serving).toHaveLength(15)
    expect(realization).toHaveLength(4)
    expect(codes(result)).not.toContain('archimate.unknown-type')
    expect(codes(result)).not.toContain('archimate.dangling-view-connection')
  })

  it('says what it converted', () => {
    const said = message(result, 'archimate.legacy-names-converted')
    expect(said).toContain('UsedByRelationship as ServingRelationship (15)')
    expect(said).toContain('RealisationRelationship as RealizationRelationship (4)')
    expect(said).toContain('DiagramModel as ArchimateDiagramModel (4)')
    expect(said).toContain('relationship as archimateRelationship (47)')
  })
})

describe('the rename table, name by name (#105)', () => {
  // What Archi 5.10.0 saved each legacy element as, from a file it loaded and
  // re-saved (scratch model, Archi's command line, 2026-10-05).
  const elements: [string, string][] = [
    ['BusinessActivity', 'BusinessProcess'],
    ['InfrastructureService', 'TechnologyService'],
    ['Network', 'CommunicationNetwork'],
    ['CommunicationPath', 'Path'],
    ['InfrastructureInterface', 'TechnologyInterface'],
    ['InfrastructureFunction', 'TechnologyFunction'],
    ['AndJunction', 'Junction'],
    ['OrJunction', 'Junction'],
  ]

  it.each([LEGACY, CURRENT])('reads each legacy element name in %s', (namespace) => {
    const xml = model(
      namespace,
      elements
        .map(
          ([legacy], i) =>
            `    <element xsi:type="archimate:${legacy}" name="${legacy}" id="e${i}"/>`,
        )
        .join('\n'),
    )
    const result = importArchimate(xml)
    const workspace = workspaceOf(result)
    expect(elements.map((_, i) => typeOf(workspace, `e${i}`))).toEqual(
      elements.map(([, now]) => now),
    )
    expect(codes(result)).not.toContain('archimate.unknown-type')
  })

  it('reads the British spellings of the two relationships', () => {
    const xml = model(
      CURRENT,
      `    <element xsi:type="archimate:TechnologyService" name="A" id="a"/>
    <element xsi:type="archimate:TechnologyService" name="B" id="b"/>
    <element xsi:type="archimate:RealisationRelationship" id="r1" source="a" target="b"/>
    <element xsi:type="archimate:SpecialisationRelationship" id="r2" source="a" target="b"/>`,
    )
    const workspace = workspaceOf(importArchimate(xml))
    expect(typeOf(workspace, 'r1')).toBe('Realization')
    expect(typeOf(workspace, 'r2')).toBe('Specialization')
  })

  it('maps only Archi’s own package, as Archi does', () => {
    // `ConverterExtendedMetadata.getType` maps only for the archimate package:
    // with endpoints, a converted one would have been kept as a relationship.
    const result = importArchimate(
      model(
        CURRENT,
        `    <element xsi:type="archimate:BusinessActor" name="A" id="a"/>
    <element xsi:type="archimate:BusinessRole" name="B" id="b"/>
    <element xsi:type="canvas:UsedByRelationship" id="x" source="a" target="b"/>`,
      ),
    )
    expect(workspaceOf(result).relationships).toEqual([])
    expect(codes(result)).not.toContain('archimate.legacy-names-converted')
  })

  it('counts only what it kept', () => {
    // The second e1 is a duplicate, skipped and reported as one.
    const result = importArchimate(
      model(
        LEGACY,
        `    <element xsi:type="archimate:InfrastructureService" name="A" id="e1"/>
    <element xsi:type="archimate:InfrastructureService" name="B" id="e1"/>`,
      ),
    )
    expect(message(result, 'archimate.legacy-names-converted')).toContain(
      'InfrastructureService as TechnologyService (1)',
    )
  })

  it('says nothing for a file in today’s vocabulary', () => {
    const result = importArchimate(
      model(
        CURRENT,
        '    <element xsi:type="archimate:TechnologyService" name="A" id="e1"/>',
        '5.0.0',
      ),
    )
    expect(codes(result)).not.toContain('archimate.legacy-names-converted')
  })
})

describe('legacy junctions (#105)', () => {
  it('keeps an Or-junction an Or-junction, and says Archi 5.10 would not', () => {
    // Archi maps the OrJunction class to Junction and sets no kind, so Archi
    // 5.10 saved this file's or-junction as a plain (and) junction.
    const result = importArchimate(
      model(
        LEGACY,
        `    <element xsi:type="archimate:OrJunction" id="j-or"/>
    <element xsi:type="archimate:AndJunction" id="j-and"/>`,
      ),
    )
    const workspace = workspaceOf(result)
    expect(workspace.elements.find((e) => e.id === 'j-or')?.junctionKind).toBe('or')
    expect(workspace.elements.find((e) => e.id === 'j-and')?.junctionKind).toBeUndefined()
    const said = result.problems.find((p) => p.code === 'archimate.legacy-or-junction')
    expect(said?.subject).toBe('j-or')
    expect(said?.message).toContain('Archi 5.10 opens it as an And-junction')
  })
})

describe('the legacy connection attribute (#105)', () => {
  function view(attributes: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="${LEGACY}" name="M" id="m" version="2.6.0">
  <folder name="Business" id="fb" type="business">
    <element xsi:type="archimate:BusinessActor" name="A" id="a"/>
    <element xsi:type="archimate:BusinessRole" name="B" id="b"/>
  </folder>
  <folder name="Relations" id="fr" type="relations">
    <element xsi:type="archimate:AssignmentRelationship" id="r" source="a" target="b"/>
  </folder>
  <folder name="Views" id="fv" type="diagrams">
    <element xsi:type="archimate:DiagramModel" name="V" id="v">
      <child xsi:type="archimate:DiagramObject" id="na" archimateElement="a">
        <bounds x="0" y="0" width="120" height="55"/>
        <sourceConnection xsi:type="archimate:Connection" id="c" source="na" target="nb" ${attributes}/>
      </child>
      <child xsi:type="archimate:DiagramObject" id="nb" archimateElement="b">
        <bounds x="200" y="0" width="120" height="55"/>
      </child>
    </element>
  </folder>
</archimate:model>`
  }

  it('reads relationship as archimateRelationship', () => {
    const result = importArchimate(view('relationship="r"'))
    const [connection] = workspaceOf(result).views[0]!.connections
    expect(connection).toMatchObject({ kind: 'relationship', relationship: 'r' })
    expect(message(result, 'archimate.legacy-names-converted')).toContain(
      'relationship as archimateRelationship (1)',
    )
  })

  it('prefers archimateRelationship and reports a stray relationship as unread', () => {
    const result = importArchimate(view('archimateRelationship="r" relationship="x"'))
    const [connection] = workspaceOf(result).views[0]!.connections
    expect(connection).toMatchObject({ relationship: 'r' })
    expect(result.problems.find((p) => p.code === 'import.content-unread')?.message).toContain(
      'the attribute “relationship”',
    )
    // The view is a legacy DiagramModel, so the note is there, without the attribute.
    expect(message(result, 'archimate.legacy-names-converted')).not.toContain(
      'archimateRelationship',
    )
  })
})
