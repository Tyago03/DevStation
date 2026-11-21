import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/{unit,integration,ui}/**/*.{test,spec}.{ts,tsx}'], testTimeout: 15000, fileParallelism: false } });
