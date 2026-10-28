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
import { sha256, serializeSeedManifest } from '../packages/deep-research-pack/scripts/lib/seed-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'research-workspace')
const PACK = join(ROOT, 'packages', 'deep-research-pack')
const DST = join(PACK, 'workspace')
const PACK_VERSION = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8')).version
const check = process.argv.includes('--check')

/** 独立种子：随包走但**不从正本同步**（见下方守卫段注释）。 */
const SEED_ONLY = 'method-library.md'

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

/** 种子所有权（落地名 → policy）：手册/节点契约/模板 = contract（跟包版本），判型库 = corpus
 *  （可生长的底本），`.gitignore` = user（用户所有，任何模式不覆盖）。缺省 = contract。 */
const POLICY = {
  'AGENTS.md': 'contract',
  'NODES.md': 'contract',
  'question-patterns.md': 'corpus',
  '.gitignore': 'user',
}

// 种子清单 = 版本 + 每个落地文件的 sha256。scaffold 用它做三态升级（current/stale/modified），
// preflight 用它判断工作区是否落后于当前 pack。生成物 tracked；内容随包装版本/种子文本变化，
// 由 pack-workspace-fresh 与 dist-manual-version 同款新鲜度门禁把守。
const SEED_MANIFEST = 'seed.json'
const seedManifestText = serializeSeedManifest({
  version: PACK_VERSION,
  policy: Object.fromEntries(FILES.map(([rel]) => [
    rel === '.gitignore.example' ? '.gitignore' : rel,
    POLICY[rel === '.gitignore.example' ? '.gitignore' : rel] ?? 'contract',
  ])),
  files: Object.fromEntries(FILES.map(([rel]) => [
    rel === '.gitignore.example' ? '.gitignore' : rel,
    sha256(readFileSync(join(SRC, rel), 'utf8')),
  ])),
})

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

// 清单本身也是生成物：与源文件同一次变化里重算；只比源文件不比清单 = 版本/哈希漂移的盲区。
if (check) {
  const dstText = existsSync(join(DST, SEED_MANIFEST)) ? readFileSync(join(DST, SEED_MANIFEST), 'utf8') : null
  if (dstText !== seedManifestText) drift.push(SEED_MANIFEST)
} else {
  writeFileSync(join(DST, SEED_MANIFEST), seedManifestText)
}

// 孤儿种子对账（双向 freshness）：只对"源有的"文件比对不算 freshness——源删了文件、种子残留
// 旧件同样是漂移（部署方会装到已删的旧模板；对照 overlay-fresh 的整文件全量 diff 无此盲区）。
// check 报红；sync 侧真镜像（删孤儿），让 --check 能保证两侧相等。
const fileSet = new Set(FILES.map(([rel]) => rel))
fileSet.add(SEED_MANIFEST)
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
// 独立种子必须在孤儿对账**之前**登记，否则会被判成"源侧已删"删掉。
if (existsSync(join(DST, SEED_ONLY))) fileSet.add(SEED_ONLY)

if (existsSync(DST)) walkDst(DST)

// 独立种子（**不参与正本同步**）：`method-library.md` 是用户个人偏好库，正本在运行场
// （research-workspace/）且内容是**每个部署方各自积累**的，绝不能被本仓的正本覆盖传播——
// 那会把一个人的偏好塞进所有人的新工作区。但包必须自带一份**合法空架子**，否则新工作区
// 里这个文件永远不存在，观察面宣称的「我的偏好库」在盘上缺席（BUG-042）。
// 因此单独把守三件事：在场、是空架子（无 `## ` 条目标题）、四字段骨架行在场。
{
  const seedPath = join(DST, SEED_ONLY)
  if (!existsSync(seedPath)) {
    const msg = `sync-pack-workspace: 独立种子缺席 → ${SEED_ONLY}（新工作区将没有偏好库）`
    if (check) drift.push(`${SEED_ONLY}（包内缺席）`)
    else console.error(msg)
  } else {
    const seedText = readFileSync(seedPath, 'utf8')
    // 空架子判据：允许被 <!-- 注释掉的模板条目标题，但**不得有注释外的 `## ` 条目**。
    const liveBody = seedText.replace(/<!--[\s\S]*?-->/g, '')
    if (/^## /m.test(liveBody)) {
      if (check) drift.push(`${SEED_ONLY}（含个人条目，种子必须是空架子）`)
      else console.error(`sync-pack-workspace: ${SEED_ONLY} 含注释外条目——种子必须是无偏好的空架子`)
    }
    for (const field of ['找来源', '怎么核实', '报告怎么写', '不承诺']) {
      if (!seedText.includes(field)) {
        if (check) drift.push(`${SEED_ONLY}（缺四字段骨架：${field}）`)
        else console.error(`sync-pack-workspace: ${SEED_ONLY} 缺四字段骨架：${field}`)
      }
    }
  }
  // 孤儿对账会把这个文件当"源侧已删"删掉——独立种子必须豁免。
  fileSet.add(SEED_ONLY)
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
