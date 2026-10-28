import {SECTIONS} from '../sections.js'

// Accepts 2027, 2016–2017, 2024–PRESENT, TBC, and a trailing * on any of them.
const YEAR_PATTERN = /^(TBC|\d{4}(\s*[–-]\s*(\d{4}|PRESENT))?)\*?$/i

export const entry = {
  name: 'entry',
  title: 'Entry',
  type: 'document',
  fields: [
    {
      name: 'section',
      title: 'Section',
      type: 'string',
      options: {list: SECTIONS.map(({value, title}) => ({value, title})), layout: 'dropdown'},
      validation: (rule) => rule.required(),
    },
    {
      name: 'year',
      title: 'Year',
      type: 'string',
      description: 'One year (2027), a range (2016–2017, 2024–PRESENT), or TBC if unknown.',
      validation: (rule) =>
        rule.required().custom((value) =>
          !value || YEAR_PATTERN.test(value.trim()) ? true : 'Use a year like 2027, a range like 2016–2017 or 2024–PRESENT, or TBC.',
        ),
    },
    {
      name: 'project',
      title: 'Project',
      type: 'string',
      description: 'Exhibition, program or publication title. For positions, education and grants: the role, degree or grant.',
      validation: (rule) => rule.required(),
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'CITY, ST in the US (NEW YORK, NY). CITY, COUNTRY elsewhere (MEXICO CITY, MEXICO). Leave empty if unknown.',
    },
    {
      name: 'space',
      title: 'Institution',
      type: 'string',
      description: 'The hosting institution, e.g. SCULPTURECENTER. Leave empty if unknown.',
    },
    {
      name: 'scope',
      title: 'Scope',
      type: 'string',
      description: 'Her role (CURATOR, CO-CURATOR WITH …, JUROR, MODERATOR) or the kind of entry (POSITION, INTERNSHIP, GRANT).',
    },
    // Keeps imported rows in their original order within a year. New entries leave it empty.
    {name: 'order', type: 'number', hidden: true},
  ],
  preview: {
    select: {project: 'project', year: 'year', space: 'space', scope: 'scope'},
    prepare: ({project, year, space, scope}) => ({
      title: project,
      subtitle: [year, space, scope].filter(Boolean).join(' · '),
    }),
  },
}
