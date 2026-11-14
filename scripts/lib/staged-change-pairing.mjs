// staged-change-pairing — 暂存区里的成对变更判据（D52）。纯函数；消费 = verify 门禁
// `staged-change-pairing`（pre-commit 的暂存索引；无暂存 = 无对象）。
//
// 三条规则：
//   ① 归档卡移入 `_backlog/_archived/settled_issues/` 时，其 `去向` 指向的 Note 必须在同一暂存集
//      （「Note 与卡关闭同变更」从散文规则变成可判）；
//   ② `snapshots/replay/**/ui.expected.md` 变更时，同目录 `snapshot.json` 必须在暂存集且
//      `lastRewrite.why` 非空、载体存在（金标准重录必须带理由）；
//   ③ bug 卡归档到 `_archived/fixed_bugs/` 时，卡内「改动」声明的至少一个仓内文件必须在同一暂存集，
//      且 `## 修复落地` 有红证/绿证的实跑片段——只翻状态/移动卡 = 假修（2026-11-14 事故：
//      批量把卡改已修并移动，repo 无任何变更；红→绿证据必须是流程的一部分，不是散文）。
//
// 边界：`staged` 由调用方从 `git diff --cached --name-status -M` 解析（不在本件跑 git）；
// `read`/`exists` 由调用方注入（keyless 测试不触盘）。
import { dirname, join, normalize } from 'node:path'
import { dispositionTargetOf } from './backlog-liveness.mjs'
import { fixChangePathsOf, fixEvidenceProblems } from './fix-evidence.mjs'

/**
 * 解析 `git diff --cached --name-status -M` 输出。
 * @param {string} text - 原始输出（每行 `<status>\t<path>`；R/C 带两段路径）。
 * @returns {{status:string, paths:string[]}[]}
 */
export function parseStagedChanges(text) {
  const out = []
  for (const line of String(text ?? '').split('\n')) {
    if (line.trim() === '') continue
    const parts = line.split('\t')
    const status = (parts[0] ?? '').trim()
    const paths = parts.slice(1).map((part) => part.trim()).filter((part) => part !== '')
    if (status === '' || paths.length === 0) continue
    out.push({ status, paths })
  }
  return out
}

/**
 * 暂存区配对判据。
 * @param {{staged: {status:string, paths:string[]}[], read: (rel:string)=>string|null, exists: (rel:string)=>boolean}} input
 * @returns {string[]} 失败原因（空 = 绿）。
 */
export function stagedChangePairingProblems({ staged, read, exists }) {
  const problems = []
  const present = new Set()
  const statusOf = new Map()
  for (const entry of staged) {
    if (entry.status === 'D') continue
    for (const path of entry.paths) { present.add(path); statusOf.set(path, entry.status) }
  }

  // ① 归档卡 ↔ Note 同暂存集
  for (const entry of staged) {
    if (entry.status === 'D') continue
    const card = entry.paths.at(-1)
    if (!/^_backlog\/_archived\/settled_issues\/[^/]+\.md$/.test(card)) continue
    const text = read(card)
    if (text === null) continue
    const target = dispositionTargetOf(text)
    if (target === null || target.value.startsWith('http')) continue
    const targetPath = target.kind === 'link'
      ? normalize(join(dirname(card), target.value))
      : normalize(target.value)
    if (targetPath.startsWith('..')) continue // 逃出仓根：md-links 管，不在这里重复判
    if (targetPath.startsWith('notes/') && !present.has(targetPath))
      problems.push(`${card} 归档但其去向 Note ${targetPath} 不在同一暂存集——卡关闭与 Note 必须同变更（先补 Note 的验证节再提交）`)
  }

  // ③ bug 修复卡：同暂存集必须有卡内「改动」声明的代码/测试/文档变更，且红证/绿证在场。
  //    这一条直接咬 2026-11-14 事故：批量翻已修 + 移动卡，repo 没有其它变更。
  //    活跃 修复落地 卡也拦（不只归档）：状态一翻就得有实证，不能等归档才补。
  const fixPairProblems = (card, text) => {
    const evidence = fixEvidenceProblems(text)
    if (evidence.length > 0) return [`${card} 不是可复核的修复：${evidence.join('；')}——先写 ## 修复落地 的 改动/红证/绿证`]
    const changes = fixChangePathsOf(text).filter((path) => !path.startsWith('_backlog/'))
    const hit = changes.filter((path) => present.has(path)
      || (path.endsWith('/') && [...present].some((stagedPath) => stagedPath.startsWith(path))))
    if (hit.length === 0) return [`${card} 的「改动」没有任何文件在同一暂存集——只翻状态/移动卡不算修复；先落代码/测试并跑出红→绿`]
    return []
  }
  for (const entry of staged) {
    if (!/^[AM]/.test(entry.status)) continue
    const card = entry.paths.at(-1)
    if (!/^_backlog\/bugs\/BUG-\d{3}-.+\.md$/.test(card)) continue
    const text = read(card)
    if (text === null) continue
    if (!/^status:\s*修复落地\s*$/m.test(text)) continue
    problems.push(...fixPairProblems(card, text))
  }
  for (const entry of staged) {
    // 只判**新归档**（R/A）；已归档卡的链接/措辞维护是 M，不应被倒查历史改动。
    if (!/^[RA]/.test(entry.status)) continue
    const card = entry.paths.at(-1)
    if (!/^_backlog\/_archived\/fixed_bugs\/BUG-\d{3}-.+\.md$/.test(card)) continue
    const text = read(card)
    if (text === null) continue
    if (!/^status:\s*已修\s*$/m.test(text)) {
      problems.push(`${card} 归档修复卡 status 必须为 已修（当前不是——状态机与目录必须互验）`)
      continue
    }
    problems.push(...fixPairProblems(card, text))
  }

  // ② ui.expected ↔ snapshot.lastRewrite
  for (const path of present) {
    const match = /^(snapshots\/replay\/.+)\/ui\.expected\.md$/.exec(path)
    if (match === null) continue
    // 只判「重录」（M/R）。A = 新场景的首次金标准（随场景一起生成），没有 lastRewrite 语义；
    // gates.e2e 的全量副本把所有文件标 A，也必须落在这里。
    if (!/^[MR]/.test(statusOf.get(path) ?? '')) continue
    const snapshotPath = `${match[1]}/snapshot.json`
    if (!present.has(snapshotPath)) {
      problems.push(`${path} 变更但 ${snapshotPath} 未暂存——金标准重录必须同 diff 写 lastRewrite（--update-expected --why <载体>）`)
      continue
    }
    const text = read(snapshotPath)
    let parsed = null
    try { parsed = JSON.parse(text ?? '') } catch { parsed = null }
    const why = typeof parsed?.lastRewrite?.why === 'string' ? parsed.lastRewrite.why.trim() : ''
    if (why === '') {
      problems.push(`${snapshotPath} 缺 lastRewrite.why——金标准重录必须带 --why <载体>`)
    } else if (why !== 'none' && !/^https?:/.test(why) && !exists(why)) {
      problems.push(`${snapshotPath} 的 lastRewrite.why 指向不存在的载体：${why}`)
    }
  }
  return problems
}
