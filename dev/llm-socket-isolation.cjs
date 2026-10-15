// dev/llm-socket-isolation.cjs — api.deepseek.com 请求的 socket 隔离（NODE_OPTIONS 预载，
// 用户指令 2026-10-13：「LLM 沟通和 web search 沟通不要复用 socket，用独立的 socket」）。
// 依据（postmortem 2026-10-13）：上游边缘对长命复用连接有相位性故障（零响应头 + 未声明 brotli 体，
// 实拍 64 健康 → 2 秒 → 23 垃圾的硬切换），而全新连接在 150+ 次受控请求中从未失败。
// 隔离版 soak 实证：LLM 流隔离后零异常，但**留在共享池的搜索客户端挨了 44 次零头**——故全量隔离。
// 语义：api.deepseek.com 的 POST /messages（LLM 流 + web_search 两类性质）→ 每请求一次性
// undici Agent（connections:1），响应体读尽后关闭——**永不复用 socket**；其余流量透传。
// 不改路由、不改协议、不碰 vendor；移除 = 摘掉 NODE_OPTIONS 一行。
// 家 = postmortem 2026-10-13 + 本文件头注；验收 = 隔离 soak（全量隔离后零头 = 0）。
const PATH = require('node:path');
const TAG = '[llm-socket-isolation]';
const AGENT_MAX_LIFETIME_MS = 10 * 60_000; // 兜底：流未终结也限时关闭，防 socket 泄漏
let undiciCache = null;
const undiciOf = () => {
  if (undiciCache === null) {
    try {
      const { execSync } = require('node:child_process');
      const dir = execSync(`ls -d ${PATH.join(__dirname, '..', 'vendor', 'dsh', 'node_modules', '.pnpm', 'undici@*', 'node_modules', 'undici')} 2>/dev/null | head -1`, { encoding: 'utf8' }).trim();
      if (dir === '') throw new Error('vendor pnpm 树里找不到 undici');
      undiciCache = require(PATH.join(dir, 'index.js')) ?? createRequireFallback(dir);
    } catch (e) {
      console.error(`${TAG} 初始化失败（LLM 请求退回全局池）: ${e.message}`);
      undiciCache = false;
    }
  }
  return undiciCache || null;
};
function createRequireFallback(dir) {
  const { createRequire } = require('node:module');
  return createRequire(PATH.join(dir, 'package.json'))('undici');
}
const orig = globalThis.fetch;
let rideCount = 0;
globalThis.fetch = async function llmSocketIsolationFetch(input, init) {
  let issued = false; // 一次性请求是否已发出——已发出则任何异常都原样抛出，绝不回落双发
  try {
    const url = typeof input === 'string' ? input : (input && input.url) ?? String(input);
    const isDeepSeekPost = url.includes('api.deepseek.com')
      && url.includes('/messages')
      && (init && init.method) === 'POST';
    if (!isDeepSeekPost) return orig(input, init);
    const undici = undiciOf();
    if (undici === null) return orig(input, init);
    rideCount += 1;
    const n = rideCount;
    if (n <= 3) console.warn(`${TAG} 第 ${n} 次骑行一次性连接（此后的不再逐条打印）`);
    const agent = new undici.Agent({ connections: 1 });
    const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : (init.headers ?? {});
    // 生命周期：响应体读尽（tee 旁路跟随到真末尾——vendor 在 message_stop 后弃读也不影响）
    // 或超时兜底 → 关闭 Agent（socket 随之释放，永不回池）。
    let closed = false;
    const close = () => { if (!closed) { closed = true; agent.close().catch(() => {}); } };
    setTimeout(close, AGENT_MAX_LIFETIME_MS).unref?.();
    issued = true;
    let res;
    try {
      // signal 保留调用方取消语义
      res = await undici.fetch(url, { method: 'POST', headers, body: init.body, ...(init.signal === undefined ? {} : { signal: init.signal }), dispatcher: agent });
    } catch (e) {
      close(); // 失败必须关 Agent——否则每次失败泄漏一条 socket/句柄（长跑实证）
      throw e; // 不回落共享池：交给 vendor 重试策略（重试再走隔离 = 新连接）
    }
    if (res.body) {
      const [a, b] = res.body.tee();
      (async () => { try { const rd = b.getReader(); try { for (;;) { const { done } = await rd.read(); if (done) break; } } catch { /* 弃读/中断视为结束 */ } } catch { /* getReader 失败也视为结束 */ } finally { close(); } })();
      return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
    }
    close();
    return res;
  } catch (e) {
    if (issued) throw e; // 已发出过一次性请求：原样抛，绝不双发、绝不踩共享池
    console.error(`${TAG} 预载侧异常（透传全局池）: ${e.message}`);
    return orig(input, init);
  }
};
// 预载自证（boot-run 导出 DSH_ISOLATION_ANNOUNCE=1）：让 boot 日志留下**确定性**证据行。
// 逐请求的"第 N 次骑行"行只在真有 LLM/web_search 调用时出现，故判读"隔离下"前不能只靠它；
// 本行在预载成功装载时无条件打印（stderr → boot-run 的 tee 进 web.log）。缺席 = 未隔离。
if (process.env.DSH_ISOLATION_ANNOUNCE === '1') {
  console.warn(`${TAG} 预载已生效 pid=${process.pid}（判读"隔离下"前先核本行；缺席 = 未隔离）`);
}
