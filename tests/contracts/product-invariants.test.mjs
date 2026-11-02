// product-invariants — D40 的产品不变量（keyless，静态面）。
//
// I1 产品有自己的 profile / 无 launcher；I2 启动期解决工作区；I3 包内容不落工作区；
// I4 内容从包内注入。反证在 2026-11-01 的红基线上成立：改动前的树 9/9 红（记录 = 决策卡
// `## 红基线`）。任何"为了好装一点"把入口/内容改回去的改动都会在这里变红。
//
// 产品面收窄（原 I5）不在本文件：读自己的 YAML 只能证明我们写了、证明不了 DSH 认（Loader 对
// 落空的 patch 是警告后跳过）。它已迁到组合层断言 —— [bundle-composition](bundle-composition.test.mjs)。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))

test('I1 安装形态：custom profile + DSH 原生安装，无 launcher/scaffold bin', () => {
  const manual = read('scripts/dist/product-manual.md')
  assert.match(manual, /dsh --profile deep-research --from-default-profile web/, '手册缺 DSH profile 初始化')
  assert.match(manual, /dsh plugin --profile deep-research add/, '手册缺 DSH 原生安装')
  assert.match(manual, /dsh --profile deep-research/, '手册缺原生启动')
  assert.match(read('README.md'), /_dist\/安装手册\.md/, '根 README 没有把安装步骤指向手册')
  assert.deepEqual(Object.keys(pkg.bin ?? {}), ['dsh-deep-research-doctor'], 'bin 只允许只读 doctor')
  assert.equal(existsSync(join(PACK, 'scripts', 'launch.mjs')), false, 'launcher 必须已删除')
  assert.equal(existsSync(join(PACK, 'scripts', 'scaffold.mjs')), false, 'scaffold 必须已删除')
  const patch = read('packages/deep-research-pack/cordis.patch.yml')
  assert.match(patch, /id: research-startup/, 'bundle patch 缺启动行')
  assert.match(patch, /id: research-content/, 'bundle patch 缺内容注入行')
  assert.equal(/research-workspace-boot/.test(patch), false, '旧 workspace-boot 行必须删除')
})

test('I2 启动期解决工作区：Host 读设置/登记；client 建/选会话', () => {
  const startup = read('packages/deep-research-pack/src/startup/index.ts')
  assert.match(startup, /resolveStartupWorkspace/, '启动行未解析产品设置/env 工作区')
  assert.match(startup, /workspaceRegistry\.create|workspaceRegistry\?/, '启动行未登记 Workspace')
  const client = read('packages/deep-research-pack/src/client/index.ts')
  assert.match(client, /startSession\(/, 'client 未建/选产品会话')
  assert.match(client, /ensureProductWorkspace/, 'client 缺启动恢复')
  assert.match(read('docs/guides/65-run-forms.md'), /--from-default-profile web/, '运行形态合同缺 DSH 安装路径')
})

test('I3 包内容不落工作区：content 随包、无 workspace 种子', () => {
  assert.ok(existsSync(join(PACK, 'content', 'manual.md')), 'content/manual.md 缺席')
  for (const name of ['run.md', 'question.md', 'topics.md', 'plan.md', 'leads.md', 'evidence-entry.md', 'findings.md', 'final.md']) {
    assert.ok(existsSync(join(PACK, 'content', 'templates', 'run', name)), `content 模板缺 ${name}`)
  }
  assert.equal(existsSync(join(PACK, 'workspace')), false, 'workspace/ 种子目录必须已删除')
  assert.ok(pkg.files.includes('content/**'), 'files 缺 content/**')
  assert.equal(pkg.files.some((f) => f.startsWith('workspace/')), false, 'files 仍含 workspace/**')
})

test('I4 内容从包内进入模型：runtime context + 变量', () => {
  const src = readFileSync(join(PACK, 'src', 'content', 'index.ts'), 'utf8')
  assert.match(src, /systemPrompt\.context\(/, '未注册 runtime context')
  assert.match(src, /variable\('research_pack_root'/, '未注册 research_pack_root')
  assert.match(src, /'content'[\s\S]*'manual\.md'|manual\.md'[\s\S]*'content'/, '未读包内手册')
})
