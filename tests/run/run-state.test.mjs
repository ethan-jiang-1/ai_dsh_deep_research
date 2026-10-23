// run-state 回归 — run 操作面状态谓词（keyless；夹具 = 第 12 场真实会话日志的三个时点投影，
// tests/fixtures/run-state/，并构造原生 zstd 多帧与损坏尾帧；测试路径零子进程）。
//
// 负例留证 2026-10-09：BUG-005——askIndefiniteOf 不认 wait:-1（恒 false/null）→ 对应测红；还原 → 绿。
// 负例留证 2026-10-09：BUG-007——eventsRegressed 判定恒 false（不认事件数回退）→ 对应测红；还原 → 绿。
//
// grep 陷阱是本测试的核心断言对象（RFC run-ops-self-diagnosis 的立案证据）：三个夹具的
// **文本**都含 'ask_user_question'（request/header 工具 schema 必带——grep 判定必然假阳性），
// 而谓词只认 tool/call 事件的形状——夹具文本含陷阱字样 + 谓词判 0/挂起正确，这一对就是红绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, utimesSync } from 'node:fs';
import { zstdCompressSync, constants } from 'node:zlib';
import { resolveSessionLog, sessionLogsInGroup, decompressSessionLog } from '../../scripts/lib/session-log.mjs';
import { zstdFrame, writeZstdLog } from '../fixtures/events.mjs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSessionEvents, toolCallCount, hitlPendingOf, turnOpenOf, bundleStateOf, runStateOf, sessionTitleOf, askIndefiniteOf, eventsRegressed } from '../../scripts/lib/run-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIX = (name) => join(ROOT, 'tests', 'fixtures', 'run-state', `${name}.jsonl`);
const loadFix = (name) => readSessionEvents(FIX(name));

