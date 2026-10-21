#!/usr/bin/env node
// session-replay.mjs — 把**任意历史会话**在真实 UI 里打开并抓成场景包（2026-10-21，反馈通路事后半边）。
//
// 为什么存在：`scene-capture` 只能抓"当场"；`snapshot-replay` 回放的是录制好的固定语料。
// "三天前那场 run 的驾驶舱当时显示的到底是什么"此前没有一条命令能回答——本工具补这一角：
//   解析会话（跨组；id 全名或标题唯一子串）→ 起/复用通道 → 登记该会话的 cwd 工作区
//   → 按会话 id 在侧栏定位并打开 → 抓五件套场景包（与 scene-capture 同形，可被 --list/--show 读回）
//   → 打印判读（会话/工作区/日志/场景包/打开方式）。
//
// **诚实边界**（别让下一个 agent 误解）：
// - 渲染 = 「现在的客户端代码 + 当年的会话数据」，**不是像素级复现**；客户端代码改过，
//   当年那个渲染 bug 不会因此重现（那要靠当时抓包或 snapshot-replay 金标准）。
// - 当年的浏览器 console 已不可得（console 不进会话日志）；场景包里的是**现在**打开时的 console。
// - 会话 → 工作区的可靠依据是日志首事件的 `cwd`（v4 实测），不靠目录名编码。
//
// 档位：keyless（本地通道 + 真浏览器，无模型调用）。verdict 契约：
//   0 = 已捕获并落盘；1 = 打开或捕获失败；2 = 前置缺席（未 source / 无会话根 / 会话不存在 / 歧义 / 通道起不来）。
// 端口自持有：3117。
// 用法：
//   source dev/env.sh && node scripts/run-ops/session-replay.mjs <session-id|标题子串> [--group <子串>] [--port 3117]
//     [--url <已起 GUI 的带 token URL>] [--out runtime/scenes/replay-<name>] [--wait-ms 2500]
//     [--open-status]（展开右栏并打开「研究状态」页签——驾驶舱观察面入镜） [--json]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubbedEnv } from '../lib/env.mjs';
import { assertVendorArtifacts, ARTIFACT_REMEDY } from '../lib/vendor-artifacts.mjs';
import { authenticate, bootWeb, makeRpc } from '../lib/web-harness.mjs';
import { launchChromium, loadChromium } from '../lib/playwright.mjs';
import { openSessionById } from '../lib/web-ui-nav.mjs';
import { pickStatusTab } from '../lib/probe-status-tab.mjs';
import { readSessionEvents } from '../lib/session-log.mjs';
import { resolveSessionQuery, sessionMetaOf, formatReplaySummary } from '../lib/session-replay.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argv = process.argv.slice(2);
const opt = (name, fallback = undefined) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const VALUE_FLAGS = new Set(['--group', '--port', '--url', '--out', '--wait-ms']);
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(argv[i - 1]));
const query = positional[0];
const PORT = Number(opt('port', '3117'));
const HOME = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : null;
const WAIT_MS = Number(opt('wait-ms', '2500'));
const AS_JSON = flag('json');

const fail = (code, msg) => {
  console.error(`session-replay: ${msg}`);
  process.exit(code);
};

if (query === undefined) fail(2, "用法：session-replay <session-id|标题子串> [--group <子串>] [--port 3117] [--url <GUI URL>] [--out <dir>] [--json]");
if (HOME === null) fail(2, '未 source dev/env.sh（DSH_HOME 缺席）——先 source 再跑（未跑 ≠ 通过）');
const sessionsRoot = join(HOME, 'sessions');
if (!existsSync(sessionsRoot)) fail(2, `会话根不在场：${sessionsRoot}——该 home 没有任何会话`);

