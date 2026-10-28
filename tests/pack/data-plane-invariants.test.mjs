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

test('README 数据卡形状：10 列（含可移植）、P2 行带保留、凭据标秘密、run.md 标声明', () => {
  const lines = readFileSync(join(PACK, 'README.md'), 'utf8').split('\n')
  const start = lines.findIndex((line) => line.startsWith('| 事实 |'))
  assert.ok(start >= 0, 'README 缺 Data 数据卡表头')
  const header = lines[start].split('|').slice(1, -1).map((cell) => cell.trim())
  assert.deepEqual(header, ['事实', '承诺', '权威', '位置', '作用域', '寿命 / 删除', '谁看得见', '秘密', '卸载后', '可移植'])
  let rows = 0
  for (let i = start + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('|')) break
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    assert.equal(cells.length, 10, `数据卡行不是 10 列：${line.slice(0, 80)}`)
    rows += 1
    const [fact, promise, , , , , visibility, secret, uninstall, portable] = cells
    assert.ok(visibility.length > 0 && secret.length > 0, `${fact} 缺可见性/秘密`)
    if (promise === 'P2') assert.match(uninstall, /保留/, `${fact} 是 P2 但卸载后未写保留`)
    if (fact === '凭据') assert.match(secret, /^是/, '凭据行必须标秘密=是')
    if (fact === 'run.md 状态头') assert.match(cells[1], /声明（非权威）/, 'run.md 必须标声明非权威')
    // 可移植是闭集词表：随 bundle / 随工作区 / 随包 / 随 profile / 仅本机（可带括注）。
    assert.match(portable, /^(随 bundle|随工作区|随包|随 profile|仅本机|回执随 bundle)/, `${fact} 的可移植列不在闭集：${portable}`)
  }
  assert.ok(rows >= 10, `数据卡行数过少（${rows}）——表被截断？`)
})

test('回执三态：手册两处副本都写明 install-only 降级（不可履行不得写成已履行）', () => {
  for (const rel of ['research-workspace/AGENTS.md', 'packages/deep-research-pack/workspace/AGENTS.md']) {
    const text = readFileSync(join(ROOT, rel), 'utf8')
    assert.match(text, /回执三态/, `${rel} 缺回执三态节`)
    assert.match(text, /no machine audit \(install-only\)/, `${rel} 缺 install-only 降级标记`)
    assert.match(text, /绝不声称 `CRITICAL=0`/, `${rel} 缺「不得声称 CRITICAL=0」句`)
  }
})

test('README 数据卡含「谁看得见 / 秘密」列，且 N2 承重依赖已披露', () => {
  const readme = readFileSync(join(PACK, 'README.md'), 'utf8')
  assert.match(readme, /\| 谁看得见 \| 秘密 \|/, '数据卡缺可见性/秘密列')
  assert.match(readme, /N2 实验/, 'N2 实验依赖未披露')
  assert.match(readme, /experimental-client-ui-agent-team/, 'client 侧 N2 peer 未披露')
})
