// 可驾驭性契约回归（D23 判据可检验化的机械面；RFC = notes/proposed/2026-10-05-project-navigability-phase1.md）。
// 断言对象 = 仓库自控文件（keyless、纯 fs、零子进程、零网络——layering 守卫范围）。
// 覆盖：正本门（design/50 在场 + 三导航面链接 + 状态定语零重述）、导航门（任务入口矩阵九任务
// 全覆盖 + 矩阵链接目标在场）、资产门（scripts 职责索引 + dev 入口说明 + fixtures taxonomy
// 覆盖全量盘上入口，且每组 fixture ≥1 真实 consumer、零孤儿）。
// 行为门不在此文件：verify/test 全绿与"diff 无运行件路径移动"是收尾对账命令面（RFC 实施记录）。
// 立红记录：2026-10-05 R2 首跑——design/50、入口矩阵、scripts/README、dev/README、
// fixtures/README 均缺席即红（红是本测试的正确起点：判据在实现前必须能失败）；
// consumer 检查与 spot-grep 绿态出生，反证 = 注入孤儿组 / 向非 owner 注入状态定语各看红一次后还原。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const DESIGN50 = 'docs/design/50-agent-loop-and-state.md';
// 状态模型定语（合同词表——唯一正本 = design/50；非 owner 文档只许链接，不许重述）
const STATE_TERMS = ['研究事实正本', '执行事件正本', '派生观察'];

test('正本门：design/50 在场且承载四类状态合同', () => {
  assert.ok(existsSync(join(ROOT, DESIGN50)), `${DESIGN50} 缺席——Agent Loop 与四类状态正本（RFC Phase 1 第 1 项）`);
  const text = read(DESIGN50);
  for (const term of STATE_TERMS) assert.ok(text.includes(term), `design/50 缺状态合同词「${term}」`);
  assert.ok(text.includes('恢复优先级'), 'design/50 缺恢复优先级说明');
  assert.ok(text.includes('交付判定'), 'design/50 缺交付判定说明');
});

test('正本门：project-map / 61 链接 design/50，NODES 持纯文本指针', () => {
  // repo 文档断言链接形态（允许 docs/ 内或 docs/guides/ 的相对前缀）；md-links 门禁保链接可解析
  const linkForm = /\]\((?:\.\.\/)?design\/50-agent-loop-and-state\.md\)/;
  for (const doc of ['docs/project-map.md', 'docs/guides/61-run-playbook.md']) {
    assert.ok(linkForm.test(read(doc)), `${doc} 未链接 design/50——分层指针缺席`);
  }
  // NODES.md 随 pack workspace 种子部署到用户侧，不能携带仓内相对链接（种子副本会被
  // md-links 扫描）——断言纯文本指针在场即可
  assert.ok(read('research-workspace/NODES.md').includes('design/50-agent-loop-and-state.md'), 'NODES.md 未指向 design/50');
});

