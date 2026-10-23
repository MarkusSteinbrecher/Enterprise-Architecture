import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// ADR 0004: two collaborators must commit identical bytes, and a
// comparison that falls back to the machine's locale collates differently
// on their two machines.
//
// The locale has to be written as a string literal *at the call site*.
// The first version of this rule keyed on `arguments.length<2`, which let
// `localeCompare(a, b, undefined)` through — the same default locale, past
// a rule CLAUDE.md was by then advertising as mechanical (#37). `void 0`
// and a variable holding either reach it too, and no selector can follow a
// variable, so the literal is the thing to require. A literal that is not a
// valid language tag throws at runtime, which is loud; what this has to
// catch is the spelling that silently uses whatever locale the machine has.
//
// `eslint-rules.test.ts` fires every one of these, and the bypasses.
const LOCALE_RULES = [
  {
    selector:
      "CallExpression[callee.property.name='localeCompare']:not([arguments.1.type='Literal'])",
    message:
      "localeCompare without a string-literal locale sorts by the machine's locale — see ADR 0004. Compare code units (a < b ? -1 : a > b ? 1 : 0) on the serialisation path, or name the locale here: localeCompare(b, 'en').",
  },
  {
    selector: "CallExpression[callee.computed=true][callee.property.value='localeCompare']",
    message:
      'Call localeCompare by name rather than through a computed member, so the locale rule can see it — see ADR 0004. On the serialisation path compare code units instead (a < b ? -1 : a > b ? 1 : 0).',
  },
  {
    selector:
      ":matches(NewExpression, CallExpression)[callee.object.name='Intl'][callee.property.name='Collator']:not([arguments.0.type='Literal'])",
    message:
      "Intl.Collator without a string-literal locale collates by the machine's locale, exactly as bare localeCompare does — see ADR 0004. Name the locale: new Intl.Collator('en').",
  },
]

// Every modal's backdrop is `DialogOverlay` (#157). Each modal used to copy the
// press-outside handler, and none of the copies prevented the press's default,
// which then focused `<body>` after the dialog closed (#156). The overlay
// classes may only be spelled in that component, so a new modal cannot copy
// the old pattern. A literal or a template that contains the class name counts,
// which also catches a class name built in a variable first.
//
// `eslint-rules.test.ts` fires these, and the bypasses.
const OVERLAY_MESSAGE =
  'Render a modal backdrop with <DialogOverlay> from @/ui/common/DialogOverlay, which keeps focus where the dismissal put it (#157).'
const OVERLAY_RULES = [
  { selector: 'Literal[value=/(dialog|palette)-overlay/]', message: OVERLAY_MESSAGE },
  { selector: 'TemplateElement[value.raw=/(dialog|palette)-overlay/]', message: OVERLAY_MESSAGE },
]

