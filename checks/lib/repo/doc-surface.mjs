// doc-surface.mjs — live 文档可读面的唯一枚举器（BUG-210/211/212/214 类级）。
//
// 为什么：门禁的判据面一直窄于它的承诺面——call-surface 只认行首命令词、doc-paths 只认现行根与
// 反引号、count-free 只认四个名词。每补一个形态就复发一次（160/172/192/193/198/204/206 之后
// 是 210/211/212/214/216）。根因不是少一条正则，而是**「哪些形态算合同」没有可对账的台账**：
// 门禁各写各的枚举，形态一超出枚举就静默放行。
//
// 本模块把两件事收口：
//   ① SHAPES / COMMAND_FORMS = 形态台账（每条 = 一种 agent 能读到的写法 + 拥有它的门禁 + 一条
//      gates.e2e 案例 id）。tests/checks/shared/doc-surface-shapes.test.mjs 双向对账：台账里的形态必须
//      被 scanDocument 真的产出、必须有案例；两个门禁的案例必须能映射回台账。
//   ② scanDocument / scanCiCommands = 唯一的形态→token 转换（剥离、归一、路径提取）。
//      消费门禁只消费 token，不再自己写「哪些行是命令」的正则。
//
// 显式不合同（防门禁越界；evaluation §L0 同口径）：
//   - 非 shell 语言围栏（```json / ```text / ```yaml）里的裸路径行：是示例不是调用面；
//   - 无扩展名的散文路径（`checks/dev`）：已知边界，不猜是文件还是目录；
//   - 裸目录名（`checks/` 结尾斜杠）、vendor/dsh 源 shorthand、包内 shorthand：由消费方按解析顺序放行；
//   - URL 与占位符（`<…>` `*` `$`）不判。
//
// 纯函数：零 fs / 零子进程（存在性解析归消费门禁）。

/** 仓内路径根（现行 + 退役；退役根必须被枚举出来才能判红，否则它们因不匹配而静默逃检）。 */
export const ROOTS = [
  'packages', 'checks', 'tools', 'docs', 'tests', 'snapshots', 'probes', '_dist',
  'research-workspace', '.agents', 'dev', 'scripts',
]
const ROOT_ALT = ROOTS.map((r) => r.replace(/\./g, '\\.')).join('|')
// 最长优先（`json` 必须先于 `js`，`tsx` 先于 `ts`）——顺序错会把扩展名截断成假路径。
const EXT = '(?:json|yaml|yml|tsx|mjs|cjs|txt|md|js|ts|sh)'

// 文档形态台账：producer = 产出它的枚举函数；case = gates.e2e 的 CASES id。
// 兑换规则（tests/checks/shared/doc-surface-shapes.test.mjs）：每种形态必须有合成样本让 producer 真的产出它，
// 且案例必须是 owner 门禁名下的一条注入。
export const SHAPES = Object.freeze([
  { form: 'backtick', producer: 'document', owner: 'doc-paths', case: 'doc-paths-dangling', note: '反引号内联代码里的路径' },
  { form: 'prose', producer: 'document', owner: 'doc-paths', case: 'doc-paths-prose-dangling', note: '散文里带扩展名的裸路径' },
  { form: 'table', producer: 'document', owner: 'doc-paths', case: 'doc-paths-table-retired-root', note: '表格单元里的裸路径（散文的表格位置）' },
  { form: 'fence-path', producer: 'document', owner: 'doc-paths', case: 'doc-paths-fenced-path-line', note: 'shell 围栏里的纯路径行' },
  { form: 'html-href', producer: 'document', owner: 'doc-paths', case: 'doc-paths-html-href', note: '<a href> 里的路径' },
  { form: 'link-label', producer: 'document', owner: 'doc-paths', case: 'doc-paths-retired-label', note: 'Markdown 链接文字里的入口名' },
  { form: 'fence-command', producer: 'document', owner: 'call-surface', case: 'call-surface-fenced-command', note: 'shell 围栏里的可执行行' },
  { form: 'indented-command', producer: 'document', owner: 'call-surface', case: 'call-surface-indented-command', note: '缩进代码块里的可执行行' },
  { form: 'ci-run', producer: 'ci', owner: 'call-surface', case: 'call-surface-ci-run', note: 'CI 工作流 run: 面' },
  { form: 'probe-header', producer: 'comment', owner: 'call-surface', case: 'call-surface-probe-header', note: '探针头注「何时跑」' },
])

// 同门禁下的断言变体案例（判的是既有形态上的另一条断言，不是新形态）。
export const ASSERTION_CASES = Object.freeze([
  { case: 'doc-paths-retired-root', owner: 'doc-paths', note: '退役根在反引号面判红 + vendor shorthand 放行对照' },
  { case: 'doc-paths-live-methods', owner: 'doc-paths', note: '活指令面（_backlog/methods + triggers.md）在扫描范围内' },
])

