#!/usr/bin/env node
// l4-lite-smoke.mjs — L4-lite 真模型冒烟（真模型档，需 DEEPSEEK_API_KEY）。
// 定义：docs/evaluation.md §L4-lite——每角色一条消息，验证模型响应 + 工具调用真实发生。
// 断言用标记法 + 会话日志即真相：prompt 要求模型回复指定标记，轮询**落盘的会话日志**
// （zstd 解压），断言 `assistant/message` 事件携带标记（不是用户消息回显）与
// `tool/call` 事件真实出现——事件词汇表来自 2026-09-24 首跑实证（见 implemented Note）。
//
// 前置：DSH_HOME（dev home 已配凭据，zstd 在 PATH）；DSH_SRC（缺省 = 本仓根——vendor/dsh 钉 tag，E1 起统一默认）。
// 用法：source dev/env.sh && node scripts/smoke/l4-lite-smoke.mjs [--port 3101]

import { spawnSync } from 'node:child_process';
import { requireCredentials, withModelKey } from '../lib/env.mjs';
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs';
import { readSessionText, resolveSessionLog } from '../lib/session-log.mjs';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from '../lib/roles.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
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
requireCredentials('l4-lite', { home });
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('l4-lite: 需要 zstd 且须在 PATH 上（会话日志为 zstd 压缩，readSessionLog 直接调 zstd）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? ROOT; // 机制基线 = 本仓 vendor/dsh 钉 tag（AGENTS §DSH 源码；E1 切换后统一默认）
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`l4-lite: 机制基线不在位（${bin}）`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// RPC 正本 = lib/web-harness.makeRpc（原值：前缀 `l4-`、无 AbortSignal 预算、
// 失败文案与 200 字符截断逐字保形）
const rpc = makeRpc({
  prefix: 'l4-',
  errorOf: (endpoint, body) => `${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`,
});

// 启停与横幅等待正本 = lib/web-harness.bootWeb（原值：**非组长** detached:false、
// withModelKey({DSH_HOME}) 环境、超时 BOOT_TIMEOUT_MS、失败尾部 600 字符）
const boot = async () => bootWeb({
  bin, cwd: dshSrc, profile: 'web', patchPath: OVERLAY, port: PORT,
  env: withModelKey({ DSH_HOME: home }), timeoutMs: BOOT_TIMEOUT_MS, tailChars: 600,
  detached: false,
});


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
  const dir = sessionDirOf(sessionId); // 本地：双形态目录发现（canonical 无此形态，保形留下）
  if (dir === null) return '';
  // 选择与解压归 canonical（session-log.mjs）：代际优先（v4.zstd → v4 → v3…）+ node zlib。
  // 契约差（已记 Note）：原首匹配 → 代际优先（dev home 1886 目录多形态=0，等价）；
  // 原 zstd CLI（maxBuffer 截断上限）→ node zlib 全量解压（同输出、不同路）。
  const logPath = resolveSessionLog(dir);
  if (logPath === null) return '';
  return readSessionText(logPath) ?? '';
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

const SMOKE_CWD = join(ROOT, 'runtime', 'smoke-workspace');
const failures = [];
const check = (label, fn) => fn().then(
  (info) => console.log(`  PASS ${label}${info ? `（${info}）` : ''}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

// 每角色：一条消息断言 assistant 响应；scout 额外强制 web_search 工具调用。
// 角色清单事实源 = 盘上 presets/（§3.2）；PROMPTS 只是已知角色的 prompt 覆盖映射——
// 盘上冒出新角色而无覆盖、或覆盖键漂移出盘上集合，都 fail-loud（不再静默忽略）。
const ROLES = presetRoles(ROOT);
const PROMPTS = {
  lead: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-LEAD', marker: '就绪-LEAD' },
  scout: { text: '这是一次连通性冒烟测试。请用 web_search 工具搜索 DeepSeek API，然后只回复：搜索完成-SCOUT', marker: '搜索完成-SCOUT' },
  analyst: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-ANALYST', marker: '就绪-ANALYST' },
  critic: { text: '这是一次连通性冒烟测试。请不要使用任何工具，只回复这几个字：就绪-CRITIC', marker: '就绪-CRITIC' },
};
for (const role of ROLES) {
  if (PROMPTS[role] === undefined) {
    console.error(`l4-lite: 盘上角色 ${role} 无 prompt 覆盖——l4-lite 是全角色冒烟，请在 PROMPTS 增加该角色的标记 prompt`);
    process.exit(2);
  }
}
for (const key of Object.keys(PROMPTS)) {
  if (!ROLES.includes(key)) {
    console.error(`l4-lite: PROMPTS 覆盖键 ${key} 不在盘上角色集合（${ROLES.join(', ')}）——覆盖映射漂移，删掉或改名`);
    process.exit(2);
  }
}

// boot 前自检（RFC vendor-build-guard）：0.1.7 起启动依赖构建产物，缺失时报错隐晦——
// 提前拦成一行 remedy。exit 2 = 环境前置缺失（与"未 source env"同档）。
{
  const va = assertVendorArtifacts(dshSrc);
  if (!va.ok) {
    console.error(`boot 前自检红：vendor 构建产物缺失（${va.missing.join('、')}）`);
    console.error(ARTIFACT_REMEDY);
    process.exit(2);
  }
}
const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(base, token);
  const sessionIds = new Map();
  for (const role of ROLES) {
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
  // 端口自持有（scripts/AGENTS.md「用完释放」）：SIGTERM 直杀只达直接子进程，孙进程会占着
  // 端口成为孤儿——与 preset-smoke 同款按端口收割（2026-09-27 实测 3099 孤儿反复出现的同因）。
  child.kill('SIGTERM');
  await sleep(400);
  const taker = spawnSync('lsof', ['-t', '-nP', `-iTCP:${PORT}`, '-sTCP', 'LISTEN'], { encoding: 'utf8' });
  for (const pid of (taker.stdout ?? '').split('\n').map((x) => x.trim()).filter(Boolean)) {
    try { process.kill(Number(pid), 'SIGKILL') } catch { /* 已死 */ }
  }
  await sleep(300);
}

console.log(failures.length === 0
  ? '\nl4-lite-smoke: ALL PASS（四角色 assistant 响应 + scout web_search 工具调用）'
  : `\nl4-lite-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
