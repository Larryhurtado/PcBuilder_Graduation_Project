import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Un único .env en la raíz del repositorio sirve a la API y a la web (solo se exponen las VITE_*).
  envDir: '../..',
  server: {
    port: 5173,
    // El frontend llama siempre a rutas relativas (/api/v1/...): Vite las reenvía a la API local.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx', 'src/mocks/browser.js'],
    },
  },
});
