// 组装请求面逐条比较（persona 全文 / 全部 request/header / 三处 user/message 注入——定向归一化）。
// 消费 = snapshot-replay-smoke B 层；比对面与判据集正本 = snapshots/README（声明不能削减比对面凑绿）。
// Pure comparison of durable model-visible request assembly, in event order.
const stableStringify = (value) => JSON.stringify(value, (_key, item) => (
  item !== null && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]))
    : item
));

const headersOf = (events) => events.filter((event) => event?.type === 'request/header').map((event) => {
  const header = event.data?.header;
  return { config: { provider: header?.config?.provider, model: header?.config?.model }, tools: header?.tools };
});

// 0.2.1 起（换 pin 实红核对）：boot 引导身份**不再嵌进 persona 正文**。上游把两处可变值改写为
// 指回 runtime context 的**间接引用**——persona 只剩「The runtime context names the DeepSeek
// Harness implementation checkout…」与「…through the DeepSeek Harness Web GUI whose URL the
// runtime context names…」两句无值句子，具体路径/端口下移到 runtime-context 三行（implementation
// checkout / Web GUI URL / file policy workspace）。故 persona 归一化**清零**——留着旧 replace 是
// 死规则（永不命中 = 假装在防漂移），零归一化才如实声明「persona 无可变令牌」。
// No SHA, URL, path, or date in persona/manual/schema text is normalized.
const normalizePersona = (text) => text;

// runtime-context 承担可变身份（逐行独立归一——只归值，句式与其余正文不动）：
// ① 录制/回放端口必不同（录制 dev/record-role-fixture 默认 3105、回放 smoke 默认 3103），
//    端口是 boot 生成物而非契约内容；② checkout 根随 clone 位置；③ 工作区根嵌在 sandbox 策略句。
// Policy mode, permissions, tool inventory and all other runtime text remain unchanged.
const normalizeRuntime = (text) => text
  .replace(/^(Current DeepSeek Harness Web GUI URL: "http:\/\/127\.0\.0\.1:)\d+("\.)$/gm,
    '$1<replay:gui-port>$2')
  .replace(/^(Current DeepSeek Harness implementation checkout: )"(?:[^"\\\n]|\\.)*"\.$/gm,
    '$1"<replay:harness-root>".')
  .replace(/^(Current DSH file policy: workspace-write\. Any available operation enforced by the DSH file sandbox may modify files under the session workspace: )"(?:[^"\\\n]|\\.)*"(\. Some platform temporary areas may also be writable\.)$/gm,
    '$1"<replay:workspace-root>"$2');

// time-context：载荷是墙钟（ISO 时间 / 耗时 / 浏览器时区），回放时物理上无法逐字复现——
// 逐字比只会得到永远红。判据改为**结构**：注入发生在哪个 turn/step。其余确定性面仍逐字全等；
// 这不是"放宽比对凑绿"（见 snapshots/README §判据面），而是把该面定义成可复现的那一半。
const normalizeTimeContext = (text) => {
  const m = /^Time sampled while preparing turn (\d+), step (\d+):/.exec(text);
  return m === null ? text : `time-context:turn=${m[1]};step=${m[2]}`;
};

const normalizeContent = (content, kind) => Array.isArray(content) ? content.map((part) => {
  if (part?.type !== 'text' || typeof part.text !== 'string') return part;
  const normalize = kind === 'system-prompt' ? normalizePersona
    : kind === 'runtime-context' ? normalizeRuntime
      : kind === 'time-context' ? normalizeTimeContext
        : (text) => text;
  return { ...part, text: normalize(part.text) };
}) : content;

const contentOf = (events, type, kind) => events
  .filter((event) => event?.type === type)
  .map((event) => type === 'system/message' ? event.data?.message : event.data)
  .filter((message) => message?.source?.kind === kind)
  .map((message) => normalizeContent(message.content, kind));

const validContent = (content) => Array.isArray(content)
  && content.some((part) => part?.type === 'text' && typeof part.text === 'string' && part.text.trim() !== '')
  && content.every((part) => part !== null && typeof part === 'object'
    && typeof part.type === 'string' && (part.type !== 'text' || typeof part.text === 'string'));
const validHeader = (header) => typeof header.config.provider === 'string' && header.config.provider !== ''
  && typeof header.config.model === 'string' && header.config.model !== '' && Array.isArray(header.tools);

function compare(id, expected, actual) {
  if (expected.length === 0 || actual.length === 0) {
    return { id, ok: false, detail: `${id}: required kind absent (expected ${expected.length}, actual ${actual.length})` };
  }
  const valid = id === 'headers' ? validHeader : validContent;
  for (const [side, entries] of [['expected', expected], ['actual', actual]]) {
    const invalid = entries.findIndex((entry) => !valid(entry));
    if (invalid !== -1) return { id, ok: false, detail: `${id}: ${side} entry ${invalid + 1} lacks required ${id === 'headers' ? 'provider/model/tools' : 'nonempty message content'}` };
  }
  const want = stableStringify(expected);
  const got = stableStringify(actual);
  if (want === got) return { id, ok: true, detail: `${id}: ${expected.length} entries match` };
  let at = 0;
  while (at < Math.min(want.length, got.length) && want[at] === got[at]) at += 1;
  const lo = Math.max(0, at - 60);
  return { id, ok: false, detail: `${id}: expected ${expected.length}, actual ${actual.length}; first difference @${at}\n`
    + `  expected: ${want.slice(lo, at + 80)}\n  actual: ${got.slice(lo, at + 80)}` };
}

