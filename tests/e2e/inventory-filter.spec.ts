import {
  test,
  expect,
  loadDemo,
  facetOption,
  facetCount,
  savedSearch,
  savedSearchCount,
  combinator,
  countsAfter,
  inventoryCounts,
  shownCount,
  waitForPersistedWorkspace,
  facetsIn,
  DEMO,
} from './support'

/**
 * Journey 3 — inventory filtering.
 *
 * The three combinators are the one piece of filter semantics a user has to
 * trust (UI spec §3.2, ADR UI-4), so they are asserted as identities over the
 * demo model rather than as memorised numbers: AND is the intersection, OR the
 * union, NOT the complement of the union. Those hold whatever the demo contains,
 * and they fail the moment the semantics drift.
 *
 * Manual counterpart: `tests/manual/inventory-filter.md`.
 */

const LAYER = 'Application'
const PHASE = 'End of Life'

test('a single facet filters to the count on its own chip', async ({ page }) => {
  await loadDemo(page)

  const applications = await facetCount(page, LAYER)
  expect(applications).toBeGreaterThan(0)

  await facetOption(page, LAYER).click()

  await expect(facetOption(page, LAYER)).toHaveAttribute('aria-pressed', 'true')
  // Rail counts are global, never co-filtered (ADR UI-5), so one facet on its own
  // returns exactly what its chip promised.
  expect(await countsAfter(page, '1 filter (AND)')).toEqual({
    shown: applications,
    total: DEMO.elements,
  })
  // Filter state lives in the URL, which is what makes a filtered view a link.
  // Each facet is percent-encoded before the join, so a value containing the
  // separator cannot split into two (#26) — decode rather than assert the
  // escaped spelling, which is an encoding detail and not the contract.
  expect(facetsIn(page.url())).toEqual(['layer:app'])
})

test('AND, OR and NOT compose the same two facets differently', async ({ page }) => {
  await loadDemo(page)

  const applications = await facetCount(page, LAYER)
  const endOfLife = await facetCount(page, PHASE)

  await facetOption(page, LAYER).click()
  await facetOption(page, PHASE).click()

  // AND: options OR within a group, groups AND together — the intersection.
  const and = (await countsAfter(page, '2 filters (AND)')).shown
  expect(and).toBeLessThanOrEqual(Math.min(applications, endOfLife))

  await combinator(page, 'OR').click()
  const or = (await countsAfter(page, '2 filters (OR)')).shown
  // Inclusion–exclusion, using the intersection AND just measured.
  expect(or).toBe(applications + endOfLife - and)
  expect(new URL(page.url()).searchParams.get('mode')).toBe('OR')

  await combinator(page, 'NOT').click()
  expect((await countsAfter(page, '2 filters (NOT)')).shown).toBe(DEMO.elements - or)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('.inventory__result')).toHaveText(
    `${DEMO.elements} of ${DEMO.elements} elements`,
  )
})

test('the name query narrows a facet selection in every mode', async ({ page }) => {
  await loadDemo(page)

  await facetOption(page, LAYER).click()
  const applications = (await countsAfter(page, '1 filter (AND)')).shown

  await page.getByLabel('Filter by name').fill('policy')
  await expect.poll(() => shownCount(page)).toBeLessThan(applications)
  expect((await inventoryCounts(page)).shown).toBeGreaterThan(0)

  // The query is ANDed on top in every mode — switching to NOT excludes facets,
  // never the search.
  await combinator(page, 'NOT').click()
  const excluded = (await countsAfter(page, '1 filter (NOT)')).shown
  await expect(page.locator('.table__row')).toHaveCount(excluded)
  for (const name of await page.locator('.table__name').allInnerTexts()) {
    expect(name.toLowerCase()).toContain('policy')
  }
})

test('a saved search applies facets and combinator, and its URL reopens it', async ({ page }) => {
  await loadDemo(page)

  const label = 'End-of-life applications'
  const expected = await savedSearchCount(page, label)
  await savedSearch(page, label).click()

  expect((await countsAfter(page, '3 filters (AND)')).shown).toBe(expected)
  const applied = new URL(page.url())
  expect(facetsIn(page.url())).toEqual(['layer:app', 'lifecycle:phaseOut', 'lifecycle:endOfLife'])
  // AND is the default, so a saved search carrying AND leaves no mode in the URL.
  expect(applied.searchParams.get('mode')).toBeNull()

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('.inventory__result')).toHaveText(
    `${DEMO.elements} of ${DEMO.elements} elements`,
  )

  // Reopening is a cold load: the model comes back from IndexedDB, the filters
  // from the link.
  await waitForPersistedWorkspace(page, DEMO.elements)
  await page.goto(applied.toString())

  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
  expect((await countsAfter(page, '3 filters (AND)')).shown).toBe(expected)
  await expect(facetOption(page, LAYER)).toHaveAttribute('aria-pressed', 'true')
})
