// artifact-freshness.mjs — `_dist` 产物是否由当前源/构建生成（BUG-174；纯 fs 谓词，keyless）。
//
// 为什么存在：lifecycle.entry 只校验 tarball 存在 + 版本号文件名；本机旧 tarball 会被装上并跑
// content/startup/defaults 断言，给出「当前 pack 的装起效果已验证」的错误结论。新鲜度 = 产物
// mtime 不早于任何被它打包的源/构建文件。CI 先 export-dist，故不受影响；本地入口用它 fail-loud
// 成 exit 2（未跑 ≠ 通过），而不是静默验证旧产物。
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SKIP = new Set(['node_modules', '.git', '_tmp'])

/** 文件/目录树的最新 mtime（目录本身也算；symlink 不跟随——避免环）。 */
export function newestMtimeIn(roots) {
  let newest = null
  const visit = (path) => {
    const stat = statSync(path)
    if (stat.isSymbolicLink()) return
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) {
        if (SKIP.has(name)) continue
        visit(join(path, name))
      }
      return
    }
    if (newest === null || stat.mtimeMs > newest.mtimeMs) newest = { mtimeMs: stat.mtimeMs, path }
  }
  for (const root of roots) {
    try { visit(root) } catch { /* 缺席的根跳过；由调用方决定是否 fail-closed */ }
  }
  return newest
}

/**
 * 产物新鲜度：artifact.mtimeMs >= 所有 roots 的最新 mtime。
 * @returns {{fresh:boolean, artifactMtimeMs:number|null, newest:{mtimeMs:number,path:string}|null, reason:string}}
 *          artifact 缺席 = fresh:false；没有任何源 = fresh:false（fail-closed）。
 */
export function artifactFreshness(artifact, roots, { toleranceMs = 0 } = {}) {
  let artifactMtimeMs = null
  try { artifactMtimeMs = statSync(artifact).mtimeMs } catch {
    return { fresh: false, artifactMtimeMs: null, newest: null, reason: 'artifact-missing' }
  }
  const newest = newestMtimeIn(roots)
  if (newest === null) return { fresh: false, artifactMtimeMs, newest: null, reason: 'no-sources' }
  const fresh = artifactMtimeMs + toleranceMs >= newest.mtimeMs
  return {
    fresh,
    artifactMtimeMs,
    newest,
    reason: fresh ? 'fresh' : `artifact 早于 ${newest.path}（${new Date(artifactMtimeMs).toISOString()} < ${new Date(newest.mtimeMs).toISOString()}）`,
  }
}
