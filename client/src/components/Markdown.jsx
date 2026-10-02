// Renders the small subset of Markdown the AI uses (bold, italics, code, lists, headings)
// as React elements, so nothing from the response is ever injected as raw HTML.

const renderInline = (text, keyPrefix) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>
    return part
  })

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/
const HEADING = /^#{1,6}\s+/

export default function Markdown({ text }) {
  const blocks = []
  let list = null
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', lines: paragraph })
    paragraph = []
  }
  const flushList = () => {
    if (list) blocks.push(list)
    list = null
  }

  for (const line of text.split('\n')) {
    const listType = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null

    if (listType) {
      flushParagraph()
      if (list?.type !== listType) {
        flushList()
        list = { type: listType, items: [] }
      }
      list.items.push(line.replace(listType === 'ul' ? BULLET : NUMBERED, ''))
    } else if (HEADING.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'h', text: line.replace(HEADING, '') })
    } else if (!line.trim()) {
      flushParagraph()
      flushList()
    } else if (list && /^\s{2,}/.test(line)) {
      // An indented line continues the previous list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()

  return (
    <div className="markdown">
      {blocks.map((block, index) => {
        if (block.type === 'h') return <h4 key={index}>{renderInline(block.text, index)}</h4>
        if (block.type === 'p') {
          return (
            <p key={index}>
              {block.lines.map((line, i) => (
                <span key={i}>{i > 0 && <br />}{renderInline(line, `${index}-${i}`)}</span>
              ))}
            </p>
          )
        }
        const List = block.type
        return (
          <List key={index}>
            {block.items.map((item, i) => <li key={i}>{renderInline(item, `${index}-${i}`)}</li>)}
          </List>
        )
      })}
    </div>
  )
}
