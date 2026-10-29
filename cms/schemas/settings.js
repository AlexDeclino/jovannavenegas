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
  backgroundColor: {hex: '#ffffff'},
  textColor: {hex: '#000000'},
  font: 'helvetica',
  fontSize: 13.25,
  rowSpacing: 0,
  highlightColor: {hex: '#000000'},
  highlightTextColor: {hex: '#ffffff'},
}

export const settings = {
  name: 'settings',
  title: 'Settings',
  type: 'document',
  fields: [
    {name: 'backgroundColor', title: 'Background color', type: 'color', options: {disableAlpha: true}, initialValue: DEFAULT_SETTINGS.backgroundColor},
    {name: 'textColor', title: 'Text color', type: 'color', options: {disableAlpha: true}, description: 'Also used for lines and links.', initialValue: DEFAULT_SETTINGS.textColor},
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
    {name: 'highlightColor', title: 'Upcoming highlight color', type: 'color', options: {disableAlpha: true}, initialValue: DEFAULT_SETTINGS.highlightColor},
    {name: 'highlightTextColor', title: 'Upcoming highlight text color', type: 'color', options: {disableAlpha: true}, initialValue: DEFAULT_SETTINGS.highlightTextColor},
  ],
  preview: {prepare: () => ({title: 'Settings'})},
}
