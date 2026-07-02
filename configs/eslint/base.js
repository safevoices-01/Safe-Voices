import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import onlyWarn from 'eslint-plugin-only-warn';
import turboPlugin from 'eslint-plugin-turbo';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 */
export const config = [
    js.configs.recommended,
    eslintConfigPrettier,
    {
        parser: '@typescript-eslint/parser',
        parserOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            project: './tsconfig.json',
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        extends: ['plugin:@typescript-eslint/recommended'],
        rules: {
            // indentation
            indent: ['error', 4],
            '@typescript-eslint/indent': ['error', 4],

            // quotes
            quotes: ['error', 'single'],
            'jsx-quotes': ['error', 'prefer-double'],

            // semicolons
            semi: ['error', 'always'],

            // spacing
            'react/jsx-indent': ['error', 4],
            'react/jsx-indent-props': ['error', 4],
            'react/jsx-max-props-per-line': [
                'error',
                { maximum: 1, when: 'multiline' },
            ],

            // blank lines between logical sections
            'padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: '*', next: 'return' },
                {
                    blankLine: 'always',
                    prev: ['const', 'let', 'var'],
                    next: '*',
                },
            ],

            // trailing commas in multi-line objects/arrays
            'comma-dangle': ['error', 'always-multiline'],

            // React/TS settings
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',

            // prettier
            'prettier/prettier': ['error', { endOfLine: 'auto' }],

            // other common rules
            'no-unused-vars': ['warn'],
            'no-console': ['warn'],
        },
    },
    {
        plugins: {
            turbo: turboPlugin,
        },
        rules: {
            'turbo/no-undeclared-env-vars': 'warn',
        },
    },
    {
        plugins: {
            onlyWarn,
        },
    },
    {
        ignores: ['dist/**'],
    },
];
