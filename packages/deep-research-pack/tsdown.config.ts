// 本包的双半构建（host 半 + client 半）。契约照抄 company-pack 的 tsdown.config.ts
// （它又照抄 vendor packages/client/tsdown.client.ts 的产物契约——vendor 助手按
// packages/*/*/package.json 的 monorepo 布局找包，仓外包用不了，故抄契约）：
//   - `fixedExtension: false` → 在 `type: module` 包里也产出 lib/index.js / lib/client.js；
//   - client 半必须包 `window.__ModuleLoader__.load({id, factory})` 外壳（否则浏览器加载不了）；
//   - 外置规则：react 运行时与 DSH 的 client/api 模块留 require（浏览器模块表回答），
//     其余必须内联（留 require 会在浏览器抛错）；
//   - CSS Modules：参照 vendor `tsdown.client.ts` 用 `lightningcss` 编译为作用域类名表 +
//     `<style data-plugin data-plugin-css>` 注入，把 `lib/types/**` 的相对导入映射回 `src/**`。
// 前置：先 `tsc -b .` 产出 lib/types/**（含 lib/types/client/index.js）。
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, relative, resolve, sep } from 'node:path'
import { defineConfig, type TsdownPlugin } from 'tsdown'

const PACKAGE_DIR = import.meta.dirname
const PACKAGE_ID = 'dsh-deep-research-pack'
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

function loadLightningCss(): { transform: (opts: { filename: string; code: Uint8Array; cssModules: { pattern: string }; minify: boolean }) => { code: Uint8Array; exports?: Record<string, { name: string }> } } {
  const vendorRequire = createRequire(resolve(PACKAGE_DIR, '../../vendor/dsh/package.json'))
  try {
    return vendorRequire('lightningcss')
  } catch {
    /* @silent-catch: fallback to package-local resolution when running outside repo monorepo */
    return createRequire(import.meta.url)('lightningcss')
  }
}

const { transform: transformCss } = loadLightningCss()

function resolveClientCssPath(source: string, importer: string | undefined): string {
  const rawAbs = importer === undefined ? resolve(PACKAGE_DIR, source) : resolve(dirname(importer), source)
  const typesRoot = resolve(PACKAGE_DIR, 'lib/types')
  const relFromTypes = relative(typesRoot, rawAbs)
  if (!relFromTypes.startsWith('..') && !relFromTypes.startsWith(sep)) {
    return resolve(PACKAGE_DIR, 'src', relFromTypes)
  }
  return rawAbs
}

function cssModulesInlinePlugin(): TsdownPlugin {
  const virtualToFile = new Map<string, string>()
  const clientRoot = resolve(PACKAGE_DIR, 'src/client')
  return {
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = resolveClientCssPath(source, importer)
      const rel = relative(clientRoot, abs).split(sep).join('/')
      const virtualId = `${CSS_VIRTUAL_PREFIX}${PACKAGE_ID}/client/${rel}${CSS_VIRTUAL_SUFFIX}`
      virtualToFile.set(virtualId, abs)
      return virtualId
    },
    async load(virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualToFile.get(virtualId)
      if (fileId === undefined) return null
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transformCss({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap: Record<string, string> = {}
      const entries = Object.entries(cssExports ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      for (const [local, exp] of entries) classMap[local] = exp.name
      const tagId = `${PACKAGE_ID}/${basename(fileId)}`
      return [
        `const css = ${JSON.stringify(Buffer.from(code).toString('utf8'))};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {`,
        `  const tag = document.createElement('style');`,
        `  tag.dataset.plugin = ${JSON.stringify(PACKAGE_ID)};`,
        `  tag.dataset.pluginCss = tagId;`,
        `  tag.textContent = css;`,
        `  document.head.appendChild(tag);`,
        `}`,
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }
}

const shared = {
  outDir: 'lib',
  dts: false,
  sourcemap: true,
  clean: false,
  target: 'es2024',
  fixedExtension: false,
} as const

export default defineConfig([
  {
    ...shared,
    name: PACKAGE_ID,
    entry: { index: 'lib/types/index.js', 'fetch-fallback': 'lib/types/fetch-fallback/index.js', 'method-library-tool': 'lib/types/method-library-tool.js', 'startup': 'lib/types/startup/index.js', content: 'lib/types/content/index.js', defaults: 'lib/types/defaults/index.js' },
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
    plugins: [cssModulesInlinePlugin()],
    // 只外置"浏览器模块表能回答"的：react 运行时与 DSH 的 client/api 模块（baseline +
    // 动态行）。其余（如 zod）必须内联——留成 require 会在浏览器里抛错（tsdown 默认会把
    // package.json 的 dependencies 当 external，所以要显式拉回来）。
    external: ['react', 'react-dom', 'react/jsx-runtime', /^@deepseek-ai\/dsh-client-/, /^@deepseek-ai\/dsh-api-/],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
