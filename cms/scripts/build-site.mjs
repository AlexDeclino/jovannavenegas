// Builds ../index.html from template.html and the entries stored in Sanity.
//   node scripts/build-site.mjs                  reads entries from Sanity
//   node scripts/build-site.mjs entries.ndjson   reads entries from a local file
import {readFileSync, writeFileSync} from 'node:fs'
import {SECTIONS} from '../sections.js'
import {PROJECT_ID, DATASET} from '../project.js'

const HEADER = ['YEAR', 'PROJECT', 'LOCATION', 'INSTITUTION', 'SCOPE']

async function loadEntries(file) {
  if (file) return readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  const query = encodeURIComponent('*[_type == "entry" && !(_id in path("drafts.**"))]')
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v2025-01-01/data/query/${DATASET}?query=${query}`)
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cell = (value) => escape((value ?? '').trim().toUpperCase() || '—')

// Newest first by starting year; TBC last. Within a year, imported rows keep their
// original order and new entries (no `order`) go on top, newest first.
const startYear = (year) => Number((year ?? '').match(/\d{4}/)?.[0] ?? -Infinity)
function compare(a, b) {
  return (
    startYear(b.year) - startYear(a.year) ||
    (a.order ?? -1) - (b.order ?? -1) ||
    (b._createdAt ?? '').localeCompare(a._createdAt ?? '')
  )
}

function renderSection({value, title, note}, entries) {
  const row = (role, cells) => `<div class="r${role === 'columnheader' ? ' hd' : ''}" role="row">${cells.map((c) => `<span role="${role}">${c}</span>`).join('')}</div>`
  return [
    `<section class="sec" id="${value}">`,
    `<h2>${escape(title.toUpperCase())}</h2>`,
    `<div class="box"><div class="t" role="table" aria-label="${escape(title.charAt(0) + title.slice(1).toLowerCase())}">`,
    row('columnheader', HEADER),
    ...entries.map((e) => row('cell', [e.year, e.project, e.location, e.space, e.scope].map(cell))),
    `</div></div>`,
    ...(note ? [`<p class="note">${escape(note)}</p>`] : []),
    `</section>`,
  ].join('\n')
}

const entries = await loadEntries(process.argv[2])
const sections = SECTIONS.map((section) => {
  const rows = entries.filter((e) => e.section === section.value).sort(compare)
  return rows.length ? renderSection(section, rows) : ''
}).filter(Boolean)

const page = readFileSync(new URL('../template.html', import.meta.url), 'utf8').replace('<!-- SECTIONS -->', sections.join('\n'))
writeFileSync(new URL('../../index.html', import.meta.url), page)
console.log(`Built index.html with ${entries.length} entries`)
