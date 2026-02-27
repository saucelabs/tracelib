const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
    {
        ignores: ['build/**', 'coverage/**', 'node_modules/**', 'dist/**']
    },
    {
        files: ['src/**/*.ts', 'devtools/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                sourceType: 'module',
                project: './tsconfig.json',
                ecmaVersion: 2020
            },
            globals: {
                console: 'readonly',
                process: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript
        },
        rules: {
            ...js.configs.recommended.rules,
            ...typescript.configs.recommended.rules,
            ...prettierConfig.rules,
            semi: ['error', 'never'],
            quotes: ['error', 'single', { avoidEscape: true }],
            indent: 'off',
            curly: 2,
            'no-multiple-empty-lines': [2, { max: 1, maxEOF: 1 }],
            'array-bracket-spacing': ['error', 'never'],
            'brace-style': ['error', '1tbs', { allowSingleLine: true }],
            camelcase: ['error', { properties: 'never' }],
            'comma-spacing': ['error', { before: false, after: true }],
            'no-lonely-if': 'error',
            'no-tabs': 'error',
            'no-trailing-spaces': ['error', {
                skipBlankLines: false,
                ignoreComments: false
            }],
            'unicode-bom': ['error', 'never'],
            'object-curly-spacing': ['error', 'always'],
            'require-atomic-updates': 0,
            '@typescript-eslint/explicit-function-return-type': 2,
            '@typescript-eslint/indent': 0,
            '@typescript-eslint/no-use-before-define': 0,
            '@typescript-eslint/no-explicit-any': 1,
            '@typescript-eslint/no-unused-vars': 1,
            '@typescript-eslint/no-unused-expressions': 1,
            'no-useless-assignment': 1,
            'no-case-declarations': 2
        }
    },
    {
        files: ['tests/**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                sourceType: 'module',
                ecmaVersion: 2020
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': typescript
        },
        rules: {
            ...js.configs.recommended.rules,
            ...typescript.configs.recommended.rules,
            ...prettierConfig.rules,
            '@typescript-eslint/explicit-function-return-type': 0,
            semi: ['error', 'never'],
            quotes: ['error', 'single', { avoidEscape: true }],
            indent: 'off'
        }
    }
];