// 公共读取接口：真实 append 帧按顺序拼接；坏尾帧不能用旧前缀冒充完整事实。
test('读取器：多帧压缩日志与不可读坏尾（原生解压）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-log-'));
  try {
    const log = join(tmp, 'session.v4.jsonl.zstd');
    // 帧构造正本 = tests/fixtures/events.mjs（zstdFrame / writeZstdLog）；checksum 特参帧与
    // 逐字节截断手术留在本地——它们是本测试的主语（读取器要扛的损坏形态），不是样板。
    const first = zstdFrame('{"type":"turn/start"}\n');
    const second = zstdFrame('{"type":"turn/end"}\n');
    writeZstdLog(log, [first, second]);
    assert.deepEqual(readSessionEvents(log), { readable: true, events: [{ type: 'turn/start' }, { type: 'turn/end' }] });
    writeZstdLog(log, [first, second.subarray(0, 5)]);
    assert.deepEqual(readSessionEvents(log), { readable: false, events: [] });
    const checksummed = zstdCompressSync(Buffer.from('{"type":"turn/end"}\n'), { params: { [constants.ZSTD_c_checksumFlag]: 1 } });
    for (let i = 0; i < checksummed.length; i++) {
      writeZstdLog(log, [first, checksummed.subarray(0, i)]);
      if (i > 0) assert.equal(readSessionEvents(log).readable, false, `截断 ${i} 字节不能成为完整日志`);
    }
    assert.equal(decompressSessionLog(first, null), null, '解压能力缺席不启动外部命令');
    writeZstdLog(log, [first, '{bad-json}\n']);
    assert.equal(readSessionEvents(log).readable, false, '坏 JSONL 行不能静默跳过形成旧前缀');
    assert.equal(runStateOf({ logPath: join(tmp, 'missing.zstd'), wsRoot: tmp }).readable, false, '缺席压缩日志同样零子进程');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('日志选择：最新 canonical 代优先，缺席不猜路径', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-select-'));
  try {
    assert.equal(resolveSessionLog(tmp), null);
    const old = join(tmp, 'session.v3.jsonl.zstd');
    writeFileSync(old, 'old');
    assert.equal(resolveSessionLog(tmp), old);
    const uncompressed = join(tmp, 'session.v4.jsonl');
    writeFileSync(uncompressed, '{"type":"turn/end"}\n');
    assert.equal(resolveSessionLog(tmp), uncompressed, 'v4 未压缩日志优先于 v3 压缩日志');
    rmSync(uncompressed);
    const current = join(tmp, 'session.v4.jsonl.zstd');
    writeFileSync(current, 'unreadable newer generation');
    assert.equal(resolveSessionLog(tmp), current);
    assert.equal(readSessionEvents(current).readable, false);
    assert.equal(resolveSessionLog(tmp), current, '新日志损坏时不降级到旧的挂起态');
    rmSync(current);
    symlinkSync(join(tmp, 'missing-target'), current);
    assert.equal(resolveSessionLog(tmp), current, 'v4 断链目录项仍在场，不能降级到 v3');
    assert.deepEqual(readSessionEvents(current), { readable: false, events: [] });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('组内会话日志：按 canonical 路径及 mtime 列出，坏的新日志不降级为挂起候选', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-group-'));
  const group = join(tmp, 'research-workspace');
  const readable = readFileSync(FIX('no-card'));
  const pending = readFileSync(FIX('pending'));
  const base = Date.parse('2026-01-01T00:00:00Z');
  mkdirSync(group);
  const put = (sessionId, files, rank) => {
    const dir = join(group, sessionId);
    mkdirSync(dir);
    for (const [name, contents] of files) writeFileSync(join(dir, name), contents);
    const canonicalName = basename(resolveSessionLog(dir));
    const when = new Date(base + rank * 60_000);
    utimesSync(join(dir, canonicalName), when, when);
  };
  try {
    put('v4-compressed', [['session.v4.jsonl.zstd', zstdFrame(readable)]], 4);
    put('v4-plain', [['session.v4.jsonl', readable]], 3);
    put('v3-compressed', [['session.v3.jsonl.zstd', zstdFrame(readable)]], 2);
    put('v3-plain', [['session.v3.jsonl', readable]], 1);
    // The higher generation is present but unreadable. Its older v3 sibling contains a real lead-pending
    // shape and must not be resurrected as a candidate by fallback.
    put('broken-v4-no-downgrade', [
      ['session.v4.jsonl.zstd', Buffer.from('not a zstd frame')],
      ['session.v3.jsonl', pending],
    ], 5);
    mkdirSync(join(group, 'no-log'));
    const unrecognized = join(group, 'unrecognized');
    mkdirSync(unrecognized);
    writeFileSync(join(unrecognized, 'session.v5.jsonl'), pending);

    const sessions = sessionLogsInGroup(group);
    assert.deepEqual(sessions.map(({ sessionId }) => sessionId), [
      'broken-v4-no-downgrade', 'v4-compressed', 'v4-plain', 'v3-compressed', 'v3-plain',
    ]);
    const byId = new Map(sessions.map((session) => [session.sessionId, session]));
    for (const [sessionId, filename] of [
      ['v4-compressed', 'session.v4.jsonl.zstd'],
      ['v4-plain', 'session.v4.jsonl'],
      ['v3-compressed', 'session.v3.jsonl.zstd'],
      ['v3-plain', 'session.v3.jsonl'],
    ]) {
      assert.equal(byId.get(sessionId).logPath, join(group, sessionId, filename));
    }
    const broken = byId.get('broken-v4-no-downgrade');
    assert.equal(broken.logPath, join(group, 'broken-v4-no-downgrade', 'session.v4.jsonl.zstd'));
    const state = runStateOf({ logPath: broken.logPath, wsRoot: tmp });
    assert.equal(state.readable, false);
    assert.equal(state.hitlPending, null);
    assert.equal(leadHitlCandidate(state), false, '坏的新版日志不能借旧版挂起内容成为候选');
    assert.ok(sessions.every((session, i) => i === 0 || sessions[i - 1].mtimeMs >= session.mtimeMs), '结果按 mtime 降序');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('读取器：.jsonl 直读可解析（夹具路径零子进程）', () => {
  const { readable, events } = loadFix('answered');
  assert.equal(readable, true);
  assert.ok(events.length > 50, `事件数应 >50，实得 ${events.length}`);
});

test('三态：未发 → pending=false / askCalls=0（grep 陷阱在场也不误报）', () => {
  const { readable, events } = loadFix('no-card');
  assert.equal(readable, true);
  assert.equal(hitlPendingOf(events).pending, false);
  assert.equal(toolCallCount(events, 'ask_user_question'), 0);
  // 陷阱证明：夹具文本确含 'ask_user_question'（request/header 工具 schema）——
  // 字符串 grep 在此形态必然假阳性，谓词不误报 = 红绿的"绿"半边。
  assert.ok(readFileSync(FIX('no-card'), 'utf8').includes('ask_user_question'), '夹具须携带 grep 陷阱形态');
});

test('三态：挂起 → pending=true / askCalls=1（末位回合事件 = 未答 ask）', () => {
  const { events } = loadFix('pending');
  assert.equal(hitlPendingOf(events).pending, true);
  assert.equal(toolCallCount(events, 'ask_user_question'), 1);
  assert.equal(turnOpenOf(events), true, '回合仍开（turn/end 未落）');
});

test('三态：已答 → pending=false / askCalls=1（ask 之后有回合事件）', () => {
  const { events } = loadFix('answered');
  assert.equal(hitlPendingOf(events).pending, false);
  assert.equal(toolCallCount(events, 'ask_user_question'), 1);
});

test('toolCallCount 只认事件形状：request/header 里的 schema 字样不计入', () => {
  const { events } = loadFix('no-card');
  // no-card 夹具文本含 'ask_user_question'（schema），但真实调用为 0——形状计数与字符串包含的分界线
  assert.equal(toolCallCount(events, 'ask_user_question'), 0);
  assert.equal(toolCallCount(events, 'web_search'), 0, 'lead 会话立项前无检索调用');
  assert.equal(toolCallCount(events, '不存在的工具'), 0);
});

test('turnOpenOf：无回合事件 → false；仅 turn/start → true', () => {
  assert.equal(turnOpenOf([]), false);
  assert.equal(turnOpenOf([{ type: 'turn/start' }]), true);
  assert.equal(turnOpenOf([{ type: 'turn/start' }, { type: 'turn/end' }]), false);
});

test('bundleStateOf：只列工作区根清单（发现用，不代表状态）；不猜 active', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-'));
  try {
    let s = bundleStateOf(tmp);
    assert.deepEqual(s.bundles, []);
    assert.equal(Object.hasOwn(s, 'activeBundle'), false, '清单函数不猜会话归属——归属归 bundle-bind');
    assert.equal(Object.hasOwn(s, 'finalWritten'), false, '清单函数不猜落定——落定归 runStateOf');
    mkdirSync(join(tmp, 'drt_probe'));
    s = bundleStateOf(tmp);
    assert.deepEqual(s.bundles, ['drt_probe']);
    // D28：archive/ 不是“已交付”状态，只是操作桶；根清单只做发现，不把 archive 误报成在飞。
    mkdirSync(join(tmp, 'archive', 'drt_old'), { recursive: true });
    assert.equal(bundleStateOf(tmp).bundles.length, 1, '根清单只列根；archive 只用于发现');
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('sessionTitleOf：读取最新可用 session/title，并对缺席标题保持 null', () => {
  assert.equal(sessionTitleOf([
    { type: 'session/title', data: { title: '首次标题' } },
    { type: 'session/title', data: { title: '最新标题' } },
  ]), '最新标题');
  assert.equal(sessionTitleOf([{ type: 'session/title', data: { title: '  ' } }]), null);
  assert.equal(sessionTitleOf([]), null);
});

test('runStateOf 组合：会话绑定的 final 在场 + turnOpen=true → runSettled=false（判定过急的教训）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-ws-'));
  try {
    mkdirSync(join(tmp, 'drt_x'));
    writeFileSync(join(tmp, 'drt_x', 'final.md'), '# 交付');
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead' },
      { type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ path: 'drt_x/question.md' }) } },
      { type: 'turn/start' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    assert.equal(s.activeBundle, 'drt_x');
    assert.equal(s.bundleBinding, 'write');
    assert.equal(s.finalWritten, true);
    assert.equal(s.turnOpen, true);
    assert.equal(s.runSettled, false, '回合未终 → 不许报落定');
    assert.equal(s.presentCalls, 0);
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('runStateOf：多 bundle 时按会话绑定，不按字典序取最后一个（审计 P0-5 反证）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-multi-'));
  try {
    mkdirSync(join(tmp, 'drt_a'));
    mkdirSync(join(tmp, 'drt_z'));
    writeFileSync(join(tmp, 'drt_z', 'final.md'), '# 别的 run 的交付');
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead' },
      { type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ path: 'drt_a/question.md' }) } },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    // 旧实现按字典序取 drt_z → finalWritten=true/runSettled=true；本测试先红后绿。
    assert.equal(s.activeBundle, 'drt_a');
    assert.equal(s.finalWritten, false, 'drt_z 的 final 不得冒充本会话落定');
    assert.equal(s.runSettled, false);
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('runStateOf：无 bundle 绑定 → activeBundle/finalWritten 为 null，不猜（不拿别家 final 冒充）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-unbound-'));
  try {
    mkdirSync(join(tmp, 'drt_x'));
    writeFileSync(join(tmp, 'drt_x', 'final.md'), '# 别的 run');
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead' },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    assert.equal(s.activeBundle, null);
    assert.equal(s.bundleBinding, null);
    assert.equal(s.finalWritten, null);
    assert.equal(s.runSettled, false, '无绑定 = 未知，不是落定');
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('runStateOf：不可读日志 → readable=false 且挂起/计数为 null（不猜）', () => {
  const s = runStateOf({ logPath: join(ROOT, 'tests', 'fixtures', 'run-state', '不存在.jsonl'), wsRoot: join(ROOT, 'research-workspace') });
  assert.equal(s.readable, false);
  assert.equal(s.hitlPending, null);
  assert.equal(s.askCalls, null);
  assert.equal(s.runSettled, false, '不可读不许判落定');
});

test('askIndefiniteOf：最后一条 ask 带 wait:-1 → true（BUG-005：活等待的兜底语义不同）', () => {
  const events = [
    { type: 'turn/start' },
    { type: 'tool/call', data: { name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'a' }], wait: -1 }) } },
  ];
  assert.equal(askIndefiniteOf(events), true);
});

