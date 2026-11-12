// node-gate-delivery —— 交付相关门：门②/③/④、门A、终局 readiness、D28/读者版边界。
// 反证记录随用例（先红后绿）；路径/审计摘要助手 = node-gate-helpers.mjs。
import test from 'node:test'
import assert from 'node:assert/strict'
import { basename, dirname, join } from 'node:path'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { gateBundle } from '../../scripts/lib/node-gate-core.mjs'
import { decisionsLines } from '../../scripts/lib/node-gate-contracts.mjs'
import { hitl2RowGate } from '../../scripts/lib/node-gate-session-gates.mjs'
import { bundle, sessions, PRE_CONTRACT_DATES, structuredAudit, withCompleteBundle } from './node-gate-helpers.mjs'

const V = (name, date) => gateBundle(bundle(name), undefined, { versionDate: date }).gates.version
const A = (name, date) => gateBundle(bundle(name), undefined, { auditDate: date }).gates.delivery


test('门③反证：final/ 在场而 §Decisions 无 HITL2 拍板行 → RED（G8 形态）', () => {
  const r = gateBundle(bundle('fixture-hitl2-missing'), sessions('s-hitl2-missing'))
  assert.equal(r.gates.hitl2Row.status, 'RED', '版本记账在场却无拍板行，必须红')
  assert.equal(r.gates.present.status, 'PASS', '隔离性：门②不因门③红而连坐')
  assert.equal(r.red, true)
})

test('门②反证：final + readiness PASS 在场而日志无 present、无操作侧标注 → RED', () => {
  const r = gateBundle(bundle('fixture-present-missing'), sessions('s-present-missing'))
  assert.equal(r.gates.present.status, 'RED', '静默缺席必须红')
  assert.equal(r.gates.hitl2Row.status, 'PASS', '隔离性：门③不因门②红而连坐')
  assert.equal(r.red, true)
})

test('合规形态：拍板行 + present 日志 → 双绿', () => {
  const r = gateBundle(bundle('fixture-complete'), sessions('s-complete'))
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.gates.present.status, 'PASS')
  assert.equal(r.red, false)
})

test('通道死恢复路径：操作侧补齐显式记账 → PASS-RELAY 放行带注（显性化不静默）', () => {
  const r = gateBundle(bundle('fixture-relay'), sessions('s-relay'), PRE_CONTRACT_DATES)
  assert.equal(r.gates.present.status, 'PASS-RELAY', '显式记账的操作侧补齐不是违规')
  assert.equal(r.gates.hitl2Row.status, 'PASS')
  assert.equal(r.red, false)
})

test('未到交付段：无 final.md、无 final/ → 双 N/A（无对象显式标注，不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-early'), sessions('s-relay'), PRE_CONTRACT_DATES)
  assert.equal(r.gates.hitl2Row.status, 'N/A')
  assert.equal(r.gates.present.status, 'N/A')
  assert.equal(r.red, false)
})

test('question.md 失踪而 final/ 在场 → fail-loud RED（不静默跳过）', () => {
  const r = gateBundle(bundle('fixture-no-question'), sessions('s-relay'))
  assert.equal(r.gates.hitl2Row.status, 'RED')
  assert.equal(r.red, true)
})

test('decisionsLines：只取 §Decisions 节，遇下一个 ## 停', () => {
  const text = '# Q\n\n## Decisions（append-only，最新在上）\n\n- HITL2 定稿\n- HITL1 定稿\n\n## 背景与动机\n\n- 不该被算进来\n'
  const lines = decisionsLines(text)
  assert.equal(lines.length, 2)
  assert.ok(lines.every((l) => l.includes('HITL')))
})

// ── 门 L（leads 交接门，v2；RFC 2026-09-28-wave0-leads-polish）────────────────
// 断代判据随测试注入日期（夹具 mtime 随检出时间漂，不可作断代依据——同 schema-scan 成例）。

test('门④ 健康：v2 在场 + §Decisions v2 行 + v1.md 索引登记 → PASS', () => {
  const g = V('fixture-version-healthy', '2026-10-04')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门④ 反证：final/v2.md 在场而 §Decisions 无 v2 行（kimi 契约前形态）→ RED', () => {
  const g = V('fixture-version-missing-decision', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /§Decisions/)
})

