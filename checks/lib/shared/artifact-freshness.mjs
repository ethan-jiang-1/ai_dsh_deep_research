// artifact-freshness.mjs — `_dist` 产物是否由当前源/构建生成（BUG-174/181；纯 fs，keyless）。
//
// 为什么存在：lifecycle.entry 只校验 tarball 存在 + 版本号文件名；本机旧 tarball 会被装上并跑
// content/startup/defaults 断言，给出「当前 pack 的装起效果已验证」的错误结论。
//
// BUG-174 先落 mtime 预检；BUG-181 补上文件集：删除/重命名/替换为旧 mtime 的源文件不改变
// 「剩余文件的最大 mtime」，mtime 谓词无法闭环。现在 export-dist 写构建清单（源指纹 + tarball
// 哈希）；消费方优先对清单，清单缺席才退回 mtime（`mode: 'mtime-only'`，显式记账）。
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SKIP = new Set(['node_modules', '.git', '_tmp'])

/** 打包输入根（相对 pack 根）：tarball 的 `files` 面 + 构建产物；缺席的根自动跳过。 */
const PACK_INPUTS = [
  'src', 'lib', 'presets', 'content', 'workers',
  'locale', 'locale-content', 'locale-startup', 'locale-fetch-fallback', 'locale-method-library',
  'scripts', 'package.json', 'cordis.patch.yml', 'README.md', 'README.zh.md', 'LICENSE', 'icon.svg',
]

export function packInputRoots(packDir) {
  return PACK_INPUTS.map((rel) => join(packDir, rel)).filter((path) => existsSync(path))
}

/** tarball 内实际存在的那部分输入根（不含 src；src 经 lib 构建后才进包）。 */
const PACKAGED_INPUTS = PACK_INPUTS.filter((rel) => rel !== 'src')

export function packagedInputRoots(packDir) {
  return PACKAGED_INPUTS.map((rel) => join(packDir, rel)).filter((path) => existsSync(path))
}

/** 当前源在 tarball 内应有条目的相对路径（`package/<rel>`，排序）。 */
export function packagedInputEntries(packDir) {
  const packaged = (rel) => !(rel.endsWith('.js.map')
    || rel.endsWith('.tsbuildinfo')
    || /^lib\/types\/.*\.(?:js|map)$/.test(rel)) // package.json files 的排除面
  return packagedInputRoots(packDir)
    .flatMap((root) => sourceFiles([root])
      .map((file) => relative(packDir, file).split(sep).join('/'))
      .filter(packaged)
      .map((rel) => `package/${rel}`))
    .sort()
}

