import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import boundaries from "eslint-plugin-boundaries"
import prettier from 'eslint-plugin-prettier'
import typescriptParser from '@typescript-eslint/parser'
import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin"

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
          { from: "action", allow: ["persistence"] },
          {
            from: "app", allow: [
              "action",
              "composition",
              "persistence"
            ]
          },
          {
            from: "composition", allow: [
              "action",
              "component",
            ]
          },
          { from: "page", allow: ["composition", "persistence"] },
          { from: "*", allow: ["core"] }, // core can be used by any layer
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
        { type: "action", pattern: "action/**" },
        { type: "app", pattern: "app/**" },
        { type: "component", pattern: "component/**" },
        { type: "composition", pattern: "composition/**" },
        { type: "core", pattern: "core/**" },
        { type: "page", pattern: "page/**" },
        { type: "persistence", pattern: "persistence/**" },
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