test('门④ 反证：final/v2.md 在场而 v1.md 索引未登记 → RED', () => {
  const g = V('fixture-version-missing-index', '2026-10-04')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /登记|索引/)
})

test('门④ 无对象：final/ 仅 v1 记账（无扩张 rerun）→ N/A 显式', () => {
  const g = V('fixture-version-v1only', '2026-10-04')
  assert.equal(g.status, 'N/A')
  assert.match(g.detail, /v1|无扩张/)
})

test('门④ 断代：契约前交付日 → PRE-CONTRACT 不计红（kimi 09-26 形态）', () => {
  const g = V('fixture-version-missing-decision', '2026-10-02')
  assert.equal(g.status, 'PRE-CONTRACT')
  // 门A 同步注入契约前日期：本夹具 review FAIL + final/ 记账在场 = 门A A1 交叉形态，
  // 不注入则夹具 mtime 漂移会让 r.red 断言不可复现（断代注入纪律——同 schema-scan 成例）。
  const r = gateBundle(bundle('fixture-version-missing-decision'), undefined, { versionDate: '2026-10-02', auditDate: '2026-10-02' })
  assert.equal(r.red, false, '契约前不计红（run bundle 是交付记录，不改历史）')
})

test('门④ 隔离性：门④ RED 不连坐门③（HITL2 行在场 → 门③ PASS）', () => {
  const r = gateBundle(bundle('fixture-version-missing-decision'), undefined, { versionDate: '2026-10-04' })
  assert.equal(r.gates.version.status, 'RED')
  assert.equal(r.gates.hitl2Row.status, 'PASS', '门③不因门④红而连坐')
})

test('门A反证：交付前置达成（readiness PASS + final.md）而 audit.md 缺席 → RED（7 bundle 实测形态）', () => {
  const g = A('fixture-audit-missing', '2026-10-08')
  assert.equal(g.status, 'RED', '交付判据含审计 CRITICAL=0——audit.md 载体缺席必须红')
  assert.match(g.detail, /audit\.md/)
  assert.match(g.detail, /evidence-audit/)
})

test('门A反证：交付前置达成而 final/v1.md 版本记账缺席 → RED（geometry-coaching 实测形态）', () => {
  const g = A('fixture-audit-missing-v1', '2026-10-08')
  assert.equal(g.status, 'RED', '版本记账是 NODES 第 8 行交付判据之首')
  assert.match(g.detail, /v1\.md/)
})

test('门A交叉反证：final/ 记账在场 × readiness FAIL → RED（交付越过审查前置——NODES 第 6 行）', () => {
  const g = A('fixture-audit-skip-review', '2026-10-08')
  assert.equal(g.status, 'RED', '审查未过而版本已记账 = 绕过审查前置的交付')
  assert.match(g.detail, /readiness 非 PASS/)
  // 隔离性：门②（review 非 PASS → 无对象）不因此连坐
  const r = gateBundle(bundle('fixture-audit-skip-review'), undefined, { auditDate: '2026-10-08' })
  assert.equal(r.gates.present.status, 'N/A', '门② 无对象如实呈现')
})

test('门A附条件形态：readiness PASS（附条件）→ PASS 但带 WARN 注记（显性化不静默，不机械红——HITL2 裁决权威在用户）', () => {
  const g = A('fixture-audit-conditional', '2026-10-08')
  assert.equal(g.status, 'PASS', '附条件是 critic 判断——机械红越权；防的是被读作无条件 PASS')
  assert.match(g.detail, /附条件/, '条件性必须显性化（WARN 注记）')
})

test('门A合规：真实 evidence-audit 摘要 + 空 CRITICAL 章节 → PASS', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), structuredAudit('fixture-complete'))
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  })
})

test('门A反证：有效零 CRITICAL 报告标题属于另一 bundle → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), structuredAudit('another-bundle'))
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /bundle|目录|标识/i)
  })
})

test('门A反证：fixture 微缩 stub 不构成正式操作侧审计 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), '# Audit — fixture\n\nCRITICAL = 0\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /报告格式无效/)
  })
})

test('门A反证：真实报告摘要 CRITICAL 非零 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), structuredAudit('fixture-complete', 2, '- **evidence/a.md** [未溯源] bad URL\n- **evidence/b.md** [未溯源] other URL'))
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /CRITICAL.*2|2.*CRITICAL/)
  })
})

