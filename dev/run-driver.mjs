#!/usr/bin/env node
// dev/run-driver.mjs — run 通道**驱动入口**（启动 / 验证 / 呈交，一条命令）。
//
// 为什么存在（用户指令 2026-10-19："驱动插件是最常用的命令，内化固定"）：启动通道的三步序
// （boot → 验浏览器面 → 交 URL）此前只活在 guides/61 §0 散文里，每次启动都要现场拼命令——
// 端口/token 从 web.log 掏、探针用哪面、什么算绿全靠记性。"承诺了动作却没有工具 = 动作不可复跑"
// （dev/run-kickoff.mjs 头注同款教训）。本入口把该序固化成可复跑的一步。
//
// 子命令：
//   up    [--port <p>] [--no-probe] [--require-data]  起通道（或复用已在飞的）+ 验浏览器面 + 打印呈交块
//   probe [--port <p>] [--expect-face <文本>] [--require-data]   对**已在飞**的通道只做浏览器面验证
//   --require-data：要求驾驶舱已绑定 run bundle（新会话默认未绑定；未绑定在 verdict 里是显式字段）
//   url                               打印当前通道 URL（不启动、不验面）
//
// 判据（= guides/61 §0 呈交纪律的机械化）：exit 0 = 可呈交（镜像一致 + 宿主侧 + 浏览器面全绿）、
// 1 = 红了（不得呈交，按 verdict.failed 修）、2 = 未跑（前置缺席，如镜像漂移/未取证 / 无通道）。
// **未跑 ≠ 通过**。复用已在飞的通道时先跑 boot-run --drift-only：通道加载的镜像 ≠ 当前 pack 源
// 时，probe 验的是旧页面——2026-10-28 实测通道 18:47 起、pack client 02:50 重建，旧实现仍报 GREEN。
// 加速（2026-11-05 实测）：boot-run 默认起 vendor **构建产物** lib/bin.js（≈3s；`DSH_RUN_RUNTIME=source`
// 退回 tsx 源码 ≈13s）；`up` 对同一 pack 源 + 同一 runtime 构建的最近 GREEN 在 30 分钟内复用
// （冷启动同样命中，命中前仍做一次 HTTP 就绪检查）；`--force-probe` 强制真验。缓存只存 GREEN。
// 缓存判据 = scripts/lib/channel-cache.mjs（键 = pack 指纹 + runtime 构建 + 断言参数）。
//
// 通道事实的唯一来源 = runtime/smoke-workspace/web.log 的**最后一条** `dsh web: <url>` 横幅
// （boot-run 每次 boot 以 tee 截断写该文件；旧横幅 = 旧 token，用旧的必 401）。
//
// 不绕漂移门（guides/61 §0.1）：起通道一律经 `bash dev/boot-run.sh`，从不直起 `dsh --profile
// research`——那会跳过 pack 漂移检测、静默用旧镜像。boot 是前台进程（脚本退出即 web 停），
// 故 `up` 以**托管后台 job** 形态起 boot-run，本驱动的 probe 阶段独立取证。
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../scripts/lib/cli-entry.mjs';
import { guiUrlFromWebLog, probeFailureVerdict, runDriverVerdict } from '../scripts/lib/run-channel.mjs';
import { collectPackEntries, packFingerprint, probeCacheHit, probeCacheKey } from '../scripts/lib/channel-cache.mjs';
import { authenticate } from '../scripts/lib/web-harness.mjs';

