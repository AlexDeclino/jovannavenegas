// The About page text. There is only one, with the fixed id "about".
export const about = {
  name: 'about',
  title: 'About',
  type: 'document',
  fields: [
    {
      name: 'text',
      title: 'Text',
      type: 'text',
      rows: 12,
      description: 'Leave an empty line between paragraphs.',
    },
  ],
  preview: {prepare: () => ({title: 'About'})},
}