// 命令形态台账：每种「可直接执行」的写法都必须有一条注入案例（归一器负责把它们折成同一判据）。
export const COMMAND_FORMS = Object.freeze([
  { form: 'env-prefix', case: 'call-surface-env-prefix', note: 'FOO=1 node …' },
  { form: 'dot-slash', case: 'call-surface-dot-slash', note: 'node ./checks/…' },
  { form: 'wrapper', case: 'call-surface-wrapper', note: 'sudo / env / time 前缀' },
  { form: 'and-chain', case: 'call-surface-and-chain', note: 'echo x && node …' },
  { form: 'require-qualifier', case: 'call-surface-require-qualifier', note: '--require=checks/… 或 NODE_OPTIONS=' },
  { form: 'heredoc', case: 'call-surface-heredoc', note: 'bash -s <<EOF 的 body' },
  { form: 'indented', case: 'call-surface-indented-command', note: '四空格缩进的可执行行' },
  { form: 'yaml-folded', case: 'call-surface-ci-folded-run', note: 'run: >- / |+ 折叠块' },
])

const COMMAND_WORDS = 'node|bash|sh|source|pnpm|npx|npm|cd'
const SEGMENT_SPLIT = /\s*(?:&&|\|\||;)\s*/
const ENV_PREFIX = /^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/
const WRAPPERS = /^(?:(?:sudo|time|env|command|nohup)\s+)+/
const PATH_IN_TEXT = new RegExp(`(?:^|[\\s"'\`(=])((?:\\./)?(?:${ROOT_ALT})/[A-Za-z0-9_./-]+)`, 'g')
const PROSE_PATH = new RegExp(`(?<![A-Za-z0-9_./-])(?:${ROOT_ALT})/[A-Za-z0-9_./-]+\\.${EXT}`, 'g')
const ROOTED = new RegExp(`^(?:\\./)?(?:${ROOT_ALT})/`)

