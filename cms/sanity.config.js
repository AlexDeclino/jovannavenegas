import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {entry} from './schemas/entry.js'
import {SECTIONS} from './sections.js'
import {PROJECT_ID, DATASET} from './project.js'

export default defineConfig({
  name: 'default',
  title: 'Jovanna Venegas CV',
  projectId: PROJECT_ID,
  dataset: DATASET,
  plugins: [
    structureTool({
      title: 'CV',
      // One sidebar item per section, each listing only that section's entries.
      structure: (S) =>
        S.list()
          .title('CV sections')
          .items(
            SECTIONS.map(({value, title}) =>
              S.listItem()
                .id(value)
                .title(title)
                .child(
                  S.documentList()
                    .id(value)
                    .title(title)
                    .schemaType('entry')
                    .filter('_type == "entry" && section == $section')
                    .params({section: value})
                    .defaultOrdering([{field: 'year', direction: 'desc'}])
                    .initialValueTemplates([S.initialValueTemplateItem('entry-in-section', {section: value})]),
                ),
            ),
          ),
    }),
  ],
  schema: {
    types: [entry],
    // "New entry" inside a section pre-fills that section.
    templates: (prev) => [
      ...prev.filter((t) => t.schemaType !== 'entry'),
      {
        id: 'entry-in-section',
        title: 'Entry',
        schemaType: 'entry',
        parameters: [{name: 'section', type: 'string'}],
        value: ({section}) => ({section}),
      },
    ],
  },
})
