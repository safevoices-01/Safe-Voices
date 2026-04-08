import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

import { config as baseConfig } from "./base.js"

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config} */
export const config = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      // React scope no longer necessary with new JSX transform.

      // indentation
      indent: ["error", 4],
      "@typescript-eslint/indent": ["error", 4],

      // quotes
      quotes: ["error", "single"],
      "jsx-quotes": ["error", "prefer-double"],

      // semicolons
      semi: ["error", "always"],

      // spacing
      "react/jsx-indent": ["error", 4],
      "react/jsx-indent-props": ["error", 4],
      "react/jsx-max-props-per-line": [
        "error",
        { maximum: 1, when: "multiline" },
      ],

      // blank lines between logical sections
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
      ],

      // trailing commas in multi-line objects/arrays
      "comma-dangle": ["error", "always-multiline"],

      // React/TS settings
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // prettier
      "prettier/prettier": ["error", { endOfLine: "auto" }],

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
]
