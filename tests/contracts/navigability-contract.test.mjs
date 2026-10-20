// 可驾驭性契约回归（D23 判据可检验化的机械面；条目 Note = notes/implemented/2026-10-05-project-navigability-phase1.md）。
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
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
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

test('资产门：scripts 职责索引覆盖全部盘上入口（根面 + 职责子目录 + lib 全量）', () => {
  assert.ok(existsSync(join(ROOT, 'scripts/README.md')), 'scripts/README.md 缺席——职责索引（RFC Phase 1 第 4 项）');
  const idx = read('scripts/README.md');
  // 分组布局（2026-10-07 目录治理档 C）：顶层 = 职责子目录 + 根面（README/AGENTS/doc-budgets.json）；
  // 索引对组目录点名、对组内文件点名（lib/ 前缀形态）。
  const topEntries = readdirSync(join(ROOT, 'scripts'), { withFileTypes: true }).filter((e) => e.name !== 'README.md');
  const libEntries = readdirSync(join(ROOT, 'scripts', 'lib'));
  for (const ent of topEntries) assert.ok(idx.includes(ent.name), `scripts 职责索引未点名：${ent.name}${ent.isDirectory() ? '/' : ''}`);
  for (const f of libEntries) assert.ok(idx.includes(`lib/${f}`), `scripts 职责索引未点名：lib/${f}`);
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
  const walkTestFiles = (dir, rel = '') => {
    const out = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'fixtures' || ent.name === '_tmp' || ent.name === 'node_modules') continue;
      const r = rel === '' ? ent.name : `${rel}/${ent.name}`;
      if (ent.isDirectory()) out.push(...walkTestFiles(join(dir, ent.name), r));
      else if (ent.name.endsWith('.test.mjs')) out.push(r);
    }
    return out;
  };
  const consumers = [
    ...walkTestFiles(join(ROOT, 'tests')).map((f) => join('tests', f)),
    // 分组布局（2026-10-07）：scripts 入口住职责子目录——逐组一层扫描（lib/ 支撑库单列）
    ...readdirSync(join(ROOT, 'scripts'), { withFileTypes: true })
      .filter((e) => e.isDirectory()).flatMap((d) =>
        readdirSync(join(ROOT, 'scripts', d.name)).filter((f) => f.endsWith('.mjs')).map((f) => join('scripts', d.name, f))),
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

// ── 测试资产组织契约（条目 = test-asset-organization，2026-10-05 mini RFC）──
// 词汇桥与落家序是导航合同的一部分，与任务入口矩阵同受机械把守；立红实录见该条目实施记录。

test('资产门：project-map 测试词汇对照五词全覆盖 + 反金字塔理由在场', () => {
  const map = read('docs/project-map.md');
  const s = map.indexOf('### 测试词汇对照');
  assert.ok(s !== -1, 'project-map.md 缺「### 测试词汇对照」节（词汇桥单一入口）');
  const rest = map.slice(s);
  const end = rest.slice(1).search(/\n#{2,3} /);
  const section = end === -1 ? rest : rest.slice(0, end + 1);
  for (const word of ['单元', '契约', '集成', '端到端', '生产审计']) {
    assert.ok(section.includes(word), `词汇对照未覆盖「${word}」——带金字塔脑子来的人对不上号`);
  }
  assert.ok(section.includes('要什么前置'), '词汇对照缺反金字塔理由（标签回答不了"要什么前置"）');
  for (const m of section.matchAll(/\]\(([^)#\s]+?)(#[^)]*)?\)/g)) {
    if (m[1].startsWith('http')) continue;
    assert.ok(existsSync(join(ROOT, 'docs', m[1])), `词汇对照链接目标缺席：docs/${m[1]}`);
  }
});

test('资产门：新检查落家序七步在场 + 成本一句原则 + 链接目标在场', () => {
  const map = read('docs/project-map.md');
  const s = map.indexOf('### 新检查落家序');
  assert.ok(s !== -1, 'project-map.md 缺「### 新检查落家序」节（新检查住哪的单一入口）');
  const rest = map.slice(s);
  const end = rest.slice(1).search(/\n#{2,3} /);
  const section = end === -1 ? rest : rest.slice(0, end + 1);
  // 七步关键词：契约测试 / 一次性检查（三例回放实锤补的步）/ 冒烟 / 真模型档 / verify 门禁 / run 门 / fixtures
  for (const step of ['契约测试', '一次性', '*-smoke', '真模型档', 'writing-a-gate', '*-gate', 'fixtures']) {
    assert.ok(section.includes(step), `落家序缺步或关键词「${step}」`);
  }
  assert.ok(section.includes('穷举矩阵不是目标'), '落家序缺成本一句原则');
  for (const m of section.matchAll(/\]\(([^)#\s]+?)(#[^)]*)?\)/g)) {
    if (m[1].startsWith('http')) continue;
    assert.ok(existsSync(join(ROOT, 'docs', m[1])), `落家序链接目标缺席：docs/${m[1]}`);
  }
});

// ── scripts/README lib 表消费列对账（2026-10-21 卫生轮）──
// 索引此前只查「点名在场」不查「点名准确」，消费列静默漂移（六维卫生轮 维度2 M3 实证：
// frontmatter 行漏 bundle-date-sanity、session-log 行 5↔20、web-harness 行「逐站点迁移中」已废、
// probe-status-tab 行的 run-driver / run-dashboard-core 行的 run-fold.test / schema-scan-core 行的
// node-gate-core 三处陈旧点名）。本门把消费列钉到 import 图：正本 = scripts/dev/tests 的 .mjs
// 实际 import（含 lib 互引与动态 import），单元格 = 纯标识符清单（CJK 旁白不参与对账）。
// 立红实录：2026-10-21 首跑即红（上述各行）；修正 README 后绿。此后新增消费方不同步登记 = 红。

test('资产门：scripts/README lib 表「被谁消费」列 = 实际 import 对账（2026-10-21 卫生轮）', () => {
  const idx = read('scripts/README.md');
  const libDir = join(ROOT, 'scripts', 'lib');
  const scanFiles = [];
  const collect = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      const p = join(dir, ent.name);
      if (ent.isDirectory()) { if (ent.name === 'fixtures' || ent.name === '_tmp') continue; collect(p); }
      else if (ent.name.endsWith('.mjs')) scanFiles.push(p);
    }
  };
  collect(join(ROOT, 'scripts')); collect(join(ROOT, 'dev')); collect(join(ROOT, 'tests'));
  const importers = new Map();
  for (const file of scanFiles) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g)) {
      const s = m[1];
      if (!s.startsWith('./') && !s.startsWith('../')) continue;
      const rel = relative(libDir, resolve(dirname(file), s));
      if (rel.startsWith('..')) continue;
      const key = rel.replace(/\.mjs$/, '');
      if (!importers.has(key)) importers.set(key, new Set());
      importers.get(key).add(basename(file).replace(/\.mjs$/, ''));
    }
  }
  assert.ok(importers.size >= 20, `防空语料：import 图扫描到 ${importers.size} 个 lib 模块（过少 = 扫描面被收窄）`);
  // 行形：盘上每个 lib 模块必须有自己的表行（行内提及不算——资产门的文件名点名可被行内提及绕过）
  for (const f of readdirSync(libDir).filter((f) => f.endsWith('.mjs'))) {
    assert.ok(idx.includes(`| lib/${f} |`), `lib 表缺行：lib/${f}——每个支撑模块一行，行内提及不算行`);
  }
  // 消费列 = 实际 import 集（双向精确对账）
  const rows = [...idx.matchAll(/^\| lib\/([\w.-]+)\.mjs \| (.+?) \|/gm)];
  assert.ok(rows.length > 0, '防空语料：README lib 表零行');
  for (const [, lib, cell] of rows) {
    const actual = [...(importers.get(lib) ?? [])].sort();
    const declared = [...new Set([...cell.matchAll(/[A-Za-z0-9_./-]+/g)]
      .map((m) => m[0].split('/').pop().replace(/\.mjs$/, '')))]
      .sort();
    const missing = actual.filter((c) => !declared.includes(c));
    const extra = declared.filter((c) => !actual.includes(c));
    assert.deepEqual(missing, [], `lib/${lib} 消费列漏报实际消费方：${missing.join(', ')}——漏报 = 按索引找消费方者漏改（正本 = import 图）`);
    assert.deepEqual(extra, [], `lib/${lib} 消费列点名了非消费方：${extra.join(', ')}——失准点名 = 陈旧索引（正本 = import 图）`);
  }
});
