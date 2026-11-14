// workspace-parsers.mjs — 从本仓 pnpm-lock.yaml 锁定的 node_modules/.pnpm 存储加载纯函数解析器
// （yaml@2 与 mdast-util-from-markdown@2），供 scripts/lib 与 tests/ 契约验证使用。
//
// 为什么不走裸 createRequire(ROOT)：若根 package.json 未直列某传递包，Node 模块解析会向上穿透到
// 宿主机父目录（如 /Users/<user>/node_modules），本机假绿而 CI ubuntu-latest 必挂。显式锚定在
// ROOT/node_modules/.pnpm 内查找并校验前缀，既遵守发布包零运行时 dependencies 铁律，又保证离线/CI 同源。
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PNPM_STORE = join(ROOT, 'node_modules', '.pnpm')

/**
 * 在本仓锁定的 `.pnpm` 目录内定位包入口绝对路径（严禁越出 ROOT）。
 * @param {RegExp} dirPattern `.pnpm` 子目录匹配正则
 * @param {string} innerPath `node_modules/<pkg>/...` 相对路径
 * @param {string} label 报错可读名
 */
export function resolveLockedParserPath(dirPattern, innerPath, label) {
  if (!existsSync(PNPM_STORE)) {
    throw new Error(`workspace-parsers: 找不到 ${PNPM_STORE}——先执行 pnpm install`)
  }
  const matches = readdirSync(PNPM_STORE).filter((name) => dirPattern.test(name)).sort()
  if (matches.length === 0) {
    throw new Error(`workspace-parsers: 本仓 .pnpm 未锁定 ${label}（${String(dirPattern)}）`)
  }
  const target = resolve(PNPM_STORE, matches[matches.length - 1], innerPath)
  if (!target.startsWith(`${PNPM_STORE}/`) || !existsSync(target)) {
    throw new Error(`workspace-parsers: ${label} 入口缺失或越界：${target}`)
  }
  return target
}

const yamlEntry = resolveLockedParserPath(/^yaml@2\./, 'node_modules/yaml/dist/index.js', 'yaml@2')
const mdastEntry = resolveLockedParserPath(
  /^mdast-util-from-markdown@2\./,
  'node_modules/mdast-util-from-markdown/index.js',
  'mdast-util-from-markdown@2',
)

const yamlMod = await import(pathToFileURL(yamlEntry).href)
const mdastMod = await import(pathToFileURL(mdastEntry).href)

/** 标准 YAML 1.2 解析器（yaml@2）。 */
export const yaml = yamlMod
/** 标准 CommonMark AST 解析器（mdast-util-from-markdown@2）。 */
export const fromMarkdown = mdastMod.fromMarkdown
