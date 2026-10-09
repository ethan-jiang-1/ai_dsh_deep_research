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
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { zstdCompressSync, constants } from 'node:zlib';
import { resolveSessionLog, decompressSessionLog } from '../scripts/lib/session-log.mjs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSessionEvents, toolCallCount, hitlPendingOf, turnOpenOf, bundleStateOf, runStateOf, askIndefiniteOf, eventsRegressed } from '../scripts/lib/run-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIX = (name) => join(ROOT, 'tests', 'fixtures', 'run-state', `${name}.jsonl`);
const loadFix = (name) => readSessionEvents(FIX(name));

// 公共读取接口：真实 append 帧按顺序拼接；坏尾帧不能用旧前缀冒充完整事实。
test('读取器：多帧压缩日志与不可读坏尾（原生解压）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-log-'));
  try {
    const log = join(tmp, 'session.v4.jsonl.zstd');
    const first = zstdCompressSync(Buffer.from('{"type":"turn/start"}\n'));
    const second = zstdCompressSync(Buffer.from('{"type":"turn/end"}\n'));
    writeFileSync(log, Buffer.concat([first, second]));
    assert.deepEqual(readSessionEvents(log), { readable: true, events: [{ type: 'turn/start' }, { type: 'turn/end' }] });
    writeFileSync(log, Buffer.concat([first, second.subarray(0, 5)]));
    assert.deepEqual(readSessionEvents(log), { readable: false, events: [] });
    const checksummed = zstdCompressSync(Buffer.from('{"type":"turn/end"}\n'), { params: { [constants.ZSTD_c_checksumFlag]: 1 } });
    for (let i = 0; i < checksummed.length; i++) {
      writeFileSync(log, Buffer.concat([first, checksummed.subarray(0, i)]));
      if (i > 0) assert.equal(readSessionEvents(log).readable, false, `截断 ${i} 字节不能成为完整日志`);
    }
    assert.equal(decompressSessionLog(first, null), null, '解压能力缺席不启动外部命令');
    writeFileSync(log, Buffer.concat([first, zstdCompressSync(Buffer.from('{bad-json}\n'))]));
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

test('bundleStateOf：位置=状态——工作区根 drt_* 才是在飞；final 在场 ≠ run 落定', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-'));
  try {
    let s = bundleStateOf(tmp);
    assert.deepEqual([s.bundles, s.activeBundle, s.finalWritten], [[], null, false]);
    mkdirSync(join(tmp, 'drt_probe'));
    s = bundleStateOf(tmp);
    assert.equal(s.activeBundle, 'drt_probe');
    assert.equal(s.finalWritten, false, '无 final.md');
    writeFileSync(join(tmp, 'drt_probe', 'final.md'), '# 交付');
    s = bundleStateOf(tmp);
    assert.equal(s.finalWritten, true);
    // archive/ 不计在飞（位置=状态：已交付归档不在根）
    mkdirSync(join(tmp, 'archive', 'drt_old'), { recursive: true });
    assert.equal(bundleStateOf(tmp).bundles.length, 1, 'archive/ 下的 drt_* 不算在飞');
  } finally { rmSync(tmp, { recursive: true, force: true }) }
});

test('runStateOf 组合：finalWritten=true + turnOpen=true → runSettled=false（判定过急的教训）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-state-ws-'));
  try {
    mkdirSync(join(tmp, 'drt_x'));
    writeFileSync(join(tmp, 'drt_x', 'final.md'), '# 交付');
    const s = runStateOf({ logPath: FIX('pending'), wsRoot: tmp });
    // pending 夹具：回合开着 + final 在场——第 12 场实录形态（final 落盘 ≠ 完成）
    assert.equal(s.hitlPending, true);
    assert.equal(s.finalWritten, true);
    assert.equal(s.turnOpen, true);
    assert.equal(s.runSettled, false, '回合未终 → 不许报落定');
    assert.equal(s.presentCalls, 0);
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
import { leadHitlCandidate } from '../scripts/lib/run-state.mjs';

test('选卡面收窄：runStateOf 暴露会话头 agentPreset，lead 挂起 = 唯一合法候选（件⑨）', () => {
  const tmp = join(ROOT, 'tests', '.tmp-run-state-probe');
  mkdirSync(tmp, { recursive: true });
  try {
    const lead = runStateOf({ logPath: FIX('pending'), wsRoot: tmp });
    assert.equal(lead.preset, 'lead', '会话头 agentPreset 必须透出');
    assert.equal(leadHitlCandidate(lead), true, 'lead 真挂起 = 合法候选');
    const mate = runStateOf({ logPath: FIX('teammate-pending'), wsRoot: tmp });
    assert.equal(mate.preset, 'critic');
    assert.equal(leadHitlCandidate(mate), false, '队友挂起不可选——误答队友陈旧卡反模式');
    const none = runStateOf({ logPath: FIX('no-card'), wsRoot: tmp });
    assert.equal(leadHitlCandidate(none), false, '无挂起 = 非候选');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
