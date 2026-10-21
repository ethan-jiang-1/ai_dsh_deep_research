// session-replay 回归 — 历史会话解析与判读整形（2026-10-21，反馈通路事后半边）。
//
// 为什么有这条测试：`session-replay` 的浏览器半边（起通道 → 登记工作区 → 按 id 打开）只能实走证；
// 但"给定一个 id 或标题，能不能可靠地找到那场会话、它的 cwd 是什么、歧义时是否如实报候选"
// 是纯逻辑，必须先钉住——否则工具在会话多的时候会静默选错人（`findGroup` 取首个命中的同款风险）。
//
// 负例留证 2026-10-21：①模块缺席即红（本文件先于 lib 落地）；②sabotage 去掉歧义判定（返回首个
// 命中当 found）→「标题歧义」用例红；③sabotage 标题匹配改成大小写敏感/前缀而非子串 → 「子串
// 命中」用例红；均 edit 还原后绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  listSessionDirs,
  resolveSessionQuery,
  sessionMetaOf,
  formatReplaySummary,
} from '../../scripts/lib/session-replay.mjs';

const ev = (o) => JSON.stringify(o);

/** 造一个 sessions 根：两个组，三场会话（含标题、不同 cwd）。 */
const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'sess-replay-'));
  const mk = (group, id, { cwd = '/tmp/ws', title = null, preset = 'lead', origin = null, raw = null } = {}) => {
    const dir = join(root, group, id);
    mkdirSync(dir, { recursive: true });
    const lines = [
      ev({ type: 'session', version: 4, id, createdAt: 1700000000000, cwd, agentPreset: preset, ...(origin ? { origin } : {}) }),
      ev({ type: 'turn/start', data: {} }),
    ];
    if (title !== null) lines.push(ev({ type: 'session/title', data: { title } }));
    writeFileSync(join(dir, 'session.v4.jsonl'), raw ?? `${lines.join('\n')}\n`);
    return dir;
  };
  mk('--Users-x-repo-research-workspace--', 'session-aaa', { cwd: '/Users/x/repo/research-workspace', title: '竞争格局调研 run' });
  mk('--Users-x-repo-research-workspace--', 'session-bbb', { cwd: '/Users/x/repo/research-workspace', title: '许可证对比 run' });
  mk('--Users-x-repo-runtime-smoke-workspace-lib-selftest--', 'session-ccc', { cwd: '/Users/x/repo/runtime/smoke-workspace/lib-selftest', title: '自测会话' });
  // 无日志的目录（残缺/被清）——必须跳过而不是崩
  mkdirSync(join(root, '--Users-x-repo-empty-group--', 'session-ddd'), { recursive: true });
  return root;
};

test('listSessionDirs：跨组枚举、按组子串过滤、缺日志的目录跳过', () => {
  const root = makeRoot();
  try {
    const all = listSessionDirs(root);
    assert.deepEqual(all.map((s) => s.sessionId).sort(), ['session-aaa', 'session-bbb', 'session-ccc'], '缺日志的会话不应入列');
    assert.ok(all.every((s) => s.logPath.endsWith('session.v4.jsonl')));
    const only = listSessionDirs(root, { groupSubstring: 'lib-selftest' });
    assert.deepEqual(only.map((s) => s.sessionId), ['session-ccc']);
    assert.deepEqual(listSessionDirs(join(root, 'nope')), [], '根缺席 = 空数组（CLI 壳负责 fail-loud）');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('resolveSessionQuery：全名 id 跨组直取（不做标题扫描）', () => {
  const root = makeRoot();
  try {
    const r = resolveSessionQuery({ sessionsRoot: root, query: 'session-bbb' });
    assert.equal(r.status, 'found');
    assert.equal(r.match.sessionId, 'session-bbb');
    assert.equal(r.match.group.includes('research-workspace'), true);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('resolveSessionQuery：标题唯一子串命中（"格局"→ 仅 aaa）', () => {
  const root = makeRoot();
  try {
    const r = resolveSessionQuery({ sessionsRoot: root, query: '格局' });
    assert.equal(r.status, 'found');
    assert.equal(r.match.sessionId, 'session-aaa');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('resolveSessionQuery：标题歧义 → ambiguous + 候选（不静默选第一个）', () => {
  const root = makeRoot();
  try {
    const r = resolveSessionQuery({ sessionsRoot: root, query: 'run' });
    assert.equal(r.status, 'ambiguous');
    assert.deepEqual(r.candidates.map((c) => c.sessionId).sort(), ['session-aaa', 'session-bbb']);
    assert.ok(r.candidates.every((c) => typeof c.title === 'string' && c.title.length > 0), '候选必须带标题，否则人无从选择');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('resolveSessionQuery：查无此会话 → not-found（带扫描数，便于判断是不是组过滤太窄）', () => {
  const root = makeRoot();
  try {
    const r = resolveSessionQuery({ sessionsRoot: root, query: '绝不存在的会话' });
    assert.equal(r.status, 'not-found');
    assert.equal(typeof r.scanned, 'number');
    assert.ok(r.scanned >= 3);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('resolveSessionQuery：坏日志不崩（不可读的会话不参与标题匹配）', () => {
  const root = makeRoot();
  try {
    mkdirSync(join(root, '--Users-x-repo-bad--', 'session-eee'), { recursive: true });
    writeFileSync(join(root, '--Users-x-repo-bad--', 'session-eee', 'session.v4.jsonl'), '{坏行\n');
    const r = resolveSessionQuery({ sessionsRoot: root, query: '格局' });
    assert.equal(r.status, 'found');
    assert.equal(r.match.sessionId, 'session-aaa');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('sessionMetaOf：取 cwd / 标题 / preset / origin；无 session 事件 → 不可读', () => {
  const meta = sessionMetaOf([
    { type: 'session', id: 'session-x', cwd: '/tmp/ws-x', agentPreset: 'lead', origin: 'subagent', createdAt: 12 },
    { type: 'session/title', data: { title: '某场 run' } },
  ]);
  assert.deepEqual(
    { cwd: meta.cwd, title: meta.title, preset: meta.agentPreset, origin: meta.origin, createdAt: meta.createdAt },
    { cwd: '/tmp/ws-x', title: '某场 run', preset: 'lead', origin: 'subagent', createdAt: 12 },
  );
  const bad = sessionMetaOf([{ type: 'turn/start' }]);
  assert.equal(bad.cwd, null);
  assert.equal(bad.title, null);
});

test('formatReplaySummary：判读行含会话/工作区/日志/场景包四要素与诚实边界', () => {
  const lines = formatReplaySummary({
    sessionId: 'session-aaa',
    group: '--g--',
    cwd: '/Users/x/repo/research-workspace',
    title: '竞争格局调研 run',
    logPath: '/r/--g--/session-aaa/session.v4.jsonl',
    sceneDir: '/r/runtime/scenes/replay-1',
    openedVia: 'row',
  });
  const text = lines.join('\n');
  for (const needle of ['session-aaa', '/Users/x/repo/research-workspace', 'session.v4.jsonl', '/r/runtime/scenes/replay-1']) {
    assert.ok(text.includes(needle), `判读行缺 ${needle}`);
  }
  assert.ok(/现在的客户端|不是像素级|当时/.test(text), '判读行必须写明诚实边界（现在的客户端代码 + 当年的数据）');
});
