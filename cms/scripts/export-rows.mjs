// One-time migration: reads the rows already in ../index.html and writes them as
// Sanity documents to entries.ndjson, ready for `npx sanity dataset import`.
import {readFileSync, writeFileSync} from 'node:fs'
import {SECTIONS} from '../sections.js'

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

const docs = []
for (const {value} of SECTIONS) {
  const block = html.match(new RegExp(`<section class="sec" id="${value}">([\\s\\S]*?)</section>`))
  if (!block) throw new Error(`Section ${value} not found in index.html`)
  const rows = [...block[1].matchAll(/<div class="r" role="row">(.*?)<\/div>/g)]
  rows.forEach(([, row], i) => {
    const [year, project, location, space, scope] = [...row.matchAll(/<span role="cell">(.*?)<\/span>/g)].map(([, c]) => {
      const text = unescape(c).trim()
      return text === '—' ? undefined : text
    })
    docs.push({_id: `entry-${value}-${String(i + 1).padStart(2, '0')}`, _type: 'entry', section: value, year, project, location, space, scope, order: i})
  })
}

writeFileSync(new URL('../entries.ndjson', import.meta.url), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
console.log(`Wrote ${docs.length} entries to cms/entries.ndjson`)