/** 归一单条路径 token：去 `./` 前缀、行号/锚点/尾标点。 */
export function cleanPath(raw) {
  return String(raw)
    .trim()
    .replace(/^\.\//, '')
    .replace(/#L\d+(?:-L?\d+)?$/, '')
    .replace(/:\d+(?:-\d+)?$/, '')
    .replace(/[.,;:）)】]+$/, '')
}

/** 退役根名（`scripts/` `dev/` `probes/run/`）——判红与提示是同一处。 */
export function isRetiredRoot(path) {
  return /^(?:dev|scripts)\//.test(path) || /^probes\/run\//.test(path)
}

export function retiredRootHint(path) {
  if (/^scripts\//.test(path)) return 'checks/'
  if (/^dev\//.test(path)) return 'tools/'
  if (/^probes\/run\//.test(path)) return 'probes/analyze/'
  return ''
}

/** shell 围栏判定：无语言标记或 shell 系语言才算调用/路径清单面（json/text/yaml 是示例面）。 */
export function isShellFence(info) {
  const lang = String(info ?? '').trim().toLowerCase().split(/\s+/)[0]
  return lang === '' || ['sh', 'bash', 'shell', 'zsh', 'console', 'shell-session', 'fish'].includes(lang)
}

/** 命令归一：剥提示符、行首 env 赋值与 sudo/env/time 包装；返回可判的命令串（无则 ''）。 */
export function normalizeCommand(line) {
  let s = String(line).trim().replace(/^\$\s+/, '').replace(/^>\s+/, '')
  // 注释行不是命令；行尾注释只剥「空白 + # 之后」（`#` 在引号里不剥是过度设计，调用面命令不带 #）。
  if (s.startsWith('#') || s === '') return ''
  s = s.replace(/\s+#.*$/, '')
  const segments = s.split(SEGMENT_SPLIT).map((seg) => {
    let out = seg.trim().replace(ENV_PREFIX, '').replace(WRAPPERS, '')
    return out
  })
  return segments.find((seg) => new RegExp(`^(?:${COMMAND_WORDS})\\b`).test(seg)) ?? ''
}

/** 一条命令串里的仓内路径 token（`./` 前缀归一为仓根；env 前缀里的 `--require=checks/…` 也同样抓）。 */
export function commandPathsOf(line) {
  const command = normalizeCommand(line)
  if (command === '') return { command: '', paths: [] }
  // 路径从**未剥 env 前缀**的行上取：`NODE_OPTIONS=--require=checks/x.cjs node …` 的坏路径在赋值里。
  const cleaned = String(line).trim().replace(/^\$\s+/, '').replace(/\s+#.*$/, '')
  const paths = [...cleaned.matchAll(PATH_IN_TEXT)].map((m) => cleanPath(m[1]))
  return { command, paths }
}

/**
 * 注释/散文里的命令引用（探针头注「何时跑」：命令词可能出现在行中，前缀是中文标签或 `//`）。
 * 只认「命令词 + 后续 token」的形态，不要求行首。
 */
export function commandPathsAnywhere(text) {
  const line = String(text ?? '')
  const hasCommand = new RegExp(`(?:^|[\\s：:，,（(\\x60])(?:${COMMAND_WORDS})\\s+`).test(line)
  if (!hasCommand) return []
  return [...line.matchAll(PATH_IN_TEXT)].map((m) => cleanPath(m[1]))
}

const fenceInfoOf = (line) => line.trimStart().replace(/^`{3,}/, '').trim()
// 占位符（`<slug>` `$name` `*` `?` `…` `[scene]`）紧跟 path token = 示例不是事实声明。
const isPlaceholderAt = (line, end) => /[<{*?$…[\]]/.test(line.slice(end, end + 1))
const isPurePathLine = (line) => {
  const s = line.trim()
  if (s === '' || /\s/.test(s) || /[<{*?$…[\]]/.test(s)) return null
  return ROOTED.test(s) ? cleanPath(s) : null
}

/**
 * 扫描一份文档，返回 token 流：
 *   { line, form, kind: 'path'|'command'|'label', text, path?, paths?, command? }
 * 消费方按 form 决定归属（doc-paths 收 path/label，call-surface 收 command）。
 */
export function scanDocument(text) {
  const out = []
  const lines = String(text ?? '').split('\n')
  let inFence = false
  let fenceInfo = ''
  for (const [index, line] of lines.entries()) {
    const at = index + 1
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      fenceInfo = inFence ? fenceInfoOf(line) : ''
      continue
    }
    if (inFence) {
      const { command, paths } = commandPathsOf(line)
      if (command !== '') {
        out.push({ line: at, form: 'fence-command', kind: 'command', text: line.trim(), command, paths })
        continue
      }
      // 纯路径行只在 shell 系围栏算合同（json/text/yaml 里的裸路径是示例）。
      if (isShellFence(fenceInfo)) {
        const path = isPurePathLine(line)
        if (path !== null) out.push({ line: at, form: 'fence-path', kind: 'path', text: line.trim(), path })
      }
      continue
    }
    // 缩进代码块（四空格或 tab）里的可执行行：不在围栏内的第二种「可执行」载体。
    if (/^(?: {4}|\t)\S/.test(line)) {
      const { command, paths } = commandPathsOf(line)
      if (command !== '') {
        out.push({ line: at, form: 'indented-command', kind: 'command', text: line.trim(), command, paths })
        continue
      }
    }
    // 反引号内联代码：命令与散路径都按路径面判（call-surface 只承诺围栏/头注/CI 三入口）。
    for (const m of line.matchAll(/`([^`\n]+)`/g)) {
      for (const pm of m[1].matchAll(PATH_IN_TEXT)) {
        if (isPlaceholderAt(m[1], pm.index + pm[0].length)) continue
        out.push({ line: at, form: 'backtick', kind: 'path', text: m[1].trim(), path: cleanPath(pm[1]) })
      }
    }
    // HTML href：链接语法之外的第三种「可点/可读」路径载体。
    for (const m of line.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)) {
      const target = m[1].trim()
      if (!ROOTED.test(target) || isPlaceholderAt(target, target.length)) continue
      out.push({ line: at, form: 'html-href', kind: 'path', text: target, path: cleanPath(target) })
    }
    // Markdown 链接文字：标签是 agent 读取的入口名（探针/方法目录都这么用）。
    for (const m of line.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
      out.push({ line: at, form: 'link-label', kind: 'label', text: m[1].trim() })
    }
    // 散文（含表格单元）：剥反引号后带扩展名的裸路径。
    const form = /^\s*\|/.test(line) ? 'table' : 'prose'
    const bare = line.replace(/`[^`\n]*`/g, '')
    for (const m of bare.matchAll(PROSE_PATH)) {
      if (isPlaceholderAt(bare, m.index + m[0].length)) continue
      out.push({ line: at, form, kind: 'path', text: m[0], path: cleanPath(m[0]) })
    }
  }
  return out
}

/**
 * CI 工作流扫描：`run:` 内联 + 任意块标量（`|` `>` `|-` `>-` `|+` `>+` `|2`）。
 * 块体每行都是 shell 上下文（纯路径行同样会执行失败），逐行取路径。
 */
export function scanCiCommands(text) {
  const out = []
  const lines = String(text ?? '').split('\n')
  let blockIndent = null
  for (const [index, line] of lines.entries()) {
    const at = index + 1
    if (blockIndent !== null) {
      if (line.trim() === '') continue
      const indent = (line.match(/^\s*/) ?? [''])[0].length
      if (indent > blockIndent) {
        const { command, paths } = commandPathsOf(line)
        out.push({ line: at, form: 'ci-run', kind: 'command', text: line.trim(), command: command || line.trim(), paths })
        continue
      }
      blockIndent = null
    }
    const m = line.match(/^\s*(?:-\s*)?run:\s*(.*)$/)
    if (!m) continue
    const value = m[1].trim()
    if (/^[|>][+-]?\d*$/.test(value)) { blockIndent = (line.match(/^\s*/) ?? [''])[0].length; continue }
    const { command, paths } = commandPathsOf(value)
    out.push({ line: at, form: 'ci-run', kind: 'command', text: value, command: command || value, paths })
  }
  return out
}
