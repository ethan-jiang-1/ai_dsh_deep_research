// replay-request 回归 — 组装请求面比较判据（注入种类 / 定向归一化边界）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareReplayRequests, unjudgedInjectionKinds, unexpectedInjectionKinds, sentinelInAssistantText, turnCompleted } from '../scripts/lib/replay-request.mjs';
import { presetRoles } from '../scripts/lib/roles.mjs';
import { fileURLToPath } from 'node:url';

const roles = presetRoles(fileURLToPath(new URL('..', import.meta.url)));

const fixture = (role = 'lead') => readFileSync(new URL(
  `../snapshots/replay/research-face/${role === 'lead' ? '' : `${role}/`}session.v4.jsonl`, import.meta.url,
), 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
const IDS = ['persona', 'headers', 'agent-instructions', 'skill-catalog', 'runtime-context'];
const messageOf = (event) => event.type === 'system/message' ? event.data.message : event.data;
const byKind = (events, kind) => events.find((event) => (
  ['system/message', 'user/message'].includes(event.type) && messageOf(event).source?.kind === kind
));
const verdict = (expected, actual, id) => compareReplayRequests(expected, actual).find((item) => item.id === id);
const matchesCriterion = (event, id) => id === 'headers' ? event.type === 'request/header'
  : event.type === (id === 'persona' ? 'system/message' : 'user/message')
    && messageOf(event).source?.kind === (id === 'persona' ? 'system-prompt' : id);

test('a later request header model change fails even when the first header matches', () => {
  const expected = fixture();
  expected.push(structuredClone(expected.find((event) => event.type === 'request/header')));
  const actual = structuredClone(expected);
  actual.at(-1).data.header.config.model = 'changed-later-model';
  assert.equal(verdict(expected, actual, 'headers').ok, false);
});

for (const id of IDS) {
  test(`${id} fails if its required kind is absent on either side or both`, () => {
    const complete = fixture();
    const missing = complete.filter((event) => !matchesCriterion(event, id));
    for (const [expected, actual] of [[complete, missing], [missing, complete], [missing, missing]]) {
      const result = verdict(expected, actual, id);
      assert.equal(result.ok, false);
      assert.match(result.detail, /absent/);
    }
  });
}

test('empty logs never pass a required criterion', () => {
  assert.deepEqual(compareReplayRequests([], []).map(({ ok }) => ok), [false, false, false, false, false]);
});

for (const id of ['persona', 'agent-instructions', 'skill-catalog', 'runtime-context']) {
  test(`${id} compares every occurrence and preserves message boundaries`, () => {
    const expected = fixture();
    const later = structuredClone(expected.find((event) => matchesCriterion(event, id)));
    expected.push(later);
    const actual = structuredClone(expected);
    messageOf(actual.at(-1)).content[0].text += '\nLater change.';
    assert.equal(verdict(expected, actual, id).ok, false);
    actual.pop();
    assert.equal(verdict(expected, actual, id).ok, false);
  });
}

test('injection attribution uses source kind rather than a reminder-looking body', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  byKind(actual, 'agent-instructions').data.source.kind = 'user';
  assert.equal(verdict(expected, actual, 'agent-instructions').ok, false);
});

test('runtime workspace identity can vary while its exact sandbox and approval rules remain visible', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  const context = byKind(actual, 'runtime-context').data;
  // 取参必须**限定在策略句内**（0.2.1 起 runtime-context 另有 `Current working directory:` 行
  // 也嵌同一个路径——裸 replace 会先命中那一行，等于测错了槽：2026-10-19 换 pin 实红）。
  const policyLine = /^Current DSH file policy: workspace-write\..*$/m.exec(context.content[0].text)?.[0];
  assert.ok(policyLine, 'the recorded sandbox policy sentence is present');
  const workspacePath = /session workspace: ("(?:[^"\\]|\\.)*")\./.exec(policyLine)?.[1];
  assert.ok(workspacePath, 'the recorded sandbox policy embeds a workspace identity');
  context.content[0].text = context.content[0].text.replace(policyLine, policyLine.replace(workspacePath, '"/tmp/replay space/workspace"'));
  assert.equal(verdict(expected, actual, 'runtime-context').ok, true);
  // 工作目录那一行**不**归一（只归策略句里的槽）：改它必须红。
  context.content[0].text = (byKind(expected, 'runtime-context').data.content[0].text)
    .replace(/^Current working directory: ".+"\.$/m, 'Current working directory: "/elsewhere".');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, false);
  // 策略模式本身是契约内容，不可归一。
  context.content[0].text = byKind(expected, 'runtime-context').data.content[0].text.replace('workspace-write', 'danger-full-access');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, false);
});

