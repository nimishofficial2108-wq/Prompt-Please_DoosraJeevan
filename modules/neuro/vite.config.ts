import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/modules/neuro/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      strictPort: true,
      host: '127.0.0.1',
      port: 5175,
      proxy: { '/api/analyze-ich': { target: 'http://127.0.0.1:3003', changeOrigin: true } },
      hmr: false, // Embedded Vite dev server uses the parent site's navigation; avoids shared WebSocket port 24678 conflicts.
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
