// docs-consistency 回归 — 跨文档/盘上的少数高价值事实一致性（keyless 纯 fs）。
// 2026-10-20 审计 P1-1/P1-2 的机械面：不再让"同一事实两个家"只靠人眼。
// 只钉可以稳定判真假的几条；语义质量仍归交付自审。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

test('归档路径三处一致：archive/drt_<slug>/（2026-10-20 审计 P1-2 反证）', () => {
  const handbook = read('research-workspace/AGENTS.md')
  const design = read('docs/design/50-agent-loop-and-state.md')
  const guide = read('docs/guides/61-run-playbook.md')
  for (const [rel, text] of [['research-workspace/AGENTS.md', handbook], ['docs/design/50-agent-loop-and-state.md', design], ['docs/guides/61-run-playbook.md', guide]]) {
    assert.ok(text.includes('archive/drt_<slug>/'), `${rel} 未写 archive/drt_<slug>/——归档目录名以盘上为准`)
  }
  assert.ok(!/archive\/<slug>/.test(guide), 'guides/61 仍出现 archive/<slug>（盘上是 drt_<slug>）')
})

test('开发技能清单覆盖盘上目录（2026-10-20 审计 P1-1 反证）', () => {
  const skills = readdirSync(join(ROOT, '.agents', 'skills'))
    .filter((name) => statSync(join(ROOT, '.agents', 'skills', name)).isDirectory())
  assert.ok(skills.length > 0, '防空语料：.agents/skills 零目录')
  const guide = read('docs/guides/60-dev-loop.md')
  for (const name of skills) assert.ok(guide.includes(name), `guides/60 未路由技能 ${name}——盘上有而文档不可发现`)
})
