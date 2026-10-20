#!/usr/bin/env node
// scripts/probe/llm-stream-tee.cjs — LLM 流透明请求/响应 tee（复现仪器转正，CJS 预载形态）。
//
// 为什么存在：技能 .agents/skills/reproducing-a-failure §2 的「透明 fetch tee」此前无
// tracked 实现——每次取证按技能现场从零重写（2026-10-13 postmortem 的 capture2.cjs 是
// 一次性工具，随运行区清理消失）。本件把它转正：预载只**抄写**字节、零行为路径改动
// （预载形态与 dev/llm-socket-isolation.cjs 同构——NODE_OPTIONS 挂载、拦 globalThis.fetch、
// 命中外的请求原样透传）。方法论正本 = 技能 §2（判读要点：**响应头集合本身是证据**——
// MALFORMED 事故里失败响应 = 200 + 零头 + 未声明压缩体，对照组 = 完整头 + content-encoding）。
// 何时用：流异常第一动作 = 挂 tee 抓原始字节与响应头，不以错误字符串推断归因。
//
// 用法①（预载取证——挂进目标进程，如 dsh web / 录制器）：
//   NODE_OPTIONS="--require /abs/path/scripts/probe/llm-stream-tee.cjs" <目标进程启动命令>
//   （boot-run 已挂 llm-socket-isolation 时可叠挂：--require A --require B）
//   捕获主机子串 = env LLM_STREAM_TEE_HOST（缺省 api.deepseek.com；空串 fail-closed
//   不捕获——见 lib/llm-stream-tee-core.isCaptureTarget）。
//   输出 = runtime/smoke-workspace/llm-stream-tee-<时间戳>/（或 env LLM_STREAM_TEE_OUT
//   覆盖），逐请求四件套（技能 §6 证据包形态）：
//     <n>.req.json  请求面（at/method/url/头已脱敏/体——字符串体全文，流式体记形态不消费）
//     <n>.meta.json 响应面（status/头全集/计时；体读尽后回写 bodyBytes/doneAt——
//                   进程中途崩溃也已留有 status+头，正是事故要的那半份证据）
//     <n>.sse       响应体**原始字节**逐块 append（不解压不解析；崩在半路也已留盘）
//     <n>.err       fetch 拒绝 / 流读异常（message + stack）——原样抛回调用方，零行为改动
//   响应体经 res.body.tee() 双分支：调用方拿到的流与原响应等形（isolation 预载同款
//   new Response 重包）；旁路分支读尽落盘。旁路流不设超时——「分块流永不终止」本身
//   就是 MALFORMED 形态的证据，掐表会丢它。
//
// 用法②（单跑预检）：node scripts/probe/llm-stream-tee.cjs --port <目标 web GUI 端口>
//   校验端口参数与目标进程在场（TCP 连通即在场），打印取证接入命令。
//   fail-loud exit 2：端口参数错 / 目标进程缺席（verdict 契约：2 = 未跑）。
//
// 档位：keyless（不碰凭据——抄写面已脱敏；预载侧零模型/网络主动性，只旁路抄写）。
// 这是活进程仪器，无 keyless 自动测试（不硬凑）；可提取纯函数（捕获判定 + 头脱敏）
// 住 scripts/lib/llm-stream-tee-core.mjs，被 tests/run/llm-stream-tee-core.test.mjs 钉住。
'use strict';
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { isCaptureTarget, redactHeaders } = require('../lib/llm-stream-tee-core.mjs');

const TAG = '[llm-stream-tee]';
const ROOT = path.resolve(__dirname, '..', '..');
// 缺省子串住 lib（唯一正本）；壳只透传 env——undefined 走 lib 缺省，'' 走 lib fail-closed
const HOST_ENV = process.env.LLM_STREAM_TEE_HOST;
const hostLabel = HOST_ENV === undefined ? 'api.deepseek.com（缺省）' : HOST_ENV === '' ? '(fail-closed：空子串不捕获)' : HOST_ENV;

const stamp = () => new Date().toISOString();
const outDirOf = () =>
  process.env.LLM_STREAM_TEE_OUT && process.env.LLM_STREAM_TEE_OUT.trim() !== ''
    ? process.env.LLM_STREAM_TEE_OUT
    : path.join(ROOT, 'runtime', 'smoke-workspace', `llm-stream-tee-${stamp().replace(/[:.]/g, '-')}`);

