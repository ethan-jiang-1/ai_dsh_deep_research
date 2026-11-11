// presets ↔ skills 的接线守卫（keyless，纯 fs + YAML 解析）。
//
// 为什么存在：preset-structure 门禁只证「presets/<role>/skills/ 目录在、frontmatter name 对」，
// 不证「这个角色的 skill-filesystem 真的指向自己的目录」，也不证「每个技能有人点名」。
// 参照 company 仓 tests/presets 的做法：期望住测试，观测从 YAML 与盘上推导——而不是把
// preset 文本再抄一遍。
//
// 判据：
//   ① 每个 preset 恰有一条 skill-filesystem，customSkillDirs 只指自己的 presets/<role>/skills；
//   ② skill-filesystem 与 tool-skill 成对（只有目录、没有加载器 = 技能正文永远读不到）；
//   ③ 技能名在角色之间唯一（同名技能会让「读自己的方法」歧义）；
//   ④ 每个技能至少被自己的 persona / 研究手册 / 同角色另一个技能点名（孤儿技能 = 死资产）；
//   ⑤ 每个技能 frontmatter name = 目录名，description 非空；
//   ⑥ 行里出现的 agentPreset / allowedAgentPresets 都指向盘上角色。
//
// 不证明：真挂载后模型是否真的看到技能（→ preset-smoke 真会话档）；技能正文的方法质量。
//
// 红配方（本次落地前实跑）：把 lead 的 customSkillDirs 改成 presets/scout/skills → ①红；
//   删 lead 的 tool-skill 行 → ②红；把 nodes-contract 的目录复制成 scout/skills/nodes-contract
//   → ③红；新增 scout/skills/orphan-skill（persona/手册/同角色技能都不点名）→ ④红；
//   把 allowedAgentPresets 的 critic 改成 critic-x → ⑥红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACK, loadPreset, loadWorker, presetRoles, rowById, skillsOf, workerPresets } from './preset-helpers.mjs';

const ROLES = presetRoles();
const RESEARCH_ROLES = ROLES.filter((role) => role !== 'method-editor');
const WORKER_IDS = workerPresets();
const ROLE_SET = new Set([...ROLES, ...WORKER_IDS]);
const MANUAL = readFileSync(join(PACK, 'content', 'manual.md'), 'utf8');
const WORKER_PERSONAS = workerPresets().map((id) => ({
  path: `${id}:persona`,
  text: rowById(loadWorker(id).rows, 'persona')?.config?.prefix ?? '',
}));

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentioned = (text, name) => new RegExp(`\\b${escapeRegExp(name)}\\b`).test(text);

test('每个 preset 恰有一条 skill-filesystem；Lead 例外可装角色技能目录（D47）', () => {
  for (const role of ROLES) {
    const preset = loadPreset(role);
    const rows = preset.rows.filter((row) => row.id === 'skill-filesystem');
    assert.equal(rows.length, 1, `${role}: skill-filesystem 行必须恰有一条（当前 ${rows.length}）`);
    const dirs = rows[0]?.config?.customSkillDirs;
    assert.ok(Array.isArray(dirs) && dirs.length >= 1, `${role}: customSkillDirs 必须至少有一个目录`);
    const roots = [...new Set(dirs.flatMap((d) => [...String(d).matchAll(/presets\/[a-z0-9-]+\/skills/g)].map((match) => match[0])))].sort();
    const expected = role === 'lead'
      ? RESEARCH_ROLES.map((r) => `presets/${r}/skills`).sort()
      : [`presets/${role}/skills`];
    assert.deepEqual(roots, expected,
      `${role}: skill 根不符合合同（实际：${roots.join(', ') || '（无）'}）`);
  }
});

test('skill-filesystem 与 tool-skill 成对：有目录就必须有加载工具', () => {
  for (const role of ROLES) {
    const preset = loadPreset(role);
    assert.ok(rowById(preset.rows, 'skill-filesystem'), `${role}: 缺 skill-filesystem 行`);
    assert.ok(rowById(preset.rows, 'tool-skill'),
      `${role}: 装了 skill 目录却没有 tool-skill——模型看得到技能名，读不到正文`);
  }
});

test('技能名跨角色唯一', () => {
  const owners = new Map();
  for (const role of ROLES) {
    for (const skill of skillsOf(role)) {
      const list = owners.get(skill) ?? [];
      list.push(role);
      owners.set(skill, list);
    }
  }
  const duplicates = [...owners.entries()].filter(([, list]) => list.length > 1);
  assert.deepEqual(duplicates, [], `技能名重复：${duplicates.map(([name, list]) => `${name}（${list.join('/')}）`).join('、')}`);
});

test('每个技能都有消费面：自己的 persona / 手册 / 同角色另一个技能至少点名一次', () => {
  const orphans = [];
  for (const role of ROLES) {
    const persona = rowById(loadPreset(role).rows, 'persona')?.config?.prefix;
    const ownSkills = skillsOf(role).map((skill) => ({
      path: `${role}/${skill}`,
      text: readFileSync(join(PACK, 'presets', role, 'skills', skill, 'SKILL.md'), 'utf8'),
    }));
    for (const skill of skillsOf(role)) {
      const own = `${role}/${skill}`;
      const sources = [
        ...(typeof persona === 'string' ? [{ path: `${role}:persona`, text: persona }] : []),
        { path: 'content/manual.md', text: MANUAL },
        ...WORKER_PERSONAS,
        ...ownSkills.filter((source) => source.path !== own),
      ];
      if (!sources.some((source) => mentioned(source.text, skill))) orphans.push(own);
    }
  }
  assert.deepEqual(orphans, [], `孤儿技能（自己的 persona/手册/同角色技能都没有点名）：${orphans.join('、')}`);
});

test('每个技能 frontmatter name = 目录名，description 非空', () => {
  for (const role of ROLES) {
    for (const skill of skillsOf(role)) {
      const path = join(PACK, 'presets', role, 'skills', skill, 'SKILL.md');
      const text = readFileSync(path, 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
      assert.ok(match, `${role}/${skill}: SKILL.md 缺 frontmatter`);
      assert.match(match[1], new RegExp(`^name:\\s*${escapeRegExp(skill)}\\s*$`, 'm'),
        `${role}/${skill}: frontmatter name ≠ 目录名`);
      assert.match(match[1], /^description:\s*\S.+$/m, `${role}/${skill}: description 必须非空`);
    }
  }
});

test('行里出现的 agentPreset / allowedAgentPresets 都指向盘上角色', () => {
  for (const role of ROLES) {
    const preset = loadPreset(role);
    for (const row of preset.rows) {
      const config = row?.config;
      if (config === null || typeof config !== 'object' || Array.isArray(config)) continue;
      const refs = [];
      if (typeof config.agentPreset === 'string') refs.push(config.agentPreset);
      if (Array.isArray(config.allowedAgentPresets)) refs.push(...config.allowedAgentPresets);
      for (const ref of refs) {
        assert.ok(ROLE_SET.has(ref), `${role}: ${row.id} 引用了不存在的 agentPreset「${ref}」（角色或 worker）`);
      }
    }
  }
});
