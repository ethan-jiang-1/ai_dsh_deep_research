// presets 结构回归 — 与 scripts/verify/verify.mjs 的 preset-structure / pack-bundle-compat /
// row-deps 同源判据（keyless，进程内文件断言；不写门禁序号，序号随域重排会腐）。
// 0.1.7 preset 重设计：preset = `presets/<role>.patch.yml` 里的一条 `@deepseek-ai/dsh-agent-preset`
// 行（config 带 id/name/description/order/plugins）；角色技能仍在 `presets/<role>/skills/`。
//
// 负例留证 2026-10-09：BUG-008——adversarial-review SKILL 删狩猎节 / 白名单词「建议挖深」/
//   近形漂移点名「建议深挖」任一 →「critic adversarial-review」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-006——lead.patch.yml 删「HITL1 零例外」句或「推荐档」操作 →
//   「lead persona 钉 HITL1 零例外」测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-005——lead.patch.yml 删「ask 调用硬约束」句 / 「wait: -1」点名 →
//   「lead persona 钉 ask 硬约束」测红；还原 → 绿。
// 负例留证 2026-11-10（改判）：删 HITL2 的 `timeout: -1` 句 / 把旧 `update_goal action=pause`
//   写回 → 本测红；还原 → 绿。旧「一律禁 -1」只保留 HITL1 内核，HITL2 由 timed schema 明许。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles, researchRoles } from '../../scripts/lib/roles.mjs';
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');
// 角色清单事实源 = 盘上 presets/*.patch.yml（基础整治 §3.2）；本测试文件不再持有副本清单
const ROLES = presetRoles(ROOT);
const RESEARCH_ROLES = researchRoles(ROOT);

