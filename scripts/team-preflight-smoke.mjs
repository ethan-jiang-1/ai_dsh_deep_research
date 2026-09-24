#!/usr/bin/env node
// team-preflight-smoke.mjs — M2 铺垫 P2：team 机制迷你预检（真模型档，需 DEEPSEEK_API_KEY）。
// 定义：notes/proposed/2026-09-24-m2-p2-team-preflight RFC。仿 l4-lite 形状（标记法 +
// 会话日志即真相），通道 = run 通道（--profile research 安装域，boot 形状同 dev/boot-run.sh）。
// 断言：spawn_teammate 真调用 ×2 / list_agents / 成员会话建立 + 响应标记 / lead 的
//   one-shot subagent 调用（company D18 现状探针）/ 成员组合画像（发现型：agentPreset 字段 +
//   工具面线索 → 打印事实，不硬断言——机制预读预期成员 = 裸代理，无角色 preset）。
// 时序教训（首跑实证）：模型会在确认语里**早现标记词**，且回合含多步工具调用——等标记
//   不等于等回合完成；这里用静默检测（日志行数连续 4 次轮询不变）等回合真正落定。
// 成员发现（首跑实证）：lead 日志的 "Background subagent <uuid>" user/message 行 =
//   成员 session id 的机制原生记录（roster childId）；行级标记扫描作 fallback。
// 前置：DSH_HOME（dev home 已配凭据）+ research 组合在位（缺则先跑 dev/boot-run.sh）+ zstd。
// 用法：source dev/env.sh && node scripts/team-preflight-smoke.mjs [--port 3102]

import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetRoles } from './lib/roles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const PROFILE = 'research';
const PORT = Number(arg('port', '3102'));
const BOOT_TIMEOUT_MS = 120_000;
const LEAD_TURN_TIMEOUT_MS = 300_000;
const MEMBER_WAIT_MS = 180_000;
const POLL_MS = 3_000;
const QUIET_POLLS = 4;

