// shipped-surface.test.mjs — 发布面自足判据的 keyless 半边（BUG-219…228 类级）。
//
// 边界：真 tarball 的集合与构建产物文本由 checks/smoke/pack.e2e.mjs 证（真进程档）；
// 本文件扫**随包源码文本**（README/presets/content/scripts/workers/locale/src 注释）+ manifest 不动量。
// src 注释也扫：构建产物保留源注释，源码即发布文本（224/225 的根因）。
//
// 负例留证 2026-11-17：BUG-219 / BUG-220 / BUG-221 / BUG-222 / BUG-223 / BUG-224 / BUG-225 / BUG-226 / BUG-227 / BUG-228
// ——本文件的判据都在当前树先红后绿：把 `checks/lib/…` 写回任一随包文本、把 `files` 改回 `lib/**`、
// 删一个 `exports.types` 入口、或在 README 折叠区外注入 `pnpm build`，各见红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  filesAllowlistIssues, readmeUserSectionIssues, shippedTextIssues, topLevelIssues,
  typeEntryPathsOf, typeSetIssues, devRefsOf,
} from '../../checks/lib/repo/shipped-surface.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'))

/** 随包源码文本：README* / cordis / presets / content / scripts / workers / locale* / src（注释）。 */
function shippedSources() {
  const out = []
  for (const name of ['README.md', 'README.zh.md', 'cordis.patch.yml']) {
    out.push({ path: name, text: readFileSync(join(PACK, name), 'utf8') })
  }
  const walk = (dir, accept) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) { walk(abs, accept); continue }
      if (!accept(entry.name)) continue
      out.push({ path: relative(PACK, abs).split('\\').join('/'), text: readFileSync(abs, 'utf8') })
    }
  }
  walk(join(PACK, 'presets'), (name) => /\.(?:md|ya?ml)$/.test(name))
  walk(join(PACK, 'content'), (name) => /\.(?:md|json)$/.test(name))
  walk(join(PACK, 'scripts'), (name) => /\.(?:mjs|cjs|js)$/.test(name))
  walk(join(PACK, 'workers'), (name) => /\.(?:js|json|md)$/.test(name))
  walk(join(PACK, 'src'), (name) => /\.(?:ts|tsx)$/.test(name))
  return out
}

test('随包文本零开发面引用（README/skills/content/scripts/workers/src 注释；BUG-220 / BUG-221 / BUG-222 / BUG-223 / BUG-224 / BUG-225 / BUG-226 / BUG-227）', () => {
  const files = shippedSources()
  assert.ok(files.length >= 60, `防空语料：随包源码文件过少（${files.length}）——扫描面被收窄`)
  assert.deepEqual(shippedTextIssues(files), [],
    '随包文本引用了开发面（tarball 里不存在）：改为行为/契约描述，或指向随包 content/ presets/ lib/')
})

test('README 用户段零开发命令与开发路径；维护者 <details> 折叠段是显式例外（BUG-220）', () => {
  for (const name of ['README.md', 'README.zh.md']) {
    const text = readFileSync(join(PACK, name), 'utf8')
    assert.deepEqual(readmeUserSectionIssues(text), [], `${name} 的用户段混入开发命令/路径（折叠段之外）`)
  }
})

test('发布清单 = 公开合同的反投影：files 显式列出 exports.types，无 lib 广模式（BUG-219 / BUG-228）', () => {
  assert.ok(typeEntryPathsOf(pkg).length >= 5, `防空语料：exports.types 过少（${typeEntryPathsOf(pkg).length}）`)
  assert.deepEqual(filesAllowlistIssues(pkg), [])
})

test('类型集合 / 顶层集合判据的纯函数矩阵（多、少、未登记都点名）', () => {
  const entries = typeEntryPathsOf(pkg)
  assert.deepEqual(typeSetIssues(entries, pkg), [], '公开入口恰好等于实际集合时应绿')
  assert.ok(typeSetIssues([...entries, 'lib/types/lib/__gone__.d.ts'], pkg).some((p) => p.includes('多出非公开类型文件')))
  assert.ok(typeSetIssues(entries.slice(1), pkg).some((p) => p.includes('缺公开类型入口')))
  assert.deepEqual(topLevelIssues(['lib/x.js', 'presets/lead.patch.yml', 'README.md']), [])
  assert.ok(topLevelIssues(['src/index.ts']).some((p) => p.includes('未登记条目 src')))
})

test('dev 引用判据的边界：运行期词放行，歧义词只认真实子目录，开发实例名必红', () => {
  assert.deepEqual(devRefsOf('运行期：content/manual.md、presets/lead.patch.yml、lib/index.js、scripts/doctor.mjs、drt_<slug>/'), [])
  assert.equal(devRefsOf('判据见 `checks/lib/shared/plan-card.mjs`。')[0]?.ref, 'checks/lib/shared/plan-card.mjs')
  assert.equal(devRefsOf('正本 = docs/design/50-agent-loop-and-state.md')[0]?.ref, 'docs/design/50-agent-loop-and-state.md')
  assert.deepEqual(devRefsOf('release notes/registry 与 changelog 不是路径'), [])
  assert.equal(devRefsOf('工作区 = research-workspace/')[0]?.ref, 'research-workspace/')
  assert.equal(devRefsOf('grep -rn "判型" research-workspace/ --include=journal.md')[0]?.ref, 'research-workspace/')
})

test('README 用户段判据：折叠区外开发命令红，折叠区内维护者语境绿（BUG-220 负控）', () => {
  assert.ok(readmeUserSectionIssues('## Usage\n`pnpm build`\n').some((p) => p.includes('开发命令')))
  assert.ok(readmeUserSectionIssues('see `docs/guides/61-run-playbook.md`\n').some((p) => p.includes('开发面')))
  assert.deepEqual(readmeUserSectionIssues('## Usage\n<details><summary>maintainers</summary>\n`pnpm build`\n</details>\n'), [])
})
