import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'window',
    'process.env': {}
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
