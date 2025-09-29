import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f8ff',
          100: '#eaefff',
          200: '#d3ddff',
          300: '#adbfff',
          400: '#7d97ff',
          500: '#4c6aff',
          600: '#2f48f5',
          700: '#2437c4',
          800: '#1e2e9a',
          900: '#1b297a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
