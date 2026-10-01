import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.DEV_API_PROXY_TARGET?.trim() || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', proxyRequest => {
              // The browser talks to this same-origin local Vite server. The
              // forwarded hop is server-to-server and must not impersonate a
              // browser origin when targeting the production API for Daraja QA.
              proxyRequest.removeHeader('origin');
            });
          },
        },
      },
    },
  };
});
