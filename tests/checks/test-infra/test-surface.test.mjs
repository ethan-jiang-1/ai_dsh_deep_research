// 覆盖边界（2026-10-28 评分轮 Phase D；同日卫生轮扩到 pack 纯件）。
//
// 为什么需要：`checks/lib` 的模块没有一个机械的覆盖对账，此前的"覆盖"只靠约定（tests/AGENTS 说"文件名为被测
// 模块名"），没有任何机械对账——新增一个 lib 模块不写测试、或删掉测试，都不会有人知道。本测试把
// 覆盖边界钉成可失败的事实：
//   ① 每个 `checks/lib/*.{mjs,cjs}` 要么被至少一个 `*.spec.mjs` 直接 import（= 有直测），
//      要么登记在 `SMOKE_ONLY` 里并给出理由；
//   ② `SMOKE_ONLY` 的键必须在盘上存在（退役模块不删登记 = 红；`.mjs`/`.cjs` 都算）；
//   ③ 防空语料：lib 模块数与测试数都不能少到让断言空转；
//   ④ pack `src/lib/*.ts` 同样每个都被测试直接 import（此前只有"23/23 已覆盖"的散文，
//      新增纯件不写测试不会被发现）。
//
// 判据边界（诚实记账）：本测试只证"有没有直测"，**不证直测的质量**。
//
// 负例留证 2026-10-28：删掉 SMOKE_ONLY 里的 hitl-card-driver → 红，报因逐项列出未覆盖模块
//（cdp-driver, hitl-card-driver, playwright, port-reclaim, web-harness, zstd-read）；还原 → 绿。
// pack 分支负例：临时新增 `src/lib/__probe-untested.ts` → 红并点名该件；删除 → 绿。
// 负例留证 2026-11-16：BUG-196——临时新增无测试 `checks/lib/shared/zz-probe.cjs` → 红并点名，
// 删除 → 绿；`.cjs` 家族的两个既有件各自有归宿（policy 直测 / preload 登记 SMOKE_ONLY）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../../checks/lib/test-infra/keyless-imports.mjs'
import { libModulesOf } from '../../../checks/lib/test-infra/test-index.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const LIB = join(ROOT, 'checks', 'lib')
const PACK_LIB = join(ROOT, 'packages', 'deep-research-pack', 'src', 'lib')

/** 只能由 smoke/probe 或 vm 沙箱行为测试覆盖的模块（keyless 回归禁真实浏览器/子进程/端口，见 layering 五件套）。 */
const SMOKE_ONLY = {
  'harness/playwright': 'chromium 定位与启动（纯件 browser-cache 有直测；launch 本身真浏览器档）',
  'harness/clean-room': '干净室安装矩阵：mkdtemp home + 钉版 dsh + tarball 安装 + 起 web——全是子进程/真宿主，keyless 回归禁；纯判据（engineIssues/moduleLeakOf）只在真入口跑，规则由 229/232/238 的纯函数测试承担',
  'harness/port-reclaim': '端口收割：需要真监听端口与系统进程，回归禁；身份纯判据 port-reclaim-policy 有直测',
  'shared/cdp-driver': 'Playwright/CDP 驱动：只被 smoke/probe 以真浏览器消费，keyless 回归禁浏览器',
  'shared/web-harness': '真 web 启动与 RPC 握手：只在 smoke 档跑，回归禁 spawn/网络',
  'shared/zstd-read': 'zstd CLI 解压：keyless 回归禁 spawn，{ok:false} 分支无直测（消费方测试注入 readLog，不触达解压本身）；失败面证据 = 一次性实测 + 消费方的降级处理',
  'channel/hitl-card-driver': '浏览器内 DOM 片段（getComputedStyle / HTMLTextAreaElement / 事件派发）：只能真浏览器跑；判据面在 ask-drive（有直测）',
  'harness/replay-network-offline': '回放离线闸 preload：静态 import 会武装真实进程，故不直引；node:vm 加载并注入假 dns/net 的行为测试见 tests/run/harness/replay-network-offline.spec.mjs（四种 DNS 形态直测），子进程集成 = snapshot-replay.entry',
}

/** lib 模块全集只在 test-index 的 libModulesOf 一处定义（收 .mjs + .cjs）；本测试复用它，
 *  避免「覆盖合同」与「索引」对同一棵树给出两个集合（BUG-196 的根因半边）。 */
function libModules() {
  return libModulesOf(ROOT).map(({ module }) => module)
}

