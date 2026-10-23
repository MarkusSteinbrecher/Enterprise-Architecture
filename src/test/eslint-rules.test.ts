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

/** Does `npm run lint` reject this snippet for a regex in toMatchObject's expected value? */
async function matchesAnything(code: string): Promise<boolean> {
  const results = await eslint.lintText(code, { filePath: 'src/to-match-object-probe.test.ts' })
  // A snippet that does not parse reports nothing, which would pass every `false` below.
  const fatal = results.flatMap((result) => result.messages).find((message) => message.fatal)
  if (fatal) throw new Error(`probe does not parse: ${fatal.message}`)
  return results.some((result) =>
    result.messages.some((message) => message.ruleId === 'archipelago/regex-in-to-match-object'),
  )
}

describe('a regex in toMatchObject (#177)', () => {
  it('is closed at run time where lint cannot see it: a regex there matches no string', () => {
    // A RegExp has no own enumerable keys, so toMatchObject's subset check alone
    // passes it against any value. `src/test/setup.ts`'s equality tester refuses
    // it. A table row is what lint cannot follow, so the trap is set that way.
    const rows: [RegExp][] = [[/zip64/], [new RegExp('zip64')]]
    for (const [re] of rows) {
      expect(() => expect({ message: 'something else' }).toMatchObject({ message: re })).toThrow()
      expect(() => expect({ message: 'zip64 header' }).toMatchObject({ message: re })).toThrow()
    }
    // What a test means by it still passes, and a regex still equals itself.
    expect({ message: 'zip64 header' }).toMatchObject({ message: expect.stringMatching(/zip64/) })
    expect({ pattern: /zip64/ }).toEqual({ pattern: /zip64/ })
    expect(() => expect({ pattern: /zip64/ }).toEqual({ pattern: /zip32/ })).toThrow()
  })

  it('rejects a regex literal in the expected value', async () => {
    expect(await matchesAnything('expect(e).toMatchObject({ message: /zip64/ })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject(/zip64/)')).toBe(true)
  })

  it('rejects one nested in objects and arrays, or behind a spread or a branch', async () => {
    expect(await matchesAnything('expect(e).toMatchObject({ a: { b: /x/ } })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject([{ a: 1 }, { a: /x/ }])')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ list: [1, /x/] })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ ...{ a: /x/ } })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject([, /x/])')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject([...[/x/]])')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: ok ? /x/ : "y" })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: ok ? "y" : /x/ })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: /x/ || "y" })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: s ?? /x/ })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: (s, /x/) })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: /x/ satisfies RegExp })')).toBe(true)
    expect(await matchesAnything('const re = /x/\nexpect(e).toMatchObject({ a: re! })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: <RegExp>/x/ })')).toBe(true)
    expect(await matchesAnything('expect(e).toMatchObject({ a: /x/ as unknown as string })')).toBe(
      true,
    )
  })

  it('rejects the matcher reached another way', async () => {
    expect(await matchesAnything('expect(e).not.toMatchObject({ a: /x/ })')).toBe(true)
    expect(await matchesAnything('await expect(p).resolves.toMatchObject({ a: /x/ })')).toBe(true)
    expect(await matchesAnything("expect(e)['toMatchObject']({ a: /x/ })")).toBe(true)
  })

  it('rejects a regex built with RegExp, with or without new', async () => {
    expect(await matchesAnything("expect(e).toMatchObject({ a: new RegExp('x') })")).toBe(true)
    expect(await matchesAnything("expect(e).toMatchObject({ a: RegExp('x') })")).toBe(true)
  })

  it('rejects a regex held in a variable, or an expected object that holds one', async () => {
    expect(await matchesAnything('const re = /x/\nexpect(e).toMatchObject({ a: re })')).toBe(true)
    expect(
      await matchesAnything("const re = new RegExp('x')\nexpect(e).toMatchObject({ a: re })"),
    ).toBe(true)
    expect(await matchesAnything('const want = { a: /x/ }\nexpect(e).toMatchObject(want)')).toBe(
      true,
    )
    // Assigned later, and passed through a second variable.
    expect(
      await matchesAnything('let re\nre = /x/\nconst r2 = re\nexpect(e).toMatchObject({ a: r2 })'),
    ).toBe(true)
    // Each assignment that gives the variable the whole right-hand side.
    for (const op of ['||=', '&&=', '??=']) {
      expect(
        await matchesAnything(`let re\nre ${op} /x/\nexpect(e).toMatchObject({ a: re })`),
      ).toBe(true)
    }
    // Declared outside the test that uses it.
    expect(
      await matchesAnything(
        "const re = /x/\nit('t', () => { expect(e).toMatchObject({ a: re }) })",
      ),
    ).toBe(true)
  })

  it('follows variables that refer to each other without looping', async () => {
    expect(
      await matchesAnything('let a\nlet b = a\na = b\nexpect(e).toMatchObject({ x: a })'),
    ).toBe(false)
  })

  it('does not take a part of the right-hand side for the value', async () => {
    // A compound assignment computes a new value; a destructuring takes one part.
    expect(await matchesAnything('let s = "a"\ns += /x/\nexpect(e).toMatchObject({ a: s })')).toBe(
      false,
    )
    expect(
      await matchesAnything('const { n } = { n: 1, re: /x/ }\nexpect(e).toMatchObject({ a: n })'),
    ).toBe(false)
  })

  it('allows expect.stringMatching, and a regex that is only an argument on the way', async () => {
    expect(
      await matchesAnything('expect(e).toMatchObject({ message: expect.stringMatching(/zip64/) })'),
    ).toBe(false)
    expect(
      await matchesAnything(
        'const re = /x/\nexpect(e).toMatchObject({ a: expect.stringMatching(re) })',
      ),
    ).toBe(false)
    // The value here is a string; the regex only builds it.
    expect(await matchesAnything("expect(e).toMatchObject({ a: s.replace(/a/, 'b') })")).toBe(false)
    expect(await matchesAnything('expect(e).toMatchObject({ a: 1, b: "x" })')).toBe(false)
    // The other matchers fail correctly on a regex, so this rule leaves them alone.
    expect(await matchesAnything('expect(e).toEqual({ a: /x/ })')).toBe(false)
    expect(await matchesAnything('expect(s).toMatch(/x/)')).toBe(false)
  })

  // The documented gap: following these needs type information, which the
  // config does not load. Each is a regex the rule cannot see; if one starts
  // failing, the rule has learned it, and its comment should say so.
  it('cannot see a regex reached through a member, a call, an import or a parameter', async () => {
    expect(
      await matchesAnything('const p = { zip: /x/ }\nexpect(e).toMatchObject({ a: p.zip })'),
    ).toBe(false)
    expect(await matchesAnything('const f = () => /x/\nexpect(e).toMatchObject({ a: f() })')).toBe(
      false,
    )
    expect(
      await matchesAnything("import { re } from './re'\nexpect(e).toMatchObject({ a: re })"),
    ).toBe(false)
    expect(
      await matchesAnything('export const t = (re: RegExp) => expect(e).toMatchObject({ a: re })'),
    ).toBe(false)
  })
})
