/**
 * seed-core — 工作区种子的纯函数：哈希、三态分类、清单序列化。
 *
 * 为什么单独成件：scaffold（安装方）与 sync-pack-workspace（生成方）必须用同一套
 * 哈希/分类判据；逻辑留在 CLI 里会让“生成物”和“安装判据”各写一份（第二份必然漂移）。
 * 只依赖 node:crypto，不读盘、不起进程——tests/pack/seed-core.test.mjs 直接断言。
 */
import { createHash } from 'node:crypto'

/** 种子文件的内容哈希（sha256 hex；换行差异也是差异，与 git/发行物口径一致）。 */
export function sha256(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex')
}

/**
 * 单个种子文件相对“上次安装状态”的分类。
 * - missing：目标不存在且没有安装记录；
 * - deleted：有安装记录但目标被删（用户删除，升级不自动重铺）；
 * - current：目标已等于当前种子；
 * - stale：目标仍是上次安装的原样，但种子已更新（可安全升级）；
 * - modified：目标与上次安装不同（用户改过，升级不得覆盖）；
 * - untracked：没有上次安装记录，且目标与当前种子不同（旧工作区/外部创建，保守处理）。
 */
export function classifySeedEntry({ destExists, destHash, stateHash, seedHash }) {
  if (!destExists) return stateHash === undefined || stateHash === null ? 'missing' : 'deleted'
  if (destHash === seedHash) return 'current'
  if (stateHash === undefined || stateHash === null) return 'untracked'
  if (destHash === stateHash) return 'stale'
  return 'modified'
}

/**
 * 计算下一次写盘的状态基线：只记录真正落地/已 current 的种子；用户改过、被删、
 * 或不是我们铺的文件保留旧基线（没有旧基线就不新增），绝不把 untracked 冒充成
 * “已安装的种子”。seed 之外的旧条目（孤儿）保留，让 `--check` 持续看得见。
 * @param {{
 *   seed: { version: string, files: Record<string, string> },
 *   previousFiles?: Record<string, string>,
 *   classifications?: Record<string, string>,
 *   written?: Iterable<string>,
 *   force?: boolean,
 * }} options
 * @returns {{ files: Record<string, string>, skipped: string[] }}
 */
export function nextSeedState({ seed, previousFiles = {}, classifications = {}, written = [], force = false }) {
  if (typeof seed !== 'object' || seed === null || typeof seed.files !== 'object' || seed.files === null) {
    throw new TypeError('nextSeedState: seed 必须是含 files 的对象')
  }
  const writtenSet = new Set(written)
  const files = {}
  for (const [rel, hash] of Object.entries(previousFiles)) {
    if (!Object.hasOwn(seed.files, rel)) files[rel] = hash
  }
  const skipped = []
  for (const rel of Object.keys(seed.files).sort()) {
    const status = classifications[rel]
    const baseline = force || writtenSet.has(rel) || status === 'current'
    if (baseline) files[rel] = seed.files[rel]
    else if (Object.hasOwn(previousFiles, rel)) files[rel] = previousFiles[rel]
    if (!baseline && ['stale', 'modified', 'untracked', 'deleted'].includes(status)) skipped.push(rel)
  }
  const sortedFiles = Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  return { files: sortedFiles, skipped: [...new Set(skipped)].sort() }
}

/** 包内名 → 工作区落地名：npm 不打包 `.gitignore`，种子以 `.gitignore.example` 随包。 */
export function seedSourceRel(destRel) {
  return destRel === '.gitignore' ? '.gitignore.example' : destRel
}

/** 稳定序列化种子清单：版本 + 按路径排序的 sha256；生成物与 `--check` 逐字对账。 */
export function serializeSeedManifest({ version, files }) {
  const sorted = Object.fromEntries(Object.entries(files)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  return `${JSON.stringify({ version, files: sorted }, null, 2)}\n`
}
