// 数据面不变量 — 架构承诺的静态守卫（本轮 FAQ 26 对账后显式化）。
// 反证 2026-10-27：往 packages/deep-research-pack/src/index.ts 临时加一行含 `storageDomain`
//   的注释 → 本文件红；删掉/还原 → 绿。README 数据卡列/ N2 披露同理（删列/删 N2 即红）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PACK = join(ROOT, 'packages', 'deep-research-pack')

function walk(dir) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name)
    if (ent.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(full)
  }
  return out
}

test('pack 代码不引入 home 账本/自定义会话事件/浏览器持久化（FAQ 26 的核心承诺）', () => {
  const files = walk(join(PACK, 'src'))
  assert.ok(files.length > 0, '防空语料：src 下没有可检查的源码')
  const forbidden = ['storageDomain', 'appendPluginRecord', 'SessionEventMap', 'localStorage', 'sessionStorage', 'indexedDB']
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const term of forbidden) {
      assert.equal(text.includes(term), false, `${file.replace(ROOT + '/', '')} 出现 ${term}`)
    }
  }
})

test('bundle patch 不声明 storage domain（状态只走工作区文件/DSH 服务）', () => {
  const patch = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
  assert.equal(/storage-domain|storageDomain/.test(patch), false, 'cordis.patch.yml 不应声明 storage domain')
})

test('README 数据卡含「谁看得见 / 秘密」列，且 N2 承重依赖已披露', () => {
  const readme = readFileSync(join(PACK, 'README.md'), 'utf8')
  assert.match(readme, /\| 谁看得见 \| 秘密 \|/, '数据卡缺可见性/秘密列')
  assert.match(readme, /N2 实验/, 'N2 实验依赖未披露')
  assert.match(readme, /experimental-client-ui-agent-team/, 'client 侧 N2 peer 未披露')
})