test('askIndefiniteOf：无 wait 参数 → false（preset 默认 600s timed 形态）', () => {
  const events = [{ type: 'tool/call', data: { name: 'ask_user_question', arguments: '{"questions":[{"id":"a"}]}' } }];
  assert.equal(askIndefiniteOf(events), false);
});

test('askIndefiniteOf：无 ask / 参数坏串 → null（形态未知，不猜测）', () => {
  assert.equal(askIndefiniteOf([{ type: 'turn/start' }]), null);
  assert.equal(askIndefiniteOf([{ type: 'tool/call', data: { name: 'ask_user_question', arguments: '{not json' } }]), null);
});

test('runStateOf 暴露 askIndefinite 字段（watcher 与代答工具的判定输入）', () => {
  const st = runStateOf({ logPath: FIX('answered'), wsRoot: join(ROOT, 'research-workspace') });
  assert.equal(st.askIndefinite, false, 'answered 夹具的 ask 无 wait 参数 → false');
});

test('eventsRegressed：同会话事件数回退 = 日志损坏信号（BUG-007：通道死亡丢尾）', () => {
  assert.equal(eventsRegressed(303, 158), true, '303 → 158 = 丢尾，必须报警');
  assert.equal(eventsRegressed(158, 158), false, '持平不是回退');
  assert.equal(eventsRegressed(158, 303), false, '增长是正常追加');
});

