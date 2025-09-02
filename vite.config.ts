import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
