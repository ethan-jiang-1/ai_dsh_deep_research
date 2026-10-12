// replay-scene 回归 — 场景声明消费判据（roster / 来源形状 / 路径越界 fail-loud）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../scripts/lib/roles.mjs';
import { loadReplayScene } from '../scripts/lib/replay-scene.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROLES = presetRoles(ROOT);
const JUDGES = ['persona', 'headers', 'agent-instructions', 'skill-catalog', 'runtime-context'];
const SOURCE = { codeAnchor: 'unknown-historical', vendor: 'unknown-historical', recordedAt: 'unknown-historical', recording: 'live' };

function scene(t) {
  const tempRoot = realpathSync(tmpdir());
  const dir = realpathSync(mkdtempSync(join(tempRoot, 'replay-scene-test-')));
  t.after(() => {
    const target = resolve(dir);
    assert.ok(isAbsolute(target) && dirname(target) === tempRoot && target.startsWith(join(tempRoot, 'replay-scene-test-')));
    assert.equal(realpathSync(target), target);
    rmSync(target, { recursive: true, force: true });
  });
  const manifest = {
    version: 1, scenario: 'research-face', profile: 'research', workspace: 'research-workspace', sessionFormat: 4,
    cases: ROLES.map((id) => ({
      id, preset: id, fixture: id === 'lead' ? 'session.v4.jsonl' : `${id}/session.v4.jsonl`,
      ...(id === 'lead' ? { renderExpected: 'ui.expected.md' } : {}), source: { ...SOURCE },
    })),
  };
  for (const item of manifest.cases) {
    mkdirSync(dirname(join(dir, item.fixture)), { recursive: true });
    writeFileSync(join(dir, item.fixture), '{}\n');
  }
  writeFileSync(join(dir, 'ui.expected.md'), 'expected render\n');
  const save = () => writeFileSync(join(dir, 'snapshot.json'), JSON.stringify(manifest));
  save();
  return { dir, manifest, save };
}

test('loads the complete role scene as absolute files with all required judges', (t) => {
  const { dir, manifest } = scene(t);
  const loaded = loadReplayScene(dir, ROLES);
  assert.equal(loaded.scenario, 'research-face');
  assert.equal(loaded.profile, 'research');
  assert.equal(loaded.workspace, 'research-workspace');
  assert.equal(loaded.sessionFormat, 4);
  assert.deepEqual(loaded.cases.map((c) => c.id), ROLES);
  for (const c of loaded.cases) {
    const original = manifest.cases.find((item) => item.id === c.id);
    assert.equal(c.preset, c.id);
    assert.equal(c.fixture, join(dir, original.fixture));
    assert.ok(isAbsolute(c.fixture));
    assert.equal(c.renderExpected, c.id === 'lead' ? join(dir, 'ui.expected.md') : null);
    assert.deepEqual(c.judges, JUDGES);
    assert.deepEqual(c.source, SOURCE);
  }
});

test('validates the whole role roster before ONLY selects one case', (t) => {
  const { dir, manifest, save } = scene(t);
  assert.deepEqual(loadReplayScene(dir, ROLES, { only: 'lead' }).cases.map((c) => c.id), ['lead']);
  for (const only of ['typo', '']) assert.throws(() => loadReplayScene(dir, ROLES, { only }), /only/i);
  for (const roles of [[], [ROLES[0], ROLES[0]], ['foreign'], null]) {
    assert.throws(() => loadReplayScene(dir, roles), /roles|roster/i);
  }
  const original = structuredClone(manifest.cases);
  for (const cases of [[], original.slice(1), [...original, original[0]], [...original, { ...original[0], id: 'extra' }]]) {
    manifest.cases = cases;
    save();
    assert.throws(() => loadReplayScene(dir, ROLES, { only: 'lead' }), /cases|role|duplicate/i);
  }
  manifest.cases = original;
  manifest.cases[0].preset = ROLES.find((r) => r !== manifest.cases[0].id);
  save();
  assert.throws(() => loadReplayScene(dir, ROLES), /preset/i);
});

test('rejects unsupported schema, missing identity and incomplete judge coverage', (t) => {
  const { dir, manifest, save } = scene(t);
  const original = structuredClone(manifest);
  const mutations = [
    (m) => { m.version = 2; },
    (m) => { m.sessionFormat = 3; },
    (m) => { m.sessionFormat = '4'; },
    (m) => { delete m.scenario; },
    (m) => { m.profile = ''; },
    (m) => { delete m.workspace; },
    (m) => { delete m.cases[0].fixture; },
    (m) => { delete m.cases.find((c) => c.id === 'lead').renderExpected; },
    (m) => { delete m.cases[0].source; },
    (m) => { delete m.cases[0].source.recordedAt; },
    (m) => { m.cases[0].source.vendor = ''; },
    (m) => { m.cases[0].judges = JUDGES.slice(0, -1); },
    (m) => { m.cases[0].judges = [...JUDGES, 'persona']; },
    (m) => { m.cases[0].judges = [...JUDGES.slice(0, -1), 'unregistered']; },
  ];
  for (const mutate of mutations) {
    Object.assign(manifest, structuredClone(original));
    mutate(manifest);
    save();
    assert.throws(() => loadReplayScene(dir, ROLES), /version|sessionFormat|scenario|profile|workspace|fixture|renderExpected|source|judges/i);
  }
  Object.assign(manifest, structuredClone(original));
  manifest.cases[0].judges = [...JUDGES].reverse();
  manifest.cases[0].source = { codeAnchor: 'a'.repeat(40), vendor: 'b'.repeat(40), recordedAt: '2026-10-05T01:02:03Z', recording: 'live' };
  save();
  const c = loadReplayScene(dir, ROLES).cases[0];
  assert.deepEqual(c.judges, JUDGES);
  assert.deepEqual(c.source, manifest.cases[0].source);
});

