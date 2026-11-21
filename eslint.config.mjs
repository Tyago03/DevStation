import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['node_modules/**', '.vite/**', 'out/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  // These validators intentionally reject/sanitize control characters.
  { files: ['src/shared/schemas.ts', 'src/main/services/{logs,configs}.ts', 'src/renderer/components/ConfigurationDialog.tsx'], rules: { 'no-control-regex': 'off' } },
);
