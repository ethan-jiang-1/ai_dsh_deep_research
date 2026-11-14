// smoke-assets.mjs — `scripts/smoke` 的盘上枚举（BUG-176；纯 fs，keyless）。
//
// 为什么存在：registry / oracle / cost 三个消费者各写一份 `readdirSync(SMOKE)`；顶层目录被
// 当噪声跳过、symlink 在 `Dirent.isFile()/isDirectory()` 下既不是文件也不是目录——两者都能
// 让一个 smoke 资产「存在但永不登记、永不运行」（BUG-162 的邻接面）。本模块把分类收成一处：
// 普通文件 / 目录 / symlink / 其它，由消费者显式判红；不再用「filter .mjs」把异常形态静默滤掉。
import { lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** 分类一个目录的顶层项（不跟随 symlink；lstat 才能看见链接本身）。 */
export function inspectSmokeDir(dir) {
  const files = []
  const dirs = []
  const symlinks = []
  const others = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, ent.name)
    const stat = lstatSync(path)
    if (stat.isSymbolicLink()) symlinks.push(ent.name)
    else if (stat.isDirectory()) dirs.push(ent.name)
    else if (stat.isFile()) files.push(ent.name)
    else others.push(ent.name)
  }
  return {
    files: files.sort(),
    dirs: dirs.sort(),
    symlinks: symlinks.sort(),
    others: others.sort(),
  }
}

/** smoke 文件集（顶层普通文件 + `.mjs` 后缀）；异常形态不在返回值里——调用方必须同时查 issues。 */
export function smokeFiles(dir) {
  return inspectSmokeDir(dir).files.filter((name) => name.endsWith('.mjs'))
}

/** 扁平合同的违规项（目录 / symlink / 其它）；空数组 = 合同成立。 */
export function smokeSurfaceIssues(dir) {
  const { dirs, symlinks, others } = inspectSmokeDir(dir)
  return [
    ...dirs.map((name) => `子目录 ${name}/`),
    ...symlinks.map((name) => `符号链接 ${name}`),
    ...others.map((name) => `非普通文件 ${name}`),
  ]
}
