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

test('pack 代码不引入 home 账本/自定义会话事件；浏览器只允许一个产品提示键', () => {
  const files = walk(join(PACK, 'src'))
  assert.ok(files.length > 0, '防空语料：src 下没有可检查的源码')
  const forbidden = ['storageDomain', 'appendPluginRecord', 'SessionEventMap', 'sessionStorage', 'indexedDB']
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const term of forbidden) {
      assert.equal(text.includes(term), false, `${file.replace(ROOT + '/', '')} 出现 ${term}`)
    }
    if (text.includes('localStorage.')) {
      assert.ok(file.endsWith('/client/index.ts'), `${file.replace(ROOT + '/', '')} 直接调用 localStorage——只允许 client/index.ts 读产品提示键`)
      for (const m of text.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*([A-Za-z_][A-Za-z0-9_]*)/g)) {
        assert.ok(['PRODUCT_WORKSPACE_KEY', 'CURRENT_SESSION_KEY'].includes(m[1]),
          `localStorage 键 ${m[1]} 未登记——产品只允许 PRODUCT_WORKSPACE_KEY / CURRENT_SESSION_KEY 两个提示键`)
      }
    }
  }
})

test('bundle patch 不声明 storage domain（状态只走工作区文件/DSH 服务）', () => {
  const patch = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8')
  assert.equal(/storage-domain|storageDomain/.test(patch), false, 'cordis.patch.yml 不应声明 storage domain')
})

test('README 数据卡形状：91 十字段、profile/设置/方法库保留、凭据只在 DSH、run.md 派生', () => {
  const lines = readFileSync(join(PACK, 'README.md'), 'utf8').split('\n')
  const start = lines.findIndex((line) => line.startsWith('| Fact |'))
  assert.ok(start >= 0, 'README 缺 Data 数据卡表头')
  const header = lines[start].split('|').slice(1, -1).map((cell) => cell.trim())
  assert.deepEqual(header, ['Fact', 'Owner', 'Authority', 'Source', 'Mechanism/path', 'Scope/key', 'Readers', 'Writers', 'Rebuildability', 'Retention/deletion'])
  let rows = 0
  for (let i = start + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('|')) break
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim())
    assert.equal(cells.length, 10, `数据卡行不是 10 列：${line.slice(0, 80)}`)
    rows += 1
    const [fact, owner, authority, source, mechanism, scope, readers, writers, rebuild, retention] = cells
    for (const [name, value] of Object.entries({ owner, authority, source, mechanism, scope, readers, writers, rebuild, retention })) {
      assert.ok(value.length > 0, `${fact} 缺 ${name}`)
    }
    if (fact === 'Deep Research settings (workspace, last session)') assert.match(retention, /package removal keeps it/, `${fact} 卸载后未写保留`)
    if (fact === 'Method library') assert.match(retention, /package removal keeps it/, `${fact} 卸载后未写保留`)
    if (fact === 'Credentials') assert.match(mechanism, /credentials/, '凭据行必须写 DSH credentials 位置')
    if (fact === 'Run state header') assert.match(rebuild, /Derived/, 'run.md 必须标派生')
  }
  assert.ok(rows >= 10, `数据卡行数过少（${rows}）——表被截断？`)
  assert.ok(lines.some((line) => line.startsWith('| Project research defaults |')), '数据卡缺项目研究默认行')
})

test('回执三态：手册两处副本都写明 install-only 降级（不可履行不得写成已履行）', () => {
  for (const rel of ['packages/deep-research-pack/content/manual.md']) {
    const text = readFileSync(join(ROOT, rel), 'utf8')
    assert.match(text, /回执三态/, `${rel} 缺回执三态节`)
    assert.match(text, /no machine audit \(install-only\)/, `${rel} 缺 install-only 降级标记`)
    assert.match(text, /绝不声称 `CRITICAL=0`/, `${rel} 缺「不得声称 CRITICAL=0」句`)
  }
})

test('README 保留 secret/portability 说明，且 N2 承重依赖已披露', () => {
  const readme = readFileSync(join(PACK, 'README.md'), 'utf8')
  assert.match(readme, /Secrets exist only in DSH credentials/, '数据卡缺秘密面说明')
  assert.match(readme, /Run bundles, the method library, and project research defaults travel with the\s+workspace/, '数据卡缺可移植说明')
  assert.match(readme, /N2 experimental/, 'N2 实验依赖未披露')
  assert.match(readme, /experimental-client-ui-agent-team/, 'client 侧 N2 peer 未披露')
})