test('角色清单 = 盘上 presets/*.patch.yml（单一事实源），数量哨兵咬 D2', () => {
  // 访问器输出与直接 readdir 对账（防访问器自身漂移：改读别处/过滤丢失）
  const files = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => f.replace(/\.patch\.yml$/, ''));
  assert.deepEqual(ROLES, [...files].sort(), 'presetRoles() 枚举 ≠ 盘上 patch 文件——访问器漂移');
  for (const id of files) assert.match(id, /^[a-z0-9][a-z0-9-]*$/);
  // 数量哨兵：增删角色 = 推翻 D2（角色 = 5 个：4 研究 + 1 方法编辑，D37），先在 docs/decisions.md 登记 D 号再动代码
  assert.equal(ROLES.length, 5, `角色数量 ${ROLES.length} ≠ 5（D2/D37：4 研究 + 1 方法编辑）——增删角色即推翻 D2，先登记新 D 号`);
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
      assert.match(fm[1], /^description:\s*\S.*$/m, `${r}/${s.name}: frontmatter description 必须非空`);
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

test('bundle patch：registry 替换行 + present insert 行在位；团队行（含 ui）与 web insert 行不进本包', () => {
  const yml = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8');
  // 替换行（0.1.7）：registry 的默认 preset 指研究主编（旧 agent-presets roots 形态已随重设计删除）
  assert.match(yml, /^- id: agent-preset-registry$/m);
  assert.match(yml, /name: '@deepseek-ai\/dsh-agent-preset-registry'/);
  assert.match(yml, /default: lead/);
  // insert 行：present（web 行实证结论 = base 出厂行，不进本包——RFC web-tool-rows）
  const insertBlock = yml.split(/^- insert:$/m).slice(1).join('\n');
  assert.match(insertBlock, /^\s*- id: tool-present$/m, 'insert 行缺失: tool-present')
  // ui-agent-team 归 vendor agent-team-profile 层（该层 patch 已 insert 同一 id；本包再 insert =
  // 同行双插入，2026-11-03 审计 D7-1）。两边一起断言：本包不插，且层里在——UI 仍随团队层发行。
  assert.doesNotMatch(insertBlock, /^\s*- id: ui-agent-team$/m, 'ui-agent-team 不应由本包 insert（归团队层，重复插入）')
  const layer = readFileSync(join(ROOT, 'vendor', 'dsh', 'packages', 'experimental', 'agent-team-profile', 'cordis.patch.yml'), 'utf8')
  assert.match(layer, /^\s*- id: ui-agent-team$/m, '团队层未提供 ui-agent-team——本包删行后 UI 会缺失')
  // 回归守卫：web 四行的 **insert** 形态不得出现在本包 bundle（insert 会与 web-app surface 的
  // preset-scoping 打架；provider 选择走下面的 `- id: web` 替换行——D30）
  for (const row of ['tool-web', 'web-search', 'web-fetch', 'web']) {
    assert.doesNotMatch(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `web 行 ${row} 不应以 insert 形态进 bundle（base 出厂行）`);
  }
  // 回归守卫：团队机制行不得出现在本包 bundle（与 vendor agent-team-profile 层同行 id
  // 双 insert = 重复行，实证见 RFC m2-p1-run-channel Phase 0；团队组合的家 = vendor 层）
  for (const row of ['agent-team', 'tool-agent-team']) {
    assert.doesNotMatch(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `团队行 ${row} 不应进 bundle（归 vendor agent-team-profile 层）`);
  }
});

test('bundle patch 固定检索底座：web 替换行 = deepseek-search-api 搜索 + 回退 fetch（D30/D31）', () => {
  const yml = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8');
  const replaceBlock = yml.split(/^- insert:$/m)[0];
  const insertBlock = yml.split(/^- insert:$/m).slice(1).join('\n');
  // 两个字段必须同时在场：Loader 的 replace 行 config 整体替换；只写 searchProvider 会让
  // fetch 面对 http + deepseek-fetch-api 两个可用 provider → WEB_PROVIDER_AMBIGUOUS。
  assert.match(
    replaceBlock,
    /^- id: web\n\s*config:\n\s*searchProvider: deepseek-search-api\n\s*fetchProvider: deepseek-fallback-fetch$/m,
    'web 替换行缺失或未同时重述 searchProvider/fetchProvider（D30/D31：搜索 = Search API，fetch = 回退 provider）',
  );
  // 行不带 name：按 id 定向替换，避免新增 peerDependency（同 llm-deepseek 行形态；row-deps 门禁）
  const row = (replaceBlock.split(/^- id: web$/m)[1] ?? '').split(/^- id: /m)[0];
  assert.doesNotMatch(row, /^\s*name:/m, 'web 替换行不应带 name（按 id 定向，避免新增 peerDependency）');
  // 回退 provider 行必须注册（selection 钉它的 id；行缺失 = CONFIGURED_MISSING，fetch 全断）。
  assert.match(insertBlock, /^\s*- id: research-fetch-fallback$/m, 'insert 行缺失: research-fetch-fallback（D31 回退 provider）');
  assert.match(insertBlock, /name:\s*['"]?dsh-deep-research-pack\/fetch-fallback['"]?/, '回退 provider 行的入口必须指向本包 ./fetch-fallback 子导出');
  // 负例留证 2026-10-27：加替换行前跑本测 → RED「web 替换行缺失…」；加行后 → GREEN。
  //   删 fetchProvider 行 / 改回 deepseek-official → 同一断言红（判别力，不是恒真）。
});

test('每个研究 preset 的 tool-web 行带 base config（fetch + 60s 搜索 / 45s 抓取预算）', () => {
  for (const r of RESEARCH_ROLES) {
    const yml = readFileSync(join(PRESETS, `${r}.patch.yml`), 'utf8');
    const m = yml.match(/- id: tool-web\n\s*name: '@deepseek-ai\/dsh-tool-web'\n\s*config:\n\s*fetch: true\n\s*searchTimeoutMs: 60000\n\s*fetchTimeoutMs: 45000/);
    assert.ok(m, `${r}: tool-web 行缺 base config（fetch: true / searchTimeoutMs: 60000 / fetchTimeoutMs: 45000——回退两腿预算 28s 必须落在工具预算内）`);
  }
});

test('delegating preset subagent = maxDepth 2 + allowedAgentPresets；无 stale backgroundMode', () => {
  const ymlOf = (r) => readFileSync(join(PRESETS, `${r}.patch.yml`), 'utf8');
  const rootRole = /^\s+default:\s*([a-z0-9-]+)\s*$/m.exec(readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8'))?.[1];
  assert.ok(rootRole !== undefined, 'bundle 未声明 preset registry default');
  // 方法编辑是页内共创角色，不作 subagent 候选（child 不能弹原生问卡）。
  const allowedRoles = RESEARCH_ROLES.filter((role) => role !== rootRole);
  const delegating = ROLES.filter((r) => ymlOf(r).includes('- id: tool-subagent'));
  assert.ok(delegating.length > 0, '至少一个角色声明 tool-subagent');
  for (const r of delegating) {
    const yml = ymlOf(r);
    assert.match(yml, /- id: tool-subagent[\s\S]*?maxDepth: 2/, `${r}: tool-subagent 缺 maxDepth: 2`);
    const allowed = yml.slice(yml.indexOf('allowedAgentPresets:'));
    for (const role of allowedRoles) {
      assert.match(allowed, new RegExp(`(?:^|\\n)\\s*- ${role}\\s*(?:\\n|$)`), `${r}: allowedAgentPresets 缺 ${role}`);
    }
    assert.doesNotMatch(yml, /backgroundMode/, `${r}: stale backgroundMode 仍在（当前 pin 不支持，静默无效）`);
  }
  for (const r of ROLES.filter((role) => !delegating.includes(role))) {
    assert.doesNotMatch(ymlOf(r), /- id: tool-subagent/, `${r} 不应有 subagent（聚焦独行）`);
  }
});

test('研究角色不挂 workflow；research-wave worker 唯一挂 engine+tool（D47）', () => {
  const ymlOf = (r) => readFileSync(join(PRESETS, `${r}.patch.yml`), 'utf8');
  for (const role of ROLES) {
    assert.doesNotMatch(ymlOf(role), /workflow-ptc|tool-workflow/, `${role} 不应挂 workflow（D47：只有 research-wave worker 承载）`);
  }
  const wave = readFileSync(join(PACK, 'workers', 'research-wave.patch.yml'), 'utf8');
  assert.match(wave, /- id: workflow-delegation\n\s+name: cordis:group\n\s+group: true\n\s+isolate:\n\s+workflowEngine: true/, 'research-wave 缺 workflow group/isolate');
  assert.match(wave, /- id: workflow-ptc\n\s+name: '@deepseek-ai\/dsh-workflow-ptc'\n\s+config:\n\s+provider: spawn\n\s+maxConcurrentAgents: 4\n\s+maxTotalAgents: 8/, 'research-wave 的 workflow engine 配置不完整');
  assert.match(wave, /- id: tool-workflow\n\s+name: '@deepseek-ai\/dsh-tool-workflow'\n\s+config:\n\s+enableRunInBackground: false/, 'research-wave 的 tool-workflow 未关闭后台');
  const worker = readFileSync(join(PACK, 'workers', 'research-worker.patch.yml'), 'utf8');
  assert.doesNotMatch(worker, /workflow-ptc|tool-workflow/, 'research-worker 不应挂 workflow（叶子）');
});

test('清单只带 DSH 读的 dsh.* 键：bundle 与 client，无自造兼容矩阵', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  assert.deepEqual(Object.keys(pkg.dsh ?? {}).sort(), ['bundle', 'client'],
    'dsh.* 只允许 DSH 消费的 bundle 与 client；版本合同只在 engines.dsh');
});

test('engines.dsh 覆盖已测基线（rc.2–rc.5 在范围内；0.2.2 不在）', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  assert.match(pkg.engines?.dsh ?? '', /^>=0\.2\.1-rc\.2 <=0\.2\.1-rc\.5$/,
    'engines.dsh 必须钉在已有安装/首屏/客户端证据的版本带上');
  for (const baseline of ['0.2.1-rc.2', '0.2.1-rc.3', '0.2.1-rc.4', '0.2.1-rc.5']) {
    assert.ok(satisfiesVersion(baseline, pkg.engines.dsh), `已测基线 ${baseline} 不在 engines.dsh 范围内`);
  }
  assert.equal(satisfiesVersion('0.2.2', pkg.engines.dsh), false, '未测的 0.2.2 不得被声明支持');
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

test('lead persona 钉 ask 硬约束：HITL1 timed、HITL2 timeout:-1（参数名不是 wait）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  // 2026-11-10 改判：timed 工具 schema 明说 `timeout: -1` 只在「答案未到不能往下走」时用。
  // HITL2 是交付拍板，用开放回合停住 goal 轮；HITL1 仍在 goal 之前、用默认 600s timed。
  // 旧 BUG-005 的「一律禁 -1」保留其正确内核（HITL1 不悬挂），但不能再套到 HITL2 上。
  assert.match(yml, /ask 调用硬约束（HITL1 与 HITL2 分开）/, 'persona 缺分档 ask 硬约束句');
  assert.match(yml, /HITL2 必须显式 `timeout: -1`/, 'HITL2 未钉 timeout:-1——开放回合不成立，goal 会空转');
  assert.match(yml, /参数名是 `timeout`/, '未纠正旧 wait/timeout 参数名');
  assert.match(yml, /`wait: -1`/, '未点名旧 wait:-1 不是合法参数');
  // 机制矛盾必须在 persona 里说清：模型不能 pause（无人工回合）/ 不能 resume durable paused。
  assert.match(yml, /GOAL_TOOL_RESUME_PAUSED/, '未点名模型不能 resume durable paused goal');
  assert.doesNotMatch(yml, /update_goal action=pause/, '旧 pause 护栏仍在——pause 需要人工回合，会造成假指令');
  assert.doesNotMatch(yml, /拿到答案后 resume/, '旧 resume 承诺仍在——模型不能 resume durable paused goal');
});

test('HITL1 两段卡：计划确认卡钉在模型可见面与合同面（persona + research-brief + 手册 + 模板）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  const skill = readFileSync(join(PRESETS, 'lead/skills/research-brief/SKILL.md'), 'utf8');
  const manual = readFileSync(join(ROOT, 'packages/deep-research-pack/content/manual.md'), 'utf8');
  const template = readFileSync(join(ROOT, 'packages/deep-research-pack/content/templates/run/question.md'), 'utf8');
  // persona（行为最强钉）：第二段在场 + quick_factual 豁免 + 推荐项形态 + 拍板落 §Decisions
  assert.match(yml, /计划确认卡/, 'persona 缺计划确认卡——第二段可被静默跳过');
  assert.match(yml, /quick_factual 免发/, 'persona 未写 quick_factual 豁免——快答场景会被强塞第二段卡');
  assert.match(yml, /按计划开跑\(Recommended\)/, '计划确认卡推荐项形态漂移（推荐置首硬格式）');
  assert.match(yml, /§Decisions（append-only、最新在上）后开工/, '拍板未钉回写记账（§Decisions）');
  // research-brief（操作面正本）：流程步 + 一轮制
  assert.match(skill, /计划确认卡/, 'research-brief 缺计划确认步');
  assert.match(skill, /一轮制/, 'research-brief 缺一轮制（修订不再二次呈卡）');
  // 计划卡字数纪律（①-c：WARN 级检出 + 措辞收紧同源）：计数口径与"呈卡前先数字数"必须留在 skill——
  // 删掉即红，否则门禁侧的 WARN 记账会变成没人听的数字（门禁实现 = node-gate 门①，两态夹具在 tests/fixtures）。
  assert.match(skill, /呈卡前先数字数/, 'research-brief 缺"呈卡前先数字数"自查步——超限卡会被递给用户');
  assert.match(skill, /全部字符/, 'research-brief 缺字数口径句（口径 = ask 的 question 字段全部字符）');
  // 手册（跨角色合同）：两段卡语义 + 豁免 + 细则下放指针
  assert.match(manual, /HITL1 = 两段卡/, '手册缺两段卡合同');
  assert.match(manual, /quick_factual 豁免/, '手册缺 quick_factual 豁免');
  // 模板（schema 实例）：Snapshot 确认行
  assert.match(template, /计划确认:/, 'question.md 模板缺计划确认字段（Snapshot 节）');
});

test('HITL1 业务决策简报：字段钉在模板与采集规则（模板 + research-brief + persona 第四问触发）', () => {
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  const skill = readFileSync(join(PRESETS, 'lead/skills/research-brief/SKILL.md'), 'utf8');
  const template = readFileSync(join(ROOT, 'packages/deep-research-pack/content/templates/run/question.md'), 'utf8');
  // 模板（schema 实例）：Snapshot 业务决策简报行——五字段 + open 显式形态
  assert.match(template, /业务决策简报/, 'question.md 模板缺业务决策简报字段（HITL1 Alignment Snapshot）');
  for (const field of ['决策对象', '待决定事项', '比较选项', '期限', '成功标准与约束']) {
    assert.match(template, new RegExp(field), `业务决策简报缺字段：${field}`);
  }
  assert.match(template, /尚未确认/, '业务决策简报缺 open 显式形态（缺项标尚未确认，禁止脑补）');
  // research-brief（操作面正本）：信息充分性触发 + 已提供不重复问 + 范围判据
  assert.match(skill, /业务决策简报/, 'research-brief 缺业务决策简报采集规则');
  assert.match(skill, /会改变研究范围/, '采集缺范围触发判据（缺项仅在会改变研究范围时随第四问追问）');
  assert.match(skill, /不重复问/, '采集缺「已提供不重复问」纪律');
  // persona（行为最强钉）：第四问触发句涵盖业务决策澄清
  assert.match(yml, /业务决策/, 'persona 第四问触发未涵盖业务决策澄清——简报字段可被静默跳过');
  // 合同不扩张：无自由文本协议、无固定第四问（业务简报只走信息充分性触发）
  assert.doesNotMatch(skill, /\[ACCEPTED\]/, 'research-brief 出现 [ACCEPTED] 自由文本协议——违反 hitl-feedback-protocol 否决记录');
  assert.doesNotMatch(yml, /\[ACCEPTED\]/, 'persona 出现 [ACCEPTED] 自由文本协议——违反 hitl-feedback-protocol 否决记录');
  assert.match(skill, /不设固定第四问/, '业务决策简报缺「不设固定第四问」声明——信息充分性触发可能漂移为固定问');
});

test('HITL1 归档预检问并入第一段卡：skill 钉面（2026-10-11 run 实证 lead 自发行为，合同补授权）', () => {
  const skill = readFileSync(join(PRESETS, 'lead/skills/research-brief/SKILL.md'), 'utf8');
  assert.match(skill, /归档预检问可并入第一段卡/, '预检问并入卡未获合同授权——实证自发行为缺钉面');
  assert.match(skill, /不单独再打断/, '预检并入缺「不单独打断」语义（与两点交互减打断目标一致）');
});

test('报告首屏决策摘要：模板节名与生成/审查合同钉（模板 + synthesis + adversarial-review）', () => {
  const template = readFileSync(join(ROOT, 'packages/deep-research-pack/content/templates/run/final.md'), 'utf8');
  const synthesis = readFileSync(join(PRESETS, 'lead/skills/synthesis/SKILL.md'), 'utf8');
  const review = readFileSync(join(PRESETS, 'critic/skills/adversarial-review/SKILL.md'), 'utf8');
  // 模板（schema 实例）：首屏六段 + 待定形态 + 快速事实缩略注记 + 来源链形态
  for (const section of ['决策摘要', '备选与取舍', '关键依据', '最强反证', '目前不能判断', '下一步']) {
    assert.match(template, new RegExp(`## ${section}`), `final.md 模板缺首屏节：${section}`);
  }
  assert.match(template, /待定/, '「下一步」缺待定形态（未获用户指定的负责人/期限不编造）');
  assert.match(template, /quick_factual 型 run/, '缺快速事实缩略注记（首屏不逼成商业建议——互补态）');
  assert.match(template, /来源: evidence\//, '模板缺来源链形态');
  // synthesis（生成正本）：首屏纪律
  assert.match(synthesis, /决策摘要/, 'synthesis 缺决策摘要首屏纪律');
  assert.match(synthesis, /目前不能判断/, 'synthesis 缺不足如实呈现纪律');
  assert.match(synthesis, /唯一推荐/, 'synthesis 缺「证据不足不硬给唯一推荐」纪律');
  assert.match(synthesis, /待定/, 'synthesis 缺待定形态（不编造负责人/期限）');
  // adversarial-review（审查正本）：首屏狩猎线
  assert.match(review, /决策摘要/, 'adversarial-review 缺首屏决策摘要核查线');
  assert.match(review, /目前不能判断/, 'adversarial-review 缺「未知写成确定」核查点');
  // 合同不扩张：自由文本协议禁词（hitl-feedback-protocol 否决同款）
  assert.doesNotMatch(template + synthesis + review, /\[ACCEPTED\]/, '报告合同面出现自由文本协议禁词');
});

test('读者版终稿：reader-final skill + persona + 手册钉面（review PASS 后、HITL2 前）', () => {
  const skill = readFileSync(join(PRESETS, 'lead/skills/reader-final/SKILL.md'), 'utf8');
  const yml = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  const manual = readFileSync(join(ROOT, 'packages/deep-research-pack/content/manual.md'), 'utf8');
  // skill（生成正本）：触发 + 两产物 + 六节 + 自检 + 交付顺序
  assert.match(skill, /review\.md.*PASS|readiness: PASS/, 'reader-final 缺 PASS 后触发的显性条件');
  assert.match(skill, /final\/readable\.md/, 'reader-final 缺工作件路径');
  assert.match(skill, /final\/readable-vN\.md/, 'reader-final 缺交付件路径');
  for (const section of ['结论', '为什么', '这对你意味着什么', '什么会改变这个结论', '目前不能判断', '依据与延伸']) {
    assert.match(skill, new RegExp(`## ${section}`), `reader-final 缺六节：${section}`);
  }
  assert.match(skill, /不新增.*事实|不新增搜索/, 'reader-final 缺「不新增事实/搜索」约束');
  assert.match(skill, /reader 第一|读者版第一/, 'reader-final 缺 present 顺序（reader 第一）');
  assert.match(skill, /5 分钟|五分钟/, 'reader-final 缺 5 分钟读者自检');
  // persona（行为最强钉）：PASS 后加载 + 交付五步 + present 两份
  assert.match(yml, /reader-final/, 'persona 未点名 reader-final skill');
  assert.match(yml, /final\/readable\.md/, 'persona 缺工作件路径');
  assert.match(yml, /final\/readable-vN\.md/, 'persona 缺交付件路径');
  assert.match(yml, /present 两份/, 'persona 缺 present 两份');
  // 手册（跨角色/恢复合同）：writer/交付/完成判据
  assert.match(manual, /final\/readable\.md/, '手册缺读者版工作件');
  assert.match(manual, /final\/readable-vN\.md/, '手册缺读者版交付件');
  assert.match(manual, /门C/, '手册缺门C 读者版合同');
});

test('claim 级复核：critic claim-verdict 契约 + lead 派工纪律（覆盖不可回退成报告级 prose）', () => {
  const critic = readFileSync(join(PRESETS, 'critic.patch.yml'), 'utf8');
  assert.match(critic, /claim-verdict/, 'critic persona 未点名 claim-verdict——claim 模式会退回报告级审查');
  const skill = readFileSync(join(PRESETS, 'critic', 'skills', 'claim-verdict', 'SKILL.md'), 'utf8');
  for (const token of ['supported', 'partially_supported', 'unsupported', 'unverifiable', 'rechecked_urls', '单值']) {
    assert.ok(skill.includes(token), `claim-verdict skill 缺 ${token}`);
  }
  const lead = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  for (const token of ['review/claims.json', 'review/verdicts-r<N>.json', 'claim-verdict', 'UNVERIFIED']) {
    assert.match(lead, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `lead persona 缺 ${token}`);
  }
  assert.match(lead, /3–5 条/, 'lead persona 缺分批纪律（3–5 条/child）');
  // 手册（跨角色/恢复合同）：工件目录 + 交付判据
  const manual = readFileSync(join(PACK, 'content', 'manual.md'), 'utf8');
  assert.match(manual, /review\/claims\.json/, '手册目录约定缺 claim 表');
  assert.match(manual, /verdict-audit/, '手册完成判据缺 verdict-audit 覆盖门');
});

test('Team 组合 subagent one-shot 合同：team-assembly + persona + design/10 限定', () => {
  const team = readFileSync(join(PRESETS, 'lead', 'skills', 'team-assembly', 'SKILL.md'), 'utf8');
  const lead = readFileSync(join(PRESETS, 'lead.patch.yml'), 'utf8');
  const design = readFileSync(join(ROOT, 'docs', 'design', '10-architecture.md'), 'utf8');
  // team-assembly：namespace + one-shot + settlement + 全 run 8 槽 + 角色边界
  assert.match(team, /child \*\*不是 Team 成员\*\*/, 'team-assembly 缺 child 不是 Team 成员的 namespace 句');
  assert.match(team, /settlement notice/, 'team-assembly 缺 settlement notice 结果通道');
  assert.match(team, /不要对 child id/, 'team-assembly 缺「不要对 child id 调 send_message」');
  assert.match(team, /全 run 8 槽预算/, 'team-assembly 缺全 run 8 槽公式');
  assert.match(team, /角色边界（teammate 不是 Lead）/, 'team-assembly 缺角色边界块');
  // persona：模型每次请求都看得到的最强钉
  assert.match(lead, /Team 组合下 subagent 是 one-shot/, 'lead persona 缺 subagent one-shot 钉');
  assert.match(lead, /teammate 不是 Lead/, 'lead persona 缺 teammate 角色边界钉');
  // design/10：不再把 provider continuable 写成控制面可达，也不把 teammate 写成机器边界
  assert.match(design, /provider 可续但 Team 控制面不可达/, 'design/10 缺 one-shot 的实际语义限定');
  assert.match(design, /root preset 的机器边界/, 'design/10 未区分 root preset 与 teammate 会话');
});

test('provenance hash 合同：owner = ops/Lead，不派给 analyst，不用 workflow 当计算器', () => {
  const manual = readFileSync(join(PACK, 'content', 'manual.md'), 'utf8');
  const analyst = readFileSync(join(PRESETS, 'analyst', 'skills', 'evidence-extraction', 'SKILL.md'), 'utf8');
  const team = readFileSync(join(PRESETS, 'lead', 'skills', 'team-assembly', 'SKILL.md'), 'utf8');
  assert.match(manual, /hash 的 owner 是 ops\/Lead，不是 analyst/, '手册缺 hash owner 合同');
  assert.match(manual, /不得要求它用\s+`python3 hashlib`/, '手册未禁止要求 analyst 用 python3 hashlib');
  assert.match(manual, /缺 hash 是 UNATTESTED，不是伪造/, '手册未定义缺 hash 的审计语义');
  assert.match(analyst, /## provenance \/ hash 边界/, 'analyst skill 缺 provenance/hash 边界节');
  assert.match(analyst, /你不计算 `sha256`/, 'analyst skill 未明确不计算 sha256');
  assert.match(team, /provenance hash 不派给角色/, 'team-assembly 缺 provenance hash 派发禁令');
  assert.match(team, /不要把 `workflow` 当计算器/, 'team-assembly 未禁止用 workflow 当计算器');
});
