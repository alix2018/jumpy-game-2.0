import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'docs',
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
  server: {
    proxy: {
      '/user': 'http://localhost:3000',
      '/high-scores': 'http://localhost:3000',
      '/score': 'http://localhost:3000',
    },
  },
});
