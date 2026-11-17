// doc-surface-shapes.test.mjs — 文档/命令形态台账 ↔ 枚举器 ↔ gates.e2e 案例的三向对账（类级守卫）。
//
// 为什么：门禁的判据面曾经小于承诺面，且没有任何机械事实阻止它继续收窄。本文件把「哪些写法算
// 合同」钉成三件事同时成立：
//   ① 台账里每种形态都有合成样本，能被枚举器真的产出（形态被删/改名 = 红）；
//   ② 每种形态/命令变体都有一条 gates.e2e 注入案例，且案例的 gate = 台账的 owner（案例被删 = 红）；
//   ③ 两个门禁名下的每条案例都能映射回台账（偷偷加案例但不声明形态 = 红；反向防"台账空转"）。
// 负例留证 2026-11-17：BUG-211——从 SHAPES 删掉 table 行 → 本文件红；把 scanDocument 的 table
// 分支去掉 → 合成样本红。BUG-210——从 COMMAND_FORMS 删掉 env-prefix → 本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSERTION_CASES, COMMAND_FORMS, SHAPES, commandPathsAnywhere, commandPathsOf, scanCiCommands, scanDocument,
} from '../../checks/lib/repo/doc-surface.mjs'
import { CASES } from '../../checks/lib/harness/gates-cases.mjs'

const PATH = 'checks/x.mjs'
const DOC_SAMPLES = {
  backtick: `看 \`${PATH}\``,
  prose: `读 ${PATH}`,
  table: `| ${PATH} | 说明 |`,
  'fence-path': `\`\`\`sh\n${PATH}\n\`\`\``,
  'html-href': `<a href="${PATH}">x</a>`,
  'link-label': '[checks/x](checks/README.md)',
  'fence-command': `\`\`\`sh\nnode ${PATH}\n\`\`\``,
  'indented-command': `    node ${PATH}`,
  'ci-run': `run: node ${PATH}`,
  'probe-header': `// 何时跑：\`node ${PATH}\``,
}
const COMMAND_SAMPLES = {
  'env-prefix': `FOO=1 node ${PATH}`,
  'dot-slash': `node ./${PATH}`,
  wrapper: `sudo node ${PATH}`,
  'and-chain': `echo x && node ${PATH}`,
  'require-qualifier': `NODE_OPTIONS=--require=checks/x.cjs node ${PATH}`,
  heredoc: `\`\`\`sh\nbash -s <<'EOF'\nnode ./${PATH}\nEOF\n\`\`\``,
  indented: `    node ./${PATH}`,
  'yaml-folded': `run: >-\n  node ${PATH}`,
}

const tokensOf = (shape) => {
  const sample = DOC_SAMPLES[shape.form]
  if (shape.producer === 'document') return scanDocument(sample)
  if (shape.producer === 'ci') return scanCiCommands(sample)
  if (shape.producer === 'comment') return commandPathsAnywhere(sample).map((path) => ({ kind: 'command', form: shape.form, paths: [path] }))
  throw new Error(`未知 producer：${shape.producer}`)
}
const pathPayload = (token) => token.paths ?? (token.path === undefined ? [] : [token.path])

test('台账形态都能被枚举器产出（合成样本；形态被删/改名即红）', () => {
  assert.ok(SHAPES.length >= 9, `防空语料：形态台账过短（${SHAPES.length}）`)
  for (const shape of SHAPES) {
    assert.equal(typeof DOC_SAMPLES[shape.form], 'string', `形态 ${shape.form} 缺合成样本——新增形态必须同时给样本与案例`)
    const produced = tokensOf(shape).filter((token) => token.form === shape.form)
    assert.ok(produced.length > 0, `枚举器不产出形态 ${shape.form}——台账承诺的写法会静默逃检`)
    if (shape.form === 'link-label') assert.equal(produced[0].text, 'checks/x', '链接标签的 payload = 标签文字')
    else assert.ok(produced.some((token) => pathPayload(token).includes(PATH)), `形态 ${shape.form} 的样本没有产出 ${PATH}`)
  }
})

test('命令变体都能归一到同一判据（env 前缀 / ./ / 包装器 / && / require / heredoc / 缩进 / 折叠块）', () => {
  assert.ok(COMMAND_FORMS.length >= 7, `防空语料：命令形态台账过短（${COMMAND_FORMS.length}）`)
  for (const form of COMMAND_FORMS) {
    const sample = COMMAND_SAMPLES[form.form]
    assert.equal(typeof sample, 'string', `命令变体 ${form.form} 缺合成样本`)
    let paths
    if (form.form === 'heredoc' || form.form === 'indented') {
      paths = scanDocument(sample).flatMap((token) => token.paths ?? [])
    } else if (form.form === 'yaml-folded') {
      paths = scanCiCommands(sample).flatMap((token) => token.paths ?? [])
    } else {
      paths = commandPathsOf(sample).paths
    }
    assert.ok(paths.includes(PATH), `命令变体 ${form.form} 没有归一出 ${PATH}（收到 ${JSON.stringify(paths)}）`)
  }
})

test('台账案例 ↔ gates.e2e CASES 双向对账（案例被删 / 偷偷加案例都红）', () => {
  const casesById = new Map(CASES.map((entry) => [entry.id, entry]))
  for (const decl of [...SHAPES, ...COMMAND_FORMS.map((form) => ({ ...form, owner: 'call-surface' })), ...ASSERTION_CASES]) {
    const found = casesById.get(decl.case)
    assert.ok(found, `台账案例 ${decl.case} 不在 gates.e2e CASES——形态承诺的注入不存在`)
    assert.equal(found.gate, decl.owner, `案例 ${decl.case} 的 gate 必须是 ${decl.owner}（台账与案例错位）`)
  }
  const declared = new Set([...SHAPES, ...COMMAND_FORMS, ...ASSERTION_CASES].map((decl) => decl.case))
  const owned = CASES.filter((entry) => ['doc-paths', 'call-surface'].includes(entry.gate)).map((entry) => entry.id)
  assert.deepEqual(owned.filter((id) => !declared.has(id)), [],
    'doc-paths / call-surface 名下出现未声明形态的案例——先登记形态，再写注入（否则台账不覆盖实际判据面）')
})
