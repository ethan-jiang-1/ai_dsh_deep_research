// verdict-conformance.spec.mjs — 判据形状的不变量（D51）：结构位置决定判定，措辞不决定。
//
// 为什么是行为测试而不是 verify 门禁：可判的是「同一行给出互斥读法时返回什么」，grep 判不出猜不猜。
// 本文件拿变异矩阵钉三条不变量：
//   ① 结构位置（行首 Markdown 装饰 / 分隔符后紧跟判定词）→ 采用该值；
//   ② 散文前缀（本轮/随后/旧轮记录/结论行/箭头）与整行包裹 → 不构成判定；
//   ③ 任何互斥读法（同行两个裸写、裸写与散文提及相反）→ 无法判定（null），不取最晚/最像。
//
// 负例留证 2026-11-13：BUG-074 / BUG-141 / BUG-150——旧实现按语境关键词挑「最像的」。
// 红配方：把 lastInlineVerdict 的 segment 检查退回关键词白名单（本轮/终局/真实/现在…）→ 第 3 组红。
import test from 'node:test'
import assert from 'node:assert/strict'
import { terminalReadiness } from '../../packages/deep-research-pack/src/lib/review-readiness.ts'

/** 结构位置：Markdown 装饰之后紧跟判定词。 */
test('不变量①：行首 Markdown 装饰与分隔符后的裸写 → 采用该值', () => {
  for (const value of ['PASS', 'FAIL']) {
    for (const prefix of ['', '## ', '### ', '> ', '- ', '* ', '> - ', '  - ', '1. ']) {
      assert.equal(terminalReadiness(`${prefix}readiness: ${value}\n`), value, `${prefix}readiness: ${value}`)
    }
    assert.equal(terminalReadiness(`readiness: ${value}；readiness: ${value}\n`), value, '同值重复不构成歧义')
  }
  // 判定词后的短括号标签是手册形态
  assert.equal(terminalReadiness('## readiness（终局）: PASS\n'), 'PASS')
})

/** 散文前缀不是装饰：它把判定降级为「提及」。 */
test('不变量②：散文前缀与整行包裹 → 不构成判定', () => {
  for (const lead of ['本轮 ', '随后 ', '旧轮记录：', '结论行：', '复核结论：', '⇒ ', '→ ', '见最终结论：']) {
    assert.equal(terminalReadiness(`${lead}readiness: PASS\n`), null, `${lead}readiness: PASS`)
  }
  const wrappedProse = [
    '**结论行：`readiness: PASS`**',
    '**⇒ 复核结论：`readiness: PASS`**（零 CRITICAL）',
    '**`readiness: PASS` 维持不变，且效力范围已复核。**',
  ]
  for (const line of wrappedProse) assert.equal(terminalReadiness(`${line}\n`), null, line)
  // 整行就是判定（包裹壳 + 可选短括号）仍读得出——这是强调，不是引用
  assert.equal(terminalReadiness('**readiness: PASS**\n'), 'PASS')
  assert.equal(terminalReadiness('`readiness: FAIL`\n'), 'FAIL')
  assert.equal(terminalReadiness('**readiness: PASS**（附条件）\n'), 'PASS')
})

/** 互斥读法 → null：不取最晚、不取最像。 */
test('不变量③：互斥读法 → 无法判定（不猜）', () => {
  const ambiguous = [
    'readiness: PASS；readiness: FAIL',
    'readiness: PASS。readiness: FAIL',
    'readiness: PASS；随后 readiness: FAIL',
    '旧轮记录：`readiness: PASS`；本轮真实终局：readiness: FAIL',
    '本轮 readiness: FAIL；旧轮 readiness: PASS',
  ]
  for (const line of ambiguous) assert.equal(terminalReadiness(`${line}\n`), null, line)
  // 引用不夺权、模板不夺权、表格不夺权
  assert.equal(terminalReadiness('readiness: PASS\n\n- **第 1 轮**：`readiness: FAIL` 血统\n'), 'PASS')
  assert.equal(terminalReadiness('## readiness: PASS | FAIL\n'), null)
  assert.equal(terminalReadiness('## readiness: FAIL\n\n| —— 结论 —— | **readiness: PASS** |\n'), 'FAIL')
})

