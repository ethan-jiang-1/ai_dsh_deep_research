// 覆盖边界（2026-10-28 评分轮 Phase D；同日卫生轮扩到 pack 纯件）。
//
// 为什么需要：`scripts/lib` 里有 54 个模块，此前的"覆盖"只靠约定（tests/AGENTS 说"文件名为被测
// 模块名"），没有任何机械对账——新增一个 lib 模块不写测试、或删掉测试，都不会有人知道。本测试把
// 覆盖边界钉成可失败的事实：
//   ① 每个 `scripts/lib/*.mjs` 要么被至少一个 `*.test.mjs` 直接 import（= 有直测），
//      要么登记在 `SMOKE_ONLY` 里并给出理由；
//   ② `SMOKE_ONLY` 的键必须在盘上存在（退役模块不删登记 = 红）；
//   ③ 防空语料：lib 模块数与测试数都不能少到让断言空转；
//   ④ pack `src/lib/*.ts` 同样每个都被测试直接 import（此前只有"23/23 已覆盖"的散文，
//      新增纯件不写测试不会被发现）。
//
// 判据边界（诚实记账）：本测试只证"有没有直测"，**不证直测的质量**。
//
// 负例留证 2026-10-28：删掉 SMOKE_ONLY 里的 hitl-card-driver → 红，报因逐项列出未覆盖模块
//（cdp-driver, hitl-card-driver, playwright, port-reclaim, web-harness, zstd-read）；还原 → 绿。
// pack 分支负例：临时新增 `src/lib/__probe-untested.ts` → 红并点名该件；删除 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LIB = join(ROOT, 'scripts', 'lib')
const PACK_LIB = join(ROOT, 'packages', 'deep-research-pack', 'src', 'lib')

/** 只可能由 smoke/probe 覆盖的模块（keyless 回归禁浏览器/子进程/端口，见 layering 五件套）。 */
const SMOKE_ONLY = {
  'cdp-driver': 'Playwright/CDP 驱动：只被 smoke/probe 以真浏览器消费，keyless 回归禁浏览器',
  'playwright': 'chromium 定位与启动：同上（真浏览器档专用）',
  'web-harness': '真 web 启动与 RPC 握手：只在 smoke 档跑，回归禁 spawn/网络',
  'zstd-read': 'zstd CLI 解压：子进程解压，keyless 回归禁 spawn；其失败契约由消费方（node-gate / evidence-audit）的测试覆盖',
  'port-reclaim': '端口收割：需要真监听端口与系统进程，回归禁',
  'hitl-card-driver': '浏览器内 DOM 片段（getComputedStyle / HTMLTextAreaElement / 事件派发）：只能真浏览器跑；判据面在 ask-drive（有直测）',
}

function libModules() {
  return readdirSync(LIB).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''))
}

function testFiles() {
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === 'fixtures' || ent.name === '_tmp' || ent.name === 'node_modules') continue
        walk(p)
      } else if (ent.name.endsWith('.test.mjs')) out.push(p)
    }
  }
  walk(join(ROOT, 'tests'))
  return out
}

/** 被测试直接 import 的 lib 模块集合（静态文本扫描，等价于 import 图的一跳）。 */
function coveredByTests(files) {
  const covered = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/['"][^'"]*scripts\/lib\/([\w.-]+)\.mjs['"]/g)) covered.add(m[1])
  }
  return covered
}

test('覆盖边界：每个 scripts/lib 模块有直测，或登记为 SMOKE_ONLY 并给出理由', () => {
  const modules = libModules()
  const files = testFiles()
  assert.ok(modules.length >= 40, `防空语料：scripts/lib 模块过少（${modules.length}）`)
  assert.ok(files.length >= 50, `防空语料：测试文件过少（${files.length}）`)
  const covered = coveredByTests(files)
  const uncovered = modules.filter((name) => !covered.has(name))
  const registered = Object.keys(SMOKE_ONLY).sort()
  assert.deepEqual(uncovered.sort(), registered,
    `覆盖缺口与 SMOKE_ONLY 不一致——未覆盖：${uncovered.join(', ') || '（无）'}；登记：${registered.join(', ')}`
    + '；新 lib 模块要么补直测，要么在 SMOKE_ONLY 登记理由（keyless 回归禁浏览器/子进程时）')
  // 登记项必须仍在盘上（退役模块不删登记 = 红）
  for (const name of registered) {
    assert.ok(existsSync(join(LIB, `${name}.mjs`)), `SMOKE_ONLY 里的 ${name} 已不存在——退役时删登记`)
    const reason = SMOKE_ONLY[name]
    assert.ok(typeof reason === 'string' && reason.length >= 10, `${name} 的 SMOKE_ONLY 理由太短（要有"为什么只能 smoke"）`)
  }
})

/** pack 纯件（src/lib/*.ts）被测试直接 import 的集合——路径比 scripts/lib 深一层。 */
function coveredPackLib(files) {
  const covered = new Set()
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/packages\/deep-research-pack\/src\/lib\/([\w.-]+)\.ts/g)) covered.add(m[1])
  }
  return covered
}

test('覆盖边界：pack src/lib 每个纯件都被至少一个测试直接 import（新增件不写测试 = 红）', () => {
  const files = testFiles()
  const modules = readdirSync(PACK_LIB).filter((f) => f.endsWith('.ts')).map((f) => f.replace(/\.ts$/, ''))
  assert.ok(modules.length >= 20, `防空语料：pack src/lib 模块过少（${modules.length}）`)
  const covered = coveredPackLib(files)
  const uncovered = modules.filter((name) => !covered.has(name)).sort()
  assert.deepEqual(uncovered, [],
    `pack src/lib 未覆盖：${uncovered.join(', ') || '（无）'}——新纯件要在 tests/cockpit 补直测`
    + '（域映射 = tests/AGENTS；浏览器专属模块若确实只能 smoke，需先在本测试登记理由）')
})
