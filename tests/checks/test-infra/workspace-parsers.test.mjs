// workspace-parsers 契约——外部解析器必须锁定在本仓 node_modules/.pnpm 内，严禁穿透宿主机父目录。
//
// 反证：把 resolveLockedParserPath 的 startsWith(PNPM_STORE) 校验删掉 → `../../package.json` 越界例不抛错即红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromMarkdown, resolveLockedParserPath, yaml } from '../../../checks/lib/test-infra/workspace-parsers.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('workspace-parsers：yaml@2 与 mdast-util-from-markdown@2 均锚定在本仓 node_modules/.pnpm 内', () => {
  const pnpmPrefix = join(ROOT, 'node_modules', '.pnpm') + '/'
  const yamlPath = resolveLockedParserPath(/^yaml@2\./, 'node_modules/yaml/dist/index.js', 'yaml@2')
  const mdastPath = resolveLockedParserPath(
    /^mdast-util-from-markdown@2\./,
    'node_modules/mdast-util-from-markdown/index.js',
    'mdast-util-from-markdown@2',
  )
  assert.ok(yamlPath.startsWith(pnpmPrefix), `yaml 路径必须在本仓 .pnpm 内：${yamlPath}`)
  assert.ok(mdastPath.startsWith(pnpmPrefix), `mdast 路径必须在本仓 .pnpm 内：${mdastPath}`)
  assert.equal(typeof yaml.parseDocument, 'function')
  assert.equal(typeof fromMarkdown, 'function')
})

test('workspace-parsers：未锁定包或路径越界 fail-loud 抛错', () => {
  assert.throws(
    () => resolveLockedParserPath(/^__nonexistent_pkg__@99\./, 'index.js', 'missing'),
    /未锁定/,
  )
  assert.throws(
    () => resolveLockedParserPath(/^yaml@2\./, '../../package.json', 'escape'),
    /缺失或越界/,
  )
})