// A regex in `toMatchObject`'s expected value matches anything (#177).
// `toMatchObject` checks that the expected value is a subset of the actual one,
// and a RegExp has no own enumerable keys, so it is a subset of every value:
// `toMatchObject({ message: /zip64/ })` passes against `{ message: 'x' }`.
// `expect.stringMatching(/zip64/)` is the spelling that tests the string.
//
// No selector fits. A descendant selector also reaches a regex that is only
// an argument on the way to a value — `{ name: s.replace(/a/, 'b') }` is
// sound — and cannot follow a variable. So this rule walks only the
// positions whose value becomes part of the expected object: property
// values, array elements, spreads, both arms of `?:`, `&&`, `||` and `??`,
// the last of a `,` sequence, TypeScript's `as`/`satisfies`/`!`/`<T>`, and a
// local variable's initialiser or `=`, `||=`, `&&=` or `??=` assignment,
// followed through further variables. A regex is a
// literal, `new RegExp(…)` or `RegExp(…)`. `expect.stringMatching(…)` and
// every other call are not walked into.
//
// What it cannot see without type information, which this config does not
// load: a regex reached through a member (`patterns.zip`), a function's
// return, an import, a parameter, a destructuring or a loop variable.
//
// `eslint-rules.test.ts` fires this, the bypasses it catches and the gap.
const REGEX_IN_TO_MATCH_OBJECT = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      regex:
        "A regex in toMatchObject's expected value matches anything: a RegExp has no own enumerable keys, so it is a subset of every value (#177). Use expect.stringMatching(/…/).",
    },
  },
  create(context) {
    const { sourceCode } = context

    const named = (member, name) =>
      member.type === 'MemberExpression' &&
      (member.computed
        ? member.property.type === 'Literal' && member.property.value === name
        : member.property.name === name)

    const variableOf = (identifier) => {
      for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const variable = scope.set.get(identifier.name)
        if (variable) return variable
      }
      return undefined
    }

    // The value a write gives the variable itself. A destructuring, a loop or
    // `+=` gives it only part of `writeExpr`, or something computed from it. A
    // read in either position (`const y = re`) yields the variable itself,
    // which `seen` stops.
    const WHOLE = new Set(['=', '||=', '&&=', '??='])
    const assigned = (reference) => {
      const parent = reference.identifier.parent
      if (parent.type === 'VariableDeclarator') return parent.init
      if (parent.type === 'AssignmentExpression' && WHOLE.has(parent.operator)) return parent.right
      return null
    }

    // `at` is where to report: the node inside toMatchObject's argument, so a
    // regex reached through a variable is reported on the assertion.
    const check = (node, at, seen) => {
      switch (node.type) {
        case 'Literal':
          if (node.regex) context.report({ node: at ?? node, messageId: 'regex' })
          return
        case 'NewExpression':
        case 'CallExpression':
          if (node.callee.type === 'Identifier' && node.callee.name === 'RegExp') {
            context.report({ node: at ?? node, messageId: 'regex' })
          }
          return
        case 'ObjectExpression':
          for (const property of node.properties) {
            if (property.type === 'SpreadElement') check(property.argument, at, seen)
            else check(property.value, at, seen)
          }
          return
        case 'ArrayExpression':
          for (const element of node.elements) {
            if (element)
              check(element.type === 'SpreadElement' ? element.argument : element, at, seen)
          }
          return
        case 'ConditionalExpression':
          check(node.consequent, at, seen)
          check(node.alternate, at, seen)
          return
        case 'LogicalExpression':
          check(node.left, at, seen)
          check(node.right, at, seen)
          return
        case 'SequenceExpression':
          check(node.expressions[node.expressions.length - 1], at, seen)
          return
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
        case 'TSNonNullExpression':
        case 'TSTypeAssertion':
          check(node.expression, at, seen)
          return
        case 'Identifier': {
          const variable = variableOf(node)
          if (!variable || seen.has(variable)) return
          seen.add(variable)
          for (const reference of variable.references) {
            const value = assigned(reference)
            if (value) check(value, at ?? node, seen)
          }
          return
        }
      }
    }

    return {
      CallExpression(node) {
        if (!named(node.callee, 'toMatchObject')) return
        for (const argument of node.arguments) check(argument, undefined, new Set())
      },
    }
  },
}

export default tseslint.config(
  {
    ignores: [
      'dist',
      'design',
      'node_modules',
      'coverage',
      'test-results',
      'playwright-report',
      'blob-report',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      archipelago: { rules: { 'regex-in-to-match-object': REGEX_IN_TO_MATCH_OBJECT } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-restricted-syntax': ['error', ...LOCALE_RULES, ...OVERLAY_RULES],
      'archipelago/regex-in-to-match-object': 'error',
    },
  },
  {
    // The one place the overlay classes are spelled, and the test that holds
    // the snippets the rule must reject.
    files: ['src/ui/common/DialogOverlay.tsx', 'src/test/eslint-rules.test.ts'],
    rules: { 'no-restricted-syntax': ['error', ...LOCALE_RULES] },
  },
  {
    // Playwright fixtures take a `use` callback, which the React plugin reads as
    // the `use` hook. Nothing in tests/ is a React component.
    files: ['tests/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
)
