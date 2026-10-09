import { test, expect, openApp } from './support'

/**
 * Journey 12 — opening a shared folder (#147, part 2), with real directory
 * handles.
 *
 * No automation can drive the native folder picker, so the picker is replaced
 * by the origin-private file system (`navigator.storage.getDirectory()`): the
 * same `FileSystemDirectoryHandle` API, from a real implementation. What jsdom
 * cannot show is checked here: a real handle lists its files, survives being
 * stored in IndexedDB, and is offered again after a reload without the picker.
 */

test('a shared folder lists its models, and is offered again after a reload (#147)', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('archipelago.sharedFolders', 'on')
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: async () => {
        // Init scripts run again on reload; the tab's session remembers that the
        // picker was used, so a second use fails the journey.
        if (sessionStorage.getItem('picked')) throw new Error('the picker was used again')
        sessionStorage.setItem('picked', 'yes')
        const root = await navigator.storage.getDirectory()
        return root.getDirectoryHandle('Architecture', { create: true })
      },
    })
  })
  await openApp(page, 'folder')

  // A library as OneDrive leaves it: two models, a lock, a log and a conflict copy.
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    const folder = await root.getDirectoryHandle('Architecture', { create: true })
    for (const name of [
      'Landscape.json',
      'Landscape.json.lock',
      'Landscape-DESKTOP7.json',
      'Claims.json',
      '.archipelago-log-c1.jsonl',
    ]) {
      const file = await folder.getFileHandle(name, { create: true })
      const writable = await file.createWritable()
      await writable.write('{}')
      await writable.close()
    }
  })

  await page.getByRole('button', { name: 'Open folder…' }).click()
  const form = page.getByRole('form', { name: 'Your name on the lock' })
  await form.getByLabel(/Your name/).fill('Markus')
  await form.getByRole('button', { name: 'Continue' }).click()

  const models = page.getByRole('region', { name: 'Models in Architecture' })
  await expect(models.getByRole('listitem')).toHaveText([
    'Claims.json',
    'Landscape.json',
    /Landscape-DESKTOP7\.json may be a copy of Landscape\.json/,
  ])

  // After a reload the folder is offered again, from IndexedDB, without the picker.
  await page.reload()
  const before = page.getByRole('region', { name: 'Folders opened before' })
  await before.getByRole('button', { name: 'Open Architecture' }).click()
  await expect(models.getByRole('listitem')).toHaveCount(3)
  // The name was kept too: no second prompt. And nothing went wrong on the way.
  await expect(form).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.evaluate(() => sessionStorage.getItem('picked'))).toBe('yes')
})
