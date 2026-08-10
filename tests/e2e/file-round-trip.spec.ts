import { writeFile } from 'node:fs/promises'
import {
  test,
  expect,
  loadDemo,
  saveWorkspaceFile,
  importWorkspaceFile,
  inventoryCounts,
  modelCounts,
  dirtyCount,
  DEMO,
} from './support'

/**
 * Journey 5 — file round trip.
 *
 * Files are the source of truth (concept §5.2) and canonical JSON has to be
 * deterministic (ADR 0004), which together make one assertion worth more than
 * any count: export → import → export must be **byte-identical**. If it is not,
 * the format is not git-friendly and browser storage has quietly become the
 * real repository.
 *
 * Manual counterpart: `tests/manual/file-round-trip.md`.
 */

test('export, reimport and export again produces the same bytes', async ({ page }, testInfo) => {
  await loadDemo(page)
  expect(await dirtyCount(page)).toBeGreaterThan(0)

  const exported = await saveWorkspaceFile(page, testInfo.outputPath('first-export.json'))

  // Saving is the only thing that clears the counter — it means "differs from
  // the file", and now it does not.
  expect(await dirtyCount(page)).toBe(0)
  await expect(page.getByRole('status')).toContainText('Downloaded archisurance.json')

  const parsed: unknown = JSON.parse(exported)
  expect(parsed).toMatchObject({
    schemaVersion: 1,
    id: 'ws-archisurance-demo',
    name: 'ArchiSurance',
  })
  expect(exported.endsWith('\n')).toBe(true)

  await importWorkspaceFile(page, testInfo.outputPath('first-export.json'))

  // An import with nothing to report closes its own dialog; the report only
  // stays up when there is something the user needs to know.
  await expect(page.getByRole('dialog', { name: 'Import' })).toBeHidden()

  expect(await inventoryCounts(page)).toEqual({ shown: DEMO.elements, total: DEMO.elements })
  // Relationships come back too, which the element count alone would not show.
  await expect(modelCounts(page)).toContainText(
    `${DEMO.elements} elements · ${DEMO.relationships} relations`,
  )

  const reexported = await saveWorkspaceFile(page, testInfo.outputPath('second-export.json'))
  expect(reexported).toBe(exported)
})

test('an unreadable file is reported rather than swallowed', async ({ page }, testInfo) => {
  await loadDemo(page)

  const junk = testInfo.outputPath('not-a-model.json')
  await writeFile(junk, '{ "elements": [ }', 'utf8')

  await importWorkspaceFile(page, junk)

  const dialog = page.getByRole('dialog', { name: 'Import' })
  await expect(dialog).toContainText('Nothing could be read from that file.')
  await expect(dialog).toContainText('not valid JSON')

  // The workspace that was already open is untouched.
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(await inventoryCounts(page)).toEqual({ shown: DEMO.elements, total: DEMO.elements })
})
