#!/usr/bin/env node
// dev/run-driver.mjs — run 通道**驱动入口**（启动 / 验证 / 呈交，一条命令）。
//
// 为什么存在（用户指令 2026-10-19："驱动插件是最常用的命令，内化固定"）：启动通道的三步序
// （boot → 验浏览器面 → 交 URL）此前只活在 guides/61 §0 散文里，每次启动都要现场拼命令——
// 端口/token 从 web.log 掏、探针用哪面、什么算绿全靠记性。"承诺了动作却没有工具 = 动作不可复跑"
// （dev/run-kickoff.mjs 头注同款教训）。本入口把该序固化成可复跑的一步。
//
// 子命令：
//   up    [--port <p>] [--no-probe]  起通道（或复用已在飞的）+ 验浏览器面 + 打印呈交块
//   probe [--port <p>] [--expect-face <文本>]   对**已在飞**的通道只做浏览器面验证
//   url                               打印当前通道 URL（不启动、不验面）
//
// 判据（= guides/61 §0 呈交纪律的机械化）：exit 0 = 可呈交（宿主侧 + 浏览器面全绿）、
// 1 = 红了（不得呈交，按 verdict.failed 修）、2 = 未跑（前置缺席，如组合在写 / 无通道）。
// **未跑 ≠ 通过**。
//
// 通道事实的唯一来源 = runtime/smoke-workspace/web.log 的**最后一条** `dsh web: <url>` 横幅
// （boot-run 每次 boot 以 tee 截断写该文件；旧横幅 = 旧 token，用旧的必 401）。
//
// 不绕漂移门（guides/61 §0.1）：起通道一律经 `bash dev/boot-run.sh`，从不直起 `dsh --profile
// research`——那会跳过 pack 漂移检测、静默用旧镜像。boot 是前台进程（脚本退出即 web 停），
// 故 `up` 以**托管后台 job** 形态起 boot-run，本驱动的 probe 阶段独立取证。
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { guiUrlFromWebLog, runDriverVerdict } from '../scripts/lib/run-channel.mjs';

export { guiUrlFromWebLog, runDriverVerdict };

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_LOG = join(ROOT, 'runtime/smoke-workspace/web.log');
const BOOT_LOG = join(ROOT, 'runtime/smoke-workspace/run-driver-boot.log');
const DEFAULT_PORT = process.env.DSH_RUN_PORT || '3083';
const DEFAULT_FACE = '研究状态';

const portOf = (url) => Number(new URL(url).port);

// ── 通道状态 ────────────────────────────────────────────────────────────────

const listenPids = (port) => {
  const r = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], { encoding: 'utf8' });
  return (r.stdout ?? '').trim().split('\n').filter(Boolean);
};

const isBootDriving = () => {
  const r = spawnSync('pgrep', ['-f', 'dev/boot-run.sh'], { encoding: 'utf8' });
  return (r.stdout ?? '').trim() !== '';
};

const currentUrl = () => {
  if (!existsSync(WEB_LOG)) return null;
  return guiUrlFromWebLog(readFileSync(WEB_LOG, 'utf8'));
};

/** 通道存活 = web.log 有横幅且该端口真有监听（横幅是旧 boot 残留而进程已死的情况要分开报）。 */
function channelState() {
  const url = currentUrl();
  if (url === null) return { url: null, port: null, listening: false, alive: false };
  const port = portOf(url);
  const pids = listenPids(port);
  return { url, port, pids, listening: pids.length > 0, alive: pids.length > 0 };
}

// ── 浏览器面验证（子进程 = scripts/probe/cdp-probe.mjs，真值的唯一实现）──────────

function probeFace(url, expectFace) {
  const r = spawnSync(process.execPath, [
    join(ROOT, 'scripts/probe/cdp-probe.mjs'),
    url,
    '--open-status',
    '--expect-face', expectFace,
  ], { encoding: 'utf8', cwd: ROOT, timeout: 300_000 });
  let verdict = null;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    return { verdict: null, error: `cdp-probe 输出不可解析（exit=${r.status}）：${(r.stderr ?? '').slice(-500)}` };
  }
  return { verdict, exit: r.status };
}

// ── 子命令 ─────────────────────────────────────────────────────────────────

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? dflt) : dflt;
};
const has = (name) => process.argv.includes(name);
// CLI 守卫：本文件同时被 tests/run-driver-contract.test.mjs import（纯函数面），import 时不许
// 跑子命令（否则 `pnpm test` 里一 import 就 exit 2）。与 scripts/run-ops/run-dashboard.mjs 同款。
const isCli = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolvePath(process.argv[1])).href;
const sub = isCli ? process.argv[2] : undefined;

if (sub === 'url') {
  const s = channelState();
  if (!s.alive) {
    console.error(`run-driver: 无存活通道（web.log ${s.url === null ? '无横幅' : `有 ${s.url} 但端口 ${s.port} 无监听`}）——先 \`node dev/run-driver.mjs up\``);
    process.exit(2);
  }
  console.log(s.url);
  process.exit(0);
}

