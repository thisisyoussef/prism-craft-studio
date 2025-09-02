#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Site URL from env or default to localhost
const SITE_URL = process.env.SITE_URL || process.env.VITE_SITE_URL || 'http://localhost:5173'

// Static routes defined in src/App.tsx
const staticRoutes = [
  '/',
  '/catalog',
  '/pricing',
  '/samples',
  '/designers',
  '/customize',
  '/dashboard',
  '/settings',
  '/case-studies',
  '/terms',
  '/privacy',
]

// Dynamic routes from case studies data (parse TS source to avoid ts runtime)
import { readFileSync } from 'node:fs'
const csPath = resolve(__dirname, '../src/data/caseStudies.ts')
const csSource = readFileSync(csPath, 'utf8')
const slugMatches = Array.from(csSource.matchAll(/slug:\s*"([^"]+)"/g))
const dynamicRoutes = slugMatches.map((m) => `/case-studies/${m[1]}`)

const urls = [...staticRoutes, ...dynamicRoutes]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (path) => `  <url>
    <loc>${SITE_URL.replace(/\/$/, '')}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.7'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

const outPath = resolve(__dirname, '../public/sitemap.xml')
writeFileSync(outPath, xml)
console.log(`Generated sitemap.xml with ${urls.length} URLs at ${outPath}`)

