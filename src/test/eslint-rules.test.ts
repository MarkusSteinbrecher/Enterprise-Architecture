import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The repo's own lint rules, driven.
 *
 * A mechanical guard needs a test that fires it, and one for the nearest bypass.
 * The `localeCompare` rule was harvested from the #17 review specifically to
 * make ADR 0004 mechanical, shipped with no test, and did not work: it keyed on
 * `arguments.length<2`, so `localeCompare(a, b, undefined)` passed lint while
 * still collating by the machine's locale — and CLAUDE.md had by then been
 * rewritten to say the machine could no longer get this wrong (#37). A harvested
 * rule that silently fails is worse than no rule, because the next author trusts
 * the line advertising it.
 *
 * This runs the real ESLint over the real `eslint.config.js`, so what is under
 * test is what `npm run lint` does — not a restatement of the selectors that
 * could drift from them.
 */

let eslint: ESLint

beforeAll(() => {
  eslint = new ESLint()
})

/** Does `npm run lint` reject this snippet for locale-dependent ordering? */
async function violates(code: string): Promise<boolean> {
  const results = await eslint.lintText(code, { filePath: 'src/locale-rule-probe.ts' })
  return results.some((result) =>
    result.messages.some((message) => message.ruleId === 'no-restricted-syntax'),
  )
}

describe('the locale-dependent ordering ban (ADR 0004)', () => {
  it('rejects a comparison with no locale at all', async () => {
    expect(await violates('p.localeCompare(q)')).toBe(true)
  })

  // The bypass that made the first version of this rule a false guarantee.
  it('rejects an explicitly undefined locale, which is the same default locale', async () => {
    expect(await violates('p.localeCompare(q, undefined)')).toBe(true)
    expect(await violates('p.localeCompare(q, undefined, { numeric: true })')).toBe(true)
  })

  it('rejects the spellings of undefined a selector could still be fooled by', async () => {
    expect(await violates('p.localeCompare(q, void 0)')).toBe(true)
    // A selector cannot follow a variable, which is why the literal is required.
    expect(await violates('const loc = undefined; p.localeCompare(q, loc)')).toBe(true)
  })

  it('rejects reaching the method through a computed member', async () => {
    expect(await violates("p['localeCompare'](q, 'en')")).toBe(true)
  })

  it('rejects Intl.Collator without a locale, which collates identically', async () => {
    expect(await violates('new Intl.Collator().compare(p, q)')).toBe(true)
    expect(await violates('new Intl.Collator(undefined).compare(p, q)')).toBe(true)
    // Intl.Collator is callable without `new`, and that form reaches the same default.
    expect(await violates('Intl.Collator().compare(p, q)')).toBe(true)
  })

  it('allows a locale named at the call site', async () => {
    expect(await violates("p.localeCompare(q, 'en')")).toBe(false)
    expect(await violates("p.localeCompare(q, 'en', { numeric: true })")).toBe(false)
    expect(await violates("new Intl.Collator('en').compare(p, q)")).toBe(false)
  })

  it('allows the code-unit comparison the serialisation path uses', async () => {
    expect(await violates('const order = a < b ? -1 : a > b ? 1 : 0')).toBe(false)
  })
})

/** Does `npm run lint` reject this snippet, in this file, for a hand-made modal backdrop? */
async function copiesOverlay(code: string, filePath = 'src/ui/overlay-rule-probe.tsx') {
  const results = await eslint.lintText(code, { filePath })
  return results.some((result) =>
    result.messages.some(
      (message) =>
        message.ruleId === 'no-restricted-syntax' && message.message.includes('<DialogOverlay>'),
    ),
  )
}

describe('the shared modal backdrop (#157)', () => {
  it('rejects a backdrop spelled by hand, as every modal used to copy it', async () => {
    expect(
      await copiesOverlay(
        'export const M = () => <div className="dialog-overlay" role="presentation" />',
      ),
    ).toBe(true)
    expect(await copiesOverlay('export const M = () => <div className="palette-overlay" />')).toBe(
      true,
    )
  })

  it('rejects the class spelled where a selector on className would not look', async () => {
    // In a template, beside another class.
    expect(
      await copiesOverlay(
        'export const M = (x: string) => <div className={`dialog-overlay ${x}`} />',
      ),
    ).toBe(true)
    // In a variable first, or in a call that builds the class list.
    expect(
      await copiesOverlay(
        "const c = 'dialog-overlay'\nexport const M = () => <div className={c} />",
      ),
    ).toBe(true)
    expect(
      await copiesOverlay(
        "export const M = () => <div className={['dialog-overlay'].join(' ')} />",
      ),
    ).toBe(true)
  })

  it('allows the component, and the one file that spells the classes', async () => {
    expect(
      await copiesOverlay(
        "import { DialogOverlay } from '@/ui/common/DialogOverlay'\nexport const M = () => <DialogOverlay onDismiss={() => {}}>x</DialogOverlay>",
      ),
    ).toBe(false)
    expect(
      await copiesOverlay(
        "export const M = () => <div className='dialog-overlay' />",
        'src/ui/common/DialogOverlay.tsx',
      ),
    ).toBe(false)
  })

  it('still holds the locale rule in the file the backdrop rule exempts', async () => {
    // The exemption restates `no-restricted-syntax` for that file, and a
    // restated rule replaces the whole list, not just the backdrop's entries.
    const results = await eslint.lintText(
      'export const s = (p: string, q: string) => p.localeCompare(q)',
      {
        filePath: 'src/ui/common/DialogOverlay.tsx',
      },
    )
    expect(results.some((r) => r.messages.some((m) => m.message.includes('ADR 0004')))).toBe(true)
  })
})