// 0.2.1 换 pin 后的分工（旧断言钉的是「persona 里嵌 URL/路径」——上游已改为间接引用，
// 具体值下移 runtime-context；旧断言于是随基线换代变红，是本条改写的原因，不是放宽）：
// persona 侧**零归一化**必须由「persona 确实无可变令牌」+「正文任一字节改动即红」两头钉住。
test('persona carries no boot-generated identity and is compared verbatim', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  const persona = messageOf(byKind(actual, 'system-prompt'));
  const original = persona.content[0].text;
  assert.doesNotMatch(original, /127\.0\.0\.1/, 'boot identity values moved out of persona at 0.2.1');
  assert.doesNotMatch(original, /implementation checkout: "/, 'boot identity values moved out of persona at 0.2.1');
  // 零归一化 = 逐字比较：persona 正文任何改动都必须红（含「看起来可变」的 URL/路径字样）。
  persona.content[0].text = original.replace(/Web GUI/, 'Web GUi');
  assert.equal(verdict(expected, actual, 'persona').ok, false);
  persona.content[0].text = original + '\nhttp://127.0.0.1:3999 /tmp/dsh.checkout';
  assert.equal(verdict(expected, actual, 'persona').ok, false);
});

test('runtime-context normalizes only boot-generated GUI port, harness checkout and workspace root', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  const context = byKind(actual, 'runtime-context').data;
  const original = context.content[0].text;
  assert.match(original, /^Current DeepSeek Harness Web GUI URL: "http:\/\/127\.0\.0\.1:\d+"\.$/m);
  assert.match(original, /^Current DeepSeek Harness implementation checkout: ".+"\.$/m);
  context.content[0].text = original
    .replace(/^(Current DeepSeek Harness Web GUI URL: "http:\/\/127\.0\.0\.1:)\d+("\.)$/m, '$13999$2')
    .replace(/^(Current DeepSeek Harness implementation checkout: )".+"\.$/m, '$1"/tmp/dsh.checkout/vendor/dsh/".');
  assert.notEqual(context.content[0].text, original, 'both boot identities must actually change');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, true);
  // 端口之外的正文改动仍须红（归一化只碰这三个槽，不吞别的差异）。
  context.content[0].text = original.replace(/^Current working directory: /m, 'Current working dir: ');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, original === context.content[0].text);
});

for (const id of IDS) {
  test(`${id} refuses identical malformed required payloads`, () => {
    const events = fixture();
    const event = events.find((item) => matchesCriterion(item, id));
    if (id === 'headers') delete event.data.header.tools;
    else messageOf(event).content = [];
    assert.equal(verdict(events, structuredClone(events), id).ok, false);
  });
}

for (const field of ['provider', 'tools', 'tool-order', 'schema', 'header-count']) {
  test(`headers retain ${field} changes in later entries`, () => {
    const expected = fixture();
    expected.push(structuredClone(expected.find((event) => event.type === 'request/header')));
    const actual = structuredClone(expected);
    const header = actual.at(-1).data.header;
    if (field === 'provider') header.config.provider = 'other-provider';
    if (field === 'tools') header.tools.pop();
    if (field === 'tool-order') header.tools.reverse();
    if (field === 'schema') header.tools[0].description += ' Changed schema guidance.';
    if (field === 'header-count') actual.pop();
    assert.equal(verdict(expected, actual, 'headers').ok, false);
  });
}

test('header schema keeps arbitrary SHA and loopback URL text unchanged', () => {
  const expected = fixture();
  const schema = expected.find((event) => event.type === 'request/header').data.header.tools[0];
  schema.description += `\nManual revision ${'a'.repeat(40)} at http://127.0.0.1:8000/manual`;
  const actual = structuredClone(expected);
  const changedSchema = actual.find((event) => event.type === 'request/header').data.header.tools[0];
  changedSchema.description = changedSchema.description.replace('a'.repeat(40), 'b'.repeat(40));
  assert.equal(verdict(expected, actual, 'headers').ok, false);
  changedSchema.description = schema.description.replace(':8000/manual', ':8001/manual');
  assert.equal(verdict(expected, actual, 'headers').ok, false);
});

