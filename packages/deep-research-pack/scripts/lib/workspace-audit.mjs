/**
 * workspace-audit — 把“文件在场”升级成“它是不是我们的种子、可读、未被替换”。
 *
 * preflight 的职责不是数文件，而是判断角色会不会拿到错误手册。只有 scaffold 的
 * seed 清单 + 状态文件能区分 current / stale / modified / untracked；本件把同一套判据
 * 复用到只读审计里，并补上不可读 / symlink / 目录等“在场但不可用”的形态。
 *
 * 关键种子（除 `.gitignore` 外的种子）的 missing/deleted/untracked/special/unreadable
 * 阻断“研究就绪”；modified/stale/orphan/sidecar/版本漂移只警告——用户可能是有意定制，
 * 但 preflight 不能再把它当全绿。
 */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { classifySeedEntry, policyOf, sha256 } from './seed-core.mjs'

/** 非关键种子：只影响 git 入库安全，不改变角色拿到的研究契约。 */
export const NON_CRITICAL_SEEDS = new Set(['.gitignore'])

/**
 * 审计一个工作区。
 * @param {{ workspace: string, seed: { version: string, files: Record<string, string> }, state?: object | null }} options
 * @returns {{
 *   blocking: Array<{rel: string, status: string, critical: boolean}>,
 *   warnings: Array<{rel?: string, status?: string, kind: string, message?: string}>,
 *   findings: Array<{rel: string, status: string, critical: boolean}>,
 *   state: object | null,
 *   version: { state: string | null, seed: string | null },
 *   orphans: string[],
 *   sidecars: string[],
 *   ok: boolean,
 * }}
 */
export function auditWorkspace({ workspace, seed, state } = {}) {
  if (typeof workspace !== 'string' || workspace === '') throw new TypeError('auditWorkspace: workspace 必填')
  if (typeof seed !== 'object' || seed === null || typeof seed.files !== 'object' || seed.files === null) {
    throw new TypeError('auditWorkspace: seed 必须是含 files 的对象')
  }
  let currentState = state
  if (currentState === undefined) {
    try { currentState = JSON.parse(readFileSync(join(workspace, '.dsh-research-seed.json'), 'utf8')) } catch { currentState = null }
  }
  const stateFiles = currentState?.files !== null && typeof currentState?.files === 'object' ? currentState.files : {}
  const adopted = new Set(Array.isArray(currentState?.adopted) ? currentState.adopted : [])

  const findings = []
  const blocking = []
  const warnings = []
  for (const rel of Object.keys(seed.files).sort()) {
    const critical = !NON_CRITICAL_SEEDS.has(rel)
    const policy = policyOf(seed, rel)
    const dest = join(workspace, rel)
    let stat = null
    try { stat = lstatSync(dest) } catch { stat = null }
    if (stat !== null && (stat.isSymbolicLink() || !stat.isFile())) {
      findings.push({ rel, status: 'special', critical, policy })
      ;(critical ? blocking : warnings).push({ rel, status: 'special', critical })
      continue
    }
    let destHash = null
    if (stat !== null) {
      try { destHash = sha256(readFileSync(dest, 'utf8')) } catch {
        findings.push({ rel, status: 'unreadable', critical, policy })
        ;(critical ? blocking : warnings).push({ rel, status: 'unreadable', critical })
        continue
      }
    }
    const stateHash = Object.hasOwn(stateFiles, rel) ? stateFiles[rel] : null
    let status = classifySeedEntry({ destExists: stat !== null, destHash, stateHash, seedHash: seed.files[rel] })
    // 用户显式接受过的文件：seed 后来变了也按 modified（--upgrade 只写 sidecar，不覆盖）。
    if (status === 'stale' && adopted.has(rel) && destHash === stateHash) status = 'modified'
    findings.push({ rel, status, critical, policy })
    if (critical && ['missing', 'deleted', 'untracked'].includes(status)) blocking.push({ rel, status, critical })
    else if (status === 'untracked') warnings.push({ rel, status, critical })
    else if (status === 'stale' || status === 'modified') warnings.push({ rel, status, critical })
  }

  const orphans = Object.keys(stateFiles)
    .filter((rel) => !Object.hasOwn(seed.files, rel) && existsSync(join(workspace, rel)))
    .sort()
  for (const rel of orphans) warnings.push({ rel, status: 'orphan', kind: 'orphan' })

  const sidecars = []
  for (const rel of Object.keys(seed.files)) {
    const dir = dirname(join(workspace, rel))
    const base = basename(rel)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(`${base}.seed-new`)) sidecars.push(join(dir, entry))
    }
  }
  for (const path of sidecars) warnings.push({ rel: path.slice(workspace.length + 1), kind: 'sidecar', status: 'sidecar' })

  if (!existsSync(join(workspace, 'method-library.md'))) {
    warnings.push({ rel: 'method-library.md', kind: 'method-library-missing', status: 'missing' })
  }

  const stateVersion = typeof currentState?.version === 'string' ? currentState.version : null
  if (currentState === null) warnings.push({ kind: 'state-missing', status: 'missing', message: '没有 .dsh-research-seed.json；无法区分用户文件与种子' })
  else if (stateVersion !== seed.version) warnings.push({ kind: 'version-mismatch', status: 'stale', message: `工作区记录 v${stateVersion ?? '未知'}；pack 种子 v${seed.version}` })

  return {
    blocking, warnings, findings,
    state: currentState,
    version: { state: stateVersion, seed: typeof seed.version === 'string' ? seed.version : null },
    orphans, sidecars,
    ok: blocking.length === 0,
  }
}