/** 文件/目录树的最新 mtime（目录本身也算；symlink 不跟随——避免环）。 */
export function newestMtimeIn(roots) {
  let newest = null
  const visit = (path) => {
    const stat = statSync(path)
    if (stat.isSymbolicLink()) return
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) {
        if (SKIP.has(name) || name.endsWith('.tsbuildinfo') || name.endsWith('.map')) continue
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

/** 源文件列表（绝对路径，排序）；symlink 不跟随，node_modules/.git/_tmp 跳过。 */
export function sourceFiles(roots) {
  const out = []
  const visit = (path) => {
    const stat = statSync(path)
    if (stat.isSymbolicLink()) return
    if (stat.isDirectory()) {
      for (const name of readdirSync(path)) {
        if (SKIP.has(name) || name.endsWith('.tsbuildinfo') || name.endsWith('.map')) continue
        visit(join(path, name))
      }
      return
    }
    out.push(path)
  }
  for (const root of roots) {
    try { visit(root) } catch { /* 缺席的根跳过 */ }
  }
  return out.sort()
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

/** 源指纹：排序后的 path + 内容 sha256；删除/新增/替换都改变指纹。 */
export function sourceFingerprint(roots) {
  const files = sourceFiles(roots)
  const rows = files.map((path) => `${path}\0${sha256(readFileSync(path))}`)
  return { hash: sha256(rows.join('\n')), files: files.length }
}

/** export-dist 写构建清单：源指纹 + tarball 哈希（两者任一变化 = 不可复用）。 */
export function writeBuildManifest({ artifact, roots, manifestPath }) {
  const artifactSha256 = sha256(readFileSync(artifact))
  const fingerprint = sourceFingerprint(roots)
  const manifest = {
    version: 1,
    artifactSha256,
    sourceFingerprint: fingerprint.hash,
    sourceFiles: fingerprint.files,
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

/** 清单对账；缺席/坏 JSON/版本未知 → 失败（调用方决定是否退回 mtime）。 */
export function verifyBuildManifest({ artifact, roots, manifestPath }) {
  if (!existsSync(manifestPath)) return { ok: false, reason: 'manifest-missing' }
  let manifest
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { return { ok: false, reason: 'manifest-invalid' } }
  if (manifest?.version !== 1 || typeof manifest.artifactSha256 !== 'string' || typeof manifest.sourceFingerprint !== 'string') {
    return { ok: false, reason: 'manifest-invalid' }
  }
  if (sha256(readFileSync(artifact)) !== manifest.artifactSha256) return { ok: false, reason: 'artifact-changed' }
  const fingerprint = sourceFingerprint(roots)
  if (fingerprint.hash !== manifest.sourceFingerprint) {
    return { ok: false, reason: `source-changed（${String(manifest.sourceFiles)} → ${fingerprint.files} files）` }
  }
  return { ok: true, reason: 'fresh' }
}

const normalizeEntries = (entries) => new Set(entries
  .map((entry) => String(entry).replace(/^package\//, '').replace(/\/$/, ''))
  .filter((entry) => entry !== ''))

/** tarball 内文件集 vs 当前源应有文件集；返回 missing（源有 artifact 无）/ extra（artifact 有源无）。 */
export function artifactFileSetProblems({ artifactEntries, sourceEntries }) {
  const artifact = normalizeEntries(artifactEntries)
  const source = normalizeEntries(sourceEntries)
  return {
    missing: [...source].filter((entry) => !artifact.has(entry)).sort(),
    extra: [...artifact].filter((entry) => !source.has(entry)).sort(),
  }
}

/**
 * 产物新鲜度：有构建清单时对「源指纹 + artifact 哈希」；无清单才退回 mtime 预检。
 * @returns {{fresh:boolean, artifactMtimeMs:number|null, newest:{mtimeMs:number,path:string}|null, mode:'manifest'|'mtime-only', reason:string}}
 */
export function artifactFreshness(artifact, roots, { toleranceMs = 0, manifestPath = null, artifactEntries = null, sourceEntries = null } = {}) {
  let artifactMtimeMs = null
  try { artifactMtimeMs = statSync(artifact).mtimeMs } catch {
    return { fresh: false, artifactMtimeMs: null, newest: null, mode: 'mtime-only', reason: 'artifact-missing' }
  }
  if (manifestPath !== null && existsSync(manifestPath)) {
    const check = verifyBuildManifest({ artifact, roots, manifestPath })
    return {
      fresh: check.ok,
      artifactMtimeMs,
      newest: null,
      mode: 'manifest',
      reason: check.reason,
    }
  }
  // 旧 tarball 没有构建清单：至少比对 tar listing 的文件集（删除/重命名/新增可见），
  // 文件集一致后再用 mtime 做内容新鲜度预检。
  if (Array.isArray(artifactEntries) && Array.isArray(sourceEntries)) {
    const { missing, extra } = artifactFileSetProblems({ artifactEntries, sourceEntries })
    if (missing.length > 0 || extra.length > 0) {
      return {
        fresh: false,
        artifactMtimeMs,
        newest: null,
        mode: 'file-set',
        reason: `artifact 文件集与当前源不一致（缺 ${missing.slice(0, 3).join(', ') || '—'}${missing.length > 3 ? '…' : ''}；多 ${extra.slice(0, 3).join(', ') || '—'}${extra.length > 3 ? '…' : ''}）`,
      }
    }
  }
  const newest = newestMtimeIn(roots)
  if (newest === null) return { fresh: false, artifactMtimeMs, newest: null, mode: 'mtime-only', reason: 'no-sources' }
  const fresh = artifactMtimeMs + toleranceMs >= newest.mtimeMs
  return {
    fresh,
    artifactMtimeMs,
    newest,
    mode: 'mtime-only',
    reason: fresh ? 'fresh' : `artifact 早于 ${newest.path}（${new Date(artifactMtimeMs).toISOString()} < ${new Date(newest.mtimeMs).toISOString()}）`,
  }
}