// Kinds the compared judges own. A model-visible injection outside this set is uncovered:
// it must be added to the compared set here (and the baseline re-recorded) rather than accepted.
const JUDGED_KINDS = new Set(['system-prompt', 'agent-instructions', 'skill-catalog', 'runtime-context', 'time-context']);

// Both message families carry source-attributed injections; watching only user/message left the
// system/message half of the same blind spot open (review finding on BUG-018's failure class).
const injectionKindsOf = (events) => new Set(events
  .filter((event) => event?.type === 'system/message' || event?.type === 'user/message')
  .map((event) => (event.type === 'system/message' ? event.data?.message : event.data)?.source?.kind)
  .filter((kind) => typeof kind === 'string' && kind !== 'user'));

/**
 * Injection kinds present in the logs that no compared judge covers.
 * Falsifiable invariant, not a tautology: a re-recorded baseline carrying an unregistered kind
 * makes this non-empty, forcing the kind into the compared set before it can be trusted.
 * @param {Array<object>} events Parsed session events.
 * @returns {string[]} Sorted uncovered injection kinds.
 */
export function unjudgedInjectionKinds(events) {
  return [...injectionKindsOf(events)].filter((kind) => !JUDGED_KINDS.has(kind)).sort();
}

/**
 * Injection kinds the replay carries that the reviewed baseline never had.
 * A new model-visible injector must enter the compared set with a re-recorded baseline;
 * silently ignoring it would recreate the "advertised coverage exceeds actual" defect.
 * @param {Array<object>} expectedEvents Parsed session events from the reviewed baseline.
 * @param {Array<object>} actualEvents Parsed session events from the replay.
 * @returns {string[]} Sorted kinds injected in the replay but absent from the baseline.
 */
export function unexpectedInjectionKinds(expectedEvents, actualEvents) {
  const baseline = injectionKindsOf(expectedEvents);
  return [...injectionKindsOf(actualEvents)].filter((kind) => !baseline.has(kind)).sort();
}

/**
 * Compare every persona, header and required injected-message occurrence independently.
 * Source ids/digests and event timestamps are bookkeeping; message content is compared.
 * Headers compare provider/model and complete tool schemas; session tuning is excluded.
 * @param {Array<object>} expectedEvents Parsed session events from the reviewed baseline.
 * @param {Array<object>} actualEvents Parsed session events from the replay.
 * @returns {Array<{id: string, ok: boolean, detail: string}>} Six ordered verdicts.
 */
export function compareReplayRequests(expectedEvents, actualEvents) {
  return [
    compare('persona', contentOf(expectedEvents, 'system/message', 'system-prompt'), contentOf(actualEvents, 'system/message', 'system-prompt')),
    compare('headers', headersOf(expectedEvents), headersOf(actualEvents)),
    ...['agent-instructions', 'skill-catalog', 'runtime-context', 'time-context'].map((kind) => compare(
      kind, contentOf(expectedEvents, 'user/message', kind), contentOf(actualEvents, 'user/message', kind),
    )),
  ];
}

// ── 回合落定判据（BUG-030 正修；单一正本）──────────────────────────────────────────────
// 消费 = snapshot-replay-smoke A 层（"回放回合是否走完"）+ dev/record-role-fixture（录制收尾）。
// 为什么必须单独成件：哨兵字样**写在录制 prompt 里**，用"全文 includes"判回合完成会在 user/message
// 一落盘时立刻放行（BUG-030 实测：A 层提前放行 → 后续层在回合在飞时执行 → 渲染金标准缺末行）。

/** 会话日志文本 → assistant 消息文本清单（`data.message.content` 的 text 项拼接）。 */
export function assistantTextsOf(logText) {
  return String(logText ?? '').split('\n').filter(Boolean)
    .map((line) => { try { return JSON.parse(line) } catch { return null } }).filter(Boolean)
    .filter((event) => event.type === 'assistant/message')
    .map((event) => (event.data?.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
    .filter(Boolean)
}

/** 收尾哨兵是否已**由 assistant 消息**落地——prompt/回执回显里的同名字样不算数（BUG-030 根因）。 */
export function sentinelInAssistantText(logText, sentinel) {
  return assistantTextsOf(logText).some((text) => text.includes(sentinel))
}

/** 回合是否以 `completed` 结束（`turn/end` 显式态；缺席或非 completed = 未结束，fail-loud 不静默放行）。 */
export function turnCompleted(logText) {
  return String(logText ?? '').split('\n').filter(Boolean).some((line) => {
    let event = null
    try { event = JSON.parse(line) } catch { return false }
    return event?.type === 'turn/end' && event?.data?.reason?.kind === 'completed'
  })
}
