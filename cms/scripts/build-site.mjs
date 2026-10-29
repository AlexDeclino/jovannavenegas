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

// Upcoming entries show only the year. The other fields are never written to the page.
const upcomingRow = (e) =>
  `<div class="r upcoming" role="row"><span role="cell">${cell(e.year)}</span>${['UPCOMING', '', '', '', ''].map((t) => `<span role="cell"><span class="bar">${t}</span></span>`).join('')}</div>`

const docs = await loadDocs(process.argv[2])
const entries = docs.filter((e) => e._type === 'entry').sort(compare)

const table = [
  `<div role="table" aria-label="CV">`,
  row('columnheader', HEADER.map((h) => escape(h.toUpperCase()))),
  ...entries.map((e) => (e.upcoming ? upcomingRow(e) : row('cell', [e.year, e.project, e.category, e.location, e.space, e.scope].map(cell)))),
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
const head = [
  ...(font.google ? [`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&amp;display=swap">`] : []),
  `<style>:root{--bg:${settings.backgroundColor?.hex ?? '#fff'};--fg:${settings.textColor?.hex ?? '#000'};--font:${font.stack};--size:${Number(settings.fontSize)}px;--row:${Number(settings.rowSpacing)}px;--hl:${settings.highlightColor?.hex ?? '#000'};--hl-fg:${settings.highlightTextColor?.hex ?? '#fff'}}</style>`,
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
// The PDF uses the same table, black on white, on US Letter.
const cvHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Jovanna Venegas — CV</title>
${font.google ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${font.google}&amp;display=swap">` : ''}
<style>
@page{size:letter;margin:0.5in}
body{margin:0;font-family:${font.stack};font-size:8pt;line-height:1.4;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
header{margin-bottom:2em}
header p{margin:0;text-transform:uppercase}
header .name{font-weight:700}
.r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,3fr) minmax(0,2fr) minmax(0,2fr) minmax(0,2fr) minmax(0,2fr);column-gap:1.5em;break-inside:avoid}
.r > span:first-child{white-space:nowrap}
.hd{font-weight:700;border-bottom:1px solid #000;margin-bottom:6px}
.empty{color:transparent}
.bar{display:block;background:${settings.highlightColor?.hex ?? '#000'};color:${settings.highlightTextColor?.hex ?? '#fff'};font-size:0.8em;line-height:1.3;padding:0 0.4em;margin:0.25em 0;min-height:1.3em;text-transform:uppercase}
</style></head><body>
<header><p class="name">Jovanna Venegas</p><p>Curator, SculptureCenter · New York, NY</p></header>
${table}
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
