// template-contract — 模板里“机器/流程真正消费”的键（keyless，key 级）。
//
// 为什么存在：`content-injection` 证模板随包，`content-coverage` 证模板被点名；两者都不证
// 模板内部还有没有解析器/流程要读的键。这里只钉**被代码或流程实际消费**的键，不抄散文节名：
//   - question.md：`- 研究类型:`（runType 的类型判定）+ `## Decisions`（schema-scan 的节点1）；
//   - topics.md：`- must_answer:`（仪表盘解析）+ `- scope_role:`（门 L 的覆盖判据）；
//   - leads.md：状态/支持来源/关键线索/建议 owner（门 L 的四字段）；
//   - findings.md：`## F#:` + `- gap:`（仪表盘解析与 gap 四态）。
// final.md 的六节已由 presets.test（报告首屏）与 reader gate（读者版）钉住，本文件不重复。
//
// 不证明：字段值语义正确、模型真的填写、报告质量（→ L1/L4）。
// 负例留证 2026-11-18：BUG-251 / BUG-252 / BUG-253 / BUG-277——把模板 quality 改成 Z、gap 改成 maybe、
// scope_role 改成 Primary → 本文件值域用例红；还原 → 绿。
// 红配方：删 findings.md 的 `- gap:` 行 → 本文件红；删 leads.md 的 `- 状态:` 行 → 本文件红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateText } from '../template-files-helpers.mjs';
import { EVIDENCE_FIELDS, QUALITY_VALUES, TIER_VALUES } from '../../../checks/lib/gates/evidence-audit-core.mjs';
import { GAP_STATES, LENS_IDS, SCOPE_ROLES } from '../../../checks/lib/gates/findings-core.mjs';
import { PLAN_KINDS, planGate } from '../../../checks/lib/gates/plan-gate.mjs';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 文件 → 被解析器/门禁实际消费的键（命名即申报；新增键先确认有消费者）。 */
const CONTRACTS = {
  'question.md': [
    { pattern: /^-\s*研究类型\s*[:：]/m, why: 'runType 的类型判定与 quick_factual 豁免' },
    { pattern: /^##\s*Decisions/m, why: 'schema-scan 的节点1 / 版本记账' },
  ],
  'topics.md': [
    { pattern: /^-\s*must_answer\s*[:：]\s*$/m, why: '仪表盘 must_answer 解析' },
    { pattern: /^-\s*scope_role\s*[:：]/m, why: '门 L 的 primary/comparison 覆盖判据' },
  ],
  'leads.md': [
    { pattern: /^-\s*状态\s*[:：]/m, why: '门 L 的状态行（建议挖深/已排除）' },
    { pattern: /^-\s*支持来源\s*[:：]/m, why: '门 L 的 A–D 分级判据' },
    { pattern: /^-\s*关键线索\s*[:：]/m, why: '门 L 的关键线索行' },
    { pattern: /^-\s*建议\s*owner\s*[:：]/m, why: '门 L 的 owner/topic 覆盖判据' },
  ],
  'findings.md': [
    { pattern: /^##\s*F\d+\s*[:：]/m, why: '仪表盘 findings 解析' },
    { pattern: /^-\s*gap\s*[:：]\s*\S+/m, why: 'gap 四态与补搜判据' },
    { pattern: /^-\s*lenses\s*[:：]/m, why: 'lens 覆盖解析（findings-core）' },
    { pattern: /^-\s*lens_gaps\s*[:：]/m, why: 'lens 缺口解析（findings-core）' },
  ],
  'evidence-entry.md': EVIDENCE_FIELDS.map((key) => ({ pattern: new RegExp(`^(?:-\\s*)?${key}\\s*[:：]`, 'm'), why: `evidence 八字段审计消费 ${key}` })),
};

for (const [file, contracts] of Object.entries(CONTRACTS)) {
  test(`${file}：解析器/门禁消费的键在场`, () => {
    const text = templateText(file);
    for (const { pattern, why } of contracts) {
      assert.match(text, pattern, `${file} 缺被消费的键（${why}）——模板是 schema 实例，缺键会让门禁/解析器失明`);
    }
  });
}

test('模板值域 = 审计/门禁闭集（BUG-251/252/253）', () => {
  const evidence = templateText('evidence-entry.md');
  const quality = /^(?:-\s*)?quality\s*[:：]\s*(\S+)/m.exec(evidence)?.[1];
  const tier = /^(?:-\s*)?source_tier\s*[:：]\s*(\S+)/m.exec(evidence)?.[1];
  assert.ok(QUALITY_VALUES.includes(quality), `evidence 模板 quality=${quality} 必须在 {${QUALITY_VALUES.join('/')}}`);
  assert.ok(TIER_VALUES.includes(tier), `evidence 模板 source_tier=${tier} 必须在 {${TIER_VALUES.join('/')}}`);

  const findings = templateText('findings.md');
  const gaps = [...findings.matchAll(/^-\s*gap\s*[:：]\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(gaps.length > 0, 'findings 模板必须有 gap 行');
  for (const gap of gaps) assert.ok(GAP_STATES.includes(gap), `findings 模板 gap=${gap} 必须在四态内（注释里的枚举不是消费者）`);

  const topics = templateText('topics.md');
  const roles = [...topics.matchAll(/^-\s*scope_role\s*[:：]\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(roles.length > 0, 'topics 模板必须有 scope_role 行');
  for (const role of roles) assert.ok(SCOPE_ROLES.includes(role), `topics 模板 scope_role=${role} 必须在四值内`);
});

test('LENS_IDS = content/lenses/*.md 的 id 集合（BUG-277 单一正本）', () => {
  const dir = join(fileURLToPath(new URL('../../../packages/deep-research-pack/content/lenses', import.meta.url)));
  const ids = readdirSync(dir).filter((n) => n.endsWith('.md')).map((n) => /^id:\s*(\S+)/m.exec(readFileSync(join(dir, n), 'utf8'))?.[1]).filter(Boolean).sort();
  assert.deepEqual([...LENS_IDS].sort(), ids);
});

// 负例留证 2026-11-28：BUG-465——templates/run/plan.md 注释混写 stage 词 `scan/dive/check` 诱导非法 kind，
// 且 research-planning SKILL 写了不在 PLAN_KINDS 闭集内的 `search`。
// 红配方：把模板第 15 行改回只列 `scan/dive/check` 或在 SKILL.md 留 `search` → 本例红。
test('BUG-465：plan.md 模板与 research-planning skill 的 kind/state 枚举与 plan-gate 双向一致', () => {
  const planTpl = templateText('plan.md');
  for (const kind of PLAN_KINDS) {
    assert.ok(planTpl.includes(kind), `templates/run/plan.md 必须明示合法 kind「${kind}」`);
  }
  assert.match(planTpl, /cross-check\s*→\s*check/, 'templates/run/plan.md 必须明示 check 是派生 stage（由 cross-check 派生），不得误导为 kind');
  assert.match(planTpl, /待派发\/进行中\/完成\/阻塞/, 'templates/run/plan.md 必须明示 ## 剩余工作 四值闭集');

  // 实例化模板（替换尖括号占位与剩余工作 active 行）后必须直接过 planGate
  const instantiated = planTpl
    .replace(/<[^>]+>/g, '示例占位')
    .replace(/\|\s*—\s*\|\s*完成\s*\|/, '| W1.1 | 待派发 |');
  const dir = mkdtempSync(join(tmpdir(), 'plan-tpl-465-'));
  try {
    writeFileSync(join(dir, 'plan.md'), instantiated);
    const r = planGate(dir);
    assert.equal(r.status, 'PASS', `实例化后的 plan.md 模板必须过 planGate：${r.detail}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  // research-planning SKILL.md 的 kind 列表不得含非法值 `search`
  const skillPath = join(fileURLToPath(new URL('../../../packages/deep-research-pack/presets/lead/skills/research-planning/SKILL.md', import.meta.url)));
  const skillText = readFileSync(skillPath, 'utf8');
  const kindLine = /^-\s*`kind`[^\n]*(?:\n\s+[^\n]+)*/m.exec(skillText)?.[0] ?? '';
  assert.ok(kindLine !== '', 'research-planning/SKILL.md 必须含 kind 枚举说明');
  const enumPart = kindLine.split('（')[0];
  const mentioned = [...enumPart.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]).filter((t) => t !== 'kind');
  for (const k of mentioned) {
    assert.ok(PLAN_KINDS.includes(k), `research-planning/SKILL.md 列出的 kind「${k}」不在 PLAN_KINDS（${PLAN_KINDS.join('/')}）`);
  }
  for (const k of PLAN_KINDS) {
    assert.ok(mentioned.includes(k), `research-planning/SKILL.md 漏列合法 kind「${k}」`);
  }
});

// 负例留证 2026-11-28：BUG-486——protocol.json 的 source_scope.families 含 `web`/`local` 但
// content/lenses/ 不存在 web.md/local.md，question-patterns 未显式分隔两套概念致 Lead 读错路径。
// 红配方：删去 question-patterns 对 families（web/local）≠ lenses 的显式分隔说明 → 本例红。
test('BUG-486：question-patterns 显式分隔 source_scope.families（含 web/local）与 8 枚内置 content/lenses/*.md', () => {
  const qpPath = join(fileURLToPath(new URL('../../../packages/deep-research-pack/presets/lead/skills/question-patterns/SKILL.md', import.meta.url)));
  const qpText = readFileSync(qpPath, 'utf8');
  assert.match(qpText, /families.*web.*local|web.*local.*不是\s*lens/i, 'question-patterns 必须显式说明 web/local 属于来源族 families 而非 content/lenses/*.md 透镜文件');
  const lensesDir = join(fileURLToPath(new URL('../../../packages/deep-research-pack/content/lenses', import.meta.url)));
  const diskIds = new Set(readdirSync(lensesDir).filter((n) => n.endsWith('.md')).map((n) => n.replace(/\.md$/, '')));
  assert.equal(diskIds.has('web'), false, 'content/lenses/ 不得假冒存在 web.md');
  assert.equal(diskIds.has('local'), false, 'content/lenses/ 不得假冒存在 local.md');
  // 索引表里列出的每个 lens id 必须在盘上存在对应 .md 文件
  const tableRows = [...qpText.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]);
  assert.ok(tableRows.length === diskIds.size, `question-patterns lens 表行数(${tableRows.length}) 必须等于盘上 lenses 数(${diskIds.size})`);
  for (const id of tableRows) assert.ok(diskIds.has(id), `question-patterns 引用了不存在的 lens 文件：${id}.md`);
});

// 负例留证 2026-11-28：BUG-489——research-brief 未约束 protocol.output.sections 自定义节名须与交付语言 H2 对齐，
// 致中文 full_report 发明只存在于 JSON 的自由英文 slug。
// 红配方：删去 research-brief/SKILL.md 中 output.sections 的 6 内置键 / 交付语言 H2 对齐约束 → 本例红。
test('BUG-489：research-brief 显式约定 protocol.output.sections 仅用 6 内置键或交付语言 H2 节名', () => {
  const rbPath = join(fileURLToPath(new URL('../../../packages/deep-research-pack/presets/lead/skills/research-brief/SKILL.md', import.meta.url)));
  const rbText = readFileSync(rbPath, 'utf8');
  assert.match(rbText, /output\.sections/, 'research-brief 必须显式点名 protocol.output.sections 的填写口径');
  assert.match(rbText, /decision.*options.*criteria.*tradeoffs.*risks.*coverage/, 'research-brief 必须列齐 6 个内置标准键');
  assert.match(rbText, /交付语言.*H2|与.*final.*H2.*对齐/, 'research-brief 必须要求自定义章节直接写交付语言 H2 节名');
});
