#!/usr/bin/env node
// sync-pack-workspace.mjs — 把研究工作区种子（手册 + 模板）同步进 pack（`workspace/`），
// `--check` 给门禁用（漂移即红）。
//
// 为什么需要：手册（研究纪律）与 run 模板是**会话 cwd 的内容**——DSH 的 agent-instructions
// 从会话 cwd 向上发现 AGENTS.md 注入角色。它们不在 pack 里 → 别人装了 pack 也没有研究纪律。
// 本脚本把仓库正本（research-workspace/AGENTS.md + templates/run/）同步为 pack 的
// `workspace/` 种子：pack 自包含，部署方从种子起工作区。
//
// 正本方向：research-workspace/（仓库运行场）→ pack workspace/（发布种子）。
// 漂移门禁 = verify 的 pack-workspace-fresh（跑 --check）。
//
// 用法：node dev/sync-pack-workspace.mjs [--check]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'research-workspace')
const DST = join(ROOT, 'packages', 'deep-research-pack', 'workspace')
const check = process.argv.includes('--check')

/** 种子文件清单（手册 + 节点契约 + run 模板；drt_ 开头的 run bundle 运行区不进种子）。 */
const FILES = [
  ['AGENTS.md', 'AGENTS.md'],
  ['NODES.md', 'NODES.md'],
  ...readdirSync(join(SRC, 'templates', 'run')).filter((f) => f.endsWith('.md')).sort()
    .map((f) => [`templates/run/${f}`, `templates/run/${f}`]),
]

const drift = []
for (const [rel] of FILES) {
  const src = join(SRC, rel)
  const dst = join(DST, rel)
  const srcText = readFileSync(src, 'utf8')
  if (check) {
    const dstText = existsSync(dst) ? readFileSync(dst, 'utf8') : null
    if (dstText !== srcText) drift.push(rel)
    continue
  }
  mkdirSync(dirname(dst), { recursive: true })
  writeFileSync(dst, srcText)
}

if (check) {
  if (drift.length > 0) {
    console.error(`sync-pack-workspace: pack 种子与仓库正本漂移（${drift.length} 个文件）：${drift.join('、')}`)
    console.error('  修复：node dev/sync-pack-workspace.mjs')
    process.exit(1)
  }
  console.log(`sync-pack-workspace: 种子一致（${FILES.length} 个文件）`)
} else {
  console.log(`sync-pack-workspace: 已同步 ${FILES.length} 个文件 → packages/deep-research-pack/workspace/`)
}
