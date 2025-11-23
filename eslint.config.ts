import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import boundaries from "eslint-plugin-boundaries"
import prettier from 'eslint-plugin-prettier'
import typescriptParser from '@typescript-eslint/parser'
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin"

const ELEM = {
  action: "action",
  all: "*",
  app: "app",
  component: "component",
  composition: "composition",
  core: "core",
  page: "page",
  persistence: "persistence",
}

export default tseslint.config(
  { ignores: ['dist'] },
  {
    plugins: {
      boundaries,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
      "@typescript-eslint": typescriptEslintPlugin,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      "boundaries/element-types": [2, {
        default: "disallow",
        rules: [
          { from: ELEM.action, allow: [ELEM.persistence] },
          {
            from: ELEM.app, allow: [ELEM.page]
          },
          {
            from: ELEM.composition, allow: [
              ELEM.action,
              ELEM.component,
            ]
          },
          { from: ELEM.component, allow: [ELEM.composition, ELEM.action, ELEM.persistence] },
          { from: ELEM.all, allow: [ELEM.core] }, // core can be used by any layer
        ]
      }],
      "boundaries/no-private": [2],
      "boundaries/no-unknown": [2],
      "boundaries/no-unknown-files": [2],
      "boundaries/no-ignored": [2],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
    settings: {
      "boundaries/elements": [
        { type: ELEM.action, pattern: "action/**" },
        { type: ELEM.app, pattern: "app/**" },
        { type: ELEM.component, pattern: "component/**" },
        { type: ELEM.composition, pattern: "composition/**" },
        { type: ELEM.core, pattern: "core/**" },
        { type: ELEM.page, pattern: "page/**" },
        { type: ELEM.persistence, pattern: "persistence/**" },
      ],
      "boundaries/include": ["src/**"],
      "boundaries/ignore": ["**/vite-env.d.ts", "src/main.tsx"],
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      }
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: typescriptParser
    },

  }
)
