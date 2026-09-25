/** Host 半：空壳（观察面 client 面的宿主位——bundle 行 name = 本包名，host 侧加载此入口）。
 * 当前零 host 侧行为（preset 行与 bundle 行都是纯配置）；「构建产物只此一件」的教义边界
 * 见 docs/00-index D18（2026-09-25 修订 D7）。 */
import type { Context } from '@deepseek-ai/cordis'

/** Host 半无服务依赖。 */
export const inject: readonly string[] = []

/** Host plugin body：无行为（浏览器半在 `./client`）。 */
export function apply(_ctx: Context): void {}