// ── ① 解析会话（纯函数：id 全名优先；标题唯一子串否则如实报歧义）──
const resolved = resolveSessionQuery({ sessionsRoot, query, groupSubstring: opt('group', null) });
if (resolved.status === 'not-found') {
  fail(2, `找不到会话「${query}」（扫描 ${resolved.scanned} 场）——用完整 id 或更短/更长的标题子串；组过滤太窄时去掉 --group`);
}
if (resolved.status === 'ambiguous') {
  console.error(`session-replay: 「${query}」命中 ${resolved.candidates.length} 场，不静默选第一个——改传完整 id：`);
  for (const c of resolved.candidates) console.error(`  ${c.sessionId}  ${c.title ?? '(无标题)'}  @ ${c.group}`);
  process.exit(2);
}
const target = resolved.match;
const { readable, events } = readSessionEvents(target.logPath);
const meta = sessionMetaOf(events);
if (!readable || meta.cwd === null) {
  fail(2, `会话 ${target.sessionId} 的日志不可读或无 cwd——无法确定要登记的工作区（日志：${target.logPath}）`);
}

// ── ② 场景包目录 ──
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const sceneDir = resolve(opt('out', join(ROOT, 'runtime', 'scenes', `replay-${stamp}`)));
mkdirSync(sceneDir, { recursive: true });

