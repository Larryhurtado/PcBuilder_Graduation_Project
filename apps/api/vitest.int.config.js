import { defineConfig } from 'vitest/config';

// Pruebas de integración: usan la base de datos real de DATABASE_URL (solo lecturas y
// operaciones que fallan o se revierten). Si no hay DATABASE_URL se omiten.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.int.test.js'],
    setupFiles: ['./src/test/load-env.js'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
