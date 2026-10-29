import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {entry} from './schemas/entry.js'
import {about} from './schemas/about.js'
import {settings} from './schemas/settings.js'
import {hexColor} from './schemas/hexColor.jsx'
import {PROJECT_ID, DATASET} from './project.js'

const SINGLETONS = ['about', 'settings']

export default defineConfig({
  name: 'default',
  title: 'Jovanna Venegas CV',
  projectId: PROJECT_ID,
  dataset: DATASET,
  plugins: [
    structureTool({
      title: 'CV',
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem().id('about').title('About').child(S.document().schemaType('about').documentId('about').title('About')),
            S.listItem()
              .id('entries')
              .title('Entries')
              .child(
                S.documentTypeList('entry')
                  .title('Entries')
                  .defaultOrdering([{field: 'year', direction: 'desc'}]),
              ),
            S.divider(),
            S.listItem().id('settings').title('Settings').child(S.document().schemaType('settings').documentId('settings').title('Settings')),
          ]),
    }),
  ],
  schema: {
    types: [entry, about, settings, hexColor],
    // About and Settings exist once and can't be created again.
    templates: (prev) => prev.filter((t) => !SINGLETONS.includes(t.schemaType)),
  },
  document: {
    // Put Delete right under Publish in the arrow menu of every entry. About and
    // Settings can't be deleted or duplicated.
    actions: (prev, {schemaType}) => {
      if (SINGLETONS.includes(schemaType)) return prev.filter(({action}) => !['delete', 'duplicate', 'unpublish'].includes(action))
      const del = prev.find(({action}) => action === 'delete')
      const rest = prev.filter(({action}) => action !== 'delete')
      return del ? [rest[0], del, ...rest.slice(1)] : prev
    },
  },
})
