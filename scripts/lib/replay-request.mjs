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

// These slots are rendered by app-boot/addHarnessSourceSection and web-app/webSurfacePrompt.
// No SHA, URL, path, or date elsewhere in persona/manual/schema text is normalized.
const normalizePersona = (text) => text
  .replace(/^(The DeepSeek Harness implementation checkout is at )(?:\/|[A-Za-z]:[\\/])[^\n]+?(\. The checkout location and current working directory are separate values and may differ;)/gm,
    '$1<replay:harness-root>$2')
  .replace(/^(You are interacting with the user through the DeepSeek Harness Web GUI at http:\/\/127\.0\.0\.1:)\d+(\. When the user refers to)/gm,
    '$1<replay:gui-port>$2');

// sandbox-policy/renderPolicyContext embeds JSON.stringify(workspaceRoot) in this exact sentence.
// Policy mode, permissions, tool inventory and all other runtime text remain unchanged.
const normalizeRuntime = (text) => text.replace(
  /^(Current DSH file policy: workspace-write\. Any available operation enforced by the DSH file sandbox may modify files under the session workspace: )"(?:[^"\\\n]|\\.)*"(\. Some platform temporary areas may also be writable\.)$/gm,
  '$1"<replay:workspace-root>"$2',
);

const normalizeContent = (content, kind) => Array.isArray(content) ? content.map((part) => {
  if (part?.type !== 'text' || typeof part.text !== 'string') return part;
  const normalize = kind === 'system-prompt' ? normalizePersona : kind === 'runtime-context' ? normalizeRuntime : (text) => text;
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
const JUDGED_KINDS = new Set(['system-prompt', 'agent-instructions', 'skill-catalog', 'runtime-context']);

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
 * @returns {Array<{id: string, ok: boolean, detail: string}>} Five ordered verdicts.
 */
export function compareReplayRequests(expectedEvents, actualEvents) {
  return [
    compare('persona', contentOf(expectedEvents, 'system/message', 'system-prompt'), contentOf(actualEvents, 'system/message', 'system-prompt')),
    compare('headers', headersOf(expectedEvents), headersOf(actualEvents)),
    ...['agent-instructions', 'skill-catalog', 'runtime-context'].map((kind) => compare(
      kind, contentOf(expectedEvents, 'user/message', kind), contentOf(actualEvents, 'user/message', kind),
    )),
  ];
}
