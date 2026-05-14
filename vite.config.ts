import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'docs',
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
});
