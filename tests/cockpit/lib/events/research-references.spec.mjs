import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildLensDraftInstruction,
  buildMethodDraftInstruction,
  defaultsCommandLineForOption,
  findNextResearchRef,
  formatEvidenceMention,
  formatPlanNodeMention,
  interpretDefaultsCommandResult,
  parseResearchRefToken,
} from '../../../../packages/deep-research-pack/src/lib/events/research-references.ts'
import { runDefaultsCommand } from '../../../../packages/deep-research-pack/src/defaults/command.ts'
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

// 负例留证 2026-11-28：BUG-470——defaultsCommandLineForOption 对全部 12 项 set 选项未包 {"patch":...} 外壳，
// 直接喂给真 Host runDefaultsCommand 100% 触发 error bad-request patch。
// 红配方：把 set 选项改回裸 patch（如 {"effort":"deep"}）→ 本例红（kind='error', text='error bad-request patch'）。
test('BUG-470 defaultsCommandLineForOption：全部 15 个 optionId 直连真 Host runDefaultsCommand 均成功落盘且携带 revision', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dr-bug470-'))
  try {
    const allOptions = [
      ['depth:quick', (d) => d.effort === 'quick'],
      ['depth:standard', (d) => d.effort === 'standard'],
      ['depth:deep', (d) => d.effort === 'deep'],
      ['depth:auto', (d) => d.effort === undefined],
      ['output:full_report', (d) => d.output?.shape === 'full_report'],
      ['output:one_page_memo', (d) => d.output?.shape === 'one_page_memo'],
      ['output:comparison_table', (d) => d.output?.shape === 'comparison_table'],
      ['output:landscape_map', (d) => d.output?.shape === 'landscape_map'],
      ['output:timeline', (d) => d.output?.shape === 'timeline'],
      ['output:quick_answer', (d) => d.output?.shape === 'quick_answer'],
      ['output:auto', (d) => d.output === undefined],
      ['source:primary', (d) => d.source?.authority === 'primary'],
      ['source:secondary', (d) => d.source?.authority === 'secondary'],
      ['source:any', (d) => d.source?.authority === 'any'],
      ['reset:clear', null],
    ]
    let rev = 0
    for (const [optId, verify] of allOptions) {
      const line = defaultsCommandLineForOption(optId, rev)
      assert.ok(line !== null && line.startsWith('/research-defaults '), `${optId} 应产出合法命令行`)
      const rawInput = line.replace(/^\/research-defaults\s+/, '')
      const res = runDefaultsCommand({ cwd: dir, rawInput })
      assert.equal(res.kind, 'success', `${optId} 执行失败：${res.text}`)
      if (verify !== null) {
        const disk = JSON.parse(readFileSync(join(dir, 'research-defaults.json'), 'utf8'))
        assert.ok(verify(disk), `${optId} 落盘值不符：${JSON.stringify(disk)}`)
        rev = disk.revision
      }
    }
    // 负控：过期 revision 必须被 Host 拒写（证明 expectedRevision 已真正送达 CAS），且客户端解释器不吞错
    runDefaultsCommand({ cwd: dir, rawInput: 'set {"patch":{"effort":"quick"}}' })
    const staleLine = defaultsCommandLineForOption('depth:deep', 0)
    const staleRes = runDefaultsCommand({ cwd: dir, rawInput: staleLine.replace(/^\/research-defaults\s+/, '') })
    assert.equal(staleRes.kind, 'error')
    assert.match(staleRes.text, /stale/)
    const interpretedErr = interpretDefaultsCommandResult({ ok: true, value: { result: staleRes } })
    assert.equal(interpretedErr.ok, false, 'RPC 成功但命令返回 kind=error 时不得折成 ok=true')
    assert.match(interpretedErr.error ?? '', /stale/)
    const interpretedOk = interpretDefaultsCommandResult({ ok: true, value: { result: { kind: 'success', text: 'ok revision=2' } } })
    assert.equal(interpretedOk.ok, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('defaultsCommandLineForOption：映射深度/输出/来源/重置并携带 revision 乐观锁', () => {
  assert.equal(defaultsCommandLineForOption('depth:deep', 3), '/research-defaults set {"patch":{"effort":"deep"},"expectedRevision":3}')
  assert.equal(defaultsCommandLineForOption('depth:auto', 3), '/research-defaults unset effort revision=3')
  assert.equal(defaultsCommandLineForOption('output:one_page_memo', null), '/research-defaults set {"patch":{"output":{"shape":"one_page_memo"}}}')
  assert.equal(defaultsCommandLineForOption('source:primary', 1), '/research-defaults set {"patch":{"source":{"authority":"primary"}},"expectedRevision":1}')
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