test('object key order and session tuning do not change header assembly', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  const header = actual.find((event) => event.type === 'request/header').data.header;
  header.config.maxTokens = 100;
  header.config.reasoningEffort = 'off';
  header.adapterDefaults = { ignoredSessionSetting: true };
  header.tools = header.tools.map((tool) => Object.fromEntries(Object.entries(tool).reverse()));
  assert.equal(verdict(expected, actual, 'headers').ok, true);
});

test('source identities, digests, event times and session cwd do not replace model-visible bodies', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  for (const event of actual) {
    event.time = 999999999;
    event.id = 'new-event-id';
    if (event.type === 'session') event.cwd = '/tmp/new-cwd';
    if (['system/message', 'user/message'].includes(event.type)) messageOf(event).id = 'new-message-id';
  }
  byKind(actual, 'agent-instructions').data.source.changes[0].digest = 'f'.repeat(40);
  byKind(actual, 'runtime-context').data.source.sections[0].text = 'source bookkeeping changed';
  actual.push({ type: 'user/message', time: 999, data: { source: { kind: 'time-context' },
    content: [{ type: 'text', text: 'Time sampled while preparing turn 1, step 1: 2030-01-01' }] } });
  assert.ok(compareReplayRequests(expected, actual).every(({ ok }) => ok));
});

for (const id of ['persona', 'agent-instructions', 'skill-catalog', 'runtime-context']) {
  test(`${id} retains arbitrary SHA, URL, path and date differences in real text`, () => {
    const expected = fixture();
    const event = expected.find((item) => matchesCriterion(item, id));
    const original = messageOf(event).content[0].text;
    for (const [want, got] of [
      ['a'.repeat(40), 'b'.repeat(40)],
      ['http://127.0.0.1:8000/manual', 'http://127.0.0.1:8001/manual'],
      ['/tmp/evidence/source.md', '/tmp/evidence/other.md'],
      ['2026-10-01', '2026-10-02'],
    ]) {
      messageOf(event).content[0].text = `${original}\nReference: ${want}`;
      const actual = structuredClone(expected);
      messageOf(actual.find((item) => matchesCriterion(item, id))).content[0].text = `${original}\nReference: ${got}`;
      assert.equal(verdict(expected, actual, id).ok, false, want);
    }
  });
}

test('runtime tool inventory and approval truth are compared even when workspace identity varies', () => {
  const expected = fixture();
  const context = byKind(expected, 'runtime-context').data;
  context.content[0].text += '\n\nAvailable tools: read, write, edit.';
  const actual = structuredClone(expected);
  const content = byKind(actual, 'runtime-context').data.content[0];
  content.text = content.text.replace('read, write, edit', 'read');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, false);
  content.text = context.content[0].text.replace('Approval policy: ask', 'Approval policy: never');
  assert.equal(verdict(expected, actual, 'runtime-context').ok, false);
});

test('non-text content blocks are compared rather than discarded', () => {
  const expected = fixture();
  byKind(expected, 'agent-instructions').data.content.push({ type: 'image', url: 'image-a' });
  const actual = structuredClone(expected);
  byKind(actual, 'agent-instructions').data.content.at(-1).url = 'image-b';
  assert.equal(verdict(expected, actual, 'agent-instructions').ok, false);
});

test('an injection kind absent from the reviewed baseline is surfaced rather than silently ignored', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  actual.push({ type: 'user/message', time: 1,
    data: { source: { kind: 'project-context' }, content: [{ type: 'text', text: 'new model-visible injection' }] } });
  assert.deepEqual(unexpectedInjectionKinds(expected, actual), ['project-context']);
  assert.deepEqual(unexpectedInjectionKinds(expected, structuredClone(expected)), []);
  const promptOnly = actual.filter((event) => !['system/message', 'user/message'].includes(event.type)
    || messageOf(event).source?.kind !== 'project-context');
  assert.deepEqual(unexpectedInjectionKinds(expected, promptOnly), []);
});

test('a new system/message injection kind is surfaced too, not only user/message', () => {
  const expected = fixture();
  const actual = structuredClone(expected);
  actual.push({ type: 'system/message', time: 1,
    data: { message: { source: { kind: 'tool-policy' }, content: [{ type: 'text', text: 'new system injection' }] } } });
  assert.deepEqual(unexpectedInjectionKinds(expected, actual), ['tool-policy']);
  assert.deepEqual(unjudgedInjectionKinds(actual), ['tool-policy']);
});

