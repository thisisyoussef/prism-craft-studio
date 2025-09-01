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
}));
