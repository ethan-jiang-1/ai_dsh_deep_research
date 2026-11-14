// asset-ledger.mjs — 测试资产组合账（S3）：每个 spec/check 一条，domain/claim/oracleType/sunset。
//
// 为什么生成而不是手写：测试资产会增删、头注会漂；手写账必然腐烂。本模块是唯一生成器，
// dev/record-asset-ledger.mjs 写盘，tests/checks/asset-ledger.test.mjs 重算对账（漂移 = 红）。
//
// oracleType 口径（与 guard-ledger 同枚举）：
//   - external：对真实工具/录制 oracle（Markdown/CI）；
//   - structured：对结构化字段/编译器/VM 行为（fix-evidence、guard-ledger、TS、隔离预载）；
//   - canonical：对规范形/源合同（源扫、文案表、状态注记）；
//   - self-referential：例子测试（默认；组合账里显式可见，是下一轮迁移面）。
//   - smoke-only / none：只用于 bug 守卫账，不用于测试资产（spec/check 都是 keyless）。
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const ORACLE_TYPES = ['external', 'structured', 'canonical', 'self-referential']

/** 已显式声明 oracle 的资产；其余默认 self-referential（可见的迁移面）。 */
export const OVERRIDES = {
  'tests/contracts/markdown-mask-conformance.spec.mjs': 'external',
  'tests/checks/ci-workflow-oracle.test.mjs': 'external',
  'tests/checks/fix-evidence.test.mjs': 'structured',
  'tests/checks/staged-change-pairing.test.mjs': 'structured',
  'tests/checks/guard-ledger.test.mjs': 'structured',
  'tests/checks/smoke-imports.test.mjs': 'structured',
  'tests/checks/smoke-identifiers.test.mjs': 'structured',
  'tests/checks/isolation-preload.test.mjs': 'structured',
  'tests/run/replay-request.spec.mjs': 'structured',
  'tests/checks/client-load-same-source.test.mjs': 'canonical',
  'tests/checks/web-ui-nav-bilingual.test.mjs': 'canonical',
  'tests/checks/boot-timer.test.mjs': 'canonical',
  'tests/checks/probe-port-policy.test.mjs': 'canonical',
  'tests/cockpit/state-note.spec.mjs': 'canonical',
}

/** 递归列出默认发现面的测试文件（tests 下的 *.spec.mjs + tests/checks/*.test.mjs；跳过 fixtures/_tmp）。 */
export function listTestFiles(root) {
  const out = []
  const walk = (dir, rel) => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.name === 'fixtures' || entry.name === '_tmp' || entry.name === 'node_modules') continue
      const nextRel = rel === '' ? entry.name : `${rel}/${entry.name}`
      const nextDir = join(dir, entry.name)
      if (entry.isDirectory()) walk(nextDir, nextRel)
      else if (entry.name.endsWith('.spec.mjs') || entry.name.endsWith('.test.mjs')) out.push(`tests/${nextRel}`)
    }
  }
  walk('tests', '')
  return out.sort()
}

/** 资产的一句话 claim：头注首个非「负例留证/夹具留证」的注释行；没有则取首个 test 标题。 */
export function claimOf(source) {
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('//')) {
      const text = trimmed.replace(/^\/\/\s?/, '').trim()
      if (text === '' || /^负例留证|^夹具留证/.test(text)) continue
      return text
    }
    break
  }
  const title = /test\(\s*['"`]([^'"`]+)['"`]/.exec(source)?.[1]
  return title ?? ''
}

export function assetLedgerOf(root, files = listTestFiles(root), overrides = OVERRIDES) {
  return files.map((path) => ({
    path,
    domain: path.split('/')[1] ?? '',
    lane: path.includes('/checks/') ? 'checks' : path.endsWith('.vendor.spec.mjs') ? 'vendor' : 'spec',
    claim: claimOf(readFileSync(join(root, path), 'utf8')),
    oracleType: overrides[path] ?? 'self-referential',
    sunset: '随被测模块删除',
  }))
}
