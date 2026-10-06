// unconsumed-evidence —— B1（critic 差集出题）的机械基座：evidence/ 池中未被 findings.md
// 引用的证据卡清单（oss-dr 借鉴 B1 / Co-STORM Moderator 策略：检索到但未被采用的信息是
// 对抗核查的矿）。纯 fs 只读投影，无门禁语义——角色运行时无 bash 不能自调，本模块供操作侧
// 收尾核验与活体验证对账用（E2E 实证 = notes/implemented/2026-10-07-living-verification-hook.md）。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * evidence/ 卡名 × findings.md 引用情况的差集。
 * 引用判定 = findings.md 正文含卡文件名（basename，与 [来源: evidence/xx.md] 行同粒度）。
 * @returns {{ findingsPresent: boolean, total: number, cited: number, unconsumed: string[] }}
 *   findings.md 缺席（run 中期态）→ findingsPresent=false、unconsumed=全部（差集语义由
 *   调用方自判，本函数如实投影不臆断）；evidence/ 缺席或空 → total=0、unconsumed=[]（空集
 *   显式，不静默不炸）。
 */
export function unconsumedEvidence(bundleDir) {
  const evDir = join(bundleDir, 'evidence')
  const cards = existsSync(evDir)
    ? readdirSync(evDir).filter((f) => f.endsWith('.md')).sort()
    : []
  const findingsPath = join(bundleDir, 'findings.md')
  const findings = existsSync(findingsPath) ? readFileSync(findingsPath, 'utf8') : null
  const unconsumed = findings === null ? [...cards] : cards.filter((c) => !findings.includes(c))
  return {
    findingsPresent: findings !== null,
    total: cards.length,
    cited: cards.length - unconsumed.length,
    unconsumed,
  }
}