export { guiUrlFromWebLog, runDriverVerdict };

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
// 实例状态根：默认 runtime/smoke-workspace；多实例用 DSH_RUN_STATE_DIR 指向各自目录。
const DEFAULT_STATE_DIR = join(ROOT, 'runtime/smoke-workspace');
const STATE_DIR = resolvePath(process.env.DSH_RUN_STATE_DIR ?? DEFAULT_STATE_DIR);
mkdirSync(STATE_DIR, { recursive: true });
const WEB_LOG = join(STATE_DIR, 'web.log');
const BOOT_LOG = join(STATE_DIR, 'run-driver-boot.log');
const DEFAULT_PORT = process.env.DSH_RUN_PORT || '3083';
const DEFAULT_PROFILE = process.env.DSH_RUN_PROFILE || 'deep-research';
const PACK_DIR = join(ROOT, 'packages', 'deep-research-pack');
// 验证缓存：只存最近一次 GREEN（键 = pack 指纹 + runtime 构建指纹 + 断言参数）；见 scripts/lib/channel-cache.mjs。
const PROBE_CACHE = join(STATE_DIR, 'probe-cache.json');
const readProbeCache = () => {
  try { return JSON.parse(readFileSync(PROBE_CACHE, 'utf8')); } catch { return null; }
};
// runtime 构建指纹：boot-run 默认起 vendor 构建产物（lib/bin.js），其 mtime 变 = 二进制变；
// DSH_RUN_RUNTIME=source 时退回 tsx 源码（键里写 source，避免与构建产物互认缓存）。
const BUILT_CLI = join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'lib', 'bin.js');
const runtimeFingerprint = () => {
  try {
    if (process.env.DSH_RUN_RUNTIME !== 'source' && existsSync(BUILT_CLI)) {
      return `built@${Math.trunc(statSync(BUILT_CLI).mtimeMs)}`;
    }
  } catch {}
  return 'source';
};
// dev 外壳指纹：决定被探测页面内容的 overlay / boot 序列 / 渲染器。pack 没动但外壳变了也必须
// miss（BUG-065：旧键只有 pack+runtime，会拿 30 分钟前的 GREEN 冒充当前页面）。
const DEV_SHELL_FILES = ['dev/research.overlay.yml', 'dev/boot-run.sh', 'dev/render-overlay.mjs'];
const devShellFingerprint = () => {
  const hash = createHash('sha256');
  for (const rel of DEV_SHELL_FILES) {
    hash.update(rel).update('\0');
    try { hash.update(readFileSync(join(ROOT, rel))); } catch { hash.update('missing'); }
  }
  return hash.digest('hex').slice(0, 16);
};
// HTTP 就绪（缓存命中仍要求服务器在、shell 可服务）：token 换 cookie 后只读首页，不代替浏览器探针。
const httpReady = async (url) => {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get('token');
    if (token === null) return { ok: false, detail: 'URL 无 token' };
    const cookie = await authenticate(parsed.origin, token);
    const res = await fetch(`${parsed.origin}/`, { headers: { cookie }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const text = await res.text();
    const ok = text.includes('id="root"') || text.includes('__DSH_BOOT__');
    return { ok, detail: ok ? `HTTP ${res.status}` : `HTTP ${res.status} 无 shell 标记` };
  } catch (error) {
    return { ok: false, detail: String(error?.message ?? error) };
  }
};

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

// ── 浏览器面验证（子进程 = probes/browser/cdp-probe.mjs，真值的唯一实现）──────────

function probeFace(url, expectFace, screenshotPath = undefined, htmlPath = undefined) {
  const args = [
    join(ROOT, 'probes/browser/cdp-probe.mjs'),
    url,
    '--open-status',
  ];
  if (expectFace !== undefined) args.push('--expect-face', expectFace);
  if (screenshotPath !== undefined) args.push('--screenshot', screenshotPath);
  if (htmlPath !== undefined) args.push('--html', htmlPath);
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: ROOT, timeout: 300_000 });
  let verdict = null;
  try {
    verdict = JSON.parse(r.stdout);
  } catch {
    return { verdict: null, error: `cdp-probe 输出不可解析（exit=${r.status}）：${(r.stderr ?? '').slice(-500)}` };
  }
  return { verdict, exit: r.status };
}

/** 镜像一致性取证 = boot-run 的只读模式（不碰端口/不安装/不起 web）。红 = 当前通道加载的
 *  不是当前 pack 源；此时浏览器面再绿也只是旧页面的绿。 */
function mirrorDrift() {
  const r = spawnSync('bash', [join(ROOT, 'dev', 'boot-run.sh'), '--drift-only'], { encoding: 'utf8', cwd: ROOT, timeout: 180_000 });
  // env.sh 的启动提示与自检绿行不是判据；只留 boot-run 的漂移/修复行，避免把 600 字预算
  // 花在每次都会出现的前缀上（实测 detail 曾从半行 "ile 镜像不一致" 开始）。
  const lines = `${r.stderr ?? ''}\n${r.stdout ?? ''}`.split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '' && !line.startsWith('dev/env.sh:') && !line.startsWith('boot 前自检绿'));
  const driftLines = lines.filter((line) => line.includes('漂移——'));
  const remedy = lines.filter((line) => line.includes('修复：') || line.includes('检测红')).slice(-2);
  // 摘要把 client.js 这类关键漂移放在前面（npm pack 清单顺序里它在 README 之后）；只取
  // 前三条 + 总数，避免 600 字预算被 20 多个 .d.ts 行吃光。
  const detail = driftLines.length > 0
    ? [`漂移 ${driftLines.length} 个文件：`, ...driftLines.slice(0, 3), ...(driftLines.length > 3 ? ['…'] : []), ...remedy].join('\n')
    : lines.slice(-4).join('\n');
  return {
    clean: r.status === 0,
    status: r.status,
    detail: detail || (r.error === undefined ? `--drift-only exit=${String(r.status)}` : `--drift-only 执行失败：${r.error.message}`),
  };
}

