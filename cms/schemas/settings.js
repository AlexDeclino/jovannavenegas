// Site-wide look. There is only one, with the fixed id "settings".
// FONTS maps each choice to its CSS stack and, for web fonts, the Google Fonts family.
export const FONTS = {
  helvetica: {title: 'Helvetica', stack: 'Helvetica,Arial,Verdana,sans-serif'},
  times: {title: 'Times', stack: '"Times New Roman",Times,serif'},
  courier: {title: 'Courier', stack: '"Courier New",Courier,monospace'},
  plexMono: {title: 'IBM Plex Mono', stack: '"IBM Plex Mono",ui-monospace,Menlo,monospace', google: 'IBM+Plex+Mono:wght@400;700'},
  inter: {title: 'Inter', stack: 'Inter,Helvetica,Arial,sans-serif', google: 'Inter:wght@400;700'},
  ebGaramond: {title: 'EB Garamond', stack: '"EB Garamond",Georgia,serif', google: 'EB+Garamond:wght@400;700'},
}

export const DEFAULT_SETTINGS = {
  backgroundColor: '#ffffff',
  textColor: '#000000',
  font: 'helvetica',
  fontSize: 13.25,
  rowSpacing: 0,
  highlightColor: '#000000',
  highlightTextColor: '#ffffff',
  hoverColor: '#eeeeee',
  lineColor: '#dddddd',
}

export const settings = {
  name: 'settings',
  title: 'Settings',
  type: 'document',
  fields: [
    {
      name: 'email',
      title: 'Email address',
      type: 'string',
      description: 'Used by the Email link in the footer. Leave empty to hide the link.',
      validation: (rule) => rule.email(),
    },
    {
      name: 'phone',
      title: 'Phone',
      type: 'string',
      description: 'Shown in the header of the exported CV PDF, e.g. +1 347-324-4446. Leave empty to hide it.',
    },
    {name: 'backgroundColor', title: 'Background color', type: 'hexColor', description: 'Hex color, e.g. #ffffff. Click the swatch to pick one.', initialValue: DEFAULT_SETTINGS.backgroundColor},
    {name: 'textColor', title: 'Text color', type: 'hexColor', description: 'Also used for lines and links.', initialValue: DEFAULT_SETTINGS.textColor},
    {
      name: 'font',
      title: 'Font',
      type: 'string',
      options: {list: Object.entries(FONTS).map(([value, {title}]) => ({value, title})), layout: 'radio'},
      initialValue: DEFAULT_SETTINGS.font,
    },
    {
      name: 'fontSize',
      title: 'Font size',
      type: 'number',
      description: 'In pixels. Default 13.25.',
      initialValue: DEFAULT_SETTINGS.fontSize,
      validation: (rule) => rule.min(9).max(24),
    },
    {
      name: 'rowSpacing',
      title: 'Entries vertical spacing',
      type: 'number',
      description: 'Extra space above and below each entry, in pixels. 0 matches jetset.nl.',
      initialValue: DEFAULT_SETTINGS.rowSpacing,
      validation: (rule) => rule.min(0).max(40),
    },
    {name: 'lineColor', title: 'Entry line color', type: 'hexColor', description: 'The thin line between entries.', initialValue: DEFAULT_SETTINGS.lineColor},
    {name: 'hoverColor', title: 'Entry hover color', type: 'hexColor', description: 'Background of an entry when the mouse is over it.', initialValue: DEFAULT_SETTINGS.hoverColor},
    {name: 'highlightColor', title: 'Upcoming highlight color', type: 'hexColor', initialValue: DEFAULT_SETTINGS.highlightColor},
    {name: 'highlightTextColor', title: 'Upcoming highlight text color', type: 'hexColor', initialValue: DEFAULT_SETTINGS.highlightTextColor},
  ],
  preview: {prepare: () => ({title: 'Settings'})},
}
