#!/usr/bin/env node
// evidence-audit —— run bundle 证据溯源审计（keyless：纯 fs + zstd CLI；防伪造链接/转写幻觉/
// 溯源断链——RFC evidence-reliability L3）。
//
// 为什么存在：evidence/*.md 是模型从 tool result **手写**的——URL 可伪造、引句可转写错/编造、
// final 引用可断链。会话日志存着全部真相（model-visible ⟺ logged：每次 web 工具调用的
// 原始结果都在 zstd 日志里），本工具拿它对账，把"谁知道是不是幻觉"变成机检报告。
//
// 三条断言（RFC 判据）：
//   ① source_url 溯源：evidence 声称的每个 URL（frontmatter source_url，无 frontmatter 的
//      存量文件则取正文全部 http(s) 链接）必须在会话日志的**工具事件**（tool/call 与
//      tool/result）里真实出现过——模型口头提过的 URL 不算（防伪造链接）；
//   ② 摘录转写回溯：原文摘录（blockquote）规范化后在工具结果语料中可找到（防转写幻觉；
//      规范化 = 去空白/markdown 强调符 + 小写——CJK 安全；匹配不到的如实列出，报告覆盖率）；
//   ③ final 溯源链：final/ 当前版每条 [来源: evidence/xx.md] 指向真实存在的证据文件
//      （**反引号内的格式说明占位不算引用**——首场 run 审计的假阳性，实测修正）。
// 附带：契约符合性（frontmatter 硬五字段；无 frontmatter = 契约不符 MAJOR——首场 run 31 份
// 全无 frontmatter，如实揭出）与佐证结构（按 supports 分组数独立域名，<2 标单域）。
//
// 输出：审计报告写 <bundle>/audit.md（run bundle 的新增文件，不改既有文件）+ 控制台摘要；
//       存在 CRITICAL（伪造链接 / final 断链）→ exit 1（供 CI/收尾判据用）。
// 分层（2026-10-09 layering 二代）：判据核心（auditBundle/buildCorpus/normalize 族）住
// scripts/lib/evidence-audit-core.mjs（keyless 纯逻辑，tests 消费——tests/ 层禁子进程，
// keyless 测试走纯 .jsonl 夹具直调）；本文件 = CLI 驱动壳 + zstd 日志 reader（多帧拼接
// CLI 可解全帧）注入。
// 用法：node scripts/run-gates/evidence-audit.mjs <run-bundle-dir> [--sessions <会话根>]（缺省 $DSH_HOME/sessions）
//       node scripts/run-gates/evidence-audit.mjs --latest（取 research-workspace 最新 drt_*——根[在飞]与 archive/[已交付]并扫）
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { auditBundle } from '../lib/evidence-audit-core.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** 读一个会话日志文件（.jsonl 直读 / .jsonl.zstd 走 zstd CLI——多帧拼接 CLI 可解全帧）。
 *  解压失败 stderr 报文件名后返回 null（调用方跳过该文件，语料缺失偏红方向——单文件失败
 *  不吞整个目录：旧实现 return 会静默丢弃同目录剩余全部日志，红无线索）。
 *  注入给 auditBundle 的 opts.readLog（lib 默认纯 reader 不解压 .zstd）。 */
function readLog(p) {
  if (!p.endsWith('.zstd')) return readFileSync(p, 'utf8')
  const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) {
    console.error(`evidence-audit: 日志解压失败（跳过该文件，语料缺失偏红方向）：${p}`)
    return null
  }
  return r.stdout
}

// ── CLI ──
if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const argv = process.argv.slice(2)
  const latest = argv.includes('--latest')
  const sessionsIdx = argv.indexOf('--sessions')
  // 会话根解析（2026-09-26 实测修复）：**不能盲信继承来的 DSH_HOME**。实测：在日用 GUI 的 shell 里
  // DSH_HOME 常已被设成 `~/.dsh`（日用 home），于是本脚本会去审计**另一个 home 的会话**——
  // 同一 bundle 两次跑出 7/88 与 85/88（1807 vs 330 个日志文件），足以把好报告判成"伪造链接"。
  // 处置：默认锚定本仓 dev home；DSH_HOME 指向别处时**先自拒**（同 L1/L2 的 exit 2 纪律），
  // 要审别的 home 就显式 `--sessions <dir>`。
  const repoHome = join(ROOT, 'runtime', 'harness-home')
  const envHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null
  if (sessionsIdx === -1 && envHome !== null && envHome !== repoHome) {
    console.error(`evidence-audit: DSH_HOME=${envHome} 不是本仓 dev home（${repoHome}）——先 \`source dev/env.sh\`，或显式 --sessions <dir>；本脚本不自作主张换 home（实测会审到别的 home 的会话，结论不可比）`)
    process.exit(2)
  }
  const sessionsRoot = sessionsIdx !== -1 ? resolve(argv[sessionsIdx + 1]) : join(repoHome, 'sessions')
  const bundleArg = argv.find((a) => !a.startsWith('--') && a !== sessionsRoot)
  let bundleDir = null
  if (latest) {
    // 位置=状态（D17）：在飞 bundle 住工作区根，已交付的由操作侧移入 archive/——两处并扫取
    // mtime 最新；同名时根优先（在飞态是正本，archive 场是历史）。两处全空 → 走用法红（防空语料）。
    const ws = join(ROOT, 'research-workspace')
    const cands = []
    const seen = new Set()
    for (const dir of [ws, join(ws, 'archive')]) {
      if (!existsSync(dir)) continue
      for (const d of readdirSync(dir)) {
        if (!/^drt_/.test(d) || seen.has(d)) continue
        let st = null
        try { st = statSync(join(dir, d)) } catch { continue }
        if (!st.isDirectory()) continue
        seen.add(d)
        cands.push({ p: join(dir, d), m: st.mtimeMs })
      }
    }
    cands.sort((a, b) => b.m - a.m)
    bundleDir = cands.length > 0 ? cands[0].p : null
  } else if (bundleArg) bundleDir = resolve(bundleArg)
  if (bundleDir === null || !existsSync(bundleDir)) {
    console.error('evidence-audit: 用法 node scripts/run-gates/evidence-audit.mjs <run-bundle-dir> | --latest（bundle 不存在）')
    process.exit(2)
  }
  const { stats, report, criticalCount } = auditBundle(bundleDir, sessionsRoot, { readLog })
  writeFileSync(join(bundleDir, 'audit.md'), report)
  console.log(`evidence-audit: ${stats.evidence} 份证据 · URL 溯源 ${stats.urlOk}/${stats.urlTotal} · `
    + `source_url 真抓过 ${stats.srcFetched}（未抓 ${stats.srcNeverFetched}）· `
    + `摘录回溯 ${stats.quoteOk}/${stats.quoteTotal}（复合 ${stats.quoteComposite} / 不符 ${stats.quoteBad}）· `
    + `final 链 ${stats.finalRefs - stats.finalBroken}/${stats.finalRefs}`)
  console.log(`  发现：CRITICAL ${stats.critical} · MAJOR ${stats.major} · INFO ${stats.info} —— 报告已写 ${join(bundleDir, 'audit.md')}`)
  process.exit(criticalCount === 0 ? 0 : 1)
}
