/**
 * citation-linkify.ts —— 内存预处理终稿 Markdown 中的证据引用为可点 Markdown 链接（纯函数）。
 *
 * 规则：
 *   - 绝不修改磁盘 `final*.md`；只做呈现层内存转换。
 *   - 围栏代码块（``` / ~~~）与行内反引号跨度内的文本原样保留，不转换。
 *   - 支持 `[来源: evidence/foo.md]` / `[来源：evidence/foo.md]` / `[Source: evidence/foo.md]`
 *     以及 `[evidence/foo.md]`（后面未紧跟 `(` 避免重复链接）。
 */

const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})/
const CITATION_RE = /\[(?:来源|Source)\s*[:：]\s*(evidence\/[^\]\s)]+\.md)\](?!\()|\[(evidence\/[^\]\s)]+\.md)\](?!\()/g

function linkifyInlineSegment(segment: string): string {
  // 按行内反引号分段：奇数段（在 `...` 内）保持原样。
  const parts = segment.split(/(`+[^`]*`+)/g)
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part
      return part.replace(CITATION_RE, (full, p1?: string, p2?: string) => {
        const target = p1 ?? p2
        if (target === undefined || target.includes('..')) return full
        return `${full}(${target})`
      })
    })
    .join('')
}

/**
 * 将终稿文本中的 `[来源: evidence/xx.md]` 转为可点击 Markdown 链接，跳过代码块与行内代码。
 */
export function linkifyEvidenceCitations(markdown: string): string {
  if (typeof markdown !== 'string' || markdown === '') return ''
  const lines = markdown.split(/\r?\n/)
  const out: string[] = []
  let fenceChar: string | null = null
  let fenceLen = 0

  for (const line of lines) {
    const match = FENCE_RE.exec(line)
    if (match?.[1] !== undefined) {
      const marker = match[1]
      if (fenceChar === null) {
        fenceChar = marker[0] ?? null
        fenceLen = marker.length
      } else if (marker[0] === fenceChar && marker.length >= fenceLen) {
        fenceChar = null
        fenceLen = 0
      }
      out.push(line)
      continue
    }
    out.push(fenceChar !== null ? line : linkifyInlineSegment(line))
  }
  return out.join('\n')
}
