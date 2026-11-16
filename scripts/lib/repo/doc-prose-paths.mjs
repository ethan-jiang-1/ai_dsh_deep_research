// doc-prose-paths.mjs — live 文档散文里的仓内路径 token 枚举（BUG-204 类级）。
//
// 为什么抽出：`doc-paths` 原先只解析反引号 token；散文里的 `scripts/lib/…` / `tests/…` 同样
// 会被 agent 照读，指向空处 = 探索成本 + 误诊。纯函数只做「枚举 + 剥除」，存在性由消费门禁
// 按统一解析顺序（仓根 / 文档目录 / vendor/dsh）判定；测试可用合成文本钉住围栏/内联代码/
// URL 三类排除形态。
const ROOT_PREFIX = '(?:packages|scripts|dev|docs|tests|snapshots|_dist|research-workspace)'
const EXT = '(?:md|mjs|sh|cjs|ts|tsx|json|ya?ml)'
// 根前缀前不得再接路径字符（排除 `https://x/scripts/foo.mjs` 这类 URL 子串）。
const PROSE_PATH = new RegExp(`(?<![A-Za-z0-9_./-])${ROOT_PREFIX}/[A-Za-z0-9_./-]+\\.${EXT}`, 'g')

/** 返回 [{ line: 1-based, path }]：剥代码围栏与反引号内联代码后，枚举带扩展名的仓内路径。 */
export function prosePathTokens(text) {
  const out = []
  let inFence = false
  for (const [index, line] of String(text ?? '').split('\n').entries()) {
    if (line.trimStart().startsWith('```')) { inFence = !inFence; continue }
    if (inFence) continue
    const bare = line.replace(/`[^`\n]*`/g, '')
    for (const match of bare.matchAll(PROSE_PATH)) {
      out.push({ line: index + 1, path: match[0].replace(/[.,;:]+$/, '') })
    }
  }
  return out
}
