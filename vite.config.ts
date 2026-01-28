
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
      // Important: Tell Rollup that 'xlsx' is external and shouldn't be bundled
      external: ['xlsx'],
      output: {
        globals: {
          xlsx: 'XLSX',
        },
      },
    },
  },
  server: {
    port: 3000,
  }
});