test('门A反证：审计摘要缺少显式 CRITICAL 计数 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), '# Evidence Audit — fixture-complete\n\n## 概要\n\n| 检查 | 结果 |\n|---|---|\n| 发现 | 无发现 |\n\n## CRITICAL（伪造链接 / 溯源断链）\n\n（无）\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /CRITICAL/)
  })
})

test('门A反证：审计摘要与 CRITICAL 章节内容不一致 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), structuredAudit('fixture-complete', 0, '- **evidence/a.md** [未溯源] bad URL'))
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /CRITICAL|审计/)
  })
})

test('门A反证：缺少 CRITICAL 章节的报告 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'audit.md'), '# Evidence Audit — fixture-complete\n\n## 概要\n\n| 检查 | 结果 |\n|---|---|\n| 发现 | CRITICAL 0 · MAJOR 0 · INFO 0 |\n\n## MAJOR\n\n（无）\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /CRITICAL/)
  })
})

test('node-gate 终局 readiness：早期 PASS 后终局 FAIL → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: PASS\n\n第一轮通过。\n\n## readiness: FAIL\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
    assert.match(g.detail, /readiness 非 PASS/)
  })
})

test('node-gate 终局 readiness：早期 FAIL 后终局 PASS → PASS', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n已按意见修订。\n\n## readiness: PASS\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  })
})

test('node-gate 终局 readiness：历史行内 PASS 不取代终局 FAIL → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n历史记录：第一轮曾有 `readiness: PASS`。\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
  })
})

test('node-gate 终局 readiness：PASS 注记说明 prior FAIL 已修复 → PASS', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n## readiness: PASS (prior FAIL fixed)\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  })
})

test('node-gate 终局 readiness：空模板不构成 PASS → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: PASS | FAIL\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
  })
})

test('node-gate 终局 readiness：最终 PASS 的附条件注记仍显性保留', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n## readiness: PASS（条件=先修 M1）\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
    assert.match(g.detail, /附条件 PASS/)
  })
})

// 负例留证 2026-11-13：D51——整行包裹的句子是引用/承诺，不是判定行；判定要独立成行。
// 红配方：把 stripVerdictDecor 的散文前缀放宽加回（2026-10-16 的短标签/标题文字）→ 本例误读成 PASS。
test('node-gate 终局 readiness：整行包裹的引用不构成判定 → 沿用上一行 FAIL', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n**`readiness: PASS` 维持不变，且效力范围已按 `final/final.md` 实体复核完毕。**\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
  })
  // 判定独立成行（手册形态）仍 PASS
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n## readiness（终局）: PASS\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  })
})

test('node-gate 终局 readiness（窄放宽）：承诺句/表格单元仍不夺权 → RED', () => {
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '**readiness: FAIL**（首轮）\n\n**复评判据**：修复后我将重新抓取并给出 `readiness: PASS`。**在此之前行使 veto。**\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
  })
  withCompleteBundle((dir) => {
    writeFileSync(join(dir, 'review.md'), '## readiness: FAIL\n\n| —— **结论** —— | **readiness: PASS** |\n')
    const g = gateBundle(dir, sessions('s-complete'), { auditDate: '2026-10-08' }).gates.delivery
    assert.equal(g.status, 'RED', JSON.stringify(g.detail))
  })
})

test('门A合规：readiness PASS + v1 记账 + audit.md → PASS', () => {
  const g = A('fixture-complete', '2026-10-08')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门A断代：契约前交付日 → 违约如实报告计 PRE-CONTRACT 不计红（存量由对账步处置）', () => {
  const g = A('fixture-audit-missing', '2026-10-07')
  assert.equal(g.status, 'PRE-CONTRACT', 'run bundle 是交付记录，不改历史')
  // r.red 隔离证明用 A1 形态夹具（其余门全 N/A/PASS；门①注入契约前日期后 PRE-CONTRACT）——
  // fixture-audit-missing 会连坐门②（era-free）与门①（无会话），不用于红灯聚合断言。
  const r = gateBundle(bundle('fixture-audit-skip-review'), undefined, { auditDate: '2026-10-07', hitlDate: '2026-10-01' })
  assert.equal(r.gates.delivery.status, 'PRE-CONTRACT')
  assert.equal(r.red, false, 'PRE-CONTRACT 不计入红灯（对账步承接，不机械翻旧账）')
})

