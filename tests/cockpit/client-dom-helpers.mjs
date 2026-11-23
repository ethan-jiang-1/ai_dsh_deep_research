// client-dom-helpers.mjs — 驾驶舱 client 组件 / hook JSDOM 测试共享助手（非测试）。
//
// 只放 CSS 模块 stub loader、JSDOM 环境初始化、RTL 重导出、translator 工厂与恶意 RunSource
// 夹具，不放断言（遵守 tests/AGENTS.md 放置规则）。
import { register } from 'node:module'
import { JSDOM } from 'jsdom'

const CSS_HOOK_KEY = Symbol.for('drp.test.cssHookRegistered')
const DOM_INSTANCE_KEY = Symbol.for('drp.test.jsdomInstance')

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

export function installClientDom() {
  installCssModuleHook()
  if (globalThis[DOM_INSTANCE_KEY]) return globalThis[DOM_INSTANCE_KEY]
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  const win = dom.window
  // React 19 act() 需要显式标记非测试运行器环境的 act 支持
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  if (typeof win.HTMLElement.prototype.scrollIntoView !== 'function') {
    win.HTMLElement.prototype.scrollIntoView = () => {}
  }
  if (!win.navigator.clipboard) {
    Object.defineProperty(win.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    })
  }
  const bindings = {
    window: win,
    document: win.document,
    HTMLElement: win.HTMLElement,
    HTMLInputElement: win.HTMLInputElement,
    HTMLTextAreaElement: win.HTMLTextAreaElement,
    HTMLSelectElement: win.HTMLSelectElement,
    HTMLButtonElement: win.HTMLButtonElement,
    HTMLDetailsElement: win.HTMLDetailsElement,
    Node: win.Node,
    Element: win.Element,
    Event: win.Event,
    CustomEvent: win.CustomEvent,
    MouseEvent: win.MouseEvent,
    KeyboardEvent: win.KeyboardEvent,
    MutationObserver: win.MutationObserver,
    navigator: win.navigator,
    getComputedStyle: win.getComputedStyle.bind(win),
  }
  for (const [key, value] of Object.entries(bindings)) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    })
  }
  globalThis[DOM_INSTANCE_KEY] = dom
  return dom
}

// 导入即装备 CSS hook（满足后续 dynamic import 含 primitives .css 的组件）与 JSDOM 全局对象
installClientDom()

export async function loadRtl() {
  installClientDom()
  return await import('@testing-library/react')
}

export const makeTranslator = (table) => (key, params = {}) =>
  String(table[key]).replace(/\{([A-Za-z0-9_]+)\}/g, (all, name) => (name in params ? String(params[name]) : all))

export async function flushMicrotasks(turns = 10) {
  for (let i = 0; i < turns; i += 1) {
    await Promise.resolve()
  }
}

export async function flushUi(act, rounds = 4) {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await flushMicrotasks(10)
    })
  }
}

export function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function listTreeEntries(node) {
  if (!node || typeof node !== 'object') return []
  return Object.entries(node)
    .filter(([, child]) => child !== null && child !== undefined && !(typeof child === 'object' && child.__absent === true))
    .map(([name, child]) => ({
      name,
      type: typeof child === 'object' && child !== null && !child.__leafFault ? 'directory' : 'file',
    }))
}

function walkTreeNode(tree, relPath) {
  if (relPath === '' || relPath === '.') return tree
  let current = tree
  for (const part of relPath.split('/').filter(Boolean)) {
    if (!current || typeof current !== 'object') return undefined
    current = current[part]
  }
  return current
}

/**
 * 恶意 RunSource 工厂：按路径/目录注入正常文本、missing、unreadable、truncated、empty、
 * throw 或受控 deferred（用于会话切换竞态与中止取消验证）。
 */