let child;
let browser;
let exitCode = 0;
const consoleProblems = [];
const exceptions = [];
try {
  // ── ③ 通道：复用 --url，或起一次性 web（源码域 overlay = 当前 dev 客户端代码）──
  let base;
  let token;
  const given = opt('url', null);
  if (given !== null) {
    const u = new URL(given);
    base = `${u.protocol}//${u.host}`;
    token = u.searchParams.get('token');
    if (!token) fail(2, `--url 缺 token 参数：${given}`);
  } else {
    const va = assertVendorArtifacts(ROOT);
    if (!va.ok) fail(2, `vendor 构建产物缺失（${va.missing.join('、')}）——${ARTIFACT_REMEDY}`);
    const booted = await bootWeb({
      bin: join(ROOT, 'vendor', 'dsh', 'apps', 'cli', 'src', 'bin.ts'),
      cwd: ROOT,
      profile: 'web',
      patchPath: join(ROOT, 'dev', 'research.overlay.yml'),
      port: PORT,
      env: scrubbedEnv({ DSH_HOME: HOME }),
      timeoutMs: 90_000,
      tailChars: 800,
      detached: false,
    });
    child = booted.child;
    token = booted.token;
    base = `http://127.0.0.1:${PORT}`;
    console.log(`session-replay: 一次性通道已起（port ${PORT}，源码域 overlay）`);
  }

  // ── ④ 登记该会话的 cwd 工作区（未登记则侧栏不列它，按 id 也就点不到）──
  const cookie = await authenticate(base, token);
  const rpc = makeRpc({
    prefix: 'srep-',
    errorOf: (endpoint, body) => `${endpoint} 失败：${JSON.stringify(body?.result?.error ?? body).slice(0, 200)}`,
  });
  const ws = await rpc(base, cookie, 'workspace/create', { request: { path: meta.cwd } });
  const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId ?? null;
  if (workspaceId === null) throw new Error('workspace/create 未返回 workspaceId');

  // ── ⑤ 真浏览器：打开 → 定位会话行 → 打开会话 ──
  const chromium = await loadChromium(ROOT);
  browser = await launchChromium(chromium);
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => exceptions.push(String(e?.message ?? e)));
  await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('[data-row-key^="workspace:"], [data-row-key^="session:"]', { timeout: 30_000 }).catch(() => {});

  let opened = await openSessionById(page, target.sessionId, meta.title);
  if (!opened.found) {
    // 工作区刚登记时侧栏可能尚未刷新——reload 一次再试（不是重试风暴：确定性动作，最多一轮）
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-row-key^="workspace:"], [data-row-key^="session:"]', { timeout: 30_000 }).catch(() => {});
    opened = await openSessionById(page, target.sessionId, meta.title);
  }
  // ── ⑤b 可选：展开右栏并打开「研究状态」页签（驾驶舱观察面——"页签显示错了"类症状的现场）──
  let statusPaneOpened = null;
  if (flag('open-status')) {
    const collect = () => page.evaluate(() => {
      const titleOf = (b) => {
        const leaves = Array.from(b.querySelectorAll('span,div')).filter((e) => e.children.length === 0 && (e.textContent ?? '').length > 0);
        return leaves.length > 0 ? (leaves[0].textContent ?? '') : '';
      };
      return [...document.querySelectorAll('button')].map((b) => ({
        title: titleOf(b),
        guideEntry: b.getAttribute('data-sidebar-right-guide-entry'),
      }));
    });
    // 展开右栏（幂等；首屏可能尚未挂载，按状态重试而非固定 sleep）
    for (let i = 0; i < 12; i++) {
      const done = await page.evaluate(() => {
        if (document.querySelector('[data-sidebar-right-open]') !== null) return true;
        const b = document.querySelector('[aria-label="Open right sidebar"]');
        if (b === null) return false;
        b.click();
        return false;
      });
      if (done === true) break;
      await page.waitForTimeout(1000);
    }
    for (let i = 0; i < 12; i++) {
      const pick = pickStatusTab({ buttons: await collect(), title: '研究状态' });
      if (pick.pickedIndex !== null) {
        await page.locator('button').nth(pick.pickedIndex).click({ timeout: 5000 }).catch(() => {});
        statusPaneOpened = pick.reason;
        break;
      }
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(Number.isFinite(WAIT_MS) ? WAIT_MS : 2500);

  // ── ⑥ 抓五件套（与 scene-capture 同形，可被 scene-capture --list/--show 读回）──
  const shot = await page.screenshot({ path: join(sceneDir, 'page.png'), fullPage: true });
  const html = await page.content();
  const body = await page.evaluate(() => document.body?.innerText ?? '');
  writeFileSync(join(sceneDir, 'page.html'), html);
  writeFileSync(join(sceneDir, 'body.txt'), body);
  writeFileSync(join(sceneDir, 'console.txt'), [...consoleProblems, ...exceptions].join('\n'));
  writeFileSync(join(sceneDir, 'meta.json'), JSON.stringify({
    url: `${base}/?token=REDACTED`,
    at: new Date().toISOString(),
    screenshot: 'page.png',
    sessionId: target.sessionId,
    group: target.group,
    cwd: meta.cwd,
    title: meta.title,
    openedVia: opened.via,
    found: opened.found,
    statusPaneOpened,
    consoleProblems,
    exceptions,
  }, null, 2));

  // ── ⑦ 判读 ──
  const summary = formatReplaySummary({
    sessionId: target.sessionId,
    group: target.group,
    cwd: meta.cwd,
    title: meta.title,
    logPath: target.logPath,
    sceneDir,
    openedVia: opened.found ? opened.via : 'MISS（侧栏未定位到该会话）',
    statusPane: statusPaneOpened,
  });
  if (!opened.found) {
    exitCode = 1;
    summary.push('  结果: 失败——会话未能在侧栏定位（工作区已登记但仍不可见？页面仍已抓取，见场景包）');
  } else {
    summary.push(`  结果: 已捕获（page.png ${shot?.length ?? '?'}B）`);
  }
  if (AS_JSON) {
    console.log(JSON.stringify({ ok: opened.found, sessionId: target.sessionId, cwd: meta.cwd, sceneDir, openedVia: opened.via, consoleProblems: consoleProblems.length, exceptions: exceptions.length }, null, 2));
  }
  for (const line of summary) console.log(line);
} catch (error) {
  exitCode = 1;
  console.error(`session-replay: 运行期失败——${String(error?.message ?? error)}`);
} finally {
  if (browser !== undefined) await browser.close().catch(() => {});
  if (child !== undefined) {
    child.kill('SIGTERM');
    await new Promise((r) => { child.once('exit', r); setTimeout(r, 8000); });
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
process.exit(exitCode);
