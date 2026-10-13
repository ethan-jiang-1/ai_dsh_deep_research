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
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'research-workspace')
const DST = join(ROOT, 'packages', 'deep-research-pack', 'workspace')
const check = process.argv.includes('--check')

/** 种子文件清单（手册 + 节点契约 + 判型模式库 + 工作区 `.gitignore.example` + run 模板；
 *  drt_ 开头的 run bundle 运行区不进种子）。为什么是 `.gitignore.example` 而不是 `.gitignore`：
 *  **npm pack 永不打包名为 .gitignore 的文件**（`files: ["workspace/**"]` 也照删，实测），
 *  而这份规则必须随包——安装方工作区是独立 git 仓，没有本仓根 .gitignore 兜底，不带它，
 *  一次 `git add -A` 就把几十个 run bundle 提交进用户库。scaffold 落地时改名回 `.gitignore`。
 *  加种子时同步 scaffold 的收集器与 export-dist 的清单断言；`workspace/` 下的非清单文件由
 *  下方 fileSet 判定报红（漏登记不静默）。 */
const FILES = [
  ['AGENTS.md', 'AGENTS.md'],
  ['NODES.md', 'NODES.md'],
  ['question-patterns.md', 'question-patterns.md'],
  ['.gitignore.example', '.gitignore.example'],
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

// 孤儿种子对账（双向 freshness）：只对"源有的"文件比对不算 freshness——源删了文件、种子残留
// 旧件同样是漂移（部署方会装到已删的旧模板；对照 overlay-fresh 的整文件全量 diff 无此盲区）。
// check 报红；sync 侧真镜像（删孤儿），让 --check 能保证两侧相等。
const fileSet = new Set(FILES.map(([rel]) => rel))
const walkDst = (dir) => {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walkDst(p)
    // 全扩展名扫描：只扫 .md 会让非 .md 种子（.gitignore）成为免检区——漏登记不报红（静默漏发）
    else {
      const rel = p.slice(DST.length + 1)
      if (!fileSet.has(rel)) {
        if (check) drift.push(`孤儿种子（源侧已删）:${rel}`)
        else rmSync(p)
      }
    }
  }
}
if (existsSync(DST)) walkDst(DST)

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