test('门A无对象：final.md 缺席 → N/A（bundle 未到交付段，显式标注不静默）', () => {
  const g = A('fixture-early', '2026-10-08')
  assert.equal(g.status, 'N/A')
})

test('门A 豁免形态：quick_factual 无 review.md（编制豁免）而已交付（记账+审计在场）→ PASS 不假红', () => {
  // deepseek-api-pricing 实测形态：quick_factual 编制豁免 review.md（schema-scan CONDITIONAL 同语义），
  // 豁免型缺席不得被 A1 判"交付越过审查"——门不重复裁判豁免已在别处成立的事实。
  const g = A('fixture-audit-quickfactual-delivered', '2026-10-08')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
  assert.match(g.detail, /豁免/)
})

test('门A 豁免反证：非 quick_factual 而记账在场、review.md 缺席 → RED（审查缺席的交付——非豁免形态）', () => {
  // fixture-audit-missing-v1 无 review 但也无记账；此处需要"记账在场 + review 缺席 + 非豁免"形态：
  // 复用 fixture-audit-skip-review 不行（它 review 在场且 FAIL）。构造 = fixture-audit-quickfactual
  // 的镜像——quick_factual 标记剔除即得（本仓 runType 判据 = question.md 类型标记缺席 = other）。
  const g = A('fixture-audit-noreview-delivered', '2026-10-08')
  assert.equal(g.status, 'RED')
  assert.match(g.detail, /review\.md 缺席/)
})

// ── 端到端实测暴露的两处门禁判据缺口（BUG-038/039，2026-10-18）────────────────────────
// 负例留证 2026-10-18：BUG-038（门L 分级判据不容忍 `**A**` 加粗 → 对已分级条目假红）与
//   BUG-039（门③ 不认代理代答 provenance 行；门A 不认「未决项升级到用户裁决」这条既定路径）。
//   红配方（038）：把门L 的分级判据改回 `/[(（]\s*[ABCD]\b/`（不剥强调）→ 本文件 bold-grade 例红。
//   红配方（039）：删掉 isHitl2Mention 的「代理模拟」分支 → 本文件代理行例红；
//     删掉门A 的 escalationNoted/escalationAdjudicated 判据 → escalation 例红。
test('门A升级路径：readiness FAIL + 未决项升级记账 + HITL2 拍板行 → 不判"越过审查前置"（BUG-039）', () => {
  const g = A('fixture-escalation-adjudicated', '2026-10-08');
  assert.notEqual(g.status, 'RED', '按既定处置（未决项升级到用户裁决）走的交付不该被判越过前置');
  assert.doesNotMatch(String(g.detail), /越过审查前置/);
});

// ── 门④ × D28：新 run 的 final/vN 是**不可变交付副本**，跨版本登记不再写进 v1（写进去 = 交付后
// 改交付物）。跨版本事实住 question.md §Decisions；v1 索引判据只对旧 epoch 保留。──
test('门④ D28：新 run 的 v1 是忠实副本（未登记 v2）→ 不因缺索引红；§Decisions 登记即 PASS', () => {
  const g = V('fixture-version-fresh-copy', '2026-10-24')
  assert.equal(g.status, 'PASS', JSON.stringify(g.detail))
})

test('门③ 不把 final/readable.md 当版本记账（读者版工作件不触发交付段）', () => {
  const tempBase = realpathSync(tmpdir())
  const tempRoot = mkdtempSync(join(tempBase, 'node-gate-reader-only-'))
  try {
    const b = join(tempRoot, 'bundle')
    mkdirSync(join(b, 'final'), { recursive: true })
    writeFileSync(join(b, 'run.md'), '# Run\n- contract: 2026-10-23\n- phase: review\n- next: none\n')
    writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n- 2026-10-23 代答声明：后续 HITL2 由代理模拟作答\n')
    writeFileSync(join(b, 'final', 'readable.md'), '# Reader\n')
    const r = hitl2RowGate(b, join(tempRoot, 'sessions'))
    assert.equal(r.gate.status, 'N/A', '只有 readable.md 时门③无对象，不得把读者版当版本记账')
  } finally {
    if (dirname(tempRoot) !== tempBase || !basename(tempRoot).startsWith('node-gate-reader-only-')) throw new Error(`refusing cleanup: ${tempRoot}`)
    rmSync(tempRoot, { recursive: true, force: true })
  }
})
