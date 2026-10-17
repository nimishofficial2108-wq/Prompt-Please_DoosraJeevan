import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    strictPort: true,
    port: 5173,
    proxy: {
      '/api/blockchain': { target: 'http://127.0.0.1:4000', changeOrigin: true, rewrite: p => p.replace(/^\/api\/blockchain/, '/api') },
      '/api/organ': { target: 'http://127.0.0.1:3002', changeOrigin: true, rewrite: p => p.replace(/^\/api\/organ/, '/api') },
      '/api/neuro': { target: 'http://127.0.0.1:3003', changeOrigin: true, rewrite: p => p.replace(/^\/api\/neuro/, '/api') },
      '/modules/organ': { target: 'http://127.0.0.1:3002', changeOrigin: true, ws: true },
      '/modules/neuro': { target: 'http://127.0.0.1:3003', changeOrigin: true, ws: true },
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
