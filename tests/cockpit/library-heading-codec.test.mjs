// library-heading-codec.test.mjs — 方法库 heading 的单一 codec（D51 迁移 II·S2）。
//
// 为什么存在：fold 与写路径曾各有一套标题解析（括号宽度 / U+3000 / 段间空白 / 默认标记位置），
// BUG-081/083/085/123/124/127/128 都是两侧口径差。本文件用变异矩阵钉住：同一行在 fold 与写路径
// 得到同一个 name/provenance/isDefault；非法尾缀两侧同判（写拒写、删除可按名寻址）。
//
// 负例留证 2026-11-13：BUG-128——全角空格/U+3000 让 upsert 判 created（编辑一次多一条同名）。
// 红配方：把 parseMethodHeading 的段间空白退回 `[ \t]` → 下方 U+3000 例的 fold 与写路径分叉。
import test from 'node:test'
import assert from 'node:assert/strict'
import { foldLibrary, parseMethodHeading } from '../../packages/deep-research-pack/src/lib/library-fold.ts'
import { clearDefaultMethodEntry, removeMethodEntry, setDefaultMethodEntry, upsertMethodEntry } from '../../packages/deep-research-pack/src/lib/method-library-write.ts'

const entry = (name) => ({
  name,
  sections: { source: '找 A', verify: '核 B', report: '写 C', limit: '不承诺 D' },
  provenance: '2026-11-13，用户',
  isDefault: false,
  legacyText: null,
})

const variants = [
  ['## 方法（来源）', { name: '方法', provenance: '来源', isDefault: false, wellFormed: true }],
  ['## 方法(来源)', { name: '方法', provenance: '来源', isDefault: false, wellFormed: true }],
  ['## 方法　（来源）', { name: '方法', provenance: '来源', isDefault: false, wellFormed: true }],
  ['## 方法 （来源） 〔默认偏好〕', { name: '方法', provenance: '来源', isDefault: true, wellFormed: true }],
  ['## 方法〔默认偏好〕（来源）', { name: '方法', provenance: '来源', isDefault: true, wellFormed: true }],
  ['##\t方法（来源）', { name: '方法', provenance: '来源', isDefault: false, wellFormed: true }],
  ['## 方法', { name: '方法', provenance: null, isDefault: false, wellFormed: true }],
  ['## 方法（来源〔默认偏好〕）', { name: '方法', provenance: '来源〔默认偏好〕', isDefault: false, wellFormed: true }],
  ['## 方法（来源）备注', { name: '方法', provenance: '来源', isDefault: false, wellFormed: false }],
]

test('不变①：codec 与 fold 对同一 heading 同判（名称/来源/默认）', () => {
  for (const [line, want] of variants) {
    const parsed = parseMethodHeading(line)
    assert.deepEqual(parsed, want, line)
    const folded = foldLibrary(`${line}\n\n- 找来源: A\n- 怎么核实: B\n- 报告怎么写: C\n- 不承诺: D\n`)[0]
    assert.equal(folded?.name, want.name, line)
    assert.equal(folded?.provenance, want.provenance, line)
    assert.equal(folded?.isDefault, want.isDefault, line)
  }
})

test('不变②：wellFormed 的 heading 编辑是更新而非新建（全部变体）', () => {
  for (const [line, want] of variants.filter(([, v]) => v.wellFormed)) {
    const library = `# 方法库\n\n${line}\n\n- 找来源: 旧\n- 怎么核实: 旧\n- 报告怎么写: 旧\n- 不承诺: 旧\n`
    const r = upsertMethodEntry(library, entry(want.name))
    assert.equal(r.action, 'updated', `${line} → ${r.action}`)
    assert.equal(foldLibrary(r.text).filter((e) => e.name === want.name).length, 1, line)
  }
})

test('不变③：非法尾缀两侧同判——编辑拒写，删除可按名寻址', () => {
  const malformed = '## 方法（来源）备注'
  const library = `# 方法库\n\n${malformed}\n\n- 找来源: 旧\n- 怎么核实: 旧\n- 报告怎么写: 旧\n- 不承诺: 旧\n`
  assert.throws(() => upsertMethodEntry(library, entry('方法')), /不可识别|规范化/, '非法尾缀不得被静默改写')
  const removed = removeMethodEntry(library, '方法')
  assert.equal(removed.removed, true)
  assert.equal(removed.text.includes('备注'), false)
})

test('不变④：默认标记只认段——provenance 内的同形文字不被清/不被计数', () => {
  const library = `# 方法库\n\n## 方法（来源〔默认偏好〕）\n\n- 找来源: A\n- 怎么核实: B\n- 报告怎么写: C\n- 不承诺: D\n\n## 另一条〔默认偏好〕\n\n- 找来源: A\n- 怎么核实: B\n- 报告怎么写: C\n- 不承诺: D\n`
  const cleared = clearDefaultMethodEntry(library)
  assert.equal(cleared.changed, true)
  assert.match(cleared.text, /方法（来源〔默认偏好〕）/, 'provenance 内的同形文字必须原样保留')
  assert.doesNotMatch(cleared.text, /另一条〔默认偏好〕/)
})

test('不变⑤：setDefault 只改目标段并保留 provenance 内同形文字', () => {
  const library = `# 方法库\n\n## 方法（来源〔默认偏好〕）\n\n- 找来源: A\n- 怎么核实: B\n- 报告怎么写: C\n- 不承诺: D\n`
  const r = setDefaultMethodEntry(library, '方法')
  assert.match(r.text, /## 方法（来源〔默认偏好〕）〔默认偏好〕/)
  const folded = foldLibrary(r.text)[0]
  assert.equal(folded?.isDefault, true)
  assert.equal(folded?.provenance, '来源〔默认偏好〕')
})
