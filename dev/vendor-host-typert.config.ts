// dev/vendor-host-typert.config.ts —— 逐包 host 构建配置（本仓所有，不改 vendor 内容）。
//
// 为什么需要它：vendor 自己的 `pnpm run build:lib:host` 在干净树上会红在**根单元**——
// 根 `tsdown.config.ts` 的 entry glob（`lib/types/{index,invariant,startup}.js`）是逐单元
// 应用的，而 root 包没有 src、也就没有 lib/types/*，于是 tsdown 报 `[@deepseek-ai/dsh-root]
// Cannot find entry`（语料维护页记过同类阻断）。`-F` 在本版对 workspace 合成配置无效。
// 故：由本仓驱动**逐包** host 构建（`typertPlugin({ mode: 'package' })` = 只发射当前包），
// 产物落各包 gitignored 的 `lib/`（vendor-clean 门禁不受影响——vendor 只读铁律针对 tracked 内容）。
//
// 路径纪律：配置住在本仓 `dev/`，而 entry/outDir 必须相对**被构建的包**（= 调用目录）解析，
// 故用绝对路径且**不设 root**——tsdown 默认 root = entry 的公共祖先（`<pkg>/lib/types`），
// 输出才会是 `<pkg>/lib/index.js`（与 vendor 自身构建的产物形状一致）；设 `root: cwd` 会得到
// `lib/lib/types/*` 的嵌套错误形状。
import { join } from 'node:path'
import { typertPlugin } from '../vendor/dsh/packages/typert/generator/lib/types/tsdown-plugin.js'

const pkg = process.cwd()

export default {
  entry: [join(pkg, 'lib/types/{index,invariant,startup}.js')],
  outDir: join(pkg, 'lib'),
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  tsconfig: join(pkg, 'tsconfig.json'),
  dts: false,
  clean: false,
  plugins: [typertPlugin({ mode: 'package', faces: ['host'] })],
}
