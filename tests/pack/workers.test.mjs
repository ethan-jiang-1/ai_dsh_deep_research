// worker profile 结构回归（D47）——keyless，纯 fs + YAML。
//
// 为什么存在：role-list-sync / preset-structure 只守 presets/ 的研究角色；workers/ 是非研究
// 角色的薄 profile，必须有独立契约：无 Team / goal / ask-user / present / subagent；workflow
// 只在 research-wave；Lead/Scout/Analyst 的 subagent 默认落到 research-worker。
//
// 红配方（本次落地前实跑）：把 research-worker 的 workflow 行抄进去 → 本测红；把
// research-worker 的 agentPreset 默认删掉 → 本测红；把 research-wave 的 workflow 删掉 →
// 本测红；把 worker 的 `tool-subagent` 加回 → 本测红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACK, loadPreset, loadWorker, presetRoles, rowById, workerPresets } from './preset-helpers.mjs';

const WORKERS = workerPresets();
const ROLES = presetRoles();
const RESEARCH_ROLES = ROLES.filter((role) => role !== 'method-editor');
const DELEGATING_ROLES = RESEARCH_ROLES.filter((role) => rowById(loadPreset(role).rows, 'tool-subagent') !== undefined);
const FORBIDDEN = ['tool-subagent', 'tool-goal', 'tool-ask-user', 'tool-present', 'team_task_create', 'spawn_teammate', 'wait_agent', 'interrupt_agent', 'list_agents'];

test('worker profile 清单 = 两个非研究角色：research-worker / research-wave', () => {
  assert.deepEqual(WORKERS, ['research-wave', 'research-worker']);
});

test('每个 worker 是一条完整 preset 行：id/name/description/order/plugins + 恰一条时钟', () => {
  for (const id of WORKERS) {
    const worker = loadWorker(id);
    const raw = worker.raw;
    assert.match(raw, new RegExp(`^\\s*- id: preset-${id}\\s*$`, 'm'), `${id}: 缺 preset-${id} 声明行`);
    assert.match(raw, /^\s+name:\s*'@deepseek-ai\/dsh-agent-preset'\s*$/m, `${id}: 声明行 name 不对`);
    for (const field of ['id:', 'name:', 'description:', 'order:', 'plugins:']) {
      assert.match(raw, new RegExp(`^\\s+${field}`, 'm'), `${id}: config 缺 ${field}`);
    }
    assert.equal(worker.rows.filter((row) => row.id === 'time-context').length, 1, `${id}: 须恰一条 time-context`);
    assert.ok(rowById(worker.rows, 'skill-filesystem'), `${id}: 缺 skill-filesystem`);
    assert.ok(rowById(worker.rows, 'tool-skill'), `${id}: 缺 tool-skill（有技能目录没加载器）`);
  }
});

test('worker 薄工具面：无 Team/goal/ask/present/subagent；workflow 只在 research-wave', () => {
  for (const id of WORKERS) {
    const worker = loadWorker(id);
    const ids = new Set(worker.rows.map((row) => row.id).filter(Boolean));
    for (const forbidden of FORBIDDEN) {
      assert.ok(!ids.has(forbidden), `${id}: 不应有 ${forbidden}（非研究角色薄 profile）`);
    }
    if (id === 'research-worker') {
      assert.ok(!ids.has('workflow-delegation') && !ids.has('tool-workflow'), 'research-worker 不应挂 workflow');
    } else {
      assert.ok(ids.has('workflow-delegation') && ids.has('tool-workflow'), 'research-wave 缺 workflow engine/tool');
      const raw = worker.raw;
      assert.match(raw, /maxConcurrentAgents: 4/, 'research-wave 缺 maxConcurrentAgents: 4');
      assert.match(raw, /maxTotalAgents: 8/, 'research-wave 缺 maxTotalAgents: 8');
      assert.match(raw, /enableRunInBackground: false/, 'research-wave 未关闭后台 workflow');
    }
  }
});

test('worker 技能目录：worker/wave 能加载角色方法论；Lead 也能（D47）', () => {
  const lead = loadPreset('lead');
  const leadDirs = rowById(lead.rows, 'skill-filesystem')?.config?.customSkillDirs ?? [];
  for (const role of RESEARCH_ROLES) {
    assert.ok(leadDirs.some((dir) => String(dir).includes(`presets/${role}/skills`)), `Lead 缺 ${role} skill 目录`);
  }
  const workerDirs = rowById(loadWorker('research-worker').rows, 'skill-filesystem')?.config?.customSkillDirs ?? [];
  for (const role of RESEARCH_ROLES.filter((id) => id !== 'lead')) {
    assert.ok(workerDirs.some((dir) => String(dir).includes(`presets/${role}/skills`)), `research-worker 缺 ${role} skill 目录`);
  }
  const waveDirs = rowById(loadWorker('research-wave').rows, 'skill-filesystem')?.config?.customSkillDirs ?? [];
  assert.ok(waveDirs.some((dir) => String(dir).includes('presets/analyst/skills')), 'research-wave 缺 analyst skill 目录（wave-execution）');
});

test('Lead/Scout/Analyst 的 subagent 默认 = research-worker；Lead 可显式派 research-wave', () => {
  for (const role of DELEGATING_ROLES) {
    const preset = loadPreset(role);
    const sub = rowById(preset.rows, 'tool-subagent');
    assert.ok(sub, `${role}: 缺 tool-subagent`);
    assert.equal(sub.config?.agentPreset, 'research-worker', `${role}: subagent 默认不是 research-worker`);
    assert.ok(Array.isArray(sub.config?.allowedAgentPresets), `${role}: allowedAgentPresets 不是数组`);
  }
  const leadSub = rowById(loadPreset('lead').rows, 'tool-subagent');
  assert.ok(leadSub.config.allowedAgentPresets.includes('research-wave'), 'Lead 不能显式派 research-wave');
  for (const role of DELEGATING_ROLES.filter((id) => id !== 'lead')) {
    const sub = rowById(loadPreset(role).rows, 'tool-subagent');
    assert.ok(!sub.config.allowedAgentPresets.includes('research-wave'), `${role} 不应能派 wave executor（workflow 只归 Lead 计划卡）`);
  }
});

test('pack manifest 携带 worker patch：files + dsh.bundle.patch', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  assert.ok(pkg.files.includes('workers/**'), 'files 缺 workers/**（发布包会丢 worker profile）');
  for (const id of WORKERS) {
    assert.ok(pkg.dsh.bundle.patch.includes(`./workers/${id}.patch.yml`), `dsh.bundle.patch 缺 ./workers/${id}.patch.yml`);
  }
});
