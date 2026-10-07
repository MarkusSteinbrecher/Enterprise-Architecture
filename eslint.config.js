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
