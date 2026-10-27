// 评估合同在位性 — docs/evaluation.md 是本仓验收合同（先于框架定案），
// 回归层断言它存在且五个评估面齐全，防止评估标准被静默删改。
// 负例留证 2026-10-28：把 evaluation.md 的「L4 交付面」标题改成「L4 面（改名探针）」→
//   `评估面缺失: L4 交付面` 红；还原 → 绿。（首次尝试只改标题后缀，断言用 includes 照旧命中，
//   说明"探针必须打到判据本身"——改名整体替换才真的红。）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVAL = join(ROOT, 'docs', 'evaluation.md');

test('评估合同存在且五面齐全', () => {
  assert.ok(existsSync(EVAL), 'docs/evaluation.md 不存在');
  const text = readFileSync(EVAL, 'utf8');
  for (const face of ['L0 结构面', 'L1 挂载面', 'L2 安装面', 'L3 领域面', 'L4 交付面']) {
    assert.ok(text.includes(face), `评估面缺失: ${face}`);
  }
  // 负面判据与判定程序——ongoing goal 可判定的机制锚点
  assert.ok(text.includes('负面判据'), '负面判据节缺失');
  assert.ok(text.includes('goal 标 `complete` 的唯一条件'), 'goal 判定程序缺失');
});

// 五面的"可执行性"契约（2026-10-28 评分轮 Phase A）：验收合同里每一面都必须能被跑/被走查，
// 而不是只有 L0 有剧本。负例留证 2026-10-28：把 L4 表的「人工走查」改成「人工检查」→ 本例红
//（判据类型词汇不在场 = 该面退回散文）；还原 → 绿。
test('五面可执行性：统一退出语义 + L4 机器/人工分栏 + 四个完成作用域', () => {
  const text = readFileSync(EVAL, 'utf8');
  // ① 统一退出语义：三态 + "未跑 ≠ 通过"必须写死（不能只有 L0 有）
  assert.ok(text.includes('五面的退出语义'), '缺「五面的退出语义」节——五面退出码没有统一口径');
  assert.ok(/exit 0 = 该面绿 \/ 1 = 红 \/ 2 = 未跑/.test(text), '退出语义必须写明 0/1/2 三态');
  assert.ok(text.includes('未跑 ≠ 通过'), '缺「未跑 ≠ 通过」');
  // ② L4 必须区分机器判据与人工走查（"机器断言四条"的旧写法会让人以为 ③④ 有载体）
  for (const term of ['机器', '人工走查', '没有记录 = 未跑']) {
    assert.ok(text.includes(term), `L4 判据缺「${term}」——机器/人工没有分栏，验收会空转`);
  }
  const l4Rows = text.split('\n').map((l) => l.trim()).filter((l) => /^\| [①②③④] /.test(l));
  assert.ok(l4Rows.length >= 4, `L4 判据表应有 4 行（实际 ${l4Rows.length}）`);
  // 逐行判类型：①② 必须机器、③④ 必须人工——只查"表里出现过两类词"会漏掉单行退回散文。
  // 判**类型列**本身（第二格），不是"整行里出现过这两类词"——通过列里也会写「人工走查」节，
  // 整行包含式断言会被它满足（2026-10-28 实测：把类型改成「人工检查」仍绿）。
  const typeOf = (n) => l4Rows.find((r) => r.startsWith(`| ${n} `))?.split('|')[2]?.trim();
  for (const n of ['①', '②']) {
    assert.equal(typeOf(n), '机器', `L4 判据 ${n} 的类型列必须是「机器」（实际：${typeOf(n) ?? '（缺行）'}）`);
  }
  for (const n of ['③', '④']) {
    assert.equal(typeOf(n), '人工走查', `L4 判据 ${n} 的类型列必须是「人工走查」（实际：${typeOf(n) ?? '（缺行）'}）`);
  }
  // ③ 四个完成作用域与优先序
  assert.ok(text.includes('完成判据的四个作用域'), '缺「完成判据的四个作用域」节——四套完成定义没有作用域声明');
  for (const scope of ['面级', '任务级', 'goal 级', '语义级']) {
    assert.ok(text.includes(scope), `完成作用域缺「${scope}」`);
  }
});

