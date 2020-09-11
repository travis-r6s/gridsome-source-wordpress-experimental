module.exports = {
  extends: ['travisreynolds-node-ts'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '_' }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '_' }]
  }
}
