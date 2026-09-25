// 本包的双半构建（host 半 + client 半）。契约照抄 company-pack 的 tsdown.config.ts
// （它又照抄 vendor packages/client/tsdown.client.ts 的产物契约——vendor 助手按
// packages/*/*/package.json 的 monorepo 布局找包，仓外包用不了，故抄契约）：
//   - `fixedExtension: false` → 在 `type: module` 包里也产出 lib/index.js / lib/client.js；
//   - client 半必须包 `window.__ModuleLoader__.load({id, factory})` 外壳（否则浏览器加载不了）；
//   - 外置规则：react 运行时与 DSH 的 client/api 模块留 require（浏览器模块表回答），
//     其余必须内联（留 require 会在浏览器抛错）。
// 前置：先 `tsc -b .` 产出 lib/types/**（含 lib/types/client/index.js）。
import { defineConfig } from 'tsdown'

const shared = {
  outDir: 'lib',
  dts: false,
  sourcemap: true,
  clean: false,
  target: 'es2024',
  fixedExtension: false,
} as const

const PACKAGE_ID = 'dsh-deep-research-pack'

export default defineConfig([
  {
    ...shared,
    name: PACKAGE_ID,
    entry: { index: 'lib/types/index.js' },
    format: 'esm',
    platform: 'node',
    external: [/^@deepseek-ai\//],
  },
  {
    ...shared,
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'lib/types/client/index.js' },
    format: 'cjs',
    platform: 'browser',
    // 只外置"浏览器模块表能回答"的：react 运行时与 DSH 的 client/api 模块（baseline +
    // 动态行）。其余（如 zod）必须内联——留成 require 会在浏览器里抛错（tsdown 默认会把
    // package.json 的 dependencies 当 external，所以要显式拉回来）。
    external: ['react', 'react/jsx-runtime', /^@deepseek-ai\/dsh-client-/, /^@deepseek-ai\/dsh-api-/],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