test('角色职责 owner 表存在（L3 判据 2 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  assert.ok(ws.includes('事实的 owner'), '研究手册缺 owner 表');
  for (const doc of ['question.md', 'leads.md', 'evidence/', 'findings.md', 'review.md', 'final.md（当前版）+ final/（版本记账 + 读者版）']) {
    assert.ok(ws.includes(doc), `owner 表缺 ${doc} 行`);
  }
});

test('证据身份链契约存在（L3 判据 3 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  for (const field of ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'source_tier', 'publisher']) {
    assert.ok(ws.includes(field), `证据 frontmatter 契约缺 ${field}`);
  }
});

// ── 基础整治 §3.3：契约字段在执行者副本间机械对账（字段必须物理到达执行者，
//    副本允许存在，但副本与正本漂移必须变红——不是只在手册里出现过就算数）──
const FIELDS = ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports', 'source_tier', 'publisher'];
const CONTRACT_COPIES = [
  ['研究手册（语义正本）', 'research-workspace/AGENTS.md'],
  ['run 模板副本', 'research-workspace/templates/run/evidence-entry.md'],
  ['analyst skill 副本（执行者实际看的）', 'packages/deep-research-pack/presets/analyst/skills/evidence-extraction/SKILL.md'],
  ['analyst persona 内联副本（0.1.7 preset 行）', 'packages/deep-research-pack/presets/analyst.patch.yml'],
  ['方法论映射（L3 载体）', 'docs/design/30-methodology-mapping.md'],
];

test('证据契约七字段在各执行者副本全部在场（对账，防静默漂移；谓词分层：硬五字段定有效性、软二字段标未分级）', () => {
  for (const [label, rel] of CONTRACT_COPIES) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const missing = FIELDS.filter((f) => !text.includes(f));
    assert.deepEqual(missing, [], `${label}（${rel}）缺字段：${missing.join(', ')}——副本必须与手册正本对齐`);
  }
});

test('有效证据谓词分层：硬五字段定有效性、软二字段标未分级（仪表盘渲染层与手册对账）', async () => {
  const { parseEvidenceDir } = await import('../../scripts/lib/run-dashboard-core.mjs');
  const { mkdirSync, rmSync, writeFileSync } = await import('node:fs');
  const tmp = join(ROOT, 'tests', '.tmp-evidence-predicate');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  try {
    const full = '---\nsource_url: https://e.example/x\nretrieved_at: 2026-09-24\nquality: A\nfound_by: analyst\nsupports: T1\nsource_tier: primary\npublisher: e.example\n---\n';
    writeFileSync(join(tmp, 'full.md'), full);
    for (const drop of FIELDS) {
      const fm = full.split('\n').filter((l) => !l.startsWith(`${drop}:`)).join('\n');
      writeFileSync(join(tmp, `drop-${drop}.md`), fm);
    }
    const { files } = parseEvidenceDir(tmp);
    const byName = Object.fromEntries(files.map((r) => [r.file, r]));
    assert.equal(byName['full.md']?.ok, true, '七字段齐 → 有效且已分级');
    assert.equal(byName['full.md']?.ungraded, false, '七字段齐 → 不标未分级');
    for (const drop of ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports']) {
      assert.equal(byName[`drop-${drop}.md`]?.ok, false, `缺硬字段 ${drop} → 必须标无效（谓词弱于手册 = 影子契约）`);
    }
    for (const drop of ['source_tier', 'publisher']) {
      assert.equal(byName[`drop-${drop}.md`]?.ok, true, `缺软字段 ${drop} → 仍有效（分层：不否决）`);
      assert.equal(byName[`drop-${drop}.md`]?.ungraded, true, `缺软字段 ${drop} → 标未分级（旧 run 存量按此显示，不回填）`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
