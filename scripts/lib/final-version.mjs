// final-version.mjs — 终稿版本文件名的唯一判据（消费 pack 的单一正本）。
//
// 为什么存在（2026-11-03 七维卫生审计 D2-3）：`final/vN.md` 的识别在 scripts 里被自写了
// 8 处、宽窄不一——旧写法收 v0，reader 门再过滤 >=1，版本门再过滤 >=2；
// 而 pack 的 `FINAL_VERSION_RE`（`v[1-9]…`）此前**零消费者**。同一条语义 8 份实现，
// 改一处永远抓不全。
//
// 正本 = `packages/deep-research-pack/src/lib/final-target.ts`（client 终稿面与 run-fold
// 已消费它）。本文件只把「目录 → 版本号数组」的 IO 薄壳补齐；纯判据一律从 pack 导入。
// 依赖方向：scripts → pack src（已有先例 = node-gate-contracts 直引 review-readiness.ts）。
import { readdirSync } from 'node:fs'
import { finalVersionOf, readableVersionOf } from '../../packages/deep-research-pack/src/lib/final-target.ts'

export { finalVersionOf, readableVersionOf }

/** 目录里的终稿版本号（升序）；目录缺席/不可读 = 空数组（调用方自判语义，不在这里抛）。 */
export function finalVersionsIn(dir) {
  try {
    return readdirSync(dir)
      .map((name) => finalVersionOf(name))
      .filter((version) => version !== null)
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

/** 目录里的读者版版本号（升序）；语义同 {@link finalVersionsIn}。 */
export function readableVersionsIn(dir) {
  try {
    return readdirSync(dir)
      .map((name) => readableVersionOf(name))
      .filter((version) => version !== null)
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

/** final/ 是否已有任何版本账。 */
export function hasFinalVersion(dir) {
  return finalVersionsIn(dir).length > 0
}
