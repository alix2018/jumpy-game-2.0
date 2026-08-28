import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'docs',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: { pixi: ['pixi.js'] },
      },
    },
  },
  optimizeDeps: {
    include: ['pixi.js'],
  },
  server: {
    proxy: {
      '/user': {
        target: 'https://dev-api.baxcus.com',
        changeOrigin: true,
      },
      '/score': {
        target: 'https://dev-api.baxcus.com',
        changeOrigin: true,
      },
    },
  },
});
