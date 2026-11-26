// css-module-helpers.mjs — `node --test` 运行期加载 *.module.css / *.css 的钩子。
// 被 `package.json` 的 `test:spec`/`test:coverage` 通过 `--import` 预加载，也被 `client-dom-helpers.mjs` 复用。
import { register } from 'node:module'

const CSS_HOOK_KEY = Symbol.for('drp.test.cssHookRegistered')

const CSS_LOADER_SOURCE = `
export async function load(url, context, nextLoad) {
  let isCss = false
  try {
    isCss = new URL(url).pathname.endsWith('.css')
  } catch {
    isCss = url.endsWith('.css')
  }
  if (isCss) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export default new Proxy({}, { get: (_t, prop) => typeof prop === "string" ? prop : "" });',
    }
  }
  return nextLoad(url, context)
}
`

export function installCssModuleHook() {
  if (globalThis[CSS_HOOK_KEY]) return
  globalThis[CSS_HOOK_KEY] = true
  register(`data:text/javascript;base64,${Buffer.from(CSS_LOADER_SOURCE, 'utf8').toString('base64')}`)
}

installCssModuleHook()
