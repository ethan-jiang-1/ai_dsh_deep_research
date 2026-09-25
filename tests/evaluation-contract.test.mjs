// 评估合同在位性 — docs/evaluation.md 是本仓验收合同（先于框架定案），
// 回归层断言它存在且五个评估面齐全，防止评估标准被静默删改。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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

test('角色职责 owner 表存在（L3 判据 2 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  assert.ok(ws.includes('事实的 owner'), '研究手册缺 owner 表');
  for (const doc of ['question.md', 'leads.md', 'evidence/', 'findings.md', 'review.md', 'final/（当前版）']) {
    assert.ok(ws.includes(doc), `owner 表缺 ${doc} 行`);
  }
});

test('证据身份链契约存在（L3 判据 3 的载体）', () => {
  const ws = readFileSync(join(ROOT, 'research-workspace', 'AGENTS.md'), 'utf8');
  for (const field of ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports']) {
    assert.ok(ws.includes(field), `证据 frontmatter 契约缺 ${field}`);
  }
});

// ── 基础整治 §3.3：契约字段在执行者副本间机械对账（字段必须物理到达执行者，
//    副本允许存在，但副本与正本漂移必须变红——不是只在手册里出现过就算数）──
const FIELDS = ['source_url', 'retrieved_at', 'quality', 'found_by', 'supports'];
const CONTRACT_COPIES = [
  ['研究手册（语义正本）', 'research-workspace/AGENTS.md'],
  ['run 模板副本', 'research-workspace/templates/run/evidence-entry.md'],
  ['analyst skill 副本（执行者实际看的）', 'packages/deep-research-pack/presets/analyst/skills/evidence-extraction/SKILL.md'],
  ['analyst persona 内联副本（0.1.7 preset 行）', 'packages/deep-research-pack/presets/analyst.patch.yml'],
  ['方法论映射（L3 载体）', 'docs/design/30-methodology-mapping.md'],
];

test('证据契约五字段在各执行者副本全部在场（对账，防静默漂移）', () => {
  for (const [label, rel] of CONTRACT_COPIES) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const missing = FIELDS.filter((f) => !text.includes(f));
    assert.deepEqual(missing, [], `${label}（${rel}）缺字段：${missing.join(', ')}——副本必须与手册正本对齐`);
  }
});

test('有效证据谓词 = 五字段全齐（仪表盘渲染层与手册对账；反证：降回三字段即本测试红）', async () => {
  const { parseEvidenceDir } = await import('../scripts/run-dashboard.mjs');
  const { mkdirSync, rmSync, writeFileSync } = await import('node:fs');
  const tmp = join(ROOT, 'tests', '.tmp-evidence-predicate');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  try {
    const full = '---\nsource_url: https://e.example/x\nretrieved_at: 2026-09-24\nquality: A\nfound_by: analyst\nsupports: T1\n---\n';
    writeFileSync(join(tmp, 'full.md'), full);
    for (const drop of FIELDS) {
      const fm = full.split('\n').filter((l) => !l.startsWith(`${drop}:`)).join('\n');
      writeFileSync(join(tmp, `drop-${drop}.md`), fm);
    }
    const { files } = parseEvidenceDir(tmp);
    const byName = Object.fromEntries(files.map((r) => [r.file, r]));
    assert.equal(byName['full.md']?.ok, true, '五字段齐 → 有效证据');
    for (const drop of FIELDS) {
      assert.equal(byName[`drop-${drop}.md`]?.ok, false, `缺 ${drop} → 必须标无效（谓词弱于手册 = 影子契约）`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