export function makeMaliciousRunSource(initialSpec = {}) {
  let spec = {
    root: '/ws',
    tree: {},
    fileFaults: {},
    dirFaults: {},
    versions: {},
    deferredPaths: {},
    ...initialSpec,
  }
  const calls = []

  const awaitDeferred = async (path, signal) => {
    const deferred = spec.deferredPaths?.[path]
    if (!deferred) return
    if (signal?.aborted) throw new Error('AbortError')
    await new Promise((resolve, reject) => {
      const onAbort = () => reject(new Error('AbortError'))
      signal?.addEventListener('abort', onAbort, { once: true })
      Promise.resolve(deferred.promise).then(
        () => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        },
        (err) => {
          signal?.removeEventListener('abort', onAbort)
          reject(err)
        },
      )
    })
  }

  const resolveLeaf = (path, opts) => {
    const fault = spec.fileFaults?.[path]
    const node = fault !== undefined ? { __leafFault: true, kind: fault } : walkTreeNode(spec.tree, path)
    if (node === undefined || (typeof node === 'object' && node !== null && node.__absent === true)) {
      return { ok: false, reason: 'missing' }
    }
    if (typeof node === 'object' && node !== null && node.__leafFault) {
      const k = node.kind
      if (k === 'missing') return { ok: false, reason: 'missing' }
      if (k === 'unreadable') return { ok: false, reason: 'unreadable', detail: 'simulated io error' }
      if (k === 'throw') throw new Error(`simulated throw on ${path}`)
      if (k === 'empty') return { ok: true, value: { text: '', lines: 0, eof: true, version: spec.versions?.[path] ?? 'v-empty' } }
      if (k === 'truncated') {
        const limit = opts?.limit ?? 40
        return { ok: true, value: { text: '# truncated\n', lines: limit, eof: false, version: spec.versions?.[path] ?? 'v-trunc' } }
      }
      if (typeof k === 'object' && k !== null && k.kind === 'custom') return k.outcome
    }
    if (typeof node !== 'string') {
      return { ok: false, reason: 'unreadable', detail: 'not a file' }
    }
    const lines = node === '' ? [] : node.split('\n')
    if (node.endsWith('\n')) lines.pop()
    const offset = opts?.offset ?? 1
    const limit = opts?.limit ?? 40
    const slice = lines.slice(offset - 1, offset - 1 + limit)
    return {
      ok: true,
      value: {
        text: slice.join('\n'),
        lines: slice.length,
        eof: offset - 1 + slice.length >= lines.length,
        version: spec.versions?.[path] ?? 'v-1',
      },
    }
  }

  const source = {
    get root() {
      return spec.root
    },
    async list(dir, opts) {
      calls.push(['list', dir])
      await awaitDeferred(dir, opts?.signal)
      if (opts?.signal?.aborted) return { ok: false, reason: 'unreadable', detail: 'aborted' }
      const dirFault = spec.dirFaults?.[dir]
      if (dirFault === 'missing') return { ok: false, reason: 'missing' }
      if (dirFault === 'unreadable') return { ok: false, reason: 'unreadable', detail: 'simulated list error' }
      if (dirFault === 'throw') throw new Error(`simulated list throw on ${dir}`)
      const node = walkTreeNode(spec.tree, dir)
      if (node === undefined) return { ok: false, reason: 'missing' }
      if (typeof node === 'string') return { ok: false, reason: 'unreadable', detail: 'not a directory' }
      return { ok: true, value: listTreeEntries(node) }
    },
    async read(path, opts) {
      calls.push(['read', path, opts])
      await awaitDeferred(path, opts?.signal)
      if (opts?.signal?.aborted) return { ok: false, reason: 'unreadable', detail: 'aborted' }
      return resolveLeaf(path, opts)
    },
    async version(path, opts) {
      calls.push(['version', path])
      await awaitDeferred(path, opts?.signal)
      const fault = spec.fileFaults?.[path]
      if (fault === 'missing') return { ok: false, reason: 'missing' }
      if (fault === 'unreadable') return { ok: false, reason: 'unreadable', detail: 'simulated stat error' }
      if (fault === 'throw') throw new Error(`simulated stat throw on ${path}`)
      const node = walkTreeNode(spec.tree, path)
      if (node === undefined) return { ok: false, reason: 'missing' }
      return { ok: true, value: spec.versions?.[path] ?? 'v-1' }
    },
  }

  return {
    source,
    calls,
    update(patch) {
      spec = {
        ...spec,
        ...patch,
        tree: patch.tree !== undefined ? patch.tree : spec.tree,
        fileFaults: patch.fileFaults !== undefined ? patch.fileFaults : spec.fileFaults,
        dirFaults: patch.dirFaults !== undefined ? patch.dirFaults : spec.dirFaults,
        versions: patch.versions !== undefined ? patch.versions : spec.versions,
        deferredPaths: patch.deferredPaths !== undefined ? patch.deferredPaths : spec.deferredPaths,
      }
    },
  }
}

export const FAULT_KINDS = ['missing', 'unreadable', 'truncated', 'empty', 'headings-only', 'invalid-json', 'conflict']

export function applyArtifactFault({ slug = 'demo', artifact, fault, baseBundle }) {
  const dir = `drt_${slug}`
  const tree = structuredClone(baseBundle)
  const fileFaults = {}
  const dirFaults = {}

  if (artifact === 'bundle') {
    if (fault === 'missing' || fault === 'unreadable') {
      return {
        tree: { ...tree, [dir]: fault === 'missing' ? undefined : {} },
        fileFaults,
        dirFaults: fault === 'missing' ? { [dir]: 'missing' } : { [dir]: 'unreadable' },
      }
    }
    return { tree, fileFaults, dirFaults }
  }

  const targetPath = `${dir}/${artifact}`
  if (fault === 'missing') {
    if (artifact.includes('/')) {
      const [sub, name] = artifact.split('/')
      if (tree[dir]?.[sub]) delete tree[dir][sub][name]
    } else {
      delete tree[dir][artifact]
    }
    fileFaults[targetPath] = 'missing'
  } else if (fault === 'unreadable') {
    if (artifact === 'evidence' || artifact === 'final') dirFaults[targetPath] = 'unreadable'
    else fileFaults[targetPath] = 'unreadable'
  } else if (fault === 'truncated') {
    fileFaults[targetPath] = 'truncated'
  } else if (fault === 'empty') {
    if (artifact === 'evidence') {
      tree[dir].evidence = { 'e1.md': '' }
    } else {
      fileFaults[targetPath] = 'empty'
    }
  } else if (fault === 'headings-only') {
    tree[dir][artifact] = '# Title\n\n## Section A\n\n## Section B\n'
  } else if (fault === 'invalid-json') {
    if (artifact.includes('/')) {
      const [sub, name] = artifact.split('/')
      tree[dir][sub] = { ...(tree[dir][sub] ?? {}), [name]: '{broken json' }
    } else {
      tree[dir][artifact] = '{broken json'
    }
  } else if (fault === 'conflict') {
    tree[dir]['review.md'] = 'readiness: PASS\n'
    tree[dir].review = {
      ...(tree[dir].review ?? {}),
      'readiness.json': JSON.stringify({
        version: 2,
        readiness: 'FAIL',
        conditional: false,
        counts: { critical: 1, major: 0, minor: 0, unverified: 0, rechecked_urls: 0 },
      }),
    }
  }

  return { tree, fileFaults, dirFaults }
}