test('every recorded role injects only kinds the compared judges cover', () => {
  // 不变量：基线（人审过的录制）里的注入种类不得超出已登记的比对面。重录若带进未登记的种类，
  // 本条红——这是"重录后把该面加入比对面"这半句的唯一机械面。
  for (const role of roles) {
    const expected = fixture(role);
    assert.deepEqual(unjudgedInjectionKinds(expected), [], role);
    // 反向对照（防空语料）：守卫对确实未登记的种类会报出来，而不是恒返回空集。
    const smuggled = structuredClone(expected);
    smuggled.push({ type: 'system/message', time: 1,
      data: { message: { source: { kind: 'unregistered-kind' }, content: [{ type: 'text', text: 'x' }] } } });
    assert.deepEqual(unjudgedInjectionKinds(smuggled), ['unregistered-kind'], role);
  }
});

test('four recorded roles each expose five independent passing criteria', () => {
  for (const role of roles) {
    const events = fixture(role);
    const before = JSON.stringify(events);
    const results = compareReplayRequests(events, structuredClone(events));
    assert.deepEqual(results.map(({ id }) => id), IDS, role);
    assert.ok(results.every(({ ok, detail }) => ok && typeof detail === 'string'), role);
    assert.equal(JSON.stringify(events), before, 'comparison must not mutate input');
  }
});

for (const [id, kind] of [['persona', 'system-prompt'], ['agent-instructions', 'agent-instructions'],
  ['skill-catalog', 'skill-catalog'], ['runtime-context', 'runtime-context']]) {
  test(`${id} catches a changed injected body without consulting unchanged source metadata`, () => {
    const expected = fixture();
    const actual = structuredClone(expected);
    messageOf(byKind(actual, kind)).content[0].text += '\nChanged model-visible text.';
    const results = compareReplayRequests(expected, actual);
    assert.equal(results.find((item) => item.id === id)?.ok, false);
    assert.ok(results.filter((item) => item.id !== id).every((item) => item.ok));
  });
}

// ── BUG-030 正修：回合落定判据只认 assistant 文本 + turn/end 显式态 ──────────────────────
// 复现的坑：哨兵「探针完成」写在录制 prompt 里，A 层用**全文 includes** 判回合完成 → user/message
// 一落盘就放行 → 后续层在回合在飞时执行 → C5 金标准缺末行（当日 4 红 / 6 跑）。
// 判据正本 = 录制器 dev/record-role-fixture.mjs（2026-10-13 因同一坑改过），此处收成共享件。
const line = (event) => JSON.stringify(event);
test('回合落定：哨兵只出现在 prompt 回显（user/message、agent/inbox/spliced）→ 不算落定', () => {
  const log = [
    line({ type: 'agent/inbox/spliced', data: { text: '…以「探针完成」收尾。' } }),
    line({ type: 'user/message', data: { message: { content: [{ type: 'text', text: '…以「探针完成」收尾。' }] } } }),
    line({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '我在查资料。' }] } } }),
    line({ type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } }),
  ].join('\n');
  assert.equal(sentinelInAssistantText(log, '探针完成'), false, 'prompt 回显不得当收尾');
});

test('回合落定：哨兵出现在 assistant 文本里 → 落定', () => {
  const log = [
    line({ type: 'user/message', data: { message: { content: [{ type: 'text', text: '以「探针完成」收尾' }] } } }),
    line({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '探针完成，搜了 X、抓了 Y' }] } } }),
  ].join('\n');
  assert.equal(sentinelInAssistantText(log, '探针完成'), true);
});

test('回合结束显式态：turn/end 缺席或非 completed → 未结束（fail-loud 不静默放行）', () => {
  const assistant = line({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '探针完成' }] } } });
  assert.equal(turnCompleted([assistant].join('\n')), false, '缺 turn/end 即未结束');
  assert.equal(turnCompleted([assistant, line({ type: 'turn/end', data: { turn: 1, reason: { kind: 'error' } } })].join('\n')), false, '非 completed 不算结束');
  assert.equal(turnCompleted([assistant, line({ type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } })].join('\n')), true);
});
