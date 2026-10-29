import {set, unset} from 'sanity'
import {Box, Flex, TextInput} from '@sanity/ui'

const HEX = /^#[0-9a-f]{6}$/i

// A hex color as text, with the browser's own color picker beside it.
function HexColorInput({value = '', onChange, elementProps}) {
  const update = (next) => onChange(next ? set(next) : unset())
  return (
    <Flex gap={2} align="center">
      <input
        type="color"
        aria-label="Pick a color"
        value={HEX.test(value) ? value : '#000000'}
        onChange={(event) => update(event.target.value)}
        style={{width: 44, height: 35, padding: 0, border: '1px solid #888', borderRadius: 3, background: 'none', cursor: 'pointer'}}
      />
      <Box flex={1}>
        <TextInput {...elementProps} value={value} placeholder="#000000" onChange={(event) => update(event.currentTarget.value.trim())} />
      </Box>
    </Flex>
  )
}

export const hexColor = {
  name: 'hexColor',
  title: 'Color',
  type: 'string',
  components: {input: HexColorInput},
  validation: (rule) => rule.custom((value) => (!value || HEX.test(value) ? true : 'Use a hex color like #000000.')),
}
