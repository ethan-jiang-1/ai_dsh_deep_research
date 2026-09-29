#!/usr/bin/env node
// dev/run-kickoff.mjs — run 通道会话驱动（④ run-mechanics 的操作面，真模型档配套）。
// 对已在跑的 run 通道 web 做 session/create（+ 可选 session/prompt）——会话日志即真相，
// 本脚本不做研究断言。中断恢复复用：--cwd/--preset 同，--prompt-file 换恢复指令。
//
// 用法：
//   node dev/run-kickoff.mjs --port 3083 --token <t> [--cwd <dir>] [--preset lead] [--prompt <text> | --prompt-file <f>]
// 输出：session id（stdout，一行）——后续日志核对/仪表盘观察用它定位。
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const port = flag('--port', process.env.DSH_RUN_PORT || '3083');
const token = flag('--token', null);
const cwd = flag('--cwd', resolve(ROOT, 'research-workspace'));
const preset = flag('--preset', 'lead');
const promptFile = flag('--prompt-file', null);
let prompt = flag('--prompt', null);
if (promptFile) prompt = readFileSync(resolve(process.cwd(), promptFile), 'utf8');
if (!token) {
  console.error('缺 --token（web 横幅里的 token）');
  process.exit(1);
}

const base = `http://127.0.0.1:${port}`;

// token → cookie（同 team-preflight-smoke 的 authenticate 形状）
const authRes = await fetch(`${base}/?token=${token}`, { redirect: 'manual' });
const cookies = [...authRes.headers.getSetCookie()];
if (cookies.length === 0) throw new Error('token 交换没拿到 cookie');
const cookie = cookies.map((c) => c.split(';')[0]).join('; ');

let rpcId = 0;
const rpc = async (endpoint, args_) => {
  const res = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `rk-${++rpcId}`, method: endpoint, payload: { args: args_ } }),
  });
  const body = await res.json();
  if (body?.result?.ok !== true) throw new Error(`${endpoint} 失败: ${JSON.stringify(body).slice(0, 300)}`);
  return body.result.value;
};

// 会话创建形态（2026-09-26 实测）：**workspaceId 与 cwd 二选一**（同传报 bad-request）。
// 走 workspaceId 才会把会话关联进该工作区（侧栏可见 + 服务端 reconciliation 认它）；
// cwd 形态建的会话不进侧栏、且 cwd 不在工作区内时手册不注入（agent-instructions 从 cwd
// 向上发现 AGENTS.md）。故：默认路径 = 找/建 research-workspace 的 workspaceId 再建会话；
// --cwd 显式指定时退回 cwd 形态（兼容旧用法，会在 stderr 提示副作用）。
const workspacePath = resolve(ROOT, 'research-workspace');
let created;
if (cwd === workspacePath) {
  const ws = await rpc('workspace/create', { request: { path: workspacePath } });
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId;
  if (typeof workspaceId !== 'string') throw new Error(`拿不到 workspaceId：${JSON.stringify(ws).slice(0, 300)}`);
  created = await rpc('session/create', { request: { workspaceId, agentPreset: preset } });
  console.error(`run-kickoff: 会话建在 research-workspace（workspaceId=${workspaceId.slice(0, 8)}…，侧栏可见 + 手册注入）`);
} else {
  created = await rpc('session/create', { request: { cwd, agentPreset: preset } });
  console.error(`run-kickoff: --cwd 形态（${cwd}）——注意：该形态的会话不进侧栏；cwd 非研究工作区时手册不注入`);
}
const sessionId = created?.id ?? created?.sessionId;
if (typeof sessionId !== 'string') throw new Error(`无会话 id：${JSON.stringify(created).slice(0, 300)}`);
console.log(sessionId);

if (prompt) {
  await rpc('session/prompt', {
    request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: prompt }] },
  });
  console.error(`run-kickoff: prompt 已送入会话 ${sessionId.slice(0, 8)}…（cwd=${cwd}, preset=${preset}）`);
}
