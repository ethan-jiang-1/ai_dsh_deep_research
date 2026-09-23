#!/usr/bin/env node
// l4-lite-smoke.mjs — L4-lite 真模型冒烟（真模型档，需 DEEPSEEK_API_KEY）。
// 定义：docs/evaluation.md §L4-lite——每角色一条消息，验证模型响应 + 工具调用真实发生。
// 断言用标记法 + 会话日志即真相：prompt 要求模型回复指定标记，轮询**落盘的会话日志**
// （zstd 解压），断言 `assistant/message` 事件携带标记（不是用户消息回显）与
// `tool/call` 事件真实出现——事件词汇表来自 2026-09-24 首跑实证（见 implemented Note）。
//
// 前置：DSH_HOME（dev home 已配凭据，zstd 在 PATH）；DSH_SRC（默认 /Users/bowhead/ai_dsh_company）。
// 用法：source dev/env.sh && node scripts/l4-lite-smoke.mjs [--port 3101]

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OVERLAY = join(ROOT, 'dev', 'research.overlay.yml');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3101'));
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 120_000;
const POLL_MS = 3_000;

const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('l4-lite: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
if (!existsSync(join(home, '.credentials.yaml'))) {
  console.error('l4-lite: dev home 无凭据文件（.credentials.yaml）——先配置 DEEPSEEK_API_KEY');
  process.exit(2);
}
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('l4-lite: 需要 zstd 且须在 PATH 上（会话日志为 zstd 压缩，readSessionLog 直接调 zstd）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? '/Users/bowhead/ai_dsh_company';
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`l4-lite: 机制基线不在位（${bin}）`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let rpcId = 0;
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `l4-${++rpcId}`, method: endpoint, payload: { args } }),
  });
  const body = await response.json();
  if (body?.result?.ok !== true) {
    throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`);
  }
  return body.result.value;
};

const boot = async () => {
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', 'web', '--patch', OVERLAY, '--', '--port', String(PORT), '--no-open'],
    { cwd: dshSrc, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk);
      const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output);
      if (m !== null) resolveBanner({ token: m[1] });
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => rejectBanner(new Error(`web 提前退出（${String(code)}）\n${output.slice(-600)}`)));
    setTimeout(() => rejectBanner(new Error(`boot 超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS);
  });
  return { child, token: (await banner).token };
};

const authenticate = async (token) => {
  const response = await fetch(`http://127.0.0.1:${String(PORT)}/?token=${token}`, { redirect: 'manual' });
  const cookies = response.headers.getSetCookie?.() ?? [];
  if (cookies.length === 0) throw new Error('token 交换没拿到 cookie');
  return cookies.map((c) => c.split(';')[0]).join('; ');
};

// ── 会话日志读取（会话日志即真相；不猜 cwd 编码，按 session id 扫描定位）──
const sessionsRoot = join(home, 'sessions');
const sessionDirOf = (sessionId) => {
  for (const form of [`session-${sessionId}`, sessionId]) {
    if (!existsSync(sessionsRoot)) continue;
    for (const ws of readdirSync(sessionsRoot)) {
      const dir = join(sessionsRoot, ws, form);
      if (existsSync(dir)) return dir;
    }
  }
  return null;
};
const readSessionLog = (sessionId) => {
  const dir = sessionDirOf(sessionId);
  if (dir === null) return '';
  const file = readdirSync(dir).find((f) => f.endsWith('.jsonl.zstd') || f.endsWith('.jsonl'));
  if (file === undefined) return '';
  const p = join(dir, file);
  if (!file.endsWith('.zstd')) return readFileSync(p, 'utf8');
  const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
};

/** 轮询会话日志直到条件函数命中（扫 assistant/message / tool/call 行）。 */
const waitFor = async (sessionId, label, predicate) => {
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const log = readSessionLog(sessionId);
    for (const line of log.split('\n')) {
      if (predicate(line)) return `${label}（seq ${/\"seq\":(\d+)/.exec(line)?.[1] ?? '?'}）`;
    }
  }
  throw new Error(`等 ${label} 超时`);
};

const SMOKE_CWD = join(ROOT, 'dev', 'smoke-workspace');
const failures = [];
const check = (label, fn) => fn().then(
  (info) => console.log(`  PASS ${label}${info ? `（${info}）` : ''}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

// 每角色：一条消息断言 assistant 响应；scout 额外强制 web_search 工具调用
const PROMPTS = {
  lead: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-LEAD', marker: '就绪-LEAD' },
  scout: { text: '这是一次连通性冒烟测试。请用 web_search 工具搜索 DeepSeek API，然后只回复：搜索完成-SCOUT', marker: '搜索完成-SCOUT' },
  analyst: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-ANALYST', marker: '就绪-ANALYST' },
  critic: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-CRITIC', marker: '就绪-CRITIC' },
};

const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(token);
  const sessionIds = new Map();
  for (const role of Object.keys(PROMPTS)) {
    await check(`${role} 会话挂载`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: SMOKE_CWD, agentPreset: role } });
      const id = created?.id ?? created?.sessionId;
      if (typeof id !== 'string') throw new Error('无会话 id');
      sessionIds.set(role, id);
      return undefined;
    });
  }
  for (const [role, spec] of Object.entries(PROMPTS)) {
    await check(`${role} 模型响应（assistant/message 携带标记）`, async () => {
      const sessionId = sessionIds.get(role);
      await rpc(base, cookie, 'session/prompt', {
        request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: spec.text }] },
      });
      return waitFor(sessionId, `assistant 响应 ${spec.marker}`, (line) =>
        line.includes('"assistant/message"') && line.includes(spec.marker));
    });
  }
  await check('scout 工具调用真实发生（tool/call name=web_search）', async () => {
    const sessionId = sessionIds.get('scout');
    return waitFor(sessionId, 'web_search 调用', (line) =>
      line.includes('"tool/call"') && line.includes('"name":"web_search"'));
  });
} finally {
  child.kill('SIGTERM');
  await sleep(300);
}

console.log(failures.length === 0
  ? '\nl4-lite-smoke: ALL PASS（四角色 assistant 响应 + scout web_search 工具调用）'
  : `\nl4-lite-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
