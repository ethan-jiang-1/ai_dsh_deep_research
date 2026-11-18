// owner 镜像契约（2026-11-15 test-source-mirror Step 0b；2026-11-18 扩到 checks 车道）：
//  ① tests/run 根不得平铺 spec；每个 spec 住已知 owner 目录；spec 的 lib 依赖 owner ∈ {spec 目录, shared}；
//  ② tests/checks 根不得平铺 test；每个 test 住 checks/lib/<owner>/ 同名目录：
//     单 owner → 该 owner；2+ owner → shared；无 checks/lib 依赖 → repo（仓库级合同）。
//  ③ checks/lib 根不得平铺模块；两车道的 owner 目录都非空（防空语料）。
// 反证：把 spec 移回 tests/run 根 → ①红；把 gates spec 放进 ops → ③红；清空一个 owner 目录 → ⑤红；
// 单 owner spec 藏进 shared → ③红（BUG-205）。
// 负例留证 2026-11-18：BUG-248——在 tests/checks/repo 放 helper 引 channel lib 的 test →
// owner 规则报「住 repo/，但只依赖 channel」；去掉间接追溯则绿（红证回放后删除探针）。
// 负例留证 2026-11-16：BUG-205——在 tests/run/shared 放一个只依赖 checks/lib/gates 的 spec →
// ③ 报「住 shared/，但依赖 gates」；单 owner spec 归位后绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localImportPath, parseKeylessImports } from '../../../checks/lib/test-infra/keyless-imports.mjs'
import { OWNERS } from '../../../checks/lib/test-infra/test-index.mjs'
import { CHECK_OWNERS, placementIssues } from '../../../checks/lib/repo/test-placement.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const RUN = join(ROOT, 'tests', 'run')
const CHECKS = join(ROOT, 'tests', 'checks')
const LIB = join(ROOT, 'checks', 'lib')
const RUN_OWNERS = ['analyze', 'channel', 'gates', 'harness', 'probes', 'shared']

function walk(dir, filter, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, filter, out)
    else if (filter(ent.name)) out.push(p)
  }
  return out
}

/**
 * owner 集 = 直接 lib import ∪ **经本地 helper 递归**得到的 lib import（BUG-248）。
 * helper 指 tests/ 下非测试模块（非 *.spec/*.test）；递归带环防护。只看直接 import 会让
 * 「test → helper → 另一个 owner 的 lib」绕过 owner 规则。
 */
function ownersOf(file, seen = new Set()) {
  if (seen.has(file)) return new Set()
  seen.add(file)
  const owners = new Set()
  const testsRoot = join(ROOT, 'tests')
  for (const { specifier } of parseKeylessImports(readFileSync(file, 'utf8'), file).imports) {
    const target = localImportPath(file, specifier)
    if (target === undefined) continue
    const lr = relative(LIB, target).split('\\').join('/')
    if (!lr.startsWith('..') && /\.(mjs|cjs)$/.test(lr)) { owners.add(lr.split('/')[0]); continue }
    if (target.startsWith(`${testsRoot}/`) && !/\.(spec|test)\.mjs$/.test(target)) {
      for (const owner of ownersOf(target, seen)) owners.add(owner)
    }
  }
  return owners
}

const specs = walk(RUN, (n) => n.endsWith('.spec.mjs'))
const checkTests = walk(CHECKS, (n) => n.endsWith('.test.mjs'))

test('tests/run 根零平铺 spec，且每个 spec 住已知 owner 目录', () => {
  assert.ok(specs.length >= 70, `防空语料：run spec 过少（${specs.length}）`)
  const flat = readdirSync(RUN).filter((n) => n.endsWith('.spec.mjs'))
  assert.deepEqual(flat, [], `tests/run 根仍平铺 spec：${flat.join(', ')}——按 owner 归位`)
  for (const p of specs) {
    const rel = relative(RUN, p).split('\\').join('/')
    const owner = rel.split('/')[0]
    assert.ok(RUN_OWNERS.includes(owner), `${relative(ROOT, p)} 不在已知 owner（${RUN_OWNERS.join('/')}）`)
  }
  assert.deepEqual(placementIssues(specs.map((p) => relative(ROOT, p).split('\\').join('/'))), [],
    'tests/run 出现未知深度（应为 tests/run/<owner>/<file>）——按 owner 归位，不建二级目录')
})

