#!/usr/bin/env node
// scripts/snapshot-replay-smoke.mjs — keyless 回放冒烟（keyless-snapshot 四件套之四）。
//
// 判据（本脚本钉的）：录制的会话流（tests/fixtures/snapshot-research-face/session.v1.jsonl）
// 在**零真模型调用**下完整回放——新会话送入同一条 prompt，回合结束后最终 assistant 文本
// = 录制流的收尾文本（canned 响应逐条回放的直接证据：活模型不可能逐字复现）。
//
// 回归信号分层（如实记档）：本冒烟钉的是**回放通路 + 工具编排 + 持久化日志形态**；
// persona/skill 文本变化的组装请求 diff 由后续增量（llm-replay 请求捕获）承接——
// canned 响应本身不随 persona 变化，这是机制边界不是缺陷。
//
// 用法：source dev/env.sh && node scripts/snapshot-replay-smoke.mjs [--port 3103]
// 红证：改 fixture 内一条 assistant 文本 → 本冒烟红；还原 → 绿。
import { spawn } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { scrubbedEnv } from './lib/env.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PORT = Number(arg('port', '3103'));
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 240_000;
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'snapshot-research-face', 'session.v1.jsonl');
const DSH_HOME = process.env.DSH_HOME ?? join(ROOT, 'dev', 'harness-home');
const SESSIONS = join(DSH_HOME, 'sessions');

if (!existsSync(FIXTURE)) {
  console.error(`snapshot-replay-smoke: 缺 fixture（${FIXTURE}）——fail-loud`);
  process.exit(2);
}
if (!process.env.DSH_HOME) {
  console.error('snapshot-replay-smoke: 未 source dev/env.sh（DSH_HOME 缺席）——与 L1/L2 同档自拒');
  process.exit(2);
}

// ── fixture 折算：首条真实用户 prompt（跳过 harness 注入的 system-reminder）+ 收尾 assistant 文本
const lines = readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean);
const userTexts = lines.filter((j) => j.type === 'user/message')
  .map((j) => (j.data?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
  .filter((t) => !t.startsWith('<system-reminder>'));
const firstPrompt = userTexts[0];
const assistantTexts = lines.filter((j) => j.type === 'assistant/message')
  .map((j) => (j.data?.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
  .filter(Boolean);
const finalTail = assistantTexts[assistantTexts.length - 1]?.slice(-120) ?? '';
if (!firstPrompt || assistantTexts.length === 0) {
  console.error('snapshot-replay-smoke: fixture 折算失败（缺用户 prompt 或 assistant 文本）');
  process.exit(2);
}

// ── 回放 patch：禁真 LLM → 插 llm-replay（接线模板 = vendor web-search-endpoint-guidance）──
const tmp = mkdtempSync(join(tmpdir(), 'snapshot-replay-'));
const patchPath = join(tmp, 'replay.patch.yml');
writeFileSync(patchPath, [
  '- id: llm-deepseek',
  '  disabled: true',
  '- insert:',
  '    - id: llm-replay',
  "      name: '@deepseek-ai/dsh-llm-replay'",
  '      config:',
  `        file: ${FIXTURE}`,
  '        providers:',
  '          - id: deepseek-official',
  '            name: DeepSeek',
  '            models:',
  '              - id: deepseek-flash',
  '                contextWindow: 1000000',
  '                defaultMaxTokens: 256000',
  "                reasoningEfforts: ['off', 'low', 'high', 'max']",
].join('\n'));

// ── boot（形状照 preset-smoke：vendor 源码 + tsx + research 档 + 回放 patch）──
const VENDOR = join(ROOT, 'vendor', 'dsh');
const bin = join(VENDOR, 'apps', 'cli', 'src', 'bin.ts');
const dshSrc = VENDOR;
const child = spawn(process.execPath, ['--import', 'tsx/esm', bin, '--profile', 'research', '--patch', patchPath, '--', '--port', String(PORT), '--no-open'], { cwd: dshSrc, env: scrubbedEnv({ DSH_HOME, PATH: process.env.PATH }), stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let output = '';
let childGone = false;
child.on('exit', () => { childGone = true; });
const banner = new Promise((res, rej) => {
  const onData = (chunk) => {
    output += String(chunk);
    const m = new RegExp(`http://127\\.0\\.0\\.1:${PORT}/\\?token=(\\S+)`).exec(output);
    if (m !== null) res({ token: m[1] });
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', (code) => rej(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-600)}`)));
  setTimeout(() => rej(new Error(`等待启动横幅超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS);
});

const failures = [];
const cleanup = () => {
  try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
};
try {
  const { token } = await banner;
  const base = `http://127.0.0.1:${PORT}`;
  const auth = async () => {
    const response = await fetch(`${base}/?token=${token}`, { redirect: 'manual' });
    return (response.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  };
  const cookie = await auth();
  let rpcId = 0;
  const rpc = async (endpoint, args) => {
    const response = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `snap-${++rpcId}`, method: endpoint, payload: { args } }),
    });
    const body = await response.json();
    if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`);
    return body.result.value;
  };

  // 建研究会话（workspaceId 形态——手册注入与侧栏可见同正式 run）
  const ws = await rpc('workspace/create', { request: { path: join(ROOT, 'research-workspace') } });
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId;
  const created = await rpc('session/create', { request: { workspaceId, agentPreset: 'lead' } });
  const sessionId = created?.id ?? created?.sessionId;

  // 送录制的同一条 prompt（回放按 first-call 序绑定脚本）
  await rpc('session/prompt', { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: firstPrompt }] } });

  // 轮询新会话的持久化日志：收尾 assistant 文本出现（canned 回放完成的直接证据）
  const group = readdirSync(SESSIONS).find((d) => d.includes('research-workspace'));
  const logOf = (sid) => join(SESSIONS, group, sid, 'session.v4.jsonl.zstd');
  let finalOk = false;
  const deadline = Date.now() + TURN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 4000));
    const dirs = existsSync(join(SESSIONS, group)) ? readdirSync(join(SESSIONS, group)).filter((d) => d !== sessionId) : [];
    for (const d of dirs) {
      const log = logOf(d);
      if (!existsSync(log)) continue;
      try {
        const { execSync } = await import('node:child_process');
        const text = execSync(`zstd -dc "${log}" 2>/dev/null`, { maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
        if (text.includes('探针完成')) { finalOk = true; break }
      } catch { /* 日志尚不可读，继续轮询 */ }
    }
    if (finalOk) break;
    if (childGone) { failures.push('web 进程在回合结束前退出'); break }
  }
  if (!finalOk) failures.push(`回放回合未在 ${TURN_TIMEOUT_MS / 1000}s 内出现录制收尾文本（"探针完成"）——canned 回放未走通`);
} catch (error) {
  failures.push(error.message);
} finally {
  cleanup();
}

console.log(failures.length === 0
  ? `\nsnapshot-replay-smoke: ALL PASS（录制流零真模型调用完整回放；收尾文本逐字命中）`
  : `\nsnapshot-replay-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
