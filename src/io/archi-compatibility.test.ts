import { describe, expect, it } from 'vitest'
import type { Workspace } from '@/model'
import { archiVersionNumber, compatibilityOf } from './archi-compatibility'
import { importArchimate } from './archimate-native'
import base from './fixtures/archi-compatibility.archimate?raw'
import openDay from './fixtures/archi-legacy-open-day.archimate?raw'
import type { ImportProblem, ImportResult } from './problems'

/**
 * Archi's version-keyed compatibility handlers, read as Archi 5.10 applies them
 * (#118).
 *
 * The evidence is Archi's own. `archi-compatibility.archimate` is one model Archi
 * 5.10 saved. `scripts/fixtures/export-with-archi.sh` opened it under each version
 * below, just below and at each handler's threshold, and saved what Archi made of
 * it to `archi-compatibility/<version>.archimate`, at Archi's current version, so
 * no handler runs on it again. Reading the older model must give what reading
 * Archi's save gives: removing any one handler, or moving a threshold, fails here.
 */

const EVIDENCE = import.meta.glob<string>('./fixtures/archi-compatibility/*.archimate', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const evidence = (name: string): string => {
  const xml = EVIDENCE[`./fixtures/archi-compatibility/${name}.archimate`]
  if (xml === undefined) throw new Error(`no evidence for ${name}`)
  return xml
}

/** The model under `version` (or none), derived as the script derives it. */
const at = (version: string | undefined): string =>
  base.replace('version="5.0.0"', version === undefined ? '' : `version="${version}"`)

function workspaceOf(result: ImportResult): Workspace {
  if (!result.workspace) throw new Error(JSON.stringify(result.problems))
  return result.workspace
}

/** Archi appends what it moves to the end of a folder: the order of a list is not what is compared. */
const byId = <T extends { id: string }>(items: readonly T[]) =>
  [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
const comparable = (workspace: Workspace) => ({
  ...workspace,
  elements: byId(workspace.elements),
  relationships: byId(workspace.relationships),
  folders: byId(workspace.folders),
})
const said = (problems: readonly ImportProblem[]) =>
  problems
    .filter((p) => p.code !== 'archimate.archi-compatibility')
    .map((p) => `${p.code}: ${p.message}`)
    .sort()
const compatibility = (result: ImportResult) =>
  result.problems.find((p) => p.code === 'archimate.archi-compatibility')?.message

const VERSIONS: [file: string, version: string | undefined, handlers: string][] = [
  ['none', undefined, 'every one'],
  ['2.9.9', '2.9.9', 'sizes, 2→3, alignment, figures'],
  ['3.0.0', '3.0.0', '2→3, alignment, figures'],
  ['3.9.9', '3.9.9', '2→3, alignment, figures'],
  ['4.0.0', '4.0.0', 'alignment, figures'],
  ['4.0.1', '4.0.1', 'alignment, opacity, figures'],
  ['4.0.2', '4.0.2', 'alignment, figures'],
  ['4.3.9', '4.3.9', 'alignment, figures'],
  ['4.4.0', '4.4.0', 'opacity, figures'],
  ['4.4.1', '4.4.1', 'figures'],
  ['4.4.0.1', '4.4.0.1', 'every one'],
  ['4.9.9', '4.9.9', 'figures'],
]

describe('an older model reads as Archi 5.10 saved it (#118)', () => {
  it('has evidence for every version, and the model as saved runs no handler', () => {
    expect(Object.keys(EVIDENCE)).toHaveLength(VERSIONS.length + 1)
    expect(base).toContain('version="5.0.0"')
    expect(compatibility(importArchimate(base))).toBeUndefined()
  })

  it.each(VERSIONS)('version %s (handlers: %s)', (file, version) => {
    const older = importArchimate(at(version))
    const saved = importArchimate(evidence(file))
    expect(older.ok).toBe(true)
    expect(comparable(workspaceOf(older))).toEqual(comparable(workspaceOf(saved)))
    expect(said(older.problems)).toEqual(said(saved.problems))
    // Archi's save is at its own version, which no handler touches.
    expect(compatibility(saved)).toBeUndefined()
  })

  it('reads Archi 2.0.0’s Open Day as Archi 5.10 saved it', () => {
    const older = importArchimate(openDay)
    const saved = importArchimate(evidence('open-day'))
    expect(comparable(workspaceOf(older))).toEqual(comparable(workspaceOf(saved)))
    expect(compatibility(older)).toContain('“1.1.1”')
    // Its 8 groups among them, each grown to hold what is in it, and labelled left.
    expect(compatibility(older)).toContain('21 shapes without a size were sized')
    expect(compatibility(older)).toContain('8 group and Grouping labels aligned centre')
  })
})

describe('each handler, as the evidence shows it', () => {
  const node = (xml: string, id: string) =>
    workspaceOf(importArchimate(xml))
      .views.flatMap((view) => view.nodes)
      .find((n) => n.id === id)

  it('below 3.0.0, sizes an unsized shape as Archi did, growing a container to hold its children', () => {
    // The image Archipelago does not draw still counts, at 200 × 150: 450 + 200 + 10.
    expect(node(at('2.9.9'), 'o-group-grown')?.bounds).toMatchObject({ width: 660, height: 270 })
    expect(node(at('2.9.9'), 'o-role-container')?.bounds).toMatchObject({ width: 205, height: 150 })
    // A Grouping is the legacy 120 × 55; one side set is not enough to keep it.
    expect(node(at('2.9.9'), 'o-grouping-absent')?.bounds).toMatchObject({ width: 120, height: 55 })
    expect(node(at('2.9.9'), 'o-location-wide')?.bounds).toMatchObject({ width: 120, height: 55 })
    expect(node(at('3.0.0'), 'o-group-grown')?.bounds).toMatchObject({ width: 400, height: 140 })
    expect(node(at('3.0.0'), 'o-location-wide')?.bounds).toMatchObject({ width: 200, height: 55 })
  })

  it('below 4.0.0, empties the Connectors and Derived Relations folders and moves elements out of Business', () => {
    const older = workspaceOf(importArchimate(at('3.9.9')))
    const folder = (id: string) => older.folders.find((f) => f.id === id)
    expect(folder('f-old-junctions')?.root).toBe('other')
    expect(folder('f-older-derived')?.root).toBe('relations')
    for (const id of ['e-location', 'e-meaning', 'e-value']) {
      expect(older.elements.find((e) => e.id === id)?.folder).toBeUndefined()
    }
    expect(older.elements.find((e) => e.id === 'e-role')?.folder).toBe('f-places')
    const current = workspaceOf(importArchimate(at('4.0.0')))
    expect(current.folders.find((f) => f.id === 'f-older-derived')?.root).toBe('other')
    expect(current.elements.find((e) => e.id === 'e-location')?.folder).toBe('f-places')
  })

  it('below 4.4.0, aligns a group’s or Grouping’s centred label left, and leaves any other', () => {
    const alignment = (version: string, id: string) =>
      node(at(version), id)?.appearance?.textAlignment
    for (const id of [
      'o-group-grown',
      'o-group-centre',
      'o-grouping-absent',
      'o-grouping-centre',
    ]) {
      expect(alignment('4.3.9', id), id).toBe('left')
      expect(alignment('4.4.0', id), id).toBe('center')
    }
    expect(alignment('4.3.9', 'o-group-right')).toBe('right')
    expect(alignment('4.3.9', 'o-note')).toBe('center')
  })

  it('at exactly 4.0.1 and 4.4.0, sets every shape’s outline opacity to its fill opacity', () => {
    const line = (version: string, id: string) => node(at(version), id)?.appearance?.lineColor
    for (const version of ['4.0.1', '4.4.0']) {
      expect(line(version, 'o-meaning-alpha')).toBe('#ff000064')
      // Over the outline opacity it had: 200 becomes the fill's 100.
      expect(line(version, 'o-location-line-alpha')).toBe('#00ff0064')
    }
    for (const version of ['4.0.0', '4.0.2', '4.3.9', '4.4.1']) {
      expect(line(version, 'o-meaning-alpha')).toBe('#ff0000')
      expect(line(version, 'o-location-line-alpha')).toBe('#00ff00c8')
    }
  })

  it('below 5.0.0, reports the figure Archi swaps a Grouping, Meaning or Value to', () => {
    const appearance = (xml: string) =>
      importArchimate(xml).problems.find((p) => p.code === 'archimate.appearance-unsupported')
        ?.message
    expect(appearance(at('4.9.9'))).toContain('type')
    expect(appearance(base) ?? '').not.toContain('type')
  })
})

describe('what was changed is said (#118)', () => {
  it('lists each change with its count, under the file’s version', () => {
    const message = compatibility(importArchimate(at('2.9.9')))
    expect(message).toMatch(/^This file’s model version is “2\.9\.9”, and Archi 5\.10 changes/)
    expect(message).toContain('11 shapes without a size were sized as Archi sizes them')
    expect(message).toContain('5 group and Grouping labels aligned centre were aligned left')
    expect(message).toContain('the contents of the “Connectors” folder were filed under Other')
    expect(message).toContain(
      'the contents of the “Derived Relations” folder were filed under Relations',
    )
    expect(message).toContain('3 Location, Meaning and Value elements were moved')
    expect(message).not.toContain('outline opacity')
    expect(compatibility(importArchimate(at('4.4.0')))).toContain(
      '3 shapes’ outline opacity was set to their fill opacity',
    )
  })

  it('says a file with no version is read as older than every version', () => {
    expect(compatibility(importArchimate(at(undefined)))).toMatch(
      /^This file records no model version, which Archi treats as older than every version/,
    )
  })

  it('says nothing when no handler had anything to change', () => {
    // 4.4.1 swaps figures only, which the display-settings report already says.
    expect(compatibility(importArchimate(at('4.4.1')))).toBeUndefined()
  })
})

describe('top-level folders that are none of the fixed groups (#118)', () => {
  const withFolder = (folder: string, version = '5.0.0') =>
    `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:archimate="http://www.archimatetool.com/archimate" name="M" id="m" version="${version}">
  ${folder}
</archimate:model>`
  const warning = (xml: string) =>
    importArchimate(xml).problems.find((p) => p.code === 'archimate.folder-type-unknown')?.message

  it.each([
    ['<folder name="F" id="f"/>', 'is an ordinary folder, not one of Archi’s fixed groups'],
    [
      '<folder name="F" id="f" type="user"/>',
      'is an ordinary folder, not one of Archi’s fixed groups',
    ],
    [
      '<folder name="Connectors" id="f" type="connectors"/>',
      'has type "connectors", which an older Archi wrote and Archi 5.10 no longer has',
    ],
    [
      '<folder name="Derived Relations" id="f" type="derived"/>',
      'has type "derived", which an older Archi wrote and Archi 5.10 no longer has',
    ],
    [
      '<folder name="F" id="f" type="nonsense"/>',
      'has type "nonsense", which Archi 5.10 does not define',
    ],
  ])('%s', (folder, why) => {
    expect(warning(withFolder(folder))).toContain(why)
  })

  it('below 4.0.0, empties an older Archi’s own folder without a warning, and names one only if it held something', () => {
    const empty = importArchimate(
      withFolder('<folder name="Connectors" id="f" type="connectors"/>', '3.3.2'),
    )
    expect(empty.problems.map((p) => p.code)).not.toContain('archimate.folder-type-unknown')
    expect(compatibility(empty)).toBeUndefined()
    const held = importArchimate(
      withFolder(
        '<folder name="Connectors" id="f" type="connectors"><element xsi:type="archimate:Junction" id="j"/></folder>',
        '3.3.2',
      ),
    )
    expect(held.problems.map((p) => p.code)).not.toContain('archimate.folder-type-unknown')
    expect(compatibility(held)).toContain(
      'the contents of the “Connectors” folder were filed under Other',
    )
  })

  it('reads a folder Archi saved among a folder’s elements as that folder, with what it holds', () => {
    const workspace = workspaceOf(
      importArchimate(
        withFolder(`<folder name="Other" id="top-o" type="other">
    <element xsi:type="archimate:Folder" name="Kept" id="f-kept">
      <element xsi:type="archimate:Junction" id="j"/>
    </element>
  </folder>`),
      ),
    )
    expect(workspace.folders).toEqual([{ id: 'f-kept', name: 'Kept', root: 'other' }])
    expect(workspace.elements.map((e) => [e.id, e.folder])).toEqual([['j', 'f-kept']])
  })
})

describe('Archi’s version number (`StringUtils.versionNumberAsInt`)', () => {
  it.each([
    ['4.4', '4.4.0'],
    // Java's split drops a trailing empty part; Archi 5.10 opened 4.4. as 4.4.0.
    ['4.4.', '4.4.0'],
    ['+4.4.0', '4.4.0'],
  ])('reads %s as %s', (version, as) => {
    expect(archiVersionNumber(version)).toBe(archiVersionNumber(as))
  })

  it.each(['', '.', '4.4.0.1', '4.4.0-beta', ' 4.4.0', '4..0', '99999999999.0.0'])(
    'reads %j as 0, older than every threshold',
    (version) => {
      expect(archiVersionNumber(version)).toBe(0)
    },
  )

  it('orders as Archi does, by packed parts', () => {
    expect(archiVersionNumber('3.10.0')).toBeGreaterThan(archiVersionNumber('3.9.9'))
    expect(archiVersionNumber('4.0.0')).toBeGreaterThan(archiVersionNumber('3.255.255'))
  })

  it('an absent version is "", so every “older than” handler fires', () => {
    expect(compatibilityOf(undefined)).toEqual(compatibilityOf('2.9.9'))
    expect(compatibilityOf('5.0.0')).toEqual({
      defaultSizes: false,
      archimate2To3: false,
      leftAlignedGroups: false,
      outlineOpacity: false,
      alternateFigures: false,
    })
  })
})