// ── 判定落盘：每次 up/probe 各留一份现场 ──────────────────────────────────────
// 旧实现只写固定名 run-driver-verdict.json / -probe-verdict.json：下一次 up/probe 直接覆盖，
// **红的现场会被后来的绿抹掉**——agent 复跑一次就再也看不到当时哪条检查红、页面长什么样
// （2026-10-27 卫生轮实证：同一通道 21:14 RED、21:22 GREEN，RED 的截图只剩内存里那份）。
// 现在：run-verdicts/<ts>-<kind>/ 每次一份（verdict.json + page.png），latest-verdict.json
// 指向最近一次；固定名副本继续写（cold-start.entry 与既有消费方按固定名读，不动契约）。
function persistVerdict(kind, payload, screenshotPath, htmlPath) {
  const at = new Date();
  const dir = join(STATE_DIR, 'run-verdicts', `${at.toISOString().replace(/[:.]/g, '-')}-${kind}`);
  mkdirSync(dir, { recursive: true });
  let shot = null;
  if (screenshotPath !== undefined && existsSync(screenshotPath)) {
    try { copyFileSync(screenshotPath, join(dir, 'page.png')); shot = join(dir, 'page.png'); } catch {}
  }
  let html = null;
  if (htmlPath !== undefined && existsSync(htmlPath)) {
    try { copyFileSync(htmlPath, join(dir, 'page.html')); html = join(dir, 'page.html'); } catch {}
  }
  const file = join(dir, 'verdict.json');
  writeFileSync(file, JSON.stringify({ ...payload, at: at.toISOString(), kind, screenshotCopy: shot, htmlCopy: html }, null, 2));
  writeFileSync(join(STATE_DIR, 'latest-verdict.json'), JSON.stringify({ kind, dir, verdict: file, at: at.toISOString() }, null, 2));
  const legacy = join(STATE_DIR, kind === 'up' ? 'run-driver-verdict.json' : 'run-driver-probe-verdict.json');
  writeFileSync(legacy, JSON.stringify(payload, null, 2));
  return { dir, file, legacy };
}

// ── 子命令 ─────────────────────────────────────────────────────────────────

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? dflt) : dflt;
};
const has = (name) => process.argv.includes(name);
// CLI 守卫：本文件同时被 tests/run-driver-contract.spec.mjs import（纯函数面），import 时不许
// 跑子命令（否则 `pnpm test` 里一 import 就 exit 2）。与 scripts/run-ops/run-dashboard.mjs 同款。
const isCli = isMain(import.meta.url);
const sub = isCli ? process.argv[2] : undefined;
const wantBootstrap = isCli && process.argv.includes('--bootstrap');

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
  const expectFace = arg('--expect-face', undefined);
  const requireData = has('--require-data');
  const given = arg('--port', null);
  const s = channelState();
  const url = given !== null ? (s.url !== null && s.port === Number(given) ? s.url : null) : s.url;
  if (url === null) {
    console.error(`run-driver probe: 找不到 ${given !== null ? `端口 ${given}` : '任何'}通道的横幅 URL（web.log = ${WEB_LOG}）——先 up`);
    process.exit(2);
  }
  const drift = mirrorDrift();
  if (!drift.clean) {
    const v = runDriverVerdict({ probe: {}, expectFace, drift });
    const payload = { url, ...v, driftDetail: drift.detail };
    const saved = persistVerdict('probe', payload);
    console.log(JSON.stringify(payload, null, 2));
    console.error(`run-driver probe: NOT-RUN——通道镜像漂移/未取证（${saved.dir}）；先按 boot-run 处方重建并重启通道，再验`);
    process.exit(2);
  }
  const shot = join(STATE_DIR, 'run-driver-probe.png');
  const html = join(STATE_DIR, 'run-driver-probe.html');
  const { verdict, error } = probeFace(url, expectFace, shot, html);
  if (verdict === null) {
    const payload = { url, ...probeFailureVerdict({ error, expectFace, drift, requireData }) };
    const saved = persistVerdict('probe', payload, undefined, html);
    console.error(`run-driver probe: 探针失败（${error}）；已落 ${saved.dir}，latest-verdict 已更新`);
    process.exit(1);
  }
  const v = runDriverVerdict({ probe: verdict, expectFace, drift, requireData });
  const payload = { url, ...v, statusPaneText: verdict.statusPaneText?.slice(0, 600), screenshot: verdict.screenshot ?? null };
  const saved = persistVerdict('probe', payload, verdict.screenshot, html);
  console.log(JSON.stringify(payload, null, 2));
  console.error(`run-driver probe: 现场 ${saved.dir}（page.png + verdict.json）；固定名副本 ${saved.legacy}`);
  process.exit(v.exit);
}

