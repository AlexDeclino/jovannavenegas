// Builds the site from template.html and the documents stored in Sanity:
// ../index.html from the entries, ../about/index.html from the About text, and
// ../cv.pdf (all entries) printed with headless Chrome.
//   node scripts/build-site.mjs                  reads from Sanity
//   node scripts/build-site.mjs entries.ndjson   reads from a local file
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {execFileSync, spawnSync} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {FONTS, DEFAULT_SETTINGS} from '../schemas/settings.js'
import {PROJECT_ID, DATASET} from '../project.js'

const HEADER = ['Year', 'Project', 'Category', 'Location', 'Institution', 'Role']

async function loadDocs(file) {
  if (file) return readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const query = encodeURIComponent('*[_type in ["entry", "about", "settings"] && !(_id in path("drafts.**"))]')
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v2025-01-01/data/query/${DATASET}?query=${query}`)
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cell = (value) => escape((value ?? '').trim() || '—')

// One list for the whole CV: newest first by starting year, TBC last. Within a year,
// imported rows keep their original order and new entries (no `order`) go on top,
// newest first.
const startYear = (year) => Number((year ?? '').match(/\d{4}/)?.[0] ?? -Infinity)
function compare(a, b) {
  return (
    startYear(b.year) - startYear(a.year) ||
    (a.order ?? -1) - (b.order ?? -1) ||
    (b._createdAt ?? '').localeCompare(a._createdAt ?? '')
  )
}

const row = (role, cells) => `<div class="r${role === 'columnheader' ? ' hd' : ''}" role="row">${cells.map((c) => `<span role="${role}"${c === '—' ? ' class="empty"' : ''}>${c}</span>`).join('')}</div>`
// Only http(s) links are used; anything else is ignored.
const safeLink = (url) => (/^https?:\/\/\S+$/i.test((url ?? '').trim()) ? escape(url.trim()).replace(/"/g, '&quot;') : null)
// On the site a linked entry is clickable as a whole row.
const linkedRow = (cells, href) =>
  `<a class="r" role="row" href="${href}" target="_blank" rel="noopener">${cells.map((c) => `<span role="cell"${c === '—' ? ' class="empty"' : ''}>${c}</span>`).join('')}</a>`
const siteRow = (e) => {
  const cells = [e.year, e.project, e.category, e.location, e.space, e.scope].map(cell)
  const href = safeLink(e.link)
  return href ? linkedRow(cells, href) : row('cell', cells)
}
// In the PDF only the project title links.
const pdfRow = (e) => {
  const href = safeLink(e.link)
  const cells = [e.year, e.project, e.location, e.space, e.scope].map(cell)
  if (href) cells[1] = `<a href="${href}">${cells[1]}</a>`
  return row('cell', cells)
}

// Upcoming entries show only the year. The other fields are never written to the page.
const upcomingRow = (e, bars = 5) =>
  `<div class="r upcoming" role="row"><span role="cell">${cell(e.year)}</span>${['UPCOMING', ...Array(bars - 1).fill('')].map((t) => `<span role="cell"><span class="bar">${t}</span></span>`).join('')}</div>`

const docs = await loadDocs(process.argv[2])
const entries = docs.filter((e) => e._type === 'entry').sort(compare)

const table = [
  `<div role="table" aria-label="CV">`,
  row('columnheader', HEADER.map((h) => escape(h.toUpperCase()))),
  ...entries.map((e) => (e.upcoming ? upcomingRow(e) : siteRow(e))),
  `</div>`,
].join('\n')

// Gallery has no page yet.
const MENU = [
  {title: 'About', href: '/about/'},
  {title: 'Index', href: '/'},
  {title: 'Gallery', href: '#gallery'},
]
// Settings from Sanity become CSS variables (and a Google Fonts link for web fonts).
const settings = {...DEFAULT_SETTINGS, ...Object.fromEntries(Object.entries(docs.find((d) => d._id === 'settings') ?? {}).filter(([, v]) => v != null))}
const font = FONTS[settings.font] ?? FONTS[DEFAULT_SETTINGS.font]
// Colors are hex strings; anything else falls back to the default.
const color = (key) => {
  const value = typeof settings[key] === 'string' ? settings[key] : settings[key]?.hex
  return /^#[0-9a-f]{3,8}$/i.test(value ?? '') ? value : DEFAULT_SETTINGS[key]
}
const head = [
  ...(font.google ? [`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&amp;display=swap">`] : []),
  `<style>:root{--bg:${color('backgroundColor')};--fg:${color('textColor')};--font:${font.stack};--size:${Number(settings.fontSize)}px;--row:${Number(settings.rowSpacing)}px;--line:${color('lineColor')};--hover:${color('hoverColor')};--hl:${color('highlightColor')};--hl-fg:${color('highlightTextColor')}}</style>`,
].join('\n')
const template = readFileSync(new URL('../template.html', import.meta.url), 'utf8').replace('<!-- SETTINGS -->', head)
const footer = [
  `© ${new Date().getFullYear()}`,
  ...(settings.email ? [`<a href="mailto:${escape(settings.email)}">Email</a>`] : []),
  `<a href="/cv.pdf" download="Jovanna-Venegas-CV.pdf">Export CV</a>`,
].join(' - ')
function writePage(path, current, content) {
  const menu = MENU.map(({title, href}) => `<li><a${title === current ? ' class="current"' : ''} href="${href}">${title}</a></li>`)
  const file = new URL(`../../${path}`, import.meta.url)
  mkdirSync(new URL('./', file), {recursive: true})
  writeFileSync(file, template.replace('<!-- MENU -->', menu.join('\n')).replace('<!-- CONTENT -->', content).replace('<!-- FOOTER -->', footer))
}