test('spec 的 lib 依赖 owner ∈ {spec 目录, shared}；shared 只收跨切（BUG-205）；根层 lib 零平铺', () => {
  const flatLib = readdirSync(LIB).filter((n) => /\.(mjs|cjs)$/.test(n))
  assert.deepEqual(flatLib, [], `checks/lib 根仍平铺模块：${flatLib.join(', ')}`)
  const libModules = walk(LIB, (n) => /\.(mjs|cjs)$/.test(n))
  assert.ok(libModules.length >= 80, `防空语料：lib 模块过少（${libModules.length}）`)
  for (const m of libModules) {
    const rel = relative(LIB, m).split('\\').join('/')
    assert.ok(OWNERS.includes(rel.split('/')[0]), `${relative(ROOT, m)} 不在已知 owner 目录`)
  }
  for (const p of specs) {
    const rel = relative(RUN, p).split('\\').join('/')
    const dir = rel.split('/')[0]
    const owners = ownersOf(p)
    // 跨切 spec：无 lib 依赖、或只依赖 shared——允许住任一 owner（索引记录实际依赖面）。
    if (owners.size === 0 || (owners.size === 1 && owners.has('shared'))) continue
    if (dir === 'shared') {
      assert.fail(`${relative(ROOT, p)} 住 shared/，但依赖 ${[...owners].sort().join('/')}——shared 只收无 lib 依赖或只依赖 shared 的跨切 spec；单 owner spec 归位到对应 owner 目录`)
    }
    assert.ok(owners.has(dir),
      `${relative(ROOT, p)} 住 ${dir}/，但只依赖 ${[...owners].sort().join('/')}——归位或改登记`)
  }
})

test('六个 run owner 目录都非空（防空语料）', () => {
  for (const owner of RUN_OWNERS) {
    const files = readdirSync(join(RUN, owner)).filter((n) => n.endsWith('.spec.mjs'))
    assert.ok(files.length > 0, `tests/run/${owner}/ 为空——owner 分组失效`)
  }
})

test('tests/checks 根零平铺，按 checks/lib owner 镜像（BUG-248，2026-11-18）', () => {
  assert.ok(checkTests.length >= 40, `防空语料：checks test 过少（${checkTests.length}）`)
  const flat = readdirSync(CHECKS).filter((n) => n.endsWith('.test.mjs'))
  assert.deepEqual(flat, [], `tests/checks 根仍平铺 test：${flat.join(', ')}——按 owner 归位（${CHECK_OWNERS.join('/')}）`)
  assert.deepEqual(placementIssues(checkTests.map((p) => relative(ROOT, p).split('\\').join('/'))), [],
    'tests/checks 出现未知 owner / 未知深度——应为 tests/checks/<owner>/<file>.test.mjs')
  for (const p of checkTests) {
    const rel = relative(CHECKS, p).split('\\').join('/')
    const dir = rel.split('/')[0]
    const owners = ownersOf(p)
    if (owners.size === 0) {
      assert.equal(dir, 'repo', `${relative(ROOT, p)} 无 checks/lib 依赖——仓库级合同归 repo/`)
      continue
    }
    if (owners.size > 1) {
      assert.equal(dir, 'shared', `${relative(ROOT, p)} 依赖 ${[...owners].sort().join('/')}——跨 owner 合同归 shared/`)
      continue
    }
    const owner = [...owners][0]
    assert.equal(dir, owner, `${relative(ROOT, p)} 住 ${dir}/，但只依赖 ${owner}——归位到 ${owner}/ 或改登记`)
  }
  for (const owner of CHECK_OWNERS) {
    const files = readdirSync(join(CHECKS, owner)).filter((n) => n.endsWith('.test.mjs'))
    assert.ok(files.length > 0, `tests/checks/${owner}/ 为空——owner 分组失效（防空语料）`)
  }
})
