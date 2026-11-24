// topics 值解析回归（BUG-428 / BUG-429）：`lenses` 与 `depends_on` 的**值文法**只有一份实现。
//
// 为什么单独成文件：这两条判据是「同一语义多实现」的类级修复，判据对象是文法本身（不是 topics
// 门的结构判据）；住在 topics-contract 会把那个文件的 oracle 类型从 structured 拖成 canonical，
// 让历史守卫卡的分类失真。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lensScanOf } from '../../../checks/lib/gates/protocol-core.mjs'
import { parseTopicsReport } from '../../../checks/lib/gates/findings-core.mjs'

// 负例留证 2026-11-24：BUG-428——`lenses` 有三套读法：lensScanOf 认 `-*+`/大小写/严格括号，
// parseTopicsReport 只认 `- lenses:` 且用宽松 listOf（坏括号被静默接受）。换一个等价书写就
// 静默丢掉 lens 义务。红配方：把 parseTopicsReport 的 lens 行解析改回 `- lenses:` 字面 + listOf。
test('BUG-428：lenses 行文法单一正本（等价 bullet/大小写同判；坏括号两侧都判读不出）', async () => {
  const { lensScanOf } = await import('../../../checks/lib/gates/protocol-core.mjs')
  const { parseTopicsReport } = await import('../../../checks/lib/gates/findings-core.mjs')
  const doc = (lensLine) => `## T1: t\n\n- must_answer:\n  - a\n  - b\n- scope_role: primary\n${lensLine}\n`
  for (const line of ['- lenses: official', '* lenses: official', '+ lenses: official', '- LENSES: official', '- lenses: [official]', '- lenses：official']) {
    const text = doc(line)
    assert.deepEqual(lensScanOf(text).ids, ['official'], `lensScanOf 未认：${line}`)
    const parsed = [...parseTopicsReport(text).topics.values()].flatMap((t) => t.lenses)
    assert.deepEqual(parsed, ['official'], `parseTopicsReport 未认：${line}`)
  }
  // 括号不成对 = 读不出：两条路径都必须拒绝，不得一边静默当合法。
  const broken = doc('- lenses: [official')
  assert.ok(lensScanOf(broken).unparsable.length > 0, 'lensScanOf 必须报读不出')
  const report = parseTopicsReport(broken)
  assert.deepEqual([...report.topics.values()].flatMap((t) => t.lenses), [], 'parseTopicsReport 不得静默接受坏括号')
  assert.ok((report.lensUnparsable ?? []).length > 0, 'parseTopicsReport 必须把坏括号行交出来（同一条判据）')
})

// 负例留证 2026-11-24：BUG-429——depends_on 的括注被当成 topic id（`无（说明）` 变悬空依赖、
// 注记里的全角逗号把 id 切碎）。红配方：把 dependsOnValueOf 改回裸 listOf。
test('BUG-429：depends_on 剥括注与注记；「无（说明）」= 无依赖', () => {
  const doc = (dep) => `## T1: a\n\n- must_answer:\n  - x\n  - y\n- scope_role: primary\n- depends_on: 无\n\n## T2: b\n\n- must_answer:\n  - x\n  - y\n- scope_role: comparison\n- depends_on: ${dep}\n`
  const cases = [
    ['T1', ['T1']],
    ['T1（实体集合）', ['T1']],
    ['无（**下游以此为准**）', []],
    ['T1、T2（**由 lead 纯综合，不派 analyst**）', ['T1', 'T2']],
  ]
  for (const [dep, expected] of cases) {
    const r = parseTopicsReport(doc(dep))
    assert.deepEqual(r.topics.get('T2')?.dependsOn, expected, `depends_on: ${dep}`)
    assert.deepEqual(r.issues.filter((issue) => /不存在/.test(issue)), [], `不得报假悬空：${dep}`)
  }
})