function testFiles() {
  const out = []
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === 'fixtures' || ent.name === '_tmp' || ent.name === 'node_modules') continue
        walk(p)
      } else if (ent.name.endsWith('.spec.mjs') || ent.name.endsWith('.test.mjs')) out.push(p)
    }
  }
  walk(join(ROOT, 'tests'))
  return out
}

/**
 * 被测试**直接 import** 的 lib 模块集合（真 import 语句，非文本提及）。
 * 2026-11-03 卫生审计 D5-5：旧实现是原文正则——注释里写一句 `checks/lib/foo.mjs` 就算覆盖。
 * 现在用 layering 同款 TS 解析器（`parseKeylessImports`）取 import/re-export/动态 import 的
 * 字面量，再用 `localImportPath` 解析到绝对路径；注释与字符串夹具不再计数。
 */
function coveredByTests(files) {
  const covered = new Set()
  for (const file of files) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const resolved = localImportPath(file, specifier)
      if (resolved === undefined) continue
      const rel = relative(LIB, resolved).split('\\').join('/')
      if (rel.startsWith('..') || !/\.(mjs|cjs)$/.test(rel)) continue
      covered.add(rel.replace(/\.(mjs|cjs)$/, ''))
    }
  }
  return covered
}

test('覆盖边界：每个 checks/lib 模块有直测，或登记为 SMOKE_ONLY 并给出理由（BUG-196）', () => {
  const modules = libModules()
  const files = testFiles()
  assert.ok(modules.length >= 40, `防空语料：checks/lib 模块过少（${modules.length}）`)
  assert.ok(files.length >= 50, `防空语料：测试文件过少（${files.length}）`)
  const covered = coveredByTests(files)
  const uncovered = modules.filter((name) => !covered.has(name))
  const registered = Object.keys(SMOKE_ONLY).sort()
  assert.deepEqual(uncovered.sort(), registered,
    `覆盖缺口与 SMOKE_ONLY 不一致——未覆盖：${uncovered.join(', ') || '（无）'}；登记：${registered.join(', ')}`
    + '；新 lib 模块要么补直测，要么在 SMOKE_ONLY 登记理由（keyless 回归禁浏览器/子进程时）')
  // 登记项必须仍在盘上（退役模块不删登记 = 红；.mjs/.cjs 两种扩展名都算）
  for (const name of registered) {
    assert.ok(existsSync(join(LIB, `${name}.mjs`)) || existsSync(join(LIB, `${name}.cjs`)),
      `SMOKE_ONLY 里的 ${name} 已不存在（.mjs/.cjs 均缺席）——退役时删登记`)
    const reason = SMOKE_ONLY[name]
    assert.ok(typeof reason === 'string' && reason.length >= 10, `${name} 的 SMOKE_ONLY 理由太短（要有"为什么只能 smoke"）`)
  }
})

/** pack 纯件（src/lib/*.ts）被测试直接 import 的集合——同一解析器，路径比 checks/lib 深一层。 */
function coveredPackLib(files) {
  const covered = new Set()
  for (const file of files) {
    const { imports } = parseKeylessImports(readFileSync(file, 'utf8'), file)
    for (const { specifier } of imports) {
      const resolved = localImportPath(file, specifier)
      if (resolved === undefined) continue
      const rel = relative(PACK_LIB, resolved).split('\\').join('/')
      if (rel.startsWith('..') || !rel.endsWith('.ts')) continue
      covered.add(rel.replace(/\.ts$/, ''))
    }
  }
  return covered
}

test('覆盖边界：pack src/lib 每个纯件都被至少一个测试直接 import（新增件不写测试 = 红）', () => {
  const files = testFiles()
  const modules = []
  const collectPackLib = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) collectPackLib(p)
      else if (ent.name.endsWith('.ts')) modules.push(relative(PACK_LIB, p).split('\\').join('/').replace(/\.ts$/, ''))
    }
  }
  collectPackLib(PACK_LIB)
  assert.ok(modules.length >= 20, `防空语料：pack src/lib 模块过少（${modules.length}）`)
  const covered = coveredPackLib(files)
  const uncovered = modules.filter((name) => !covered.has(name)).sort()
  assert.deepEqual(uncovered, [],
    `pack src/lib 未覆盖：${uncovered.join(', ') || '（无）'}——新纯件要在 tests/cockpit 补直测`
    + '（域映射 = tests/AGENTS；浏览器专属模块若确实只能 smoke，需先在本测试登记理由）')
})
