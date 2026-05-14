import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  optimizeDeps: {
    include: ['pixi.js'],
  },
});
