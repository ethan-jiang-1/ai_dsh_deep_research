// D28 模型可见契约的 keyless 约束 — 手册/模板/RFC 与门禁解析器必须说同一件事。
// 为什么存在：手册是注入载荷，语义漂移只能靠真模型快照（贵、要重录）才能发现；本测试把「同一事实
// 的几处文本」钉到门禁解析器的单点（RUN_PHASES / contractEpochOf / READ_ORDER），并咬住已知的
// 互斥句（final/ 的「只放版本记账，不放当前版全文」曾与 final/vN 交付副本语义打架）。
// 负例留证 2026-10-28：把研究手册的「## 来源证明」改成「## 来源（改名探针）」→ 两例红
//   （`手册缺 D28 节：## 来源证明` + 下游同源断言）；还原 → 绿。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contractEpochOf, RUN_PHASES } from '../../scripts/lib/schema-scan-core.mjs'
import { READ_INTENTS, READ_ORDER } from '../../scripts/lib/run-receipt.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const HANDBOOK = 'research-workspace/AGENTS.md'
const SEED = 'packages/deep-research-pack/workspace/AGENTS.md'
const TEMPLATE = 'research-workspace/templates/run/run.md'

test('手册承 D28 四节与位置语义（模型每轮都会读到的合同）', () => {
  const h = read(HANDBOOK)
  for (const section of ['## 状态头、读序与恢复', '## 交付与审查终局', '## 来源证明']) {
    assert.ok(h.includes(section), `手册缺 D28 节：${section}`)
  }
  assert.match(h, /位置 = 操作桶/, '手册缺位置=操作桶句（D28 核心语义）')
  assert.ok(h.includes('见证只认'), '手册缺见证绑定句（门②/③ 的模型侧合同）')
})

test('手册不得留下与 final/vN 交付副本互斥的旧句（B-4 回归）', () => {
  const h = read(HANDBOOK)
  assert.equal(h.includes('只放版本记账'), false, '旧句「只放版本记账，不放当前版全文」与交付副本语义互斥')
  assert.ok(h.includes('交付副本'), 'final/vN 必须被表述为交付副本')
  assert.equal(/v1\.md = 索引与关键事实回溯/.test(h), false, '旧索引语义不得回到手册')
})

test('手册读序逐项 = run-receipt.READ_ORDER（一处事实一个家）', () => {
  const h = read(HANDBOOK)
  for (const entry of READ_ORDER) {
    if (entry.startsWith('evidence/ + provenance/')) {
      assert.ok(h.includes('provenance/<id>.json'), '读序缺 provenance 指针')
      continue
    }
    const token = entry.split('（')[0]
    assert.ok(h.includes(token), `手册读序缺 ${token}`)
  }
})

test('run.md 模板键集 = contractEpochOf/phase/next/delivered/parked 的解析面', () => {
  const t = read(TEMPLATE)
  const keys = [...t.matchAll(/^-\s*([a-z]+)\s*:/gm)].map((m) => m[1]).sort()
  assert.deepEqual(keys, ['contract', 'delivered', 'next', 'parked', 'phase'], `模板键漂移：${keys.join(',')}`)
  for (const [key, value] of [['contract', 'YYYY-MM-DD'], ['phase', 'briefing'], ['next', 'HITL1'], ['delivered', 'none'], ['parked', 'none']]) {
    assert.ok(new RegExp(`^-\\s*${key}\\s*:\\s*${value}`, 'm').test(t), `模板缺默认 ${key}: ${value}`)
  }
})

test('模板 phase 注释 = RUN_PHASES 闭集；contract 示例可被解析器读出', () => {
  const t = read(TEMPLATE)
  const phaseLine = t.split('\n').find((l) => /^-\s*phase\s*:/.test(l)) ?? ''
  for (const phase of RUN_PHASES) assert.ok(phaseLine.includes(phase), `模板 phase 注释缺 ${phase}`)
  // 用模板实值造一个 run.md，契约纪元必须被解析器读成同一个日期（模板 ↔ 解析器同源）。
  const dir = mkdtempSync(join(tmpdir(), 'dsh-charter-'))
  try {
    writeFileSync(join(dir, 'run.md'), t.replaceAll('YYYY-MM-DD', '2026-10-23'))
    assert.equal(contractEpochOf(dir), '2026-10-23')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('手册种子与工作区手册逐字一致（部署态读到同一份合同）', () => {
  assert.equal(read(SEED), read(HANDBOOK))
})

test('RFC 现在时描述见证绑定与回执校验（docs = 当前合同）', () => {
  const rfc = read('notes/implemented/2026-10-23-run-bundle-charter.md')
  assert.ok(rfc.includes('见证必须归属本 run'), 'RFC 缺见证绑定句')
  assert.match(rfc, /delivered\.json.*sha256|sha256.*delivered\.json/s, 'RFC 缺回执哈希校验句')
})

test('手册「按意图读」表 = run-receipt.READ_INTENTS（读完即停的合同）', () => {
  const h = read(HANDBOOK)
  for (const intent of READ_INTENTS) {
    assert.ok(h.includes(`| ${intent.label} |`), `手册缺意图行：${intent.label}`)
    for (const file of intent.files) assert.ok(h.includes(file), `手册意图「${intent.label}」缺文件：${file}`)
    assert.ok(h.includes(intent.stop), `手册意图「${intent.label}」缺停止句：${intent.stop}`)
  }
});
