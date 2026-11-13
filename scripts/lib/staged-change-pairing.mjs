// staged-change-pairing — 暂存区里的成对变更判据（D52）。纯函数；消费 = verify 门禁
// `staged-change-pairing`（pre-commit 的暂存索引；无暂存 = 无对象）。
//
// 两条规则：
//   ① 归档卡移入 `_backlog/_archived/settled_issues/` 时，其 `去向` 指向的 Note 必须在同一暂存集
//      （「Note 与卡关闭同变更」从散文规则变成可判）；
//   ② `snapshots/replay/**/ui.expected.md` 变更时，同目录 `snapshot.json` 必须在暂存集且
//      `lastRewrite.why` 非空、载体存在（金标准重录必须带理由）。
//
// 边界：`staged` 由调用方从 `git diff --cached --name-status -M` 解析（不在本件跑 git）；
// `read`/`exists` 由调用方注入（keyless 测试不触盘）。
import { dirname, join, normalize } from 'node:path'
import { dispositionTargetOf } from './backlog-liveness.mjs'

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