writePage('index.html', 'Index', table)
const aboutText = docs.find((d) => d._id === 'about')?.text ?? ''
const paragraphs = aboutText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
writePage('about/index.html', 'About', `<div class="about">\n${paragraphs.map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('\n')}\n</div>`)
// The PDF groups entries under their category instead of showing a Category column.
// Known categories keep the order of the original CV; any others follow in order of
// their newest entry. Within a category, entries keep the site's order.
const CATEGORY_ORDER = ['Positions', 'Exhibitions', 'Art Fairs and Curatorial Advisory', 'Juries, Reviews and Critiques', 'Mentorship and Teaching', 'Talks, Panels and Public Programs', 'Texts and Publications', 'Previous Experience', 'Education', 'Grants']
const groups = new Map()
for (const e of entries.filter((e) => !e.excludeFromPdf)) {
  const name = (e.category ?? '').trim() || 'Other'
  const key = name.toLowerCase()
  if (!groups.has(key)) groups.set(key, {name, entries: []})
  groups.get(key).entries.push(e)
}
const rank = (g) => {
  const i = CATEGORY_ORDER.findIndex((c) => c.toLowerCase() === g.name.toLowerCase())
  return i === -1 ? CATEGORY_ORDER.length : i
}
const PDF_HEADER = ['Year', 'Project', 'Location', 'Institution', 'Role']
const cvSections = [...groups.values()]
  .map((g, i) => ({...g, i}))
  .sort((a, b) => rank(a) - rank(b) || a.i - b.i)
  .map((g) =>
    [
      `<section>`,
      `<h2>${escape(g.name)}</h2>`,
      row('columnheader', PDF_HEADER.map(escape)),
      ...g.entries.map((e) => (e.upcoming ? upcomingRow(e, 4) : pdfRow(e))),
      `</section>`,
    ].join('\n'),
  )
  .join('\n')

// Contact line in the PDF header; email and phone come from Settings when set.
const contact = [
  'Curator, SculptureCenter · New York, NY',
  ...(settings.email ? [`<a href="mailto:${escape(settings.email)}">${escape(settings.email)}</a>`] : []),
  ...(settings.phone ? [escape(settings.phone)] : []),
].join(' · ')

// The PDF follows the original CV layout: black on white, all caps, US Letter.
const cvHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Jovanna Venegas — CV</title>
${font.google ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&amp;display=swap">` : ''}
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
  const candidates = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)
  const found = candidates.find((c) => existsSync(c))
  if (found) return found
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    if (spawnSync('which', [name]).status === 0) return name
  }
}
const chrome = findChrome()
if (chrome) {
  const htmlFile = join(tmpdir(), 'jovannavenegas-cv.html')
  writeFileSync(htmlFile, cvHtml)
  const pdf = fileURLToPath(new URL('../../cv.pdf', import.meta.url))
  execFileSync(chrome, ['--headless', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer', '--virtual-time-budget=5000', `--print-to-pdf=${pdf}`, pathToFileURL(htmlFile).href], {stdio: 'ignore'})
  console.log(`Built index.html with ${entries.length} entries, about/index.html and cv.pdf`)
} else {
  console.log(`Built index.html with ${entries.length} entries and about/index.html (no Chrome found, cv.pdf not updated)`)
}
