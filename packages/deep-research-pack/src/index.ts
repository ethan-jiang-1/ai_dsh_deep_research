/** Host 半：空壳（观察面 client 面的宿主位——bundle 行 name = 本包名，host 侧加载此入口）。
 * 本文件零行为；本包的 host 侧代码只有抓取回退 provider（`src/fetch-fallback/`，D31）。
 * 观察面的教义边界见 docs/decisions.md D18（2026-09-25 修订 D7）。 */
import type { Context } from '@deepseek-ai/cordis'

/** Host 半无服务依赖。 */
export const inject: readonly string[] = []

/** Host plugin body：无行为（浏览器半在 `./client`）。 */
export function apply(_ctx: Context): void {}
