// dev/vendor-host-bundle.config.ts —— 逐包 host 半批量构建配置（无插件版，本仓所有）。
//
// 为什么需要它：vendor 的 `pnpm run build:lib:host` 在干净树上红在 tsdown **根单元**（root 包
// 无 lib/types 入口），早夭后 **205 个 workspace 包的 host 半 lib/index.js 从未产出**。后果有二：
// ① client 遍的 clientBundle 助手对"纯折"依赖**能解析才内联**——目标包 lib/index.js 缺席时
// 静默外置成 require，浏览器模块表答不出（实测两连：cosmokit / dsh-typert-protocol 的
// "missed the module table"）；
// ② host 侧"config 子进程跑 built lib/"的契约面（docs/testing.md）也无产物。
// 故：tsc host 遍之后，对每个"有 lib/types/index.js 而无 lib/index.js"的包用本配置补建。
// 与 vendor root host 遍的差异仅在无 typert 插件（typert 产物由 dev/vendor-typert-emit.mjs
// 单独生成）与入口按绝对路径（配置住本仓 dev/；不设 root 防 lib/lib 嵌套错形）。
import { join } from 'node:path'

const pkg = process.cwd()

export default {
  entry: [join(pkg, 'lib/types/{index,invariant,startup}.js')],
  outDir: join(pkg, 'lib'),
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
  external: [/^@deepseek-ai\//],
}
