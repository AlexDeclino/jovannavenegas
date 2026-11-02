// Builds index.html, about/index.html, sitemap.xml, robots.txt and cv.pdf from Sanity.
//   node scripts/build-site.mjs                  reads from Sanity
//   node scripts/build-site.mjs entries.ndjson   reads from a local export
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {execFileSync, spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {FONTS, DEFAULT_SETTINGS} from '../schemas/settings.js'
import {PROJECT_ID, DATASET} from '../project.js'

const SITE = 'https://jovannavenegas.com'

async function loadDocs(file) {
  if (file) return readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const query = encodeURIComponent('*[_type in ["entry", "about", "settings"] && !(_id in path("drafts.**"))]')
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v2025-01-01/data/query/${DATASET}?query=${query}`)
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attr = (s) => escape(s).replace(/"/g, '&quot;')
const cell = (value) => escape((value ?? '').trim() || '—')
const paragraphsOf = (text) => (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
const isUrl = (url) => /^https?:\/\/\S+$/i.test((url ?? '').trim())
const safeLink = (url) => (isUrl(url) ? attr(url.trim()) : null)

// Newest first by starting year, TBC last. Within a year, imported rows keep their
// original order and new entries (no `order`) go on top, newest first.
const startYear = (year) => Number((year ?? '').match(/\d{4}/)?.[0] ?? -Infinity)
const compare = (a, b) =>
  startYear(b.year) - startYear(a.year) ||
  (a.order ?? -1) - (b.order ?? -1) ||
  (b._createdAt ?? '').localeCompare(a._createdAt ?? '')

const docs = await loadDocs(process.argv[2])
const entries = docs.filter((e) => e._type === 'entry').sort(compare)
const aboutText = docs.find((d) => d._id === 'about')?.text ?? ''
const settings = {
  ...DEFAULT_SETTINGS,
  ...Object.fromEntries(Object.entries(docs.find((d) => d._id === 'settings') ?? {}).filter(([, v]) => v != null)),
}
const font = FONTS[settings.font] ?? FONTS[DEFAULT_SETTINGS.font]
const color = (key) => (/^#[0-9a-f]{3,8}$/i.test(settings[key] ?? '') ? settings[key] : DEFAULT_SETTINGS[key])
const fontLink = font.google ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&amp;display=swap">` : ''

// Index list

// Image refs look like image-<id>-<width>x<height>-<format>.
function imageTag(image, fallbackAlt) {
  const match = /^image-([a-f0-9]+)-(\d+)x(\d+)-(\w+)$/.exec(image?.asset?._ref ?? '')
  if (!match) return ''
  const [, id, w, h, format] = match
  const src = `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${id}-${w}x${h}.${format}`
  const srcset = [600, 1200, 2000].map((width) => `${src}?w=${width}&amp;auto=format ${width}w`).join(', ')
  return `<img src="${src}?w=1200&amp;auto=format" srcset="${srcset}" sizes="(max-width: 619px) 100vw, 33vw" width="${w}" height="${h}" alt="${attr((image.alt ?? fallbackAlt ?? '').trim())}" loading="lazy">`
}

const spans = (cells) => cells.map((c) => `<span>${c}</span>`).join('')

// Upcoming entries show only their year; nothing else about them is written out.
function listRow(e) {
  if (e.upcoming) return `<div class="e upcoming" role="listitem"><div class="row">${spans([cell(e.year), '<span class="bar">Upcoming</span>', '', ''])}</div></div>`
  const cells = spans([e.year, e.project, e.space, e.location].map((v) => escape((v ?? '').trim())))
  const href = safeLink(e.link)
  const paragraphs = paragraphsOf(e.description).map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`)
  const images = (e.images ?? []).slice(0, 3).map((img) => imageTag(img, e.project)).filter(Boolean)
  if (!paragraphs.length && !images.length && !href) return `<div class="e" role="listitem"><div class="row">${cells}</div></div>`
  const link = href ? `<p><a href="${href}" target="_blank" rel="noopener">Link ↗</a></p>` : ''
  return [
    `<details class="e" role="listitem">`,
    `<summary class="row">${cells}</summary>`,
    `<div class="detail"><div class="inner">`,
    `<div class="text">${paragraphs.join('')}${link}</div>`,
    `<div class="images">${images.join('')}</div>`,
    `</div></div>`,
    `</details>`,
  ].join('')
}

// Pages

const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Jovanna Venegas',
  jobTitle: 'Curator',
  worksFor: {'@type': 'Organization', name: 'SculptureCenter', url: 'https://www.sculpture-center.org'},
  address: {'@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US'},
  url: `${SITE}/`,
}
const profileLinks = (settings.profileLinks ?? []).filter(isUrl)
if (profileLinks.length) person.sameAs = profileLinks

function headFor({title, description, path, jsonLd}) {
  const url = `${SITE}/${path.replace(/index\.html$/, '')}`
  return [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${attr(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Jovanna Venegas">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary">`,
    ...(jsonLd ? [`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`] : []),
  ].join('\n')
}

const styleVars = `<style>:root{--bg:${color('backgroundColor')};--fg:${color('textColor')};--font:${font.stack};--size:${Number(settings.fontSize)}px;--row:${Number(settings.rowSpacing)}px;--line:${color('lineColor')};--hover:${color('hoverColor')};--hl:${color('highlightColor')};--hl-fg:${color('highlightTextColor')}}</style>`
const template = readFileSync(new URL('../template.html', import.meta.url), 'utf8').replace('<!-- SETTINGS -->', [fontLink, styleVars].filter(Boolean).join('\n'))
const MENU = [{title: 'About', href: '/about/'}]
const footer = [
  `© ${new Date().getFullYear()}`,
  ...(settings.email ? [`<a href="mailto:${attr(settings.email)}">Email</a>`] : []),
  `<a href="/cv.pdf" download="Jovanna-Venegas-CV.pdf">Export CV</a>`,
].join(' - ')

function writePage(path, current, content, head) {
  const menu = MENU.map(({title, href}) => `<li><a href="${href}"${title === current ? ' aria-current="page"' : ''}>${title}</a></li>`)
  const file = new URL(`../../${path}`, import.meta.url)
  mkdirSync(new URL('./', file), {recursive: true})
  writeFileSync(
    file,
    template
      .replace('<!-- HEAD -->', headFor({...head, path}))
      .replace('<!-- MENU -->', menu.join('\n'))
      .replace('<!-- CONTENT -->', content)
      .replace('<!-- FOOTER -->', footer),
  )
}

writePage('index.html', 'Index', [`<div class="list" role="list" aria-label="CV">`, ...entries.map(listRow), `</div>`].join('\n'), {
  title: 'Jovanna Venegas',
  description: 'Jovanna Venegas is a curator currently working at SculptureCenter, New York.',
  jsonLd: person,
})

const aboutParagraphs = paragraphsOf(aboutText)
writePage('about/index.html', 'About', `<div class="about">\n${aboutParagraphs.map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('\n')}\n</div>`, {
  title: 'About — Jovanna Venegas',
  description: (aboutParagraphs[0] ?? 'About Jovanna Venegas, Curator at SculptureCenter, New York.').slice(0, 300),
})

const today = new Date().toISOString().slice(0, 10)
const sitemapUrls = ['', 'about/'].map((p) => `<url><loc>${SITE}/${p}</loc><lastmod>${today}</lastmod></url>`)
writeFileSync(
  new URL('../../sitemap.xml', import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n')}\n</urlset>\n`,
)
writeFileSync(new URL('../../robots.txt', import.meta.url), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

// PDF: entries grouped by category, in the order of the original CV; categories it
// doesn't know follow in order of their newest entry.

const CATEGORY_ORDER = ['Positions', 'Exhibitions', 'Art Fairs and Curatorial Advisory', 'Juries, Reviews and Critiques', 'Mentorship and Teaching', 'Talks, Panels and Public Programs', 'Texts and Publications', 'Previous Experience', 'Education', 'Grants'].map((c) => c.toLowerCase())
const PDF_HEADER = ['Year', 'Project', 'Location', 'Institution', 'Role']

const pdfRow = (role, cells) =>
  `<div class="r${role === 'columnheader' ? ' hd' : ''}" role="row">${cells.map((c) => `<span role="${role}"${c === '—' ? ' class="empty"' : ''}>${c}</span>`).join('')}</div>`

function pdfEntry(e) {
  if (e.upcoming) return `<div class="r upcoming" role="row"><span role="cell">${cell(e.year)}</span>${['UPCOMING', '', '', ''].map((t) => `<span role="cell"><span class="bar">${t}</span></span>`).join('')}</div>`
  const cells = [e.year, e.project, e.location, e.space, e.scope].map(cell)
  const href = safeLink(e.link)
  if (href) cells[1] = `<a href="${href}">${cells[1]}</a>`
  return pdfRow('cell', cells)
}

const groups = new Map()
for (const e of entries.filter((e) => !e.excludeFromPdf)) {
  const name = (e.category ?? '').trim() || 'Other'
  if (!groups.has(name.toLowerCase())) groups.set(name.toLowerCase(), {name, entries: []})
  groups.get(name.toLowerCase()).entries.push(e)
}
const rank = (name) => {
  const i = CATEGORY_ORDER.indexOf(name.toLowerCase())
  return i === -1 ? CATEGORY_ORDER.length : i
}
const cvSections = [...groups.values()]
  .map((g, i) => ({...g, i}))
  .sort((a, b) => rank(a.name) - rank(b.name) || a.i - b.i)
  .map((g) => [`<section>`, `<h2>${escape(g.name)}</h2>`, pdfRow('columnheader', PDF_HEADER), ...g.entries.map(pdfEntry), `</section>`].join('\n'))
  .join('\n')

const contact = [
  'Curator, SculptureCenter · New York, NY',
  ...(settings.email ? [`<a href="mailto:${attr(settings.email)}">${escape(settings.email)}</a>`] : []),
  ...(settings.phone ? [escape(settings.phone)] : []),
].join(' · ')

const cvHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Jovanna Venegas — CV</title>
${fontLink}
<style>
@page{size:letter;margin:0.4in 0.4in 0.5in}
body{margin:0;font-family:${font.stack};font-size:7pt;line-height:1.4;color:#000;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:#000}
header{margin-bottom:4em}
header p{margin:0}
header .name{font-weight:700}
section{margin-bottom:4.5em}
h2{margin:0 0 1.8em;font-size:1em;font-weight:700;break-after:avoid}
.r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr) minmax(0,2fr) minmax(0,2fr) minmax(0,2fr);column-gap:2em;padding:0.45em 0 0.95em;border-bottom:0.5pt solid #000;break-inside:avoid}
.r > span:first-child{white-space:nowrap}
.r:last-child{border-bottom:0}
.hd{font-weight:700;padding-bottom:0.5em;break-after:avoid}
.empty{color:transparent}
.bar{display:block;background:${color('highlightColor')};color:${color('highlightTextColor')};font-size:0.85em;line-height:1.3;padding:0 0.4em;min-height:1.3em}
</style></head><body>
<header><p class="name">Jovanna Venegas</p><p>${contact}</p></header>
${cvSections}
</body></html>`

function findChrome() {
  const paths = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
  const found = paths.find((p) => existsSync(p))
  if (found) return found
  return ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find((name) => spawnSync('which', [name]).status === 0)
}

const chrome = findChrome()
if (chrome) {
  const htmlFile = join(tmpdir(), 'jovannavenegas-cv.html')
  writeFileSync(htmlFile, cvHtml)
  const pdf = fileURLToPath(new URL('../../cv.pdf', import.meta.url))
  execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer', '--virtual-time-budget=5000', `--print-to-pdf=${pdf}`, pathToFileURL(htmlFile).href], {stdio: 'ignore'})
  console.log(`Built the site (${entries.length} entries) and cv.pdf`)
} else {
  console.log(`Built the site (${entries.length} entries); no Chrome found, so cv.pdf was not updated`)
}
