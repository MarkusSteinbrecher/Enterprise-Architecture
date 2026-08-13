import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'design', 'node_modules', 'coverage'] },
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
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='localeCompare']:not([arguments.1.type='Literal'])",
          message:
            "localeCompare without a string-literal locale sorts by the machine's locale — see ADR 0004. Compare code units (a < b ? -1 : a > b ? 1 : 0) on the serialisation path, or name the locale here: localeCompare(b, 'en').",
        },
        {
          selector: "CallExpression[callee.computed=true][callee.property.value='localeCompare']",
          message:
            "Call localeCompare by name rather than through a computed member, so the locale rule can see it — see ADR 0004. On the serialisation path compare code units instead (a < b ? -1 : a > b ? 1 : 0).",
        },
        {
          selector:
            ":matches(NewExpression, CallExpression)[callee.object.name='Intl'][callee.property.name='Collator']:not([arguments.0.type='Literal'])",
          message:
            "Intl.Collator without a string-literal locale collates by the machine's locale, exactly as bare localeCompare does — see ADR 0004. Name the locale: new Intl.Collator('en').",
        },
      ],
    },
  },
)