// ── 前置校验 ──
const home = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
if (!home) { console.error('team-preflight: 需要 DSH_HOME（先 source dev/env.sh）'); process.exit(2); }
if (!existsSync(join(home, '.credentials.yaml'))) {
  console.error('team-preflight: dev home 无凭据文件（.credentials.yaml）——先配置 DEEPSEEK_API_KEY');
  process.exit(2);
}
if (spawnSync('zstd', ['--version']).status !== 0) {
  console.error('team-preflight: 需要 zstd 且须在 PATH 上（会话日志为 zstd 压缩）');
  process.exit(2);
}
const dshSrc = process.env.DSH_SRC ?? '/Users/bowhead/ai_dsh_company';
const bin = join(dshSrc, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts');
if (!existsSync(bin)) { console.error(`team-preflight: 机制基线不在位（${bin}）`); process.exit(2); }
// run 通道组合校验（镜像 boot-run.sh 的 profile_ok；缺则提示先跑 boot-run）
const profDir = join(home, 'profiles', PROFILE);
{
  let ok = existsSync(join(profDir, 'package.json'));
  if (ok) {
    const m = JSON.parse(readFileSync(join(profDir, 'package.json'), 'utf8'));
    const b = new Set(m?.dsh?.profile?.bundles ?? []);
    ok = b.has('dsh-deep-research-pack') && b.has('@deepseek-ai/dsh-experimental-agent-team-profile');
  }
  for (const r of presetRoles(ROOT)) {
    ok = ok && existsSync(join(profDir, 'node_modules', 'dsh-deep-research-pack', 'presets', r, 'preset.yml'));
  }
  if (!ok) {
    console.error('team-preflight: research profile 组合不完整（本包 + vendor 层 + 盘上全部角色 preset）——先跑 dev/boot-run.sh 再来');
    process.exit(2);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let rpcId = 0;
const rpc = async (base, cookie, endpoint, args) => {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `tp-${++rpcId}`, method: endpoint, payload: { args } }),
  });
  const body = await response.json();
  if (body?.result?.ok !== true) {
    throw new Error(`${endpoint} 失败: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
  }
  return body.result.value;
};

const boot = async () => {
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', bin, '--profile', PROFILE, '--', '--port', String(PORT), '--no-open'],
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

// ── 会话日志读取（会话日志即真相；按 session id 扫描定位，不猜 cwd 编码）──
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
  const r = spawnSync('zstd', ['-dc', p], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : '';
};

/** 等回合真正落定：日志行数连续 QUIET_POLLS 次轮询不变（多步工具回合没有 turn/end 事件，
 *  且模型会在确认语里早现标记——静默是唯一可靠的完成信号；首跑实证）。 */
const waitForQuiescence = async (sessionId, label, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  let stable = 0;
  let lastCount = -1;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const n = readSessionLog(sessionId).split('\n').length;
    if (n === lastCount) stable += 1;
    else { stable = 0; lastCount = n; }
    if (stable >= QUIET_POLLS && n > 1) return `${n} 行已静默`;
  }
  throw new Error(`等 ${label} 静默超时（日志停在 ${lastCount} 行）`);
};

const waitForLine = async (sessionId, label, predicate, timeoutMs) => {
  const deadline = Date.now() + (timeoutMs ?? 120_000);
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    for (const line of readSessionLog(sessionId).split('\n')) {
      if (predicate(line)) return `"seq":${/"seq":(\d+)/.exec(line)?.[1] ?? '?'}`;
    }
  }
  throw new Error(`等 ${label} 超时`);
};

const countEvents = (sessionId, predicate) => {
  let n = 0;
  for (const line of readSessionLog(sessionId).split('\n')) {
    if (predicate(line)) n += 1;
  }
  return n;
};

const SMOKE_CWD = join(ROOT, 'dev', 'smoke-workspace');
const LEAD_MARKER = '预检完成-LEAD';
const SCOUT_MARKER = '预检就绪-SCOUT';
const ANALYST_MARKER = '预检就绪-ANALYST';
const LEAD_PROMPT = `这是一次团队机制预检，不是研究任务。严格按以下四个步骤执行；每一步都必须真实调用指定的工具，不得跳过、不得用其他工具替代、不得凭记忆回答。不要在开始时复述任何标记词；"预检完成-LEAD"这个词组只许在第 4 步输出。
1. 调用 spawn_teammate 工具两次：第一次 name=probe-scout、description=侦察预检，prompt 只写：请只回复这几个字：${SCOUT_MARKER}；第二次 name=probe-analyst、description=分析预检，prompt 只写：请只回复这几个字：${ANALYST_MARKER}。
2. 调用 list_agents 工具，确认两名队友在场。
3. 调用名为 subagent 的工具（一次性 one-shot 模式）查证：珠穆朗玛峰海拔多少米。不要用 web_search。
4. 只回复这几个字：${LEAD_MARKER}`;

const failures = [];
const findings = [];
const check = (label, fn) => fn().then(
  (info) => console.log(`  PASS ${label}${info ? `（${info}）` : ''}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`); },
);

const { child, token } = await boot();
try {
  const base = `http://127.0.0.1:${String(PORT)}`;
  const cookie = await authenticate(token);

  let leadId = null;
  await check('lead 会话挂载（research 安装域）', async () => {
    const created = await rpc(base, cookie, 'session/create', { request: { cwd: SMOKE_CWD, agentPreset: 'lead' } });
    const id = created?.id ?? created?.sessionId;
    if (typeof id !== 'string') throw new Error(`无会话 id：${JSON.stringify(created).slice(0, 200)}`);
    leadId = id;
    return undefined;
  });
  if (leadId === null) throw new Error('lead 会话未建立，后续断言无从谈起');

  await check(`lead 回合落定 + 标记（${LEAD_MARKER}）`, async () => {
    await rpc(base, cookie, 'session/prompt', {
      request: { requestId: randomUUID(), sessionId: leadId, mode: 'queue', content: [{ type: 'text', text: LEAD_PROMPT }] },
    });
    await waitForQuiescence(leadId, 'lead 回合', LEAD_TURN_TIMEOUT_MS);
    return await waitForLine(leadId, `assistant 携带 ${LEAD_MARKER}`, (line) =>
      line.includes('"assistant/message"') && line.includes(LEAD_MARKER), 15_000);
  });

  await check('spawn_teammate 真调用 ×2（tool/call）', async () => {
    const n = countEvents(leadId, (line) => line.includes('"tool/call"') && line.includes('"name":"spawn_teammate"'));
    if (n < 2) throw new Error(`spawn_teammate 调用数 = ${n}（期望 ≥2）`);
    return `共 ${n} 次`;
  });

  await check('list_agents 真调用（tool/call）', async () => {
    const n = countEvents(leadId, (line) => line.includes('"tool/call"') && line.includes('"name":"list_agents"'));
    if (n < 1) throw new Error('list_agents 调用未见（lead 可能跳过了第 2 步）');
    return `共 ${n} 次`;
  });

  await check('lead 的 one-shot subagent 调用真实发生（company D18 现状探针）', async () => {
    const n = countEvents(leadId, (line) => line.includes('"tool/call"') && line.includes('"name":"subagent"'));
    if (n < 1) throw new Error('subagent 调用未见（lead 可能跳过第 3 步或用了别的工具）');
    return `共 ${n} 次`;
  });

  // 成员发现：lead 日志的 "Background subagent <uuid>" 行 = roster childId（机制原生）
  await check('成员 id 从 lead 日志提取（Background subagent 行）', async () => {
    const ids = [...readSessionLog(leadId).matchAll(/Background subagent ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g)].map((m) => m[1]);
    if (ids.length < 2) throw new Error(`只提取到 ${ids.length} 个成员 id`);
    return ids.map((i) => i.slice(0, 8)).join(' / ');
  });
  const memberIds = [...new Set([...readSessionLog(leadId).matchAll(/Background subagent ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/g)].map((m) => m[1]))];

  const memberSpecs = [[SCOUT_MARKER, 'probe-scout'], [ANALYST_MARKER, 'probe-analyst']];
  for (let i = 0; i < memberSpecs.length; i += 1) {
    const [marker, name] = memberSpecs[i];
    await check(`成员 ${name} 响应（assistant 携带 ${marker}）`, async () => {
      const id = memberIds[i];
      if (id === undefined) throw new Error('成员 id 缺席（上一步未全过）');
      return await waitForLine(id, `成员标记 ${marker}`, (line) =>
        line.includes('"assistant/message"') && line.includes(marker), MEMBER_WAIT_MS);
    });
  }

  // 发现型画像（不硬断言——机制预读预期：成员 = 裸代理 + team 工具面，无角色 preset）
  for (let i = 0; i < memberSpecs.length; i += 1) {
    const [, name] = memberSpecs[i];
    const id = memberIds[i];
    if (id === undefined) continue;
    const log = readSessionLog(id);
    const presetHit = /"agentPreset":"([^"]*)"/.exec(log);
    const tools = [...new Set([...log.matchAll(/"name":"([a-z_]+)"/g)].map((m) => m[1]))];
    findings.push(`${name}（session ${id.slice(0, 8)}…）：agentPreset = ${presetHit ? `"${presetHit[1]}"` : '（日志无此字段）'}；`
      + `会话出现过的 name 词汇：${tools.slice(0, 14).join(', ')}`);
  }
} finally {
  child.kill('SIGTERM');
  await sleep(300);
}

console.log('\n── 成员组合画像（Q2 机制半边，发现型事实）──');
for (const f of findings) console.log(`  · ${f}`);
if (failures.length === 0) {
  console.log(findings.some((f) => f.includes('agentPreset = "scout"') || f.includes('agentPreset = "analyst"'))
    ? '\nteam-preflight: ALL PASS（机制绿；成员挂上了角色 preset——与机制预读相左，回填 Q2 时修正预期）'
    : '\nteam-preflight: ALL PASS（机制绿；成员组合与机制预读一致（无角色 preset）——Q2 机制半边闭环）');
} else {
  console.log(`\nteam-preflight: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
  console.log('\n（预检的价值在暴露：以上失败即雷区清单，处置建议进毕业 Note）');
}
process.exit(failures.length === 0 ? 0 : 1);
