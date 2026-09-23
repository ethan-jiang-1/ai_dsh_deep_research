// presets 结构回归 — 与 scripts/verify.mjs 门禁 3/5/6 同源判据（keyless，进程内文件断言）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK = join(ROOT, 'packages', 'deep-research-pack');
const PRESETS = join(PACK, 'presets');
const ROLES = ['lead', 'scout', 'analyst', 'critic'];

test('四角色 preset 齐备且 id 规范', () => {
  const dirs = readdirSync(PRESETS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.deepEqual([...dirs].sort(), [...ROLES].sort());
  for (const id of dirs) assert.match(id, /^[a-z0-9][a-z0-9-]*$/);
});

test('每个角色三件套完整', () => {
  for (const r of ROLES) {
    const dir = join(PRESETS, r);
    assert.ok(existsSync(join(dir, 'preset.yml')), `${r}: preset.yml`);
    assert.ok(existsSync(join(dir, 'agent.cordis.yml')), `${r}: agent.cordis.yml`);
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
    ...ROLES.map((r) => join(PRESETS, r, 'agent.cordis.yml')),
    join(PACK, 'cordis.patch.yml'),
  ];
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      assert.ok(peers.has(m[1]), `${f}: ${m[1]} 不在 peerDependencies`);
    }
  }
});

test('bundle patch：roster 替换行 + 团队/web/present insert 行在位', () => {
  const yml = readFileSync(join(PACK, 'cordis.patch.yml'), 'utf8');
  // 替换行：agent-presets（default: lead，roots 指向本包 presets）
  assert.match(yml, /^- id: agent-presets$/m);
  assert.match(yml, /default: lead/);
  assert.match(yml, /node_modules\/dsh-deep-research-pack\/presets\//);
  // insert 行：web 三件 + present + 团队三件。用行锚定分割：真 insert 标记在列 0 整行
  // （`^- insert:$`），注释里的字面量提及（行中、反引号内）不会误命中——首版测试在这里
  // 被 cordis.patch.yml 第 3 行注释打红过，教训：结构性断言锚定结构特征，不锚定子串。
  const insertBlock = yml.split(/^- insert:$/m)[1] ?? '';
  for (const row of [
    'tool-web', 'web-search', 'web-fetch', 'tool-present',
    'agent-team', 'tool-agent-team', 'ui-agent-team',
  ]) {
    assert.match(insertBlock, new RegExp(`^\\s*- id: ${row}$`, 'm'), `insert 行缺失: ${row}`);
  }
});

test('compatibility 矩阵钉住当前 tag', () => {
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dsh.compatibility.dshReleases, ['dsh-v0.1.5-rc.2']);
});