if (sub === 'probe') {
  const expectFace = arg('--expect-face', DEFAULT_FACE);
  const given = arg('--port', null);
  const s = channelState();
  const url = given !== null ? (s.url !== null && s.port === Number(given) ? s.url : null) : s.url;
  if (url === null) {
    console.error(`run-driver probe: 找不到 ${given !== null ? `端口 ${given}` : '任何'}通道的横幅 URL（web.log = ${WEB_LOG}）——先 up`);
    process.exit(2);
  }
  const { verdict, error } = probeFace(url, expectFace);
  if (verdict === null) {
    console.error(`run-driver probe: ${error}`);
    process.exit(1);
  }
  const v = runDriverVerdict({ probe: verdict, expectFace, composing: false });
  console.log(JSON.stringify({ url, ...v, statusPaneText: verdict.statusPaneText?.slice(0, 600) }, null, 2));
  process.exit(v.exit);
}

if (isCli && sub !== 'up') {
  console.error('run-driver: 用法 node dev/run-driver.mjs up [--port <p>] [--no-probe] | probe [--port <p>] [--expect-face <文本>] | url');
  process.exit(2);
}

// ── up：起通道（或复用）→ 验浏览器面 → 呈交块 ─────────────────────────────────
// 被 import（非 CLI）= 纯函数面：到此为止，不跑主流程（顶层 await 下 return 不合法，用 if 包）。
if (isCli && sub === 'up') {
const wantPort = String(arg('--port', DEFAULT_PORT));
const noProbe = has('--no-probe');
const expectFace = arg('--expect-face', DEFAULT_FACE);

let state = channelState();
if (state.alive) {
  console.log(`run-driver: 通道已存活，复用（端口 ${state.port}，pid ${state.pids.join(',')}）——不另起（guides/61 §0：在飞通道别另起）`);
} else {
  if (isBootDriving()) {
    console.error('run-driver: 已有一个 boot-run.sh 在起通道（勿并发另起）——等它出横幅后跑 `node dev/run-driver.mjs probe`');
    process.exit(2);
  }
  const port = wantPort;
  const busy = listenPids(port);
  if (busy.length > 0) {
    // 端口被非本仓通道占用：说清是谁，不盲杀（BUG-007：在飞会话日志尾部会丢）
    console.error(`run-driver: 端口 ${port} 已被 pid ${busy.join(',')} 占用（不是本仓 web.log 里的通道）`);
    console.error(`           换端口：node dev/run-driver.mjs up --port <空闲端口>；或确认后停掉占用者`);
    process.exit(1);
  }
  console.log(`run-driver: 起通道（bash dev/boot-run.sh，端口 ${port}；日志 ${BOOT_LOG}）…`);
  const out = openSync(BOOT_LOG, 'w');
  const child = spawn('bash', [join(ROOT, 'dev/boot-run.sh')], {
    cwd: ROOT,
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, DSH_RUN_PORT: port },
  });
  child.unref();
  writeFileSync(join(ROOT, 'runtime/smoke-workspace/run-driver.pid'), String(child.pid));

  // 等横幅（boot-run 的自检/漂移门在前，正常 5–30s；红了就 fail-loud 回显尾部）
  let waited = 0;
  let tail = '';
  while (waited < 120_000) {
    await new Promise((r) => setTimeout(r, 1000));
    waited += 1000;
    tail = existsSync(BOOT_LOG) ? readFileSync(BOOT_LOG, 'utf8') : '';
    if (guiUrlFromWebLog(tail) !== null) break;
    if (/boot-run: .*fail-loud|漂移|已退出/.test(tail) && waited > 5000) break;
  }
  state = channelState();
  if (!state.alive) {
    // 起不来就**回收自己 spawn 的子进程**（2026-10-19 实测：detached 子进程活过失败分支会变成
    // 孤儿 boot-run——本驱动生的必须自己收，否则占着 boot 锁让下一次 up 误报"已有 boot 在起"）。
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
    try { child.kill('SIGTERM') } catch {}
    console.error('run-driver: boot 未出可用横幅——boot-run 日志尾部：');
    console.error(tail.slice(-2000) || '（空）');
    process.exit(1);
  }
  console.log(`run-driver: 横幅已出（端口 ${state.port}）`);
}

if (noProbe) {
  console.log(JSON.stringify({ url: state.url, level: 'NOT-RUN', reason: '--no-probe：宿主侧已起，浏览器面未验证（未跑 ≠ 通过）' }, null, 2));
  process.exit(2);
}

const { verdict, error } = probeFace(state.url, expectFace);
if (verdict === null) {
  console.error(`run-driver: ${error}`);
  process.exit(1);
}
const v = runDriverVerdict({ probe: verdict, expectFace, composing: false });
const submitted = v.exit === 0;
console.log('──────────────────────────── 呈交块 ────────────────────────────');
console.log(`通道 URL：${state.url}`);
console.log(`浏览器面：${v.level}${submitted ? '' : `（${v.reason}）`}`);
console.log('自检判据：GUI 里 preset 选单含四个 Deep Research 角色、会话右栏有「研究状态」页签');
console.log('───────────────────────────────────────────────────────────────');
console.log(JSON.stringify({ url: state.url, port: state.port, ...v, statusPaneText: verdict.statusPaneText?.slice(0, 600) }, null, 2));
process.exit(submitted ? 0 : 1);
}
