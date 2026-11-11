// tests/pack/wave-contract.test.mjs —— wave 执行的**模型可见文本契约**（keyless）。
//
// 配方本身的确定面由 `wave-recipes.test.mjs` 钉；本件钉的是「配方之外、模型要照做的文本」：
// plan 模板的 `## Wave 执行`、analyst 的 wave-execution skill、Lead 的 research-planning /
// team-assembly / research-brief、以及 design/30 的映射落点。没有这些，preset 挂上了
// workflow 也没人知道何时/怎么写报告。
//
// 反证（同 diff 实测）：删 plan 模板的 `## Wave 执行` → 用例 1 红；删 skill 的
// `run_id`/`waves/<wave>.json` → 用例 2 红；删 Lead skill 的「脚本层」句 → 用例 3 红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const PACK = 'packages/deep-research-pack';

test('plan 模板：## Wave 执行 + plan-only + 不新增 engine/channel 列', () => {
  const plan = read(`${PACK}/content/templates/run/plan.md`);
  assert.match(plan, /^## Wave 执行$/m, 'plan 模板缺 ## Wave 执行 节');
  assert.match(plan, /lens-fanout/, 'plan 模板缺 lens-fanout 示例');
  assert.match(plan, /waves\/W2\.json/, 'plan 模板的报告路径不在场');
  assert.match(plan, /task_id`? 写 `plan-only`|task_id=plan-only/, 'plan 模板未钉 plan-only');
  assert.doesNotMatch(plan, /\|\s*engine\s*\|/i, 'plan 模板不应加 engine 列');
  assert.doesNotMatch(plan, /\|\s*channel\s*\|/i, 'plan 模板不应加 channel 列');
});

test('analyst wave-execution skill：报告/回执/边界/不伪造 run_id', () => {
  const skill = read(`${PACK}/presets/analyst/skills/wave-execution/SKILL.md`);
  for (const token of ['waves/<wave>.json', 'structured_output', 'Do not call workflow', 'Do not call subagent', 'ok/partial/failed/missing', 'run_id']) {
    assert.ok(skill.includes(token), `wave-execution skill 缺 ${token}`);
  }
  assert.match(skill, /run_id.*null|runId.*看不到|runId.*不在/s, 'skill 未说明 run_id 可为 null/不可见');
  assert.doesNotMatch(skill, /把.*runId.*抄/, 'skill 仍要求抄 runId（模型可见结果没有）');
});

test('Lead skills：planning / team-assembly / brief 都点名脚本层', () => {
  const planning = read(`${PACK}/presets/lead/skills/research-planning/SKILL.md`);
  const team = read(`${PACK}/presets/lead/skills/team-assembly/SKILL.md`);
  const brief = read(`${PACK}/presets/lead/skills/research-brief/SKILL.md`);
  assert.match(planning, /脚本层不是列/, 'research-planning 缺「脚本层不是列」');
  assert.match(planning, /脚本层不建 Team task/, 'research-planning 缺「脚本层不建 Team task」');
  assert.match(planning, /task_id=plan-only/, 'research-planning 缺 plan-only');
  assert.match(team, /workflow（脚本层执行器/, 'team-assembly 缺 workflow 通道行');
  assert.match(team, /不要用 `spawn_teammate`/, 'team-assembly 未钉脚本层唯一通道');
  assert.match(team, /不要用 `wait_agent`/, 'team-assembly 未钉 subagent 等法（completion notice）');
  assert.match(team, /有脚本层时先算槽再组队/, 'team-assembly 未钉脚本层容量公式');
  assert.match(team, /team \+ worker \+ executor \+ N child ≤ 8/, 'team-assembly 未钉全 run 8 槽公式');
  assert.match(brief, /脚本层点名/, 'research-brief 缺脚本层点名');
  assert.match(brief, /W<n> 脚本扇出/, 'research-brief 缺计划卡授权句');
});

test('design/30：脚本层落点在 L3 映射表', () => {
  const map = read('docs/design/30-methodology-mapping.md');
  assert.match(map, /wave-execution/, 'design/30 未登记 wave-execution');
  assert.match(map, /lens-fanout/, 'design/30 未登记 lens-fanout');
});
