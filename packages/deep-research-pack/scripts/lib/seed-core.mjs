/**
 * seed-core — 工作区种子的纯函数：哈希、三态分类、清单序列化。
 *
 * 为什么单独成件：scaffold（安装方）与 sync-pack-workspace（生成方）必须用同一套
 * 哈希/分类判据；逻辑留在 CLI 里会让“生成物”和“安装判据”各写一份（第二份必然漂移）。
 * 只依赖 node:crypto，不读盘、不起进程——tests/pack/seed-core.test.mjs 直接断言。
 */
import { createHash } from 'node:crypto'

/** 工作区种子状态文件的 schema 版本（不是种子内容版本；内容版本 = pack 版本）。 */
export const SEED_STATE_SCHEMA = 1

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
  return { schemaVersion: SEED_STATE_SCHEMA, files: sortedFiles, skipped: [...new Set(skipped)].sort() }
}

/**
 * 解析工作区种子状态（`.dsh-research-seed.json`）。
 * - 缺省 → state:null（旧工作区合法）；
 * - 旧态无 `schemaVersion` → 按 0 读、同形前移（upgraded:true），下次写入即新口径；
 * - 比当前新 → ok:false/newer-schema（不猜、不覆盖，交用户升级 scaffold）；
 * - 坏 JSON/形状 → ok:false/corrupt（fail loud，不静默当无状态）。
 * @param {string|null|undefined} text 状态文件原文。
 * @returns {{ok:boolean, state?:object|null, schemaVersion?:number, upgraded?:boolean, reason?:string}}
 */
export function parseSeedState(text) {
  if (text === null || text === undefined || text === '') {
    return { ok: true, state: null, schemaVersion: 0, upgraded: false }
  }
  let raw
  try { raw = JSON.parse(text) } catch { return { ok: false, reason: 'corrupt' } }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'corrupt' }
  const declared = raw.schemaVersion
  if (declared !== undefined && (!Number.isSafeInteger(declared) || declared < 0)) return { ok: false, reason: 'corrupt' }
  const schemaVersion = declared ?? 0
  if (schemaVersion > SEED_STATE_SCHEMA) return { ok: false, reason: 'newer-schema', schemaVersion }
  // 形状校验：可解析但形状错的 state 比坏 JSON 更危险（下游会把它当空的/半可信的基线）。
  if (raw.files !== undefined && (raw.files === null || typeof raw.files !== 'object' || Array.isArray(raw.files))) {
    return { ok: false, reason: 'corrupt' }
  }
  if (raw.files !== undefined) {
    for (const [rel, hash] of Object.entries(raw.files)) {
      if (typeof rel !== 'string' || typeof hash !== 'string') return { ok: false, reason: 'corrupt' }
    }
  }
  for (const field of ['skipped', 'adopted']) {
    if (raw[field] !== undefined && (!Array.isArray(raw[field]) || raw[field].some((value) => typeof value !== 'string'))) {
      return { ok: false, reason: 'corrupt' }
    }
  }
  if (raw.version !== undefined && typeof raw.version !== 'string') return { ok: false, reason: 'corrupt' }
  const state = { ...raw, schemaVersion: SEED_STATE_SCHEMA }
  return { ok: true, state, schemaVersion, upgraded: schemaVersion < SEED_STATE_SCHEMA }
}

/**
 * 清理计划（纯函数）：只处理状态账本里的**孤儿**与失效记录，不碰当前种子。
 * - 孤儿且盘上哈希 = 基线 → 删（未改过）；
 * - 孤儿但被改过 → 保留（用户资产）；
 * - 记录存在而文件已不在 → 清账；
 * - 种子文件本身（含用户删掉的 deleted 态）永不删除、永不清账。
 * @param {{seed:{files:Record<string,string>}, state:object|null, entries:Record<string,{exists:boolean,hash:string|null}>}} options
 * @returns {{remove:Array<{rel:string,reason:string}>, keep:Array<{rel:string,reason:string}>, dropFromState:string[]}}
 */
export function planSeedCleanup({ seed, state, entries }) {
  const seedFiles = seed?.files ?? {}
  const stateFiles = state?.files ?? {}
  const remove = []
  const keep = []
  const drop = new Set()
  for (const [rel, stateHash] of Object.entries(stateFiles)) {
    if (Object.hasOwn(seedFiles, rel)) continue
    const entry = entries?.[rel] ?? { exists: false, hash: null }
    if (!entry.exists) { drop.add(rel); continue }
    if (entry.hash === stateHash) remove.push({ rel, reason: 'orphan-unmodified' })
    else keep.push({ rel, reason: 'orphan-modified' })
  }
  for (const rel of Array.isArray(state?.adopted) ? state.adopted : []) {
    if (Object.hasOwn(seedFiles, rel)) continue
    const entry = entries?.[rel] ?? { exists: false, hash: null }
    if (!entry.exists) drop.add(rel)
  }
  return { remove, keep, dropFromState: [...drop].sort() }
}

/** 包内名 → 工作区落地名：npm 不打包 `.gitignore`，种子以 `.gitignore.example` 随包。 */
export function seedSourceRel(destRel) {
  return destRel === '.gitignore' ? '.gitignore.example' : destRel
}

/** 种子所有权三态（FAQ 24 的「谁拥有」落到种子层）：
 *  - `contract`：跟包版本的契约（手册 / 节点 I/O / 模板）——偏离包版本 = 契约漂移；
 *  - `corpus`：可生长的语料底本（判型模式库）——包只给起点，允许并预期分叉；
 *  - `user`：用户数据（`.gitignore`）——任何模式不覆盖。
 *  缺省 = `contract`（旧 seed.json 无 policy 字段时读兼容）。 */
export const SEED_POLICIES = ['contract', 'corpus', 'user']

/** 取某个种子的所有权；未知/缺席按 `contract`（保守：宁可多报契约漂移，不静默当用户数据）。 */
export function policyOf(seed, rel) {
  const value = seed?.policy?.[rel]
  return SEED_POLICIES.includes(value) ? value : 'contract'
}

/** 稳定序列化种子清单：版本 + 所有权 + 按路径排序的 sha256；生成物与 `--check` 逐字对账。 */
export function serializeSeedManifest({ version, files, policy = {} }) {
  const byPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
  for (const [rel, value] of Object.entries(policy)) {
    if (!Object.hasOwn(files, rel)) throw new TypeError(`serializeSeedManifest: policy 指向未知种子 ${rel}`)
    if (!SEED_POLICIES.includes(value)) throw new TypeError(`serializeSeedManifest: ${rel} 的 policy 非法（${value}）——闭集 = ${SEED_POLICIES.join('|')}`)
  }
  const sorted = Object.fromEntries(Object.entries(files).sort(([a], [b]) => byPath(a, b)))
  const policies = Object.fromEntries(Object.entries(policy).sort(([a], [b]) => byPath(a, b)))
  return `${JSON.stringify({ version, policy: policies, files: sorted }, null, 2)}\n`
}
