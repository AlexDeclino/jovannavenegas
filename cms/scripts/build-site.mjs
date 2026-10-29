// Builds the site from template.html and the documents stored in Sanity:
// ../index.html from the entries and ../about/index.html from the About text.
//   node scripts/build-site.mjs                  reads from Sanity
//   node scripts/build-site.mjs entries.ndjson   reads from a local file
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
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
const shownNotes = [
  entries.some((e) => e.year?.includes('*')) && '* = Year taken from the matching exhibition.',
  entries.some((e) => /^TBC/i.test(e.year ?? '')) && 'TBC = Year not given in the original CV.',
].filter(Boolean)

const table = [
  `<div role="table" aria-label="CV">`,
  row('columnheader', HEADER.map((h) => escape(h.toUpperCase()))),
  ...entries.map((e) => (e.upcoming ? upcomingRow(e) : row('cell', [e.year, e.project, e.category, e.location, e.space, e.scope].map(cell)))),
  `</div>`,
  ...(shownNotes.length ? [`<p class="note">${escape(shownNotes.join(' '))}</p>`] : []),
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
function writePage(path, current, content) {
  const menu = MENU.map(({title, href}) => `<li><a${title === current ? ' class="current"' : ''} href="${href}">${title}</a></li>`)
  const file = new URL(`../../${path}`, import.meta.url)
  mkdirSync(new URL('./', file), {recursive: true})
  writeFileSync(file, template.replace('<!-- MENU -->', menu.join('\n')).replace('<!-- CONTENT -->', content))
}

writePage('index.html', 'Index', table)
const aboutText = docs.find((d) => d._id === 'about')?.text ?? ''
const paragraphs = aboutText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
writePage('about/index.html', 'About', `<div class="about">\n${paragraphs.map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join('\n')}\n</div>`)
console.log(`Built index.html with ${entries.length} entries, and about/index.html`)
