import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['NudeShared/test/**/*.{test,spec}.mjs'],
    setupFiles: ['NudeShared/test/setup/globalDbSetup.mjs'],
    hookTimeout: 15000,
    testTimeout: 15000,
    globals: true,
    onConsoleLog(log) {
      // Optionally filter noisy logs later
      return log;
    }
  }
});