test('rejects absolute, escaping, missing and non-file fixture or render paths even with ONLY', (t) => {
  const { dir, manifest, save } = scene(t);
  const original = structuredClone(manifest.cases);
  mkdirSync(join(dir, 'directory'));
  for (const field of ['fixture', 'renderExpected']) {
    for (const path of [join(dir, 'ui.expected.md'), '../ui.expected.md', 'nested/../../ui.expected.md', 'missing', 'directory', 'C:\\outside\\fixture', '..\\outside']) {
      manifest.cases = structuredClone(original);
      manifest.cases.find((c) => c.id !== 'lead')[field] = path;
      save();
      assert.throws(() => loadReplayScene(dir, ROLES, { only: 'lead' }), /fixture|renderExpected|path|file/i);
    }
  }
});

test('rejects symlink files, symlink parent directories and a symlink manifest', (t) => {
  const { dir, manifest, save } = scene(t);
  const original = structuredClone(manifest.cases);
  symlinkSync(join(dir, 'ui.expected.md'), join(dir, 'linked-file'));
  symlinkSync(join(dir, 'scout'), join(dir, 'linked-dir'));
  for (const field of ['fixture', 'renderExpected']) {
    for (const path of ['linked-file', 'linked-dir/session.v4.jsonl']) {
      manifest.cases = structuredClone(original);
      manifest.cases[0][field] = path;
      save();
      assert.throws(() => loadReplayScene(dir, ROLES), /symlink/i);
    }
  }
  manifest.cases = original;
  save();
  writeFileSync(join(dir, 'manifest-copy.json'), JSON.stringify(manifest));
  const target = resolve(dir, 'snapshot.json');
  assert.equal(dirname(target), dir);
  rmSync(target);
  symlinkSync(join(dir, 'manifest-copy.json'), target);
  assert.throws(() => loadReplayScene(dir, ROLES), /symlink/i);
});

test('limits workspace to a repository relative directory', (t) => {
  const { dir, manifest, save } = scene(t);
  for (const workspace of [ROOT, '../outside', 'nested/../../outside', '.', 'C:\\outside', '..\\outside', 'scripts/lib/roles.mjs', 'missing-workspace']) {
    manifest.workspace = workspace;
    save();
    assert.throws(() => loadReplayScene(dir, ROLES), /workspace/i);
  }
});

test('rejects reusing another role fixture and reports unreadable manifests with scene identity', (t) => {
  const { dir, manifest, save } = scene(t);
  manifest.cases[1].fixture = manifest.cases[0].fixture;
  save();
  assert.throws(() => loadReplayScene(dir, ROLES), /duplicate.*fixture/i);
  for (const content of ['{', 'null', '[]']) {
    writeFileSync(join(dir, 'snapshot.json'), content);
    assert.throws(() => loadReplayScene(dir, ROLES), (error) => {
      assert.ok(error.message.includes(dir));
      assert.match(error.message, /snapshot\.json|manifest/i);
      return true;
    });
  }
});

test('accepts paths containing spaces and optional non-lead render files', (t) => {
  const { dir, manifest, save } = scene(t);
  mkdirSync(join(dir, 'with spaces'));
  writeFileSync(join(dir, 'with spaces', 'record.jsonl'), '{}\n');
  const c = manifest.cases.find((item) => item.id !== 'lead');
  c.fixture = 'with spaces/record.jsonl';
  c.renderExpected = 'ui.expected.md';
  save();
  const loaded = loadReplayScene(dir, ROLES, { only: c.id }).cases[0];
  assert.equal(loaded.fixture, join(dir, 'with spaces', 'record.jsonl'));
  assert.equal(loaded.renderExpected, join(dir, 'ui.expected.md'));
});

test('provenance must be a checkable anchor or the honest unknown marker, never junk', (t) => {
  const { dir, manifest, save } = scene(t);
  const original = structuredClone(manifest);
  const junk = [
    ['codeAnchor', 'some-commit'], ['codeAnchor', 'A'.repeat(40)], ['codeAnchor', 'abc'],
    ['vendor', 'latest'], ['vendor', '639ed015'],
    ['recordedAt', 'yesterday'], ['recordedAt', '2026-13-45'],
    ['recording', ''],
  ];
  for (const [field, value] of junk) {
    Object.assign(manifest, structuredClone(original));
    manifest.cases[0].source[field] = value;
    save();
    assert.throws(() => loadReplayScene(dir, ROLES), /source\.|hex|timestamp/i, `${field}=${value}`);
  }
  // 合法两形态：真实锚 + 如实标记的历史缺失。
  Object.assign(manifest, structuredClone(original));
  manifest.cases[0].source = { codeAnchor: 'a'.repeat(40), vendor: 'b'.repeat(40), recordedAt: '2026-10-09T10:22:29.125Z', recording: 'live' };
  manifest.cases[1].source = { ...SOURCE };
  save();
  assert.equal(loadReplayScene(dir, ROLES).cases.length, ROLES.length);
});
