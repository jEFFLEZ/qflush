module.exports = [
  { ignores: ['dist/**', 'node_modules/**', '.qflush/**', 'extensions/**/obj/**', 'extensions/**/bin/**'] },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
    },
    plugins: { '@typescript-eslint': require('@typescript-eslint/eslint-plugin') },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
];
