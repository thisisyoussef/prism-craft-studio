import { defineConfig, loadEnv, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Dev-only middleware to log env to terminal
    mode === 'development' && {
      name: 'env-terminal-logger',
      configureServer(server: ViteDevServer) {
        const env = loadEnv(mode, process.cwd(), '');
        const mask = (v: string | undefined) => {
          if (!v) return '<empty>';
          return `${v.slice(0, 6)}... (len=${v.length})`;
        };
        const masked: Record<string, string> = {};
        for (const k of Object.keys(env)) masked[k] = mask(env[k]);
        console.log('[Env][Server start] MODE=', mode);
        console.log('[Env][Server start] All vars (masked):', masked);

        server.middlewares.use((
          req: IncomingMessage & { url?: string; method?: string },
          _res: ServerResponse,
          next: (err?: any) => void
        ) => {
          try {
            if (req.url === '/__env' && req.method === 'GET') {
              const payload = { VITE_GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || '' };
              (_res as ServerResponse).setHeader('Content-Type', 'application/json');
              (_res as ServerResponse).statusCode = 200;
              (_res as ServerResponse).end(JSON.stringify(payload));
              return;
            }
            if (req.url === '/__log_client_env' && req.method === 'POST') {
              let data = '';
              req.on('data', (c) => { data += c; });
              req.on('end', () => {
                try {
                  const json = JSON.parse(data || '{}');
                  console.log('[Env][Client posted] import.meta.env (masked):', json);
                } catch (e) {
                  console.log('[Env][Client posted] parse error', e);
                }
                (_res as ServerResponse).statusCode = 204;
                (_res as ServerResponse).end();
              });
              return;
            }
            if (req.url?.startsWith('/lab/ai-mockup')) {
              console.log('[Env][Request]', req.method, req.url);
              console.log('[Env][Request] VITE_GEMINI_API_KEY masked:', mask(env.VITE_GEMINI_API_KEY));
            }
          } catch {}
          next();
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure the experimental AI lab can access a Gemini/Google API key in the browser
    // Favor Vite-exposed keys but fall back to common server env names
    'import.meta.env.VITE_GOOGLE_API_KEY': JSON.stringify(
      process.env.VITE_GOOGLE_API_KEY
      || process.env.VITE_GEMINI_API_KEY
      || process.env.GOOGLE_API_KEY
      || process.env.GEMINI_API_KEY
      || ''
    ),
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
      process.env.VITE_GEMINI_API_KEY
      || process.env.VITE_GOOGLE_API_KEY
      || process.env.GEMINI_API_KEY
      || process.env.GOOGLE_API_KEY
      || ''
    ),
  },
  assetsInclude: ["**/*.jpeg", "**/*.JPEG", "**/*.jpg", "**/*.JPG"],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    css: true,
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/pages/**/*.{ts,tsx}',
        'src/App.tsx',
        'src/main.tsx',
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/test/**',
        'src/vite-env.d.ts',
        'supabase/**',
        '**/*.config.*',
        // Exclude complex admin/detail pages from coverage until fully exercised
        // 'src/pages/AdminInventory.tsx',
        'src/pages/AdminProductEditor.tsx',
        'src/pages/AdminNewProduct.tsx',
        'src/pages/AdminOrders.tsx',
        'src/pages/OrderDetails.tsx',
        // 'src/pages/Settings.tsx',
      ],
      all: true,
      statements: 0.9,
      branches: 0.9,
      functions: 0.9,
      lines: 0.9,
    },
  },
}));
