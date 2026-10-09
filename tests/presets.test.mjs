// presets 结构回归 — 与 scripts/verify/verify.mjs 门禁 4/6/7（preset-structure / pack-bundle-compat /
// row-deps）同源判据（keyless，进程内文件断言）。
// 0.1.7 preset 重设计：preset = `presets/<role>.patch.yml` 里的一条 `@deepseek-ai/dsh-agent-preset`
// 行（config 带 id/name/description/order/plugins）；角色技能仍在 `presets/<role>/skills/`。
//
// 负例留证 2026-10-09：BUG-008——adversarial-review SKILL 删狩猎节 / 白名单词「建议挖深」/
//   近形漂移点名「建议深挖」任一 →「critic adversarial-review」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-006——lead.patch.yml 删「HITL1 零例外」句或「推荐档」操作 →
//   「lead persona 钉 HITL1 零例外」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-005——lead.patch.yml 删「ask 调用硬约束」句 / 「wait: -1」点名 →
//   「lead persona 钉 ask 硬约束」测红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../scripts/lib/roles.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');
// 角色清单事实源 = 盘上 presets/*.patch.yml（基础整治 §3.2）；本测试文件不再持有副本清单
const ROLES = presetRoles(ROOT);

test('角色清单 = 盘上 presets/*.patch.yml（单一事实源），数量哨兵咬 D2', () => {
  // 访问器输出与直接 readdir 对账（防访问器自身漂移：改读别处/过滤丢失）
  const files = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => f.replace(/\.patch\.yml$/, ''));
  assert.deepEqual(ROLES, [...files].sort(), 'presetRoles() 枚举 ≠ 盘上 patch 文件——访问器漂移');
  for (const id of files) assert.match(id, /^[a-z0-9][a-z0-9-]*$/);
  // 数量哨兵：增删角色 = 推翻 D2（角色 = 4 个），先在 docs/00-index.md 台账登记新 D 号再动代码
  assert.equal(ROLES.length, 4, `角色数量 ${ROLES.length} ≠ 4（D2）——增删角色即推翻 D2，先登记新 D 号（AGENTS.md §偏离登记簿）`);
});

test('每个角色 preset 行完整（0.1.7 形态：一条 dsh-agent-preset 行 + config.plugins）', () => {
  for (const r of ROLES) {
    const yml = readFileSync(join(PRESETS, `${r}.patch.yml`), 'utf8');
    assert.match(yml, new RegExp(`^\\s*- id: preset-${r}\\s*$`, 'm'), `${r}: 缺 preset-${r} 声明行`);
    assert.match(yml, /^\s+name:\s*'@deepseek-ai\/dsh-agent-preset'\s*$/m, `${r}: 声明行 name 不是 dsh-agent-preset`);
    for (const field of ['id:', 'name:', 'description:', 'order:', 'plugins:']) {
      assert.match(yml, new RegExp(`^\\s+${field}`, 'm'), `${r}: config 缺字段 ${field}`);
    }
    const dir = join(PRESETS, r);
    const skills = readdirSync(join(dir, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory());
    assert.ok(skills.length >= 1, `${r}: 至少一个 skill`);
    for (const s of skills) {
      const fm = readFileSync(join(dir, 'skills', s.name, 'SKILL.md'), 'utf8').split('---');
      assert.ok(fm.length >= 3, `${r}/${s.name}: SKILL.md 有 frontmatter`);
      assert.match(fm[1], new RegExp(`^name:\\s*${s.name}\\s*$`, 'm'), `${r}/${s.name}: frontmatter name=目录名`);
    }
  }
});

test('行依赖全部声明进 peerDependencies', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
  const files = [
    ...ROLES.map((r) => join(PRESETS, `${r}.patch.yml`)),
    join(PACK, 'cordis.patch.yml'),
  ];
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      assert.ok(peers.has(m[1]), `${f}: ${m[1]} 不在 peerDependencies`);
    }
  }
});

test('bundle patch：registry 替换行 + present/ui-agent-team insert 行在位；团队与 web 行不进本包', () => {
  const yml = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8');
  // 替换行（0.1.7）：registry 的默认 preset 指研究主编（旧 agent-presets roots 形态已随重设计删除）
  assert.match(yml, /^- id: agent-preset-registry$/m);
  assert.match(yml, /name: '@deepseek-ai\/dsh-agent-preset-registry'/);
  assert.match(yml, /default: lead/);
  // insert 行：present + ui-agent-team（web 行实证结论 = base 出厂行，不进本包——RFC web-tool-rows）
  const insertBlock = yml.split(/^- insert:$/m).slice(1).join('\n');
  for (const row of ['tool-present', 'ui-agent-team']) {
    assert.match(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `insert 行缺失: ${row}`);
  }
  // 回归守卫：web 四行不得出现在本包 bundle（insert 会与 web-app surface 的 preset-scoping 打架）
  for (const row of ['tool-web', 'web-search', 'web-fetch', 'web']) {
    assert.doesNotMatch(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `web 行 ${row} 不应进 bundle（base 出厂行）`);
  }
  // 回归守卫：团队机制行不得出现在本包 bundle（与 vendor agent-team-profile 层同行 id
  // 双 insert = 重复行，实证见 RFC m2-p1-run-channel Phase 0；团队组合的家 = vendor 层）
  for (const row of ['agent-team', 'tool-agent-team']) {
    assert.doesNotMatch(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `团队行 ${row} 不应进 bundle（归 vendor agent-team-profile 层）`);
  }
});

