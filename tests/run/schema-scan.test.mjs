// schema-scan 断代逻辑反证（RFC 2026-09-29-quality-evidence-loop 验收②）。
// 纯 fs 直调（layering：无子进程）；夹具 mtime 随检出时间漂——断代用 dates 注入，不碰盘上时间。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanAll, scanBundle, epochDateOf, hygieneOf, journalFutureDate, runType } from '../../scripts/lib/schema-scan-core.mjs'

const F = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'schema-scan')
const DATES = {
  'drt-clean-post': '2026-09-29',
  'drt-violating-pre': '2026-09-20',
  'drt-violating-post': '2026-09-29',
  // drt-undated-drift 不注入 → 交付日 null → 从严
}

test('契约期合规 bundle：核心全齐不红', () => {
  const { rows, red } = scanAll([join(F, 'drt-clean-post')], { dates: DATES })
  assert.equal(rows[0].core.length, 0)
  assert.equal(rows[0].era, 'contract')
  assert.equal(red, false)
})

test('契约前违约：如实报告但不计红（交付记录不改历史）', () => {
  const { rows, red } = scanAll([join(F, 'drt-violating-pre')], { dates: DATES })
  assert.ok(rows[0].core.some((c) => c.includes('leads.md')))
  assert.equal(rows[0].era, 'pre-contract')
  assert.equal(rows[0].red, false)
  assert.equal(red, false)
})

test('契约期违约：RED（断代从严是逃逸口反面）', () => {
  const { rows, red } = scanAll([join(F, 'drt-violating-post')], { dates: DATES })
  assert.ok(rows[0].core.some((c) => c.includes('findings.md')))
  assert.equal(rows[0].red, true)
  assert.equal(red, true)
})

test('无日期可断：按契约期从严红 + 位置漂移形态被抓', () => {
  const { rows, red } = scanAll([join(F, 'drt-undated-drift')], { dates: DATES })
  assert.equal(rows[0].era, 'undated')
  assert.ok(rows[0].core.some((c) => c.includes('位置漂移')))
  assert.equal(rows[0].red, true)
  assert.equal(red, true)
})

test('断代翻转：同一违约形态，pre → 不红 / contract → 红（口径不是装饰）', () => {
  const pre = scanAll([join(F, 'drt-violating-post')], { dates: { 'drt-violating-post': '2026-09-20' } })
  const con = scanAll([join(F, 'drt-violating-post')], { dates: { 'drt-violating-post': '2026-09-29' } })
  assert.equal(pre.red, false)
  assert.equal(con.red, true)
})

test('journal 未来日期异常旗（模型时间感不可信——显性化不无视）', () => {
  const last = journalFutureDate(join(F, 'drt-future-journal'), '2026-09-29')
  assert.equal(last, '2026-10-20')
  const { rows } = scanAll([join(F, 'drt-future-journal')], { dates: { 'drt-future-journal': '2026-09-29' }, today: '2026-09-29' })
  assert.equal(rows[0].future, '2026-10-20')
  assert.equal(rows[0].core.length, 0) // 异常旗不计违约（INFO 级）
})

test('toDateStr：本地日期——跨午夜 UTC 滞后窗口不误判"未来"（mcp-hosts run 实录假阳性，UTC now=10-05 时本地 10-06 journal 被误报）', async () => {
  const { toDateStr } = await import('../../scripts/lib/schema-scan-core.mjs')
  assert.equal(toDateStr(new Date('2026-10-06T00:30:00')), '2026-10-06')
  assert.equal(toDateStr(new Date(2026, 9, 5, 23, 59)), '2026-10-05')
})

// ── 编制条件性（RFC 2026-09-29-schema-debt-clearance）──

test('quick_factual 编制豁免：条件件缺席不计违约，journal 记账在场则无 WARN', () => {
  const { rows, red } = scanAll([join(F, 'drt-quickfactual')], { dates: { 'drt-quickfactual': '2026-09-29' } })
  assert.equal(rows[0].core.length, 0)
  assert.equal(rows[0].exempt.length, 2) // leads.md + review.md 双豁免
  assert.equal(rows[0].warn.length, 0)
  assert.equal(red, false)
})

test('quick_factual 但 journal 无补偿把关记账 → WARN（不静默不红，人工核对入口）', () => {
  const { rows, red } = scanAll([join(F, 'drt-quickfactual-silent')], { dates: { 'drt-quickfactual-silent': '2026-09-29' } })
  assert.equal(rows[0].core.length, 0)
  assert.ok(rows[0].warn.length >= 1)
  assert.equal(red, false)
})

