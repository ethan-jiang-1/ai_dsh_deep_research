/**
 * pack-rows — 从 bundle/preset patch 里抽宿主运行时行依赖（`name:` 是 @deepseek-ai/* 的行）。
 *
 * 为什么不是 peerDependencies 全量：peerDependencies 混了三类东西——宿主运行时行依赖
 * （preflight 必须从安装锚解析）、client 侧共享模块（由 web shell/模块表提供，Node 里可能
 * 根本没有包）、构建期类型依赖。把后两类当 Node 包全量 require，真用户 home 上会误报缺
 * 17 个 peer（全局 rc.3 的 client-ui-primitives 就不在安装本体里）。
 *
 * 只读盘；tests/pack/pack-rows.test.mjs 直接断言。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @param {string} packDir - pack 根目录（含 cordis.patch.yml / presets/）。
 * @returns {string[]} 去重、排序后的 @deepseek-ai/* 行名。
 */
export function rowPeerNames(packDir) {
  const files = [join(packDir, 'cordis.patch.yml')]
  const presets = join(packDir, 'presets')
  if (existsSync(presets)) {
    for (const name of readdirSync(presets).filter((entry) => entry.endsWith('.patch.yml')).sort()) {
      files.push(join(presets, name))
    }
  }
  const names = new Set()
  for (const file of files) {
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) names.add(match[1])
  }
  return [...names].sort()
}
