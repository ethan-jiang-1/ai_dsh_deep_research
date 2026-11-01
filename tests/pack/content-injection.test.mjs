// content-injection 回归 — D40：研究内容在包内，由 src/content 以 runtime context 注入。
// 断言对象 = 自控文件（手册 / 模板 / 包清单 / 注入行源码）；不建 build、不起宿主。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const read = (rel) => readFileSync(join(PACK, rel), 'utf8')

const TEMPLATES = ['run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']

test('手册随包，且只含 research_pack_root 一个插值变量', () => {
  const manual = read('content/manual.md')
  assert.ok(manual.trim().length > 0, 'content/manual.md 为空')
  const vars = [...manual.matchAll(/{{([^}]+)}}/g)].map((m) => m[1])
  assert.deepEqual([...new Set(vars)], ['research_pack_root'],
    `手册出现未注册插值：${vars.filter((v) => v !== 'research_pack_root').join(', ')}`)
  assert.match(manual, /runtime context 注入/, '手册未写明注入渠道')
  assert.match(manual, /项目指令优先/, '手册缺项目指令优先句')
})

test('run 模板八件随包', () => {
  for (const name of TEMPLATES) {
    assert.ok(existsSync(join(PACK, 'content', 'templates', 'run', name)), `缺模板 ${name}`)
  }
})

test('包清单发布 content/**，不再发布 workspace/**', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.ok(pkg.files.includes('content/**'), 'files 缺 content/**')
  assert.equal(pkg.files.some((f) => f.startsWith('workspace/')), false, 'files 仍含 workspace/**')
  assert.equal(existsSync(join(PACK, 'workspace')), false, 'workspace/ 种子目录仍在')
})

test('注入行注册 systemPrompt.context 与 research_pack_root 变量', () => {
  const src = readFileSync(join(PACK, 'src', 'content', 'index.ts'), 'utf8')
  assert.match(src, /systemPrompt\.context\(/, '未注册 runtime context')
  assert.match(src, /variable\('research_pack_root'/, '未注册 research_pack_root 变量')
  assert.match(src, /name: 'research:manual'/, 'context 名不是 research:manual')
})
