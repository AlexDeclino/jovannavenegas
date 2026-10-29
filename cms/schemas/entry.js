// Accepts 2027, 2016–2017, 2024–PRESENT, TBC, and a trailing * on any of them.
const YEAR_PATTERN = /^(TBC|\d{4}(\s*[–-]\s*(\d{4}|PRESENT))?)\*?$/i

// Fields follow the column order on the site.
export const entry = {
  name: 'entry',
  title: 'Entry',
  type: 'document',
  fields: [
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
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'For example Exhibitions, Positions, Talks, Panels and Public Programs, Texts and Publications, Grants.',
      validation: (rule) => rule.required(),
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'City, ST in the US (New York, NY). City, Country elsewhere (Mexico City, Mexico). Leave empty if unknown.',
    },
    {
      name: 'space',
      title: 'Institution',
      type: 'string',
      description: 'The hosting institution, e.g. SculptureCenter. Leave empty if unknown.',
    },
    {
      name: 'scope',
      title: 'Role',
      type: 'string',
      description: 'Her role (Curator, Co-curator with …, Juror, Moderator) or the kind of entry (Position, Internship, Grant).',
    },
    // Keeps imported rows in their original order within a year. New entries leave it empty.
    {name: 'order', type: 'number', hidden: true},
    // Legacy: the old build grouped by section. Remove once the new build is live on GitHub.
    {name: 'section', type: 'string', hidden: true},
  ],
  orderings: [{title: 'Year, newest first', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]}],
  preview: {
    select: {project: 'project', year: 'year', category: 'category', space: 'space'},
    prepare: ({project, year, category, space}) => ({
      title: project,
      subtitle: [year, category, space].filter(Boolean).join(' · '),
    }),
  },
}
