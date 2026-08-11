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
      'no-restricted-syntax': [
        'error',
        {
          // ADR 0004: two collaborators must commit identical bytes, and bare
          // localeCompare collates by whatever locale the machine happens to
          // have. Sort by code unit on the serialisation path; pass an explicit
          // locale (or an Intl.Collator) where a human is meant to read the order.
          selector: "CallExpression[callee.property.name='localeCompare'][arguments.length<2]",
          message:
            'Bare localeCompare sorts by the machine locale — see ADR 0004. Compare code units (a < b ? -1 : …) on the serialisation path, or pass an explicit locale.',
        },
      ],
    },
  },
)
