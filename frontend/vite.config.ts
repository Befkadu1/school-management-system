import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development, forward /api to the Node API so the browser sees one origin
    proxy: { '/api': process.env.API_URL ?? 'http://localhost:4000' },
  },
  build: {
    rollupOptions: {
      output: {
        // Performance: keep rarely-changing libraries in their own long-cached chunk
        manualChunks: (id) => (id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
