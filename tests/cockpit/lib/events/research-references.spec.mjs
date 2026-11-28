import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLensDraftInstruction,
  buildMethodDraftInstruction,
  defaultsCommandLineForOption,
  findNextResearchRef,
  formatEvidenceMention,
  formatPlanNodeMention,
  parseResearchRefToken,
} from '../../../../packages/deep-research-pack/src/lib/events/research-references.ts'
import { translateZh } from '../../../../packages/deep-research-pack/src/lib/shared/i18n.ts'

test('parseResearchRefToken：识别证据卡与计划节点，拒绝路径穿越与 _failed.md', () => {
  assert.deepEqual(parseResearchRefToken('@drt_ai-2026/evidence/sec-10k.md'), {
    kind: 'evidence',
    slug: 'ai-2026',
    cardName: 'sec-10k.md',
    relPath: 'evidence/sec-10k.md',
    raw: '@drt_ai-2026/evidence/sec-10k.md',
  })
  assert.deepEqual(parseResearchRefToken('archive/drt_ai-2026/W2.1'), {
    kind: 'plan_node',
    slug: 'ai-2026',
    nodeId: 'W2.1',
    raw: 'archive/drt_ai-2026/W2.1',
  })
  assert.equal(parseResearchRefToken('@drt_ai-2026/evidence/_failed.md'), null)
  assert.equal(parseResearchRefToken('@drt_ai-2026/evidence/../secret.md'), null)
  assert.equal(parseResearchRefToken('random/path.md'), null)
})

test('findNextResearchRef：在用户文本中准确切分研究引用并忽略粘连路径', () => {
  const text = '请对照 @drt_demo/evidence/un-charter.md 复核 drt_demo/W3.2 的边界，不要碰 foo/drt_demo/W1。'
  const first = findNextResearchRef(text, 0)
  assert.ok(first !== undefined)
  assert.equal(first.target.kind, 'evidence')
  assert.equal(first.target.cardName, 'un-charter.md')

  const second = findNextResearchRef(text, first.end)
  assert.ok(second !== undefined)
  assert.equal(second.target.kind, 'plan_node')
  assert.equal(second.target.nodeId, 'W3.2')

  const third = findNextResearchRef(text, second.end)
  assert.equal(third, undefined)
})

test('formatEvidenceMention / formatPlanNodeMention：生成稳定双向可解析引用', () => {
  const ev = formatEvidenceMention('unsc-p5', 'un-charter.md')
  assert.equal(ev, '@drt_unsc-p5/evidence/un-charter.md')
  assert.equal(parseResearchRefToken(ev)?.kind, 'evidence')

  const node = formatPlanNodeMention('unsc-p5', 'W2.1')
  assert.equal(node, '@drt_unsc-p5/W2.1')
  assert.equal(parseResearchRefToken(node)?.kind, 'plan_node')
})

test('defaultsCommandLineForOption：映射深度/输出/来源/重置并携带 revision 乐观锁', () => {
  assert.equal(defaultsCommandLineForOption('depth:deep', 3), '/research-defaults set {"effort":"deep"}')
  assert.equal(defaultsCommandLineForOption('depth:auto', 3), '/research-defaults unset effort revision=3')
  assert.equal(defaultsCommandLineForOption('output:one_page_memo', null), '/research-defaults set {"output":{"shape":"one_page_memo"}}')
  assert.equal(defaultsCommandLineForOption('source:primary_first', 1), '/research-defaults set {"source":{"authority":"primary_first"}}')
  assert.equal(defaultsCommandLineForOption('reset:clear', 5), '/research-defaults clear revision=5')
  assert.equal(defaultsCommandLineForOption('unknown:id', 5), null)
})

test('buildLensDraftInstruction / buildMethodDraftInstruction：生成非空双语草稿指令', () => {
  const lensText = buildLensDraftInstruction('adversarial', '反例 / 对抗', translateZh)
  assert.match(lensText, /adversarial/)
  assert.match(lensText, /反例/)
  const methodText = buildMethodDraftInstruction('方案比较', translateZh)
  assert.match(methodText, /方案比较/)
})
