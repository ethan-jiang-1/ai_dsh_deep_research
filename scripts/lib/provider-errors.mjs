// scripts/lib/provider-errors.mjs —— 模型回合被上游流错误终结的**结构化抽取**（唯一语义源）。
//
// 为什么存在：这类停摆此前只能靠临时正则猜（作者第一版正则把键序写死 → 全库零命中，白查一轮）。
// 事件形状本身是嵌套 JSON，**解析**才是对的判据（"parse, don't regex"）：
//   `{"type":"turn/end", …, "data":{"turn":N,"reason":{"kind":"error","error":{"message":"…","code":"MALFORMED_RESPONSE"}}}}`
// 上游只读、本仓修不了（BUG-022）：能做的是**可复跑地数**它、并让恢复程序有据可依。
// 消费方 = `scripts/run-ops/provider-error-stats.mjs`（跨场分布）与 keyless 契约测试。

/**
 * 抽取日志里所有**被错误终结的回合**（判据 = `turn/end` 且 `reason.kind === 'error'`）。
 *
 * 只认 `turn/end`：`assistant/attempt` 的 finish chunk 常带同一条错误（同一事故的第二次露面），
 * 计它会双算——"一次事故 = 一个回合"才是可解释的分母。
 *
 * @param {string} logText 会话日志全文（已解压）
 * @returns {Array<{seq:number|null, code:string, message:string}>} 出现序
 */
export function turnEndErrorsOf(logText) {
  const out = [];
  if (typeof logText !== 'string' || logText === '') return out;
  for (const line of logText.split('\n')) {
    if (!line.includes('turn/end')) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.type !== 'turn/end') continue;
    const reason = event?.data?.reason;
    if (reason?.kind !== 'error') continue;
    out.push({
      seq: typeof event?.seq === 'number' ? event.seq : null,
      code: typeof reason?.error?.code === 'string' ? reason.error.code : 'UNKNOWN',
      message: typeof reason?.error?.message === 'string' ? reason.error.message : '',
    });
  }
  return out;
}

/**
 * 抽取日志里所有**请求重试**事件（`llm/retry`；由 vendor `llm-retry` 插件在 `agent/request-error`
 * 决定重试时 append）。这是"缓解是否真的在拦截"的**直接证据**——某码出现在这里 = 它被重试了；
 * 某码只在 `turn/end` 里出现 = 它不在可重试集（或重试已耗尽）。
 *
 * ⚠ 判据只能取 `data.failure.code`：事件里还有个 `policyKey` 字段**列出了整个可重试码表**
 * （2026-10-11 实测形如 `["normal",5,["EMPTY_RESPONSE",…,"MALFORMED_RESPONSE"]]`）——按"行文本含某码"
 * 计数会把**每一次**重试都算成那个码（本文件第一版正则式猜法同族错误）。测试夹具钉住了这个陷阱。
 *
 * @param {string} logText 会话日志全文（已解压）
 * @returns {Array<{seq:number|null, code:string, message:string, retry:number|null, delayMs:number|null, provider:string|null}>}
 */
export function retryEventsOf(logText) {
  const out = [];
  if (typeof logText !== 'string' || logText === '') return out;
  for (const line of logText.split('\n')) {
    if (!line.includes('llm/retry')) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.type !== 'llm/retry') continue;
    const failure = event?.data?.failure;
    out.push({
      seq: typeof event?.seq === 'number' ? event.seq : null,
      code: typeof failure?.code === 'string' ? failure.code : 'UNKNOWN',
      message: typeof failure?.message === 'string' ? failure.message : '',
      retry: typeof event?.data?.retry === 'number' ? event.data.retry : null,
      delayMs: typeof event?.data?.delayMs === 'number' ? event.data.delayMs : null,
      provider: typeof event?.data?.provider === 'string' ? event.data.provider : null,
    });
  }
  return out;
}

/** 把抽取结果聚成 `code: message → 次数`（供投影打印；同类不同措辞分开计，不做归一化猜测）。 */
export function tallyTurnEndErrors(errors) {
  const tally = new Map();
  for (const e of Array.isArray(errors) ? errors : []) {
    const key = `${e.code}: ${e.message}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}