/** 跨行次序是成文规则：无标注取末位；全带轮次取轮次高者。 */
test('不变量④：跨行次序按成文规则（末位 / 轮次）', () => {
  assert.equal(terminalReadiness('readiness: PASS\n\nreadiness: FAIL\n'), 'FAIL')
  assert.equal(terminalReadiness('# 第 2 轮（复审）—— readiness: PASS\n\n## 第 1 轮 readiness: FAIL\n'), 'PASS')
  assert.equal(terminalReadiness('## 第 1 轮 readiness: FAIL\n\n## 第 2 轮 readiness: FAIL\n'), 'FAIL')
})

/** 变异矩阵：任意（装饰 × 分隔 × 前缀 × 值）组合都落在上面三条不变量里。 */
test('不变量⑤：生成矩阵——单一结构判定采用；结构 + 相反散文 → null', () => {
  const positions = ['', '## ', '> ', '- ']
  const values = ['PASS', 'FAIL']
  const leads = ['', '随后 ', '本轮 ', '旧轮记录：']
  for (const position of positions) {
    for (const value of values) {
      for (const lead of leads) {
        const line = `${position}${lead}readiness: ${value}`
        const expected = lead === '' ? value : null
        assert.equal(terminalReadiness(`${line}\n`), expected, line)
      }
    }
  }
  for (const position of positions) {
    for (const value of values) {
      for (const lead of ['随后 ', '本轮 ']) {
        const line = `${position}readiness: ${value}；${lead}readiness: ${value === 'PASS' ? 'FAIL' : 'PASS'}`
        assert.equal(terminalReadiness(`${line}\n`), null, line)
      }
    }
  }
})

// 负例留证 2026-11-14：BUG-169（fenced code 里的判定被当正文）、BUG-170（`**readiness**:`
// 被判无判定）。红配方：删掉 maskFencedLines 的调用 → 前六例红；删掉 stripVerdictDecor 的
// normalizeLabelDecor → 后七例红；两处都还原 → 绿。
test('不变量⑥：fenced code 与标签加粗是结构，不是判定', () => {
  // 围栏里的示例/旧轮引文不夺权（真值在围栏外）
  assert.equal(terminalReadiness('readiness: PASS\n\n```\nreadiness: FAIL\n```\n'), 'PASS', '真 PASS + 后置围栏 FAIL')
  assert.equal(terminalReadiness('readiness: FAIL\n\n```\nreadiness: PASS\n```\n'), 'FAIL', '真 FAIL + 后置围栏 PASS')
  assert.equal(terminalReadiness('```md\nreadiness: FAIL\n```\n\nreadiness: PASS\n'), 'PASS', '前置围栏 FAIL + 真 PASS')
  assert.equal(terminalReadiness('readiness: PASS\n\n~~~\nreadiness: FAIL\n~~~\n'), 'PASS', '~~~ 围栏同判')
  assert.equal(terminalReadiness('readiness: PASS\n\n```\nreadiness: FAIL\n'), 'PASS', '未闭合围栏按剩余全文处理')
  assert.equal(terminalReadiness('```\nreadiness: FAIL\n```\n'), null, '全文只有围栏示例 = 无判定')

  // 标签本身的加粗/反引号是装饰（VERDICT_LINE 归一后再匹配）
  for (const line of [
    '**readiness**: FAIL',
    '- **readiness**: FAIL',
    '### **readiness**: FAIL',
    '__readiness__: FAIL',
    '`readiness`: FAIL',
    '## **readiness**：FAIL',
    '- __readiness__: **FAIL**',
  ]) {
    assert.equal(terminalReadiness(`${line}\n`), 'FAIL', line)
  }
  // 散文标签仍不夺权；空模板仍是空模板
  assert.equal(terminalReadiness('**结论**：**readiness: FAIL**\n'), null, '散文标签不夺权')
  assert.equal(terminalReadiness('**readiness**: PASS | FAIL\n'), null, '加粗标签的空模板仍是模板')
})