test('每角色 preset 的 tool-web 行带 base config（fetch + 60s 超时）', () => {
  for (const r of ROLES) {
    const yml = readFileSync(join(PRESETS, `${r}.patch.yml`), 'utf8');
    const m = yml.match(/- id: tool-web\n\s*name: '@deepseek-ai\/dsh-tool-web'\n\s*config:\n\s*fetch: true\n\s*searchTimeoutMs: 60000/);
    assert.ok(m, `${r}: tool-web 行缺 base config（fetch: true / searchTimeoutMs: 60000）`);
  }
});

test('compatibility 矩阵钉住当前 tag', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dsh.compatibility.dshReleases, ['dsh-v0.2.0-rc.2']);
});

test('critic adversarial-review 钉 leads 交接狩猎（BUG-008 契约：状态词漂移不可穿透交付）', () => {
  const yml = readFileSync(join(PRESETS, 'critic', 'skills', 'adversarial-review', 'SKILL.md'), 'utf8');
  // 契约文本三个必备面：狩猎节在场 + 白名单词逐字 + 近形漂移点名（建议深挖 = 必抓形态）
  assert.match(yml, /leads 交接纪律狩猎/, '缺 leads 狩猎节——状态词漂移无审查面');
  assert.match(yml, /建议挖深/, '白名单合同词缺席');
  assert.match(yml, /建议深挖/, '近形漂移形态未点名（critic 不知道要抓什么）');
});

test('lead persona 钉 HITL1 零例外（BUG-006 契约：快路径自我豁免不可见即违法）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  // 契约文本两个必备面：零例外句在场 + 指明"题面自含答案"也必须问（取推荐档即时拍板）
  assert.match(yml, /HITL1 零例外/, 'persona 缺 HITL1 零例外句——快路径仍可自我豁免');
  assert.match(yml, /推荐档/, '零例外句未写明题面自含答案时的操作（取推荐档）');
});

test('lead persona 钉 ask 硬约束：禁 wait:-1（BUG-005——模型单参绕过 timed 护栏即无人值守悬挂）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  // 契约文本两个必备面：约束句在场（HITL1 三问与计划确认卡、HITL2 三处 ask 通用）+ 明确点名 wait: -1 的禁令
  assert.match(yml, /ask 调用硬约束（HITL1 三问与计划确认卡、HITL2 通用）/, 'persona 缺 ask 硬约束句——timed 护栏可被模型单参绕过');
  assert.match(yml, /wait: -1/, 'persona 未点名禁 wait: -1');
  // 双保险：约束句必须同时说明"为什么"（兜底失效后果）——没有后果的禁令对模型是空约束
  assert.match(yml, /兜底/, 'ask 硬约束句未说明违反后果（超时/文本兜底失效）');
});

test('HITL1 两段卡：计划确认卡钉在模型可见面与合同面（persona + research-brief + 手册 + 模板）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  const skill = readFileSync(join(PRESETS, 'lead/skills/research-brief/SKILL.md'), 'utf8');
  const manual = readFileSync(join(ROOT, 'research-workspace/AGENTS.md'), 'utf8');
  const template = readFileSync(join(ROOT, 'research-workspace/templates/run/question.md'), 'utf8');
  // persona（行为最强钉）：第二段在场 + quick_factual 豁免 + 推荐项形态 + 拍板落 §Decisions
  assert.match(yml, /计划确认卡/, 'persona 缺计划确认卡——第二段可被静默跳过');
  assert.match(yml, /quick_factual 免发/, 'persona 未写 quick_factual 豁免——快答场景会被强塞第二段卡');
  assert.match(yml, /按计划开跑\(Recommended\)/, '计划确认卡推荐项形态漂移（推荐置首硬格式）');
  assert.match(yml, /§Decisions（append-only、最新在上）后开工/, '拍板未钉回写记账（§Decisions）');
  // research-brief（操作面正本）：流程步 + 一轮制
  assert.match(skill, /计划确认卡/, 'research-brief 缺计划确认步');
  assert.match(skill, /一轮制/, 'research-brief 缺一轮制（修订不再二次呈卡）');
  // 手册（跨角色合同）：两段卡语义 + 豁免 + 细则下放指针
  assert.match(manual, /HITL1 = 两段卡/, '手册缺两段卡合同');
  assert.match(manual, /quick_factual 豁免/, '手册缺 quick_factual 豁免');
  // 模板（schema 实例）：Snapshot 确认行
  assert.match(template, /计划确认:/, 'question.md 模板缺计划确认字段（Snapshot 节）');
});
