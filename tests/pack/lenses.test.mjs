// lenses — 出厂研究视角（lens）目录的形状守卫（keyless，纯 fs）。
//
// 为什么存在（2026-11-10 lens 数据层）：lens 是模型按需读的 pack 内容，不是代码；它的
// 一致性只能靠目录合同把守：id = 文件名、七个必需字段行、pairs_with 指向存在的 id、无人格句。
// 反证（先红）：删一条 / 改坏一个 pair / 在条目里写「你是……」→ 本文件红；还原/改正 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LENSES = join(ROOT, 'packages', 'deep-research-pack', 'content', 'lenses')

/** 出厂 8 面（与 catalog draft 对齐；增删面 = 同 diff 改本表）。 */
const IDS = ['official', 'quant', 'practitioner', 'adversarial', 'structural', 'historical', 'regulatory', 'academic']
/** 字段行（行首 `- **<field>**：`；`pairs_with` 可选，单独校验）。 */
const REQUIRED = ['when', 'seek', 'verify', 'frame', 'refuse', 'bias', 'blind_spots']

const read = (id) => readFileSync(join(LENSES, `${id}.md`), 'utf8')
const frontmatter = (text) => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (m === null) return null
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line)
    if (kv !== null) fm[kv[1]] = kv[2].trim()
  }
  return fm
}

test('lens 目录 = 8 条出厂证据面，文件名 = id', () => {
  assert.ok(existsSync(LENSES), '缺 content/lenses/ 目录——lens 数据层未落地')
  const files = readdirSync(LENSES).filter((n) => n.endsWith('.md')).sort()
  assert.deepEqual(files, IDS.map((id) => `${id}.md`).sort(),
    `content/lenses/ 的文件集必须恰为 ${IDS.join(', ')}（实际：${files.join(', ')}）`)
  for (const id of IDS) {
    const fm = frontmatter(read(id))
    assert.ok(fm !== null, `${id}.md 缺 frontmatter`)
    assert.equal(fm.id, id, `${id}.md 的 frontmatter id 必须等于文件名`)
    assert.ok(typeof fm.name === 'string' && fm.name.trim() !== '', `${id}.md 缺 name`)
  }
})

test('每条 lens：七个必需字段行在场，pairs_with 指向存在的 id，无人格句', () => {
  for (const id of IDS) {
    const text = read(id)
    for (const field of REQUIRED) {
      assert.match(text, new RegExp(`^- \\*\\*${field}\\*\\*\\s*[：:]`, 'm'),
        `${id}.md 缺必需字段行「- **${field}**：」`)
    }
    const pairsLine = /^- \*\*pairs_with\*\*\s*[：:]\s*(.*)$/m.exec(text)?.[1] ?? ''
    const pairs = [...pairsLine.matchAll(/`([^`]+)`/g)].map((m) => m[1])
    for (const pair of pairs) {
      assert.ok(IDS.includes(pair), `${id}.md 的 pairs_with 指向不存在的 id：${pair}`)
    }
    for (const phrase of ['你是', '你的职责', '你的角色']) {
      assert.ok(!text.includes(phrase), `${id}.md 出现人格句「${phrase}」——lens 是证据面，不是 persona`)
    }
  }
})
