// checks/lib/channel/mirror-sync.mjs —— 漂移恢复快路径的分类判据（BUG-435 修法 A）。
//
// 为什么存在：boot-run 漂移门曾只报红、恢复只有整包重建一条路（≈2–3 min + 换 token），
// 报错文本承诺的"逐文件 cp 同步"无实现。DSH 原生机制（vendor client-hmr node 半，500ms
// stat-poll → clientModules.rebuilt）让 **client 产物**盘上替换即可被运行进程热载——
// 不重启、不换 token。但 host 运行时文件（lib/*.js host 半 / presets / content / yml…）
// 在 boot 时装载并缓存于进程，同步盘上文件不更新加载面——混入 host 漂移必须拒绝快路径。
// 分类判据下沉本模块（纯函数 + 薄 fs 读），bash sync_mirror 与契约测试共用同一份。
//
// 非运行时类（G-20 同原则：不改变页面行为）= README/LICENSE + *.d.ts 类型声明。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isMain } from '../shared/cli-entry.mjs'

/** 非运行时文档文件（漂移只提示，不判红；同步无害）。 */
const DOC_FILES = new Set(['README.md', 'README.zh.md', 'LICENSE'])

/**
 * client 产物在发布集里的相对路径，取自 exports["./client"]（唯一真源，不手写第二份）。
 * @param {string} packDir - pack 源目录（含 package.json）。
 * @returns {string} 归一后的相对路径（如 lib/client.js）。
 * @throws 缺 ./client 导出或形态非法 → fail-loud（不猜路径）。
 */
export function clientArtifactRel(packDir) {
  const pkg = JSON.parse(readFileSync(join(packDir, 'package.json'), 'utf8'))
  const entry = pkg.exports?.['./client']
  const target = typeof entry === 'string' ? entry : entry?.default
  if (typeof target !== 'string' || target === '') {
    throw new Error(`mirror-sync: ${packDir} exports["./client"] 缺席或无 default 字符串——无法定位 client 产物`)
  }
  return target.replace(/^\.\//, '')
}

/**
 * 把漂移文件集分成三桶：client（可热载）/ doc（非运行时）/ host（须重建）。
 * 未知文件默认 host——fail-safe：不认识的不许走快路径。
 * @param {{packDir: string, driftRels: string[]}} input
 * @returns {{client: string[], doc: string[], host: string[]}}
 */
export function classifyDrift({ packDir, driftRels }) {
  const clientRel = clientArtifactRel(packDir)
  /** @type {{client: string[], doc: string[], host: string[]}} */
  const plan = { client: [], doc: [], host: [] }
  for (const rel of driftRels) {
    if (rel === clientRel) plan.client.push(rel)
    else if (DOC_FILES.has(rel) || rel.endsWith('.d.ts')) plan.doc.push(rel)
    else plan.host.push(rel)
  }
  return plan
}

// CLI（bash sync_mirror 消费）：stdin 逐行漂移 rel → stdout 逐行 host 漂移 rel；
// exit 0 = 无 host 漂移（可就地同步），exit 1 = 有 host 漂移（须重建）。
if (isMain(import.meta.url)) {
  const packDir = process.argv[2]
  if (packDir === undefined) { console.error('usage: mirror-sync.mjs <packDir> < drift-rels'); process.exit(2) }
  let text = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => { text += chunk })
  process.stdin.on('end', () => {
    const driftRels = text.split('\n').map((line) => line.trim()).filter(Boolean)
    let plan
    try { plan = classifyDrift({ packDir, driftRels }) } catch (error) {
      console.error(String(error?.message ?? error)); process.exit(2)
    }
    for (const rel of plan.host) console.log(rel)
    process.exit(plan.host.length > 0 ? 1 : 0)
  })
}