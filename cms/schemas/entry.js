// Accepts 2027, 2016–2017, 2024–PRESENT, TBC, and a trailing * on any of them.
const YEAR_PATTERN = /^(TBC|\d{4}(\s*[–-]\s*(\d{4}|PRESENT))?)\*?$/i

// Fields follow the column order on the site.
export const entry = {
  name: 'entry',
  title: 'Entry',
  type: 'document',
  fields: [
    {
      name: 'upcoming',
      title: 'Upcoming',
      type: 'boolean',
      description: 'Hides this entry on the site behind a highlight that says UPCOMING. Only the year shows.',
      initialValue: false,
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
    {
      name: 'link',
      title: 'Link',
      type: 'url',
      description: 'Optional. Makes the entry clickable on the site (opens in a new tab). In the PDF only the project title links.',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 6,
      description: 'Shown when the entry is opened on the site. Leave an empty line between paragraphs.',
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      description: 'Up to 3 images, shown stacked next to the description when the entry is opened.',
      of: [{type: 'image', fields: [{name: 'alt', title: 'Alt text', type: 'string', description: 'Describes the image for screen readers.'}]}],
      options: {layout: 'grid'},
      validation: (rule) => rule.max(3),
    },
    {
      name: 'excludeFromPdf',
      title: 'Exclude from PDF',
      type: 'boolean',
      description: 'Leaves this entry out of the exported CV. It still shows on the site.',
      initialValue: false,
    },
    // Keeps imported rows in their original order within a year. New entries leave it empty.
    {name: 'order', type: 'number', hidden: true},
  ],
  orderings: [{title: 'Year, newest first', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]}],
  preview: {
    select: {project: 'project', year: 'year', category: 'category', space: 'space', upcoming: 'upcoming'},
    prepare: ({project, year, category, space, upcoming}) => ({
      title: project,
      subtitle: [upcoming && 'UPCOMING', year, category, space].filter(Boolean).join(' · '),
    }),
  },
}
