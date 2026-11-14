// 类级守卫：同一段方法库标题文本，fold（读字段）与 upsert（定位行）必须同源。
//
// 为什么需要（2026-11-13）：BUG-081/085/093/123/124/127/128/138 是同一命题的 8 个邻接变体——
// 解析器不是「认不全」，而是**同一文本有两个读者**：`foldLibrary` 读 name/provenance/isDefault，
// `upsertMethodEntry` 用同一 `parseMethodHeading` 定位要改写的行。只测 fold 一侧（41 例）或只
// 喂 canonical 形态（写路径测试）都咬不住「两个读者对哪些写法是同一个标题」的分叉。
//
// 本文件是 40 格矩阵（2 括号宽 × 2 段序 × 5 空白类 × 2 后缀），每格断言：
//   ① fold 得到唯一的 name/provenance/isDefault；
//   ② 同一 heading 再写一次 = updated（不是 created），条目数不增；
//   ③ 未识别后缀（BUG-138）= fail-loud，不新建幽灵条目。
//
// 负例留证 2026-11-13：把 `parseMethodHeading` 的半角括号分支去掉 → 本文件 `(来源)` 组红；
// 把 `matchingHeadingLines` 的 `wellFormed` 过滤去掉 → 后缀组红；还原 → 绿。
// 矩阵刻意不叫 `*-conformance.spec.mjs`（文件名会触发 guard-red-record 的留证义务）；BUG 号只
// 出现在本块，不写进测试标题——标题是命题，不是场景描述。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foldLibrary, parseMethodHeading } from '../../packages/deep-research-pack/src/lib/library-fold.ts'
import { upsertMethodEntry } from '../../packages/deep-research-pack/src/lib/method-library-write.ts'

const BRACKET = ['（来源）', '(来源)'] // 127：全角 / 半角
const ORDER = ['{p}〔默认偏好〕', '〔默认偏好〕{p}'] // 085：provenance 与默认标记的顺序
const GAP = ['', ' ', '\t', '\u3000', '  '] // 124/128：无空白、半角、制表、全角、双空格
const SUFFIX = ['', ' [草稿]'] // 138：未识别后缀

const BODY = '\n- 找来源: a\n- 怎么核实: b\n- 报告怎么写: c\n- 不承诺: d\n'
const HEADINGS = []
for (const bracket of BRACKET) {
  for (const order of ORDER) {
    for (const gap of GAP) {
      for (const suffix of SUFFIX) {
        HEADINGS.push({
          text: `## 方法${gap}${order.replace('{p}', bracket)}${suffix}`,
          malformed: suffix !== '',
        })
      }
    }
  }
}

test('同源：每个标题变体在 fold 与 upsert 里都是同一个条目', () => {
  assert.equal(HEADINGS.length, 40, '矩阵维度被改动——先确认是有意的')
  for (const { text, malformed } of HEADINGS) {
    const lib = `${text}${BODY}`
    const folded = foldLibrary(lib)
    assert.equal(folded.length, 1, `fold 应只认一个条目：${JSON.stringify(text)}`)
    assert.equal(folded[0].name, '方法', `fold 名称错：${JSON.stringify(text)}`)
    assert.equal(folded[0].provenance, '来源', `fold provenance 错：${JSON.stringify(text)}`)
    assert.equal(folded[0].isDefault, true, `fold 默认标记错：${JSON.stringify(text)}`)
    assert.equal(folded[0].sections.source, 'a', `fold 分区错：${JSON.stringify(text)}`)

    if (malformed) {
      assert.equal(parseMethodHeading(text)?.wellFormed, false, `未识别后缀应标灰：${JSON.stringify(text)}`)
      assert.throws(
        () => upsertMethodEntry(lib, folded[0]),
        /不可识别/,
        `未识别后缀必须 fail-loud，不得新建幽灵条目：${JSON.stringify(text)}`,
      )
      continue
    }

    const { text: next, action } = upsertMethodEntry(lib, folded[0])
    assert.equal(action, 'updated', `同一标题再写一次被判为新条目：${JSON.stringify(text)}`)
    const after = foldLibrary(next)
    assert.equal(after.length, 1, `upsert 复制了条目：${JSON.stringify(text)}`)
    assert.equal(after[0].name, '方法', `upsert 后名称漂移：${JSON.stringify(text)}`)
    assert.equal(after[0].provenance, '来源', `upsert 后 provenance 漂移：${JSON.stringify(text)}`)
    assert.equal(after[0].isDefault, true, `upsert 后默认标记漂移：${JSON.stringify(text)}`)
    assert.equal(after[0].sections.report, 'c', `upsert 后分区漂移：${JSON.stringify(text)}`)
  }
})

test('负控：未识别后缀不会被 fold 当作可改写行', () => {
  const head = '## 方法（来源）[草稿]'
  const lib = `${head}${BODY}`
  const folded = foldLibrary(lib)
  assert.equal(folded.length, 1)
  assert.equal(parseMethodHeading(head)?.wellFormed, false)
  assert.throws(() => upsertMethodEntry(lib, folded[0]), /不可识别/)
})

// BUG-167 负例留证 2026-11-14：旧实现下 ZWSP/软连字符等 \p{Cf} 留在 name 里，
// `foldLibrary` 读出 `方法\u200B`，`upsert('方法')` 判 created → 两条视觉同名。
// 还原法 = 去掉 parseMethodHeading 的格式字符剥离 / methodNameIssue 的 Cf 拒绝。
test('身份归一：Unicode 格式字符不制造同名幽灵条目', () => {
  const sections = { source: 'a', verify: 'b', report: 'c', limit: 'd' }
  const entry = { name: '方法', provenance: null, isDefault: false, sections, legacyText: null }
  for (const ch of ['\u200B', '\u00AD', '\u2060', '\u200E', '\u180E']) {
    const lib = `## 方法${ch}（来源）${BODY}`
    assert.equal(foldLibrary(lib)[0].name, '方法', `fold 名称应剥掉 ${JSON.stringify(ch)}`)
    const { text, action } = upsertMethodEntry(lib, entry)
    assert.equal(action, 'updated', `${JSON.stringify(ch)} 不应造新条目`)
    assert.equal(foldLibrary(text).length, 1, `${JSON.stringify(ch)} upsert 后条目数`)
    assert.throws(
      () => upsertMethodEntry(lib, { ...entry, name: `方法${ch}` }),
      /不可见|格式|字符/,
      `${JSON.stringify(ch)} 的写入路径应 fail-loud，不得静默新建`,
    )
  }
})