if (isCli && sub !== 'up') {
  console.error('run-driver: 用法 node dev/run-driver.mjs up [--port <p>] [--profile <p>] [--bootstrap] [--no-probe] [--force-probe] [--require-data] | probe [--port <p>] [--expect-face <文本>] [--require-data] | url');
  process.exit(2);
}

// ── up：起通道（或复用）→ 验浏览器面 → 呈交块 ─────────────────────────────────
// 被 import（非 CLI）= 纯函数面：到此为止，不跑主流程（顶层 await 下 return 不合法，用 if 包）。
if (isCli && sub === 'up') {
const wantPort = String(arg('--port', DEFAULT_PORT));
const wantProfile = arg('--profile', DEFAULT_PROFILE);
const noProbe = has('--no-probe');
const forceProbe = has('--force-probe');
const expectFace = arg('--expect-face', undefined);
const requireData = has('--require-data');

let state = channelState();
let drift = null;
if (state.alive) {
  console.log(`run-driver: 通道已存活，复用（端口 ${state.port}，pid ${state.pids.join(',')}）——不另起（guides/61 §0：在飞通道别另起）`);
  // 复用不是免检：先证明通道加载的镜像 = 当前 pack 源。旧实现直接 probe，把旧页面判成当前绿。
  drift = mirrorDrift();
  if (!drift.clean) {
    const v = runDriverVerdict({ probe: {}, expectFace, drift });
    const payload = { url: state.url, port: state.port, ...v, driftDetail: drift.detail };
    const saved = persistVerdict('up', payload);
    console.error(`run-driver: NOT-RUN——通道镜像漂移/未取证（${saved.dir}）；当前页面不是当前代码。`);
    console.error('           先确认没有在飞 run 需要保活，再停通道并重建镜像（bash dev/boot-run.sh），然后重跑 up。');
    console.log(JSON.stringify(payload, null, 2));
    process.exit(2);
  }
} else {
  if (wantBootstrap) {
    console.log('run-driver: --bootstrap 检查独立环境前置…');
    const b = spawnSync('bash', [join(ROOT, 'dev', 'bootstrap.sh')], { cwd: ROOT, stdio: 'inherit', env: process.env });
    if (b.status !== 0) {
      console.error('run-driver: bootstrap 未就绪——按上方 FAIL/todo 修复后重试（未跑 ≠ 通过）');
      process.exit(1);
    }
  }
  // 并发检查只守默认 state：不同 state dir 的实例允许并行（多实例）；同端口仍由下方端口检查拦。
  if (STATE_DIR === DEFAULT_STATE_DIR && isBootDriving()) {
    console.error('run-driver: 默认 state 下已有一个 boot-run.sh 在起通道（勿并发另起）——等它出横幅后跑 `node dev/run-driver.mjs probe`');
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
    env: { ...process.env, DSH_RUN_PORT: port, DSH_RUN_PROFILE: wantProfile, DSH_RUN_STATE_DIR: STATE_DIR },
  });
  child.unref();
  writeFileSync(join(STATE_DIR, 'run-driver.pid'), String(child.pid));

  // 等横幅（boot-run 的自检/漂移门在前，正常 5–30s；红了就 fail-loud 回显尾部）
  let waited = 0;
  let tail = '';
  while (waited < 120_000) {
    // 250ms 轮询（2026-11-05 加速）：横幅出现即返回，避免 1s 粒度的平均 0.5s 等待。
    await new Promise((r) => setTimeout(r, 250));
    waited += 250;
    tail = existsSync(BOOT_LOG) ? readFileSync(BOOT_LOG, 'utf8') : '';
    if (guiUrlFromWebLog(tail) !== null) break;
    if (/boot-run: .*(?:fail-loud|已退出|失败)|pack 漂移检测红|漂移——/.test(tail) && waited > 5000) break;
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
  // 刚起的通道已经过 boot-run 的漂移门（红则起不来）——此处只记录取证结果。
  drift = { clean: true, detail: 'boot-run 漂移门绿（起通道时已验）' };
}

if (noProbe) {
  console.log(JSON.stringify({ url: state.url, level: 'NOT-RUN', reason: '--no-probe：宿主侧已起，浏览器面未验证（未跑 ≠ 通过）' }, null, 2));
  process.exit(2);
}

// 验证缓存（2026-11-05 加速）：同一 pack 源 + 同一 runtime 构建 + TTL（30 分钟）内的最近 GREEN →
// 复用结论，省掉 ~13s 浏览器探针；**冷启动同样可命中**（页面内容由 pack+runtime 决定）。
// 命中前仍要求 boot 出横幅 + 一次 HTTP 就绪检查（服务器在、shell 可服务）；HTTP 不过即转真探针。
// --force-probe 永久绕过；NOT-RUN/红从不入缓存（未跑 ≠ 通过）。
if (!forceProbe && drift?.clean === true) {
  const cached = readProbeCache();
  const packId = packFingerprint(collectPackEntries(PACK_DIR));
  const key = `${probeCacheKey({ packFingerprint: packId, runtime: runtimeFingerprint(), extra: devShellFingerprint() })}|${expectFace ?? ''}|${requireData ? '1' : '0'}`;
  const hit = probeCacheHit({ entry: cached, key, now: Date.now() });
  if (hit.hit) {
    const ready = await httpReady(state.url);
    if (ready.ok) {
      const ageS = Math.round((hit.ageMs ?? 0) / 1000);
      const payload = { ...cached.payload, url: state.url, port: state.port, cached: true, cacheAgeMs: hit.ageMs, reason: `缓存命中（同一 pack 源 + runtime 构建 + dev 外壳；${ageS}s 前 GREEN）——--force-probe 可强制重验` };
      console.log(`run-driver: 验证缓存命中（${ageS}s 前 GREEN，同一 pack 源 + runtime 构建 + dev 外壳；--force-probe 可强制重验）`);
      console.log('──────────────────────────── 呈交块（缓存）────────────────────────────');
      console.log(`通道 URL：${state.url}`);
      console.log(`浏览器面：GREEN（缓存，${ageS}s 前；HTTP 就绪 ${ready.detail}）`);
      console.log('───────────────────────────────────────────────────────────────');
      console.log(JSON.stringify(payload, null, 2));
      process.exit(0);
    }
    console.log(`run-driver: 缓存命中但 HTTP 就绪检查未过（${ready.detail}）——转真探针`);
  }
}

const shot = join(STATE_DIR, 'run-driver-status.png');
const html = join(STATE_DIR, 'run-driver-status.html');
const { verdict, error } = probeFace(state.url, expectFace, shot, html);
if (verdict === null) {
  const payload = { url: state.url, port: state.port, ...probeFailureVerdict({ error, expectFace, drift, requireData }) };
  const saved = persistVerdict('up', payload, undefined, html);
  console.error(`run-driver: 探针失败（${error}）；已落 ${saved.dir}，latest-verdict 已更新`);
  process.exit(1);
}
const v = runDriverVerdict({ probe: verdict, expectFace, drift, requireData });
const submitted = v.exit === 0;
const payload = { url: state.url, port: state.port, ...v, statusPaneText: verdict.statusPaneText?.slice(0, 600), screenshot: verdict.screenshot ?? null };
const saved = persistVerdict('up', payload, verdict.screenshot, html);
if (submitted) {
  // 只缓存 GREEN（键 = pack 指纹 + runtime 构建 + 断言参数；冷启动可复用）；红/未跑永不入缓存。
  try {
    const packId = packFingerprint(collectPackEntries(PACK_DIR));
    const key = `${probeCacheKey({ packFingerprint: packId, runtime: runtimeFingerprint(), extra: devShellFingerprint() })}|${expectFace ?? ''}|${requireData ? '1' : '0'}`;
    writeFileSync(PROBE_CACHE, JSON.stringify({ key, at: new Date().toISOString(), level: v.level, payload }, null, 2));
  } catch {}
}
console.log('──────────────────────────── 呈交块 ────────────────────────────');
console.log(`通道 URL：${state.url}`);
console.log(`浏览器面：${v.level}（数据面：${v.dataFace}）${submitted ? '' : `（${v.reason}）`}`);
console.log(`可见证据：${saved.dir}/page.png ｜ 判定：${saved.dir}/verdict.json（固定名副本 ${saved.legacy}；latest = ${join(STATE_DIR, 'latest-verdict.json')}）`);
console.log('自检判据：GUI 里 preset 选单含四个 Deep Research 角色、会话右栏有「研究状态」页签');
console.log('───────────────────────────────────────────────────────────────');
console.log(JSON.stringify(payload, null, 2));
process.exit(submitted ? 0 : 1);
}