test('eventsRegressed：首轮无前值 / 不可读态 → false（不误报，报警只认确凿回退）', () => {
  assert.equal(eventsRegressed(null, 158), false, '无前值无从比较');
  assert.equal(eventsRegressed(303, null), false, '当前不可读（截断帧/路径错）由 readable 单独暴露');
});

// ── 盘侧谓词选卡面收窄（审计 P3 件⑨）——先红后绿：preset 字段与谓词未实现时本节即红 ──
import { leadHitlCandidate } from '../../scripts/lib/run-state.mjs';

// ── teammate 信号（2026-10-21 卫生轮 维度6 件②）——先红后绿：teammate 字段未实现时本节即红 ──
// 背景：teammate 会话首事件 agentPreset 继承 "lead"（实盘 336/550 场 origin=subagent 且
// agentPreset=lead），只读 events[0].agentPreset 会让「盯的是非 lead 会话」提醒对 teammate
// 永不触发。真实身份信号 = 首事件 origin==='subagent'。

test('teammate 信号：首事件 origin=subagent → teammate=true（agentPreset 继承 lead 不表身份）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-mate-'));
  try {
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead', origin: 'subagent' },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    assert.equal(s.preset, 'lead', 'preset 字段仍是继承值（加性不动）');
    assert.equal(s.teammate, true, 'origin=subagent 才是 teammate 的身份信号');
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('teammate 信号：无 origin（顶层会话）→ teammate=false；不可读 → null（不猜）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-top-'));
  try {
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'critic' },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    assert.equal(runStateOf({ logPath: log, wsRoot: tmp }).teammate, false, 'kickoff 建的顶层 critic 会话不是 teammate');
    assert.equal(runStateOf({ logPath: join(tmp, 'missing.jsonl'), wsRoot: tmp }).teammate, null, '不可读不猜');
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('选卡面收窄：runStateOf 暴露会话头 agentPreset，lead 挂起 = 唯一合法候选（件⑨）', () => {
  const tmp = join(ROOT, 'tests', '.tmp-run-state-probe');
  mkdirSync(tmp, { recursive: true });
  try {
    const ordinary = runStateOf({ logPath: FIX('pending'), wsRoot: tmp });
    assert.equal(Object.hasOwn(ordinary, 'sessionId'), false, '默认 watcher 投影不暴露 raw session ID');
    assert.equal(Object.hasOwn(ordinary, 'title'), false, '默认 watcher 投影不暴露会话标题');
    const lead = runStateOf({ logPath: FIX('pending'), wsRoot: tmp, includeSessionIdentity: true });
    assert.equal(lead.sessionId, 'session-2e246686-b978-48e5-a87f-3bbcdb255105', 'UI 目标 session ID 必须取自 canonical 日志头');
    assert.equal(lead.title, 'DSH 后续版本与 agent-team 转正', '显式标题子串必须来自最新 session/title');
    assert.equal(lead.preset, 'lead', '会话头 agentPreset 必须透出');
    assert.equal(leadHitlCandidate(lead), true, 'lead 真挂起 = 合法候选');
    const mate = runStateOf({ logPath: FIX('teammate-pending'), wsRoot: tmp });
    assert.equal(mate.preset, 'critic');
    assert.equal(leadHitlCandidate(mate), false, '队友挂起不可选——误答队友陈旧卡反模式');
    const none = runStateOf({ logPath: FIX('no-card'), wsRoot: tmp });
    assert.equal(leadHitlCandidate(none), false, '无挂起 = 非候选');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('runStateOf：D28 绑定 bundle 在 archive/ 时 final 仍可判、runSettled 不因位置失真', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-archive-'));
  try {
    mkdirSync(join(tmp, 'archive', 'drt_x'), { recursive: true });
    writeFileSync(join(tmp, 'archive', 'drt_x', 'final.md'), '# 交付');
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead' },
      { type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ path: 'drt_x/question.md' }) } },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    assert.equal(s.activeBundle, 'drt_x');
    assert.equal(s.bundleLocation, 'archive');
    assert.equal(s.finalWritten, true);
    assert.equal(s.runSettled, true);
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('runStateOf：D28 绑定 bundle 在 _abandoned/ 时 final 仍可判、bundleLocation=abandoned', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-abandoned-'));
  try {
    mkdirSync(join(tmp, '_abandoned', 'drt_p'), { recursive: true });
    writeFileSync(join(tmp, '_abandoned', 'drt_p', 'final.md'), '# 停放但已有终稿');
    const log = join(tmp, 's.jsonl');
    writeFileSync(log, [
      { type: 'session', id: 's', agentPreset: 'lead' },
      { type: 'tool/call', data: { name: 'write', arguments: JSON.stringify({ path: 'drt_p/question.md' }) } },
      { type: 'turn/start' },
      { type: 'turn/end' },
    ].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const s = runStateOf({ logPath: log, wsRoot: tmp });
    assert.equal(s.activeBundle, 'drt_p');
    assert.equal(s.bundleLocation, 'abandoned');
    assert.equal(s.finalWritten, true);
    assert.equal(s.runSettled, true);
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});
