import { fileURLToPath } from 'node:url'
import { test, expect, importWithNothingToReport, startEmpty } from './support'

/**
 * Journey 21 — the validator, in a real browser (#193).
 *
 * Import the claims platform, validate, open an unused element from the list,
 * delete it from its fact sheet, and validate again: the finding is gone and
 * the rest stay. The claims platform draws every one of its elements, so the
 * journey first adds one from the inventory that no view draws.
 */

const FIXTURE = fileURLToPath(new URL('../../src/io/fixtures/claims-platform.xml', import.meta.url))
const CLAIMS = { elements: 39, relationships: 48 } as const

test('validates, opens an unused element from the list, deletes it, and validates again', async ({
  page,
}) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, CLAIMS)

  // An element no view draws.
  await page.getByRole('button', { name: '+ Element' }).click()
  const create = page.getByRole('dialog', { name: 'New element' })
  await create.getByLabel('Name').fill('Claim form')
  await create.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByRole('heading', { name: 'Claim form', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Validator' }).click()
  await expect(page.getByText(/^Not validated yet/)).toBeVisible()
  await page.getByRole('button', { name: 'Validate' }).click()

  const warnings = page.getByRole('region', { name: /^Warnings/ })
  await expect(warnings.getByRole('group', { name: 'Unused element, 1' })).toBeVisible()
  await expect(warnings.getByRole('group', { name: 'Unused relation, 9' })).toBeVisible()
  await expect(page.getByRole('region', { name: /^Advice/ })).toContainText(
    '"Target state (to do)" is empty.',
  )

  // Open it from the list, and delete it from its fact sheet.
  await page.getByRole('link', { name: /"Claim form" is not used in a view/ }).click()
  await expect(page.getByRole('heading', { name: 'Claim form', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete…' }).click()
  await page
    .getByRole('dialog', { name: 'Delete element from the model' })
    .getByRole('button', { name: 'Delete from model' })
    .click()
  await expect(page.getByRole('status')).toHaveText(/“Claim form” is deleted from the model/)
  await expect(page.getByRole('status')).toBeFocused()

  // Back on the validator, the list is the last run's, and says it is out of date.
  await page.getByRole('link', { name: 'Validator' }).click()
  await expect(page.getByRole('status')).toHaveText(/The model has changed since this run/)
  await expect(warnings.getByRole('group', { name: 'Unused element, 1' })).toBeVisible()

  await page.getByRole('button', { name: 'Validate' }).click()
  // Present first: the run has landed, with the findings that remain.
  await expect(warnings.getByRole('group', { name: 'Unused relation, 9' })).toBeVisible()
  await expect(page.getByLabel('Last run')).toHaveText('0 errors · 9 warnings · 1 advice')
  await expect(warnings.getByRole('group', { name: /^Unused element/ })).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('opens a relationship no view draws on its source, and an empty view on the canvas', async ({
  page,
}) => {
  await startEmpty(page)
  await importWithNothingToReport(page, FIXTURE, CLAIMS)
  await page.getByRole('link', { name: 'Validator' }).click()
  await page.getByRole('button', { name: 'Validate' }).click()

  await page
    .getByRole('link', {
      name: /"Composition from "Kubernetes Cluster" to "PostgreSQL"" is not used/,
    })
    .click()
  await expect(page.getByRole('heading', { name: 'Kubernetes Cluster', exact: true })).toBeVisible()

  await page.goBack()
  await page.getByRole('link', { name: /"Target state \(to do\)" is empty/ }).click()
  await expect(page.getByText(/^This view is empty./)).toBeVisible()
})
