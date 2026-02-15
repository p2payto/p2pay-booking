// server/routes/sitemap.xml.js
// XML sitemap with optional XSL stylesheet for human-friendly rendering.
// Works without browser extensions.

import { readdir } from 'fs/promises'
import { join } from 'path'

// Minimal XML escape helper
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // IMPORTANT:
  // Set NUXT_PUBLIC_DEPLOYMENT_DOMAIN=booking.p2pay.to (without https://)
  // or fallback to booking.p2pay.to.
  const rawDomain = (config.public.deploymentDomain || 'booking-template.p2pay.to')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const baseUrl = `https://${rawDomain}`

  // Canonical/default locale
  const defaultLocale = 'en'
  const locales = ['en', 'es', 'it']

  // Read services from content folder (single source of truth)
  let services = []
  try {
    const servicesPath = join(process.cwd(), 'content/en/services')
    const files = await readdir(servicesPath)
    services = files
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/^\d+\./, '').replace(/\.md$/, ''))
  } catch (e) {
    // Fallback to avoid breaking sitemap generation in minimal deployments.
    services = []
  }

  const nowIso = new Date().toISOString()
  const urls = []

  // --- HOME PAGE (one logical page) ---
  urls.push(`
  <url>
    <loc>${esc(`${baseUrl}/${defaultLocale}`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <priority>1.0</priority>
    <changefreq>daily</changefreq>
    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${baseUrl}/${defaultLocale}`)}"/>
${locales
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(`${baseUrl}/${l}`)}"/>`)
      .join('\n')}
  </url>`)

  // --- SERVICES ---
  for (const service of services) {
    urls.push(`
  <url>
    <loc>${esc(`${baseUrl}/${defaultLocale}/${service}`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <priority>0.8</priority>
    <changefreq>weekly</changefreq>
    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(`${baseUrl}/${defaultLocale}/${service}`)}"/>
${locales
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(`${baseUrl}/${l}/${service}`)}"/>`)
        .join('\n')}
  </url>`)
  }

  // IMPORTANT:
  // Dashboard is intentionally NOT included.
  // It is private / non-indexable and must never appear in sitemap.

  // IMPORTANT:
  // The xml-stylesheet line must be immediately after the XML declaration,
  // with NO blank lines before it, otherwise browsers may ignore it.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`

  // Some browsers are happier with text/xml for rendering + XSL
  setHeader(event, 'content-type', 'text/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return sitemap
})