test('导航门：任务入口矩阵九任务全覆盖，链接目标全部在场', () => {
  const map = read('docs/project-map.md');
  const s = map.indexOf('## 任务入口矩阵');
  assert.ok(s !== -1, 'project-map.md 缺「## 任务入口矩阵」节（RFC Phase 1 第 2 项）');
  const next = map.indexOf('\n## ', s + 1);
  const section = map.slice(s, next === -1 ? undefined : next);
  for (const task of ['启动', '继续', '观察', '回答 HITL', '查看 run', '验证挂载', '验证安装', '查漂移', '定位故障']) {
    assert.ok(section.includes(task), `入口矩阵未覆盖任务「${task}」`);
  }
  for (const m of section.matchAll(/\]\(([^)#\s]+?)(#[^)]*)?\)/g)) {
    if (m[1].startsWith('http')) continue;
    assert.ok(existsSync(join(ROOT, 'docs', m[1])), `矩阵链接目标缺席：docs/${m[1]}——文档只指向真实文件`);
  }
});

test('资产门：scripts 职责索引覆盖 scripts 根与 lib 全量盘上入口', () => {
  assert.ok(existsSync(join(ROOT, 'scripts/README.md')), 'scripts/README.md 缺席——职责索引（RFC Phase 1 第 4 项）');
  const idx = read('scripts/README.md');
  const rootEntries = readdirSync(join(ROOT, 'scripts')).filter((f) => f !== 'README.md');
  const libEntries = readdirSync(join(ROOT, 'scripts', 'lib'));
  for (const f of rootEntries) assert.ok(idx.includes(f), `scripts 职责索引未点名：${f}`);
  for (const f of libEntries) assert.ok(idx.includes(f), `scripts 职责索引未点名：lib/${f}`);
});

test('资产门：dev 入口说明覆盖 dev 全量盘上入口（含运行区目录）', () => {
  assert.ok(existsSync(join(ROOT, 'dev/README.md')), 'dev/README.md 缺席——dev 入口说明（RFC Phase 1 第 7 项）');
  const idx = read('dev/README.md');
  for (const ent of readdirSync(join(ROOT, 'dev'), { withFileTypes: true })) {
    if (ent.name === 'README.md') continue; // 自指豁免
    assert.ok(idx.includes(ent.name), `dev 入口说明未点名：${ent.name}${ent.isDirectory() ? '/' : ''}`);
  }
});

test('资产门：fixtures taxonomy 覆盖全部顶层组，每组 ≥1 真实 consumer，零孤儿', () => {
  assert.ok(existsSync(join(ROOT, 'tests/fixtures/README.md')), 'tests/fixtures/README.md 缺席——taxonomy（RFC Phase 1 第 5 项）');
  const idx = read('tests/fixtures/README.md');
  const groups = readdirSync(join(ROOT, 'tests', 'fixtures'), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  assert.ok(groups.length > 0, 'fixtures 顶层零组——防空语料');
  const consumers = [
    ...readdirSync(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.mjs')).map((f) => join('tests', f)),
    ...readdirSync(join(ROOT, 'scripts')).filter((f) => f.endsWith('.mjs')).map((f) => join('scripts', f)),
    ...readdirSync(join(ROOT, 'scripts', 'lib')).filter((f) => f.endsWith('.mjs')).map((f) => join('scripts', 'lib', f)),
  ];
  const texts = Object.fromEntries(consumers.map((c) => [c, read(c)]));
  for (const g of groups) {
    assert.ok(idx.includes(g), `fixtures taxonomy 未点名顶层组：${g}`);
    // consumer 引用形态归一化：`fixtures/<g>` 与 join(..., 'fixtures', '<g>') 两种写法都算
    const refRe = new RegExp(`fixtures['",\\s/]+['"]*${g}`);
    const hits = consumers.filter((c) => refRe.test(texts[c]));
    assert.ok(hits.length > 0, `fixture 组 ${g} 零真实 consumer（孤儿）——taxonomy 必须能指到消费它的测试或 smoke`);
  }
});

test('正本门 spot-grep：状态合同词不在非 owner 文档重述', () => {
  const skills = [];
  const presetsDir = join(ROOT, 'packages/deep-research-pack/presets');
  for (const role of readdirSync(presetsDir, { withFileTypes: true })) {
    if (!role.isDirectory()) continue;
    const skillsDir = join(presetsDir, role.name, 'skills');
    for (const s of readdirSync(skillsDir)) skills.push(join('packages/deep-research-pack/presets', role.name, 'skills', s, 'SKILL.md'));
  }
  const nonOwners = ['docs/project-map.md', 'docs/guides/61-run-playbook.md', 'docs/guides/60-dev-loop.md',
    'docs/00-index.md', 'README.md', 'AGENTS.md', 'packages/deep-research-pack/README.md',
    'research-workspace/AGENTS.md', 'research-workspace/NODES.md', ...skills];
  for (const doc of nonOwners) {
    if (!existsSync(join(ROOT, doc))) continue;
    const text = read(doc);
    for (const term of STATE_TERMS) {
      assert.ok(!text.includes(term), `${doc} 重述状态合同词「${term}」——唯一正本 = design/50，非 owner 改为链接`);
    }
  }
});
