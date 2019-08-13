module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint'
  ],
  env: {
    node: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: "./tsconfig.json"
  },
  plugins: ['@typescript-eslint'],
  rules: {
    semi: ['error', 'never'],
    quotes: ['error', 'single'],
    indent: [2, 4],
    curly: 2,

    'no-multiple-empty-lines': [2, {'max': 1, 'maxEOF': 1}],
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
    quotes: ['error', 'single', { avoidEscape: true }],
    'unicode-bom': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'require-atomic-updates': 0,
    '@typescript-eslint/explicit-function-return-type': 2,
    '@typescript-eslint/indent': 0,
    '@typescript-eslint/no-use-before-define': 0
  }
}