// ── 预载形态：拦 globalThis.fetch，只抄写，不改行为 ───────────────────────────────
function installTee() {
  const orig = globalThis.fetch;
  if (typeof orig !== 'function') {
    console.error(`${TAG} globalThis.fetch 不在——目标进程形态不支持（未挂捕获）`);
    return;
  }
  let dir = null; // 惰性建目录：预载可能挂在永不发 fetch 的进程上（构建器/驱动壳）
  let seq = 0;
  const ensureDir = () => {
    if (dir === null) {
      dir = outDirOf();
      fs.mkdirSync(dir, { recursive: true });
      console.error(`${TAG} 捕获目录 = ${dir}（host~=${hostLabel}）`);
    }
    return dir;
  };
  const writeLoud = (file, data) => {
    try {
      fs.writeFileSync(path.join(dir, file), data);
    } catch (e) {
      console.error(`${TAG} 抄写失败 ${file}（证据缺角，请求照走）: ${e.message}`);
    }
  };
  globalThis.fetch = async function llmStreamTeeFetch(input, init) {
    const url = typeof input === 'string' ? input : (input && typeof input.url === 'string' ? input.url : String(input));
    if (!isCaptureTarget(url, HOST_ENV)) return orig(input, init);
    seq += 1;
    const n = String(seq).padStart(3, '0');
    try {
      ensureDir();
    } catch (e) {
      console.error(`${TAG} 建目录失败（本次不捕获，请求照走）: ${e.message}`);
      return orig(input, init);
    }
    // 请求面先落盘（响应到来前）：崩在请求阶段也有半份证据。
    const method = (init && init.method) || (typeof input === 'object' && input && input.method) || 'GET';
    const headers = redactHeaders(
      (init && init.headers) || (typeof input === 'object' && input && typeof input.headers === 'object' && input.headers) || {},
    );
    let bodyText = null;
    let bodyNote = null;
    const rawBody = init && init.body !== undefined ? init.body : (typeof input === 'object' && input ? input.body : undefined);
    if (typeof rawBody === 'string') bodyText = rawBody;
    else if (rawBody === undefined || rawBody === null) bodyNote = '无请求体';
    else bodyNote = `未抄写形态 ${typeof rawBody}${rawBody && rawBody.constructor ? `(${rawBody.constructor.name})` : ''}——流式体只能消费一次，抄写即改行为`;
    writeLoud(`${n}.req.json`, `${JSON.stringify({ at: stamp(), seq, method, url, headers, ...(bodyText !== null ? { bodyText } : { bodyNote }) }, null, 2)}\n`);
    let res;
    try {
      res = await orig(input, init);
    } catch (e) {
      writeLoud(`${n}.err`, `${JSON.stringify({ at: stamp(), seq, phase: 'fetch', error: e.message, stack: String(e.stack ?? '') }, null, 2)}\n`);
      throw e; // 网络错误原样抛回调用方——零行为改动
    }
    const meta = { at: stamp(), seq, status: res.status, statusText: res.statusText, headers: redactHeaders(res.headers), respondedAt: stamp(), bodyBytes: 0, doneAt: null };
    writeLoud(`${n}.meta.json`, `${JSON.stringify(meta, null, 2)}\n`);
    if (!res.body) return res; // 无体响应（204 等）——没有流可抄
    const [toCaller, toCapture] = res.body.tee();
    (async () => {
      const reader = toCapture.getReader();
      const file = path.join(dir, `${n}.sse`);
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length) {
            fs.appendFileSync(file, Buffer.from(value)); // 逐块 append：崩在半路已留盘
            meta.bodyBytes += value.length;
          }
        }
      } catch (e) {
        // 旁路读异常只记证据，不影响调用方分支（tee 双分支独立）
        writeLoud(`${n}.err`, `${JSON.stringify({ at: stamp(), seq, phase: 'body-read', error: e.message, stack: String(e.stack ?? ''), bodyBytesSoFar: meta.bodyBytes }, null, 2)}\n`);
      } finally {
        meta.doneAt = stamp();
        writeLoud(`${n}.meta.json`, `${JSON.stringify(meta, null, 2)}\n`);
        reader.releaseLock?.();
      }
    })();
    return new Response(toCaller, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
  console.error(`${TAG} 预载已生效 pid=${process.pid}（判读"已捕获"前先核本行；捕获目录 = 首个命中时打印）`);
}

// ── 单跑形态：预检（端口参数 + 目标进程在场）+ 打印接入命令 ─────────────────────────
async function preflight() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--port');
  const portArg = i !== -1 ? argv[i + 1] : undefined;
  if (argv.includes('--help') || portArg === undefined || !/^\d+$/.test(portArg) || Number(portArg) < 1 || Number(portArg) > 65535) {
    console.error('llm-stream-tee: 用法 node scripts/probe/llm-stream-tee.cjs --port <目标 web GUI 端口>');
    console.error('  预检端口参数与目标进程在场，打印取证接入命令；预载形态（用法①）见文件头注。');
    console.error('  退出码：0 = 预检通过；2 = 用法/前置缺席（未跑）。');
    return 2;
  }
  const port = Number(portArg);
  const alive = await new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port, timeout: 2000 });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
  if (!alive) {
    console.error(`llm-stream-tee: 目标进程缺席——127.0.0.1:${port} 无监听。先起目标（或核对端口），再预检；直接挂预载 = 对着空场抄写。`);
    return 2;
  }
  console.log(`llm-stream-tee: 预检通过——127.0.0.1:${port} 有目标进程在听。取证接入（重启目标进程时挂预载）：`);
  console.log(`  NODE_OPTIONS="--require ${__filename}" <目标进程启动命令>`);
  console.log(`  捕获主机子串 = env LLM_STREAM_TEE_HOST（缺省 api.deepseek.com，空串 fail-closed）；`);
  console.log(`  输出 = runtime/smoke-workspace/llm-stream-tee-<时间戳>/（env LLM_STREAM_TEE_OUT 可覆盖）。`);
  return 0;
}

if (require.main === module) {
  preflight().then((code) => process.exit(code), (e) => { console.error(`${TAG} 预检异常: ${e.message}`); process.exit(2); });
} else {
  installTee();
}