test('无类型标记而条件件缺席 → 维持违约（豁免依据必须是 bundle 自带事实，不是名单）', () => {
  const { rows, red } = scanAll([join(F, 'drt-notyped-missing-leads')], { dates: { 'drt-notyped-missing-leads': '2026-09-29' } })
  assert.ok(rows[0].core.some((c) => c.includes('leads.md')))
  assert.equal(rows[0].exempt.length, 0)
  assert.equal(red, true)
})

test('run.md 在场但 contract/phase/next 非法：核心违约（D28）', () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-schema-'))
  try {
    cpSync(join(F, 'drt-clean-post'), dir, { recursive: true })
    writeFileSync(join(dir, 'run.md'), '# Run\n- contract: 2026/10/23\n- phase: nope\n- next:\n')
    const row = scanBundle(dir)
    assert.ok(row.core.some((c) => c.includes('既无 schema 也无合法 contract')))
    assert.ok(row.core.some((c) => c.includes('run.md 的 phase')))
    assert.ok(row.core.some((c) => c.includes('run.md 缺 next')))
  } finally {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-schema-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── 整数契约（schema）：新 run 的断代与日期无关；旧形态读兼容 ──
const mkSchemaRun = (header) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-schema-int-'))
  cpSync(join(F, 'drt-clean-post'), dir, { recursive: true })
  writeFileSync(join(dir, 'run.md'), `# Run\n${header}\n- phase: research\n- next: W1\n`)
  return { base, dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-schema-int-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

test('整数契约：schema 在场即现行契约——不看日期，也不要求 contract', () => {
  const { dir, cleanup } = mkSchemaRun('- schema: 2\n- created: 2026-10-28')
  try {
    const row = scanBundle(dir)
    assert.deepEqual(row.core, [])
    const { rows } = scanAll([dir], { dates: {} })
    assert.equal(rows[0].era, 'contract')
    assert.equal(rows[0].date, '2026-10-28', '显示日期取 created，不落回 mtime')
    assert.equal(rows[0].red, false)
  } finally { cleanup() }
})

test('整数契约：未来 schema 判红（不猜语义，逼升工具）', () => {
  const { dir, cleanup } = mkSchemaRun('- schema: 99')
  try {
    const row = scanBundle(dir)
    assert.ok(row.core.some((c) => c.includes('比本工具')), row.core.join(' | '))
    const { rows } = scanAll([dir], { dates: {} })
    assert.equal(rows[0].red, true)
  } finally { cleanup() }
})

test('整数契约：schema 非法判红；schema 与 contract 全缺判红', () => {
  const bad = mkSchemaRun('- schema: two')
  try {
    assert.ok(scanBundle(bad.dir).core.some((c) => c.includes('schema 非法')))
  } finally { bad.cleanup() }
  const neither = mkSchemaRun('- phase: research')
  try {
    assert.ok(scanBundle(neither.dir).core.some((c) => c.includes('既无 schema 也无合法 contract')))
  } finally { neither.cleanup() }
})

test('整数契约：旧形态（contract 日期）读兼容——既有判定不变', () => {
  const { dir, cleanup } = mkSchemaRun('- contract: 2026-10-23')
  try {
    const row = scanBundle(dir)
    assert.equal(row.core.length, 0, row.core.join(' | '))
    const { rows } = scanAll([dir], { dates: {} })
    assert.equal(rows[0].era, 'contract')
    assert.equal(rows[0].date, '2026-10-23')
  } finally { cleanup() }
})

test('D28 新 run 卫生：绝对路径 / ../drt_ / 跨 bundle [来源:] → 核心违约；旧场不扫', () => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'dsh-hygiene-'))
  try {
    cpSync(join(F, 'drt-clean-post'), dir, { recursive: true })
    writeFileSync(join(dir, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: research\n- next: W1\n')
    writeFileSync(join(dir, 'final.md'), '# F\n/Users/me/secret\n../drt_other/evidence/x.md\n[来源: ../drt_other/evidence/x.md]\n')
    const core = hygieneOf(dir)
    assert.ok(core.some((c) => c.includes('绝对路径')))
    assert.ok(core.some((c) => c.includes('../drt_')))
    assert.ok(core.some((c) => c.includes('跨 bundle [来源:]')))
    // 旧场（无 run.md）不扫
    const old = mkdtempSync(join(base, 'dsh-hygiene-old-'))
    try {
      cpSync(join(F, 'drt-violating-pre'), old, { recursive: true })
      assert.deepEqual(hygieneOf(old), [])
    } finally { rmSync(old, { recursive: true, force: true }) }
  } finally {
    if (dirname(dir) !== base || !basename(dir).startsWith('dsh-hygiene-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  }
});

// ── D28 卫生族：契约声明的「机械禁止」必须有红案例（RFC §7/§11；宪章卡 §10 B1）──
const mkNewRun = (tag) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, `dsh-${tag}-`))
  cpSync(join(F, 'drt-clean-post'), dir, { recursive: true })
  writeFileSync(join(dir, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: research\n- next: W1\n')
  return { base, dir, cleanup: () => {
    if (dirname(dir) !== base || !basename(dir).startsWith(`dsh-${tag}-`)) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  } }
}

test('D28 卫生：绝对路径族（/home、盘符、~/）都算违约，不只 /Users/', () => {
  const { dir, cleanup } = mkNewRun('hyg-path')
  try {
    writeFileSync(join(dir, 'journal.md'), '# J\n/home/me/x\nC:\\Users\\me\\y\n~/z\n')
    const core = hygieneOf(dir)
    assert.ok(core.some((c) => c.includes('绝对路径')), core.join(' | '))
  } finally { cleanup() }
})

test('D28 卫生：bundle 内指令文件 / 可执行脚本 / symlink → 核心违约', () => {
  const { dir, cleanup } = mkNewRun('hyg-entry')
  try {
    writeFileSync(join(dir, 'AGENTS.md'), '# 第二指令通道\n')
    writeFileSync(join(dir, 'helper.sh'), 'echo hi\n')
    symlinkSync(join(dir, 'question.md'), join(dir, 'link.md'))
    const core = hygieneOf(dir)
    assert.ok(core.some((c) => c.includes('指令文件')), core.join(' | '))
    assert.ok(core.some((c) => c.includes('脚本')), core.join(' | '))
    assert.ok(core.some((c) => c.includes('symlink')), core.join(' | '))
  } finally { cleanup() }
})

test('D28 卫生：未登记顶层条目 → 核心违约（RFC §11 顶层白名单）', () => {
  const { dir, cleanup } = mkNewRun('hyg-top')
  try {
    writeFileSync(join(dir, 'notes.txt'), 'x\n')
    assert.ok(hygieneOf(dir).some((c) => c.includes('未登记顶层')), hygieneOf(dir).join(' | '))
  } finally { cleanup() }
})

test('D28 卫生：leads/ 分片必须在 leads.md 登记', () => {
  const { dir, cleanup } = mkNewRun('hyg-leads')
  try {
    mkdirSync(join(dir, 'leads'), { recursive: true })
    writeFileSync(join(dir, 'leads', 'axis-a.md'), '# 分片\n')
    assert.ok(hygieneOf(dir).some((c) => c.includes('未登记分片')), hygieneOf(dir).join(' | '))
    writeFileSync(join(dir, 'leads.md'), '# Leads\n\n- leads/axis-a.md\n')
    assert.equal(hygieneOf(dir).some((c) => c.includes('未登记分片')), false)
  } finally { cleanup() }
})

test('D28 卫生：ops 生成物（audit/node-gate/acceptance）不回踩绝对路径门', () => {
  const { dir, cleanup } = mkNewRun('hyg-ops')
  try {
    writeFileSync(join(dir, 'acceptance.md'), '# Acceptance\n\n| 会话语料根 | `/Users/me/sessions` |\n')
    writeFileSync(join(dir, 'audit.md'), '# Audit\n\n语料根：/Users/me/sessions\n')
    assert.deepEqual(hygieneOf(dir).filter((c) => c.includes('绝对路径')), [])
  } finally { cleanup() }
})

test('D28 phase=delivery 必须落 final/vN 与 review 终局（卡 §10 B1）', () => {
  const { dir, cleanup } = mkNewRun('hyg-delivery')
  try {
    rmSync(join(dir, 'final'), { recursive: true, force: true })
    writeFileSync(join(dir, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: delivery\n- next: present\n')
    const core = scanBundle(dir).core
    assert.ok(core.some((c) => c.includes('phase=delivery')), core.join(' | '))
  } finally { cleanup() }
})

// ── 读者版落点（门C / 可读终稿）──

test('D28 顶层白名单：final/readable-v1.md 合法；run 根 readable-final.md 违约', (t) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'schema-reader-'))
  t.after(() => {
    if (dirname(dir) !== base || !basename(dir).startsWith('schema-reader-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  })
  writeFileSync(join(dir, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: delivery\n- next: none\n')
  mkdirSync(join(dir, 'final'), { recursive: true })
  writeFileSync(join(dir, 'final', 'readable-v1.md'), '# 读者版\n\n> 对应 canonical: final/v1.md\n')
  assert.deepEqual(hygieneOf(dir), [], 'final/ 下的读者版不是顶层白名单对象')

  writeFileSync(join(dir, 'readable-final.md'), '# 读者版（错误落点）\n')
  assert.ok(hygieneOf(dir).some((c) => c.includes('未登记顶层条目 readable-final.md')),
    'run 根放 readable-final.md 必须核心违约（落点是 final/，不是根）')
})

// ── 研究类型解析（门C/编制豁免的共同依据）──

test('runType：优先读 HITL1 字段/节，不被用户原话里的「不是快速事实核查」误判', (t) => {
  const base = realpathSync(tmpdir())
  const dir = mkdtempSync(join(base, 'schema-runtype-'))
  t.after(() => {
    if (dirname(dir) !== base || !basename(dir).startsWith('schema-runtype-')) throw new Error(`refusing cleanup: ${dir}`)
    rmSync(dir, { recursive: true, force: true })
  })
  const write = (text) => writeFileSync(join(dir, 'question.md'), text)

  write('# Q\n- 研究类型: claim_verification（判型命中 P4）\n- 用户原话: "请按主张验证处理，不是快速事实核查"\n')
  assert.equal(runType(dir), 'other', '字段优先：claim_verification 不被引用句误判')

  write('# Q\n## 研究类型\n\nquick_factual（快速事实核查）\n')
  assert.equal(runType(dir), 'quick_factual', '节形态仍认 quick_factual')

  write('# Q\n- 研究类型: **quick_factual**\n')
  assert.equal(runType(dir), 'quick_factual', '强调符不影响字段值')

  write('# Q\n用户原话: "不是快速事实核查"\n')
  assert.equal(runType(dir), 'other', '无字段时否定引用不触发 quick_factual')
})

test('见证下界：schema 形态取 created（不让新 run 丢掉时间下界）', () => {
  const withSchema = mkSchemaRun('- schema: 2\n- created: 2026-10-28')
  try {
    assert.equal(epochDateOf(withSchema.dir), '2026-10-28')
  } finally { withSchema.cleanup() }
  const withContract = mkSchemaRun('- contract: 2026-10-23')
  try {
    assert.equal(epochDateOf(withContract.dir), '2026-10-23')
  } finally { withContract.cleanup() }
  const both = mkSchemaRun('- schema: 2\n- created: 2026-10-28\n- contract: 2026-10-01')
  try {
    assert.equal(epochDateOf(both.dir), '2026-10-01', '旧形态存在时以 contract 为准（读兼容）')
  } finally { both.cleanup() }
  const neither = mkSchemaRun('- phase: research')
  try {
    assert.equal(epochDateOf(neither.dir), '', '两者都没有 = 空串（交门禁判红，不静默给下界）')
  } finally { neither.cleanup() }
})

test('整数契约：低版本不是豁免口（schema: 1 + created 仍判红）', () => {
  const { dir, cleanup } = mkSchemaRun('- schema: 1\n- created: 2026-10-28')
  try {
    const row = scanBundle(dir)
    assert.ok(row.core.some((c) => c.includes('低于本工具')), row.core.join(' | '))
    const { rows } = scanAll([dir], { dates: {} })
    assert.equal(rows[0].era, 'contract', '写 schema 就按现行从严，不给契约前豁免')
    assert.equal(rows[0].red, true)
  } finally { cleanup() }
})

test('整数契约：schema 形态缺 created 判红（bundle 里唯一的人读时间）', () => {
  const { dir, cleanup } = mkSchemaRun('- schema: 2')
  try {
    const row = scanBundle(dir)
    assert.ok(row.core.some((c) => c.includes('缺 created')), row.core.join(' | '))
  } finally { cleanup() }
})
