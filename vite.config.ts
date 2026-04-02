
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      // Important: Tell Rollup that 'exceljs' is external and shouldn't be bundled
      external: ['exceljs'],
      output: {
        globals: {
          exceljs: 'ExcelJS',
        },
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-chart': ['chart.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
  }
});
