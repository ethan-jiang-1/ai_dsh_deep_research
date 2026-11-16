// test-placement.mjs — tests/ 落点闭集（BUG-191 类级，M1 落点补集 / M4 生成器吸收）。
//
// 判据 = **全集 − 已知子集 = 空**：每个测试文件必须住在某个被规则命名过的 home；未知子树、
// 未知深度、根层平铺都红——不是「暂时没人管」。消费者 = verify 门禁 `test-placement`
//（git ls-files tracked 面）+ tests/checks/pack-mirror.test.mjs（盘上全量 spec，防账本重生成
// 把错落点吸收成「当前状态」）。纯函数、零 fs/子进程，负控住 tests/checks/test-placement.test.mjs。
export const TEST_DOMAINS = ['run', 'cockpit', 'pack', 'contracts', 'checks', 'vendor', 'fixtures']
export const RUN_OWNERS = ['channel', 'gates', 'harness', 'ops', 'probes', 'shared']
export const COCKPIT_PARTS = ['lib', 'client', 'shared']
export const COCKPIT_LIB_DOMAINS = ['run', 'plan', 'events', 'method-library', 'review', 'workspace', 'shared']
export const CLIENT_SUBS = ['defaults', 'locales', 'method-library', 'research-config', 'research-graph', 'research-status']
export const PACK_SURFACES = ['contract', 'scripts', 'content', 'startup', 'defaults', 'fetch-fallback']

/** tests/ 下会被默认回归发现的测试文件（fixtures 另属夹具，不在本判据）。 */
export function isTestFile(rel) {
  const norm = rel.split('\\').join('/')
  if (!norm.startsWith('tests/')) return false
  return norm.endsWith('.spec.mjs') || norm.endsWith('.test.mjs')
}

const list = (values) => values.join('/')

/**
 * 返回落点问题（空数组 = 合法）。每个问题都点名失败对象 + 已知闭集 + 修正入口。
 * 只判路径形态；「spec 的依赖 domain 是否与目录同名」「shared 是否真的跨 sub」由拥有
 * import 图的契约测试判（pack-mirror / test-owner-mirror），避免本模块拖入 TS 解析。
 */
export function placementIssues(paths) {
  const issues = []
  for (const rel of paths) {
    const norm = rel.split('\\').join('/')
    if (!isTestFile(norm)) continue
    const seg = norm.split('/')
    if (seg.length === 2) {
      issues.push(`${norm}: tests/ 根不得平铺测试——按域归位（${list(TEST_DOMAINS.filter((d) => d !== 'fixtures'))}）`)
      continue
    }
    const domain = seg[1]
    if (domain === 'fixtures') continue
    if (!TEST_DOMAINS.includes(domain)) {
      issues.push(`${norm}: 未知测试域 ${domain}——已知 = ${list(TEST_DOMAINS.filter((d) => d !== 'fixtures'))}；落点由规则决定`)
      continue
    }
    if (domain === 'checks') {
      if (seg.length !== 3 || !norm.endsWith('.test.mjs')) {
        issues.push(`${norm}: tests/checks 只收平铺 *.test.mjs（门禁自身）——禁止嵌套目录或别的后缀`)
      }
      continue
    }
    if (domain === 'vendor') {
      if (seg.length !== 3 || !norm.endsWith('.vendor.spec.mjs')) {
        issues.push(`${norm}: tests/vendor 只收平铺 *.vendor.spec.mjs（独立 test:vendor 车道）`)
      }
      continue
    }
    if (domain === 'contracts') {
      if (seg.length !== 3 || !norm.endsWith('.spec.mjs')) {
        issues.push(`${norm}: tests/contracts 只收平铺 *.spec.mjs（跨仓产品合同）`)
      }
      continue
    }
    if (domain === 'run') {
      if (!norm.endsWith('.spec.mjs')) {
        issues.push(`${norm}: tests/run 只收 *.spec.mjs（进程内车道）`)
      } else if (seg.length < 4) {
        issues.push(`${norm}: tests/run 下必须再有 owner 目录——已知 = ${list(RUN_OWNERS)}`)
      } else if (seg.length > 4) {
        issues.push(`${norm}: tests/run 未知深度（应为 tests/run/<owner>/<file>；收到 ${seg.length} 段）——按 owner 归位，不建二级目录`)
      } else if (!RUN_OWNERS.includes(seg[2])) {
        issues.push(`${norm}: tests/run 未知 owner ${seg[2]}——已知 = ${list(RUN_OWNERS)}；spec 依赖 owner ∈ {目录, shared}`)
      }
      continue
    }
    if (domain === 'cockpit') {
      if (!norm.endsWith('.spec.mjs')) {
        issues.push(`${norm}: tests/cockpit 只收 *.spec.mjs（进程内车道）`)
        continue
      }
      if (seg.length < 4) {
        issues.push(`${norm}: tests/cockpit 下必须再有落点（${list(COCKPIT_PARTS)}）`)
        continue
      }
      const part = seg[2]
      if (!COCKPIT_PARTS.includes(part)) {
        issues.push(`${norm}: 未知落点（tests/cockpit 首段 = ${part}；已知 = ${list(COCKPIT_PARTS)}）——按 tests/AGENTS 归位`)
        continue
      }
      if (part === 'lib') {
        if (seg.length < 5) {
          issues.push(`${norm}: tests/cockpit/lib 下必须再有 domain（${list(COCKPIT_LIB_DOMAINS)}）`)
        } else if (seg.length > 5) {
          issues.push(`${norm}: tests/cockpit/lib 未知深度（应为 tests/cockpit/lib/<domain>/<file>；收到 ${seg.length} 段）`)
        } else if (!COCKPIT_LIB_DOMAINS.includes(seg[3])) {
          issues.push(`${norm}: tests/cockpit/lib 未知 domain ${seg[3]}——已知 = ${list(COCKPIT_LIB_DOMAINS)}`)
        }
      } else if (part === 'client') {
        if (seg.length > 5) {
          issues.push(`${norm}: tests/cockpit/client 未知深度（应为 client/<file> 或 client/<sub>/<file>；收到 ${seg.length} 段）`)
        } else if (seg.length === 5 && !CLIENT_SUBS.includes(seg[3])) {
          issues.push(`${norm}: 未知 client 子目录 ${seg[3]}——已知 = ${list(CLIENT_SUBS)}；跨 sub 的 spec 住 tests/cockpit/shared/`)
        }
      } else if (part === 'shared') {
        if (seg.length !== 4) {
          issues.push(`${norm}: tests/cockpit/shared 只收平铺 spec（跨 sub 的 client spec；无客户端依赖的归 lib/ 或 checks/）`)
        }
      }
      continue
    }
    if (domain === 'pack') {
      if (!norm.endsWith('.spec.mjs')) {
        issues.push(`${norm}: tests/pack 只收 *.spec.mjs（进程内车道）`)
        continue
      }
      if (seg.length < 4) {
        issues.push(`${norm}: tests/pack 下必须再有 surface（${list(PACK_SURFACES)}）`)
        continue
      }
      if (!PACK_SURFACES.includes(seg[2])) {
        issues.push(`${norm}: 未知落点（tests/pack 首段 = ${seg[2]}；已知 = ${list(PACK_SURFACES)}）——按 tests/AGENTS 归位`)
      } else if (seg.length !== 4) {
        issues.push(`${norm}: tests/pack/${seg[2]}/ 只收平铺 spec——按 surface 归位，不建二级目录`)
      }
    }
  }
  return issues
}
