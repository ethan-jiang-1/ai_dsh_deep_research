/**
 * workspace-guard — scaffold 的两条数据隔离边界：
 *   ① 工作区根不能是 HOME/DSH_HOME/pack/profile 本身，也不能是 DSH_HOME/pack 的祖先
 *      （否则种子会写进 home 根或安装树，成为全局 AGENTS 或包内容）；
 *   ② 种子目标的父目录不能经 symlink 指到工作区外（叶子 symlink 由 scaffold 替换，
 *      不写穿——父目录写穿才是漏洞）。
 *
 * 判据用 realpath 比较，不用字符串前缀；tests/pack/workspace-guard.test.mjs 直接断言。
 */
import { existsSync, realpathSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'

/** 解析到真实路径；目标不存在时，解析最深已存在祖先再拼回后缀。 */
function canonical(path) {
  const abs = resolve(path)
  if (existsSync(abs)) {
    try { return realpathSync(abs) } catch { return abs }
  }
  const suffix = []
  let current = abs
  while (!existsSync(current)) {
    const parent = dirname(current)
    if (parent === current) break
    suffix.unshift(basename(current))
    current = parent
  }
  try { return join(realpathSync(current), ...suffix) } catch { return abs }
}

/** target 是否等于 root 或在 root 内。 */
function inside(root, target) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * 检查工作区根是否安全。
 * @param {{ workspace: string, home: string, dshHome: string, packDir: string, profileDir?: string | null }} options
 * @returns {{ workspace: string, warnings: string[] }}
 * @throws {Error} workspace 是 HOME/DSH_HOME/pack/profile 的祖先、本身或内部。
 */
export function assertSafeWorkspace({ workspace, home, dshHome, packDir, profileDir = null } = {}) {
  if (typeof workspace !== 'string' || workspace === '') throw new TypeError('assertSafeWorkspace: workspace 必填')
  const ws = canonical(workspace)
  const homePath = canonical(home)
  const dshPath = canonical(dshHome)
  const packPath = canonical(packDir)
  const profilePath = profileDir === null || profileDir === undefined ? null : canonical(profileDir)

  if (ws === homePath) throw new Error(`工作区不能是 HOME：${ws}（会把 AGENTS.md 铺成所有项目的上级指令）`)
  if (ws === dshPath) throw new Error(`工作区不能是 DSH_HOME：${ws}（AGENTS.md 会变成 user-global 指令）`)
  if (inside(ws, homePath)) throw new Error(`工作区不能是 HOME 的祖先：${ws}（会覆盖 ${homePath} 的上级指令发现面）`)
  if (inside(ws, dshPath)) throw new Error(`工作区不能包含 DSH_HOME：${ws}（DSH_HOME 在 ${dshPath}）`)
  if (inside(ws, packPath)) throw new Error(`工作区不能包含 pack 安装目录：${ws}（pack 在 ${packPath}）`)
  if (inside(packPath, ws)) throw new Error(`工作区不能在 pack 安装目录内：${ws}（pack 在 ${packPath}）`)
  if (profilePath !== null && (inside(profilePath, ws) || inside(ws, profilePath))) {
    throw new Error(`工作区不能与 profile 目录重叠：${ws}（profile 在 ${profilePath}）`)
  }

  const warnings = []
  if (inside(dshPath, ws)) {
    warnings.push(`工作区在 DSH_HOME 内：${ws}（sessions/credentials 与 run 数据同一棵树；不要把整个工作区提交进 git）`)
  }
  return { workspace: ws, warnings }
}

/**
 * 检查一个种子目标的父目录是否仍在工作区内（跟随父目录 symlink 的 realpath）。
 * @param {{ workspace: string, rel: string }} options
 * @returns {{ dest: string, realParent: string, workspace: string }}
 * @throws {Error} rel 越界，或父目录经 symlink 指向工作区外。
 */
export function assertSeedTargetInsideWorkspace({ workspace, rel } = {}) {
  if (typeof workspace !== 'string' || workspace === '') throw new TypeError('assertSeedTargetInsideWorkspace: workspace 必填')
  if (typeof rel !== 'string' || rel === '' || rel.includes('\0')) throw new TypeError('assertSeedTargetInsideWorkspace: rel 必填')
  const realWs = canonical(workspace)
  const base = resolve(workspace)
  const dest = resolve(base, rel)
  if (!inside(base, dest)) throw new Error(`种子目标越界：${rel}（不在工作区 ${workspace} 内）`)
  // 父目录可能尚不存在（dry-run / 首装）：canonical 解析最深已存在祖先再拼回后缀，
  // 不能把“已存在祖先”直接当父目录（否则 workspace 自身会被判成它的上级）。
  const parent = dirname(dest)
  const realParent = canonical(parent)
  if (!inside(realWs, realParent)) {
    throw new Error(`种子目标的父目录经 symlink 指向工作区外：${dest} -> ${realParent}（工作区 ${realWs}）`)
  }
  return { dest, realParent, workspace: realWs }
}
