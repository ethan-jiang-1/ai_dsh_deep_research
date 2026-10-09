#!/usr/bin/env node
// scripts/smoke/snapshot-replay-smoke.mjs — keyless 回放冒烟（keyless-snapshot 四件套之四）。
// 场景集由 snapshots/replay/research-face/snapshot.json 声明（消费 = scripts/lib/replay-scene.mjs；
// case 集仍与盘上 presets/ 精确对账）——每场景独立 boot + 回放，A/B 层全角色；
// C 渲染金标准只在声明了 renderExpected 的场景跑（渲染面与角色无绑定，逐角色金标准是重复证据
// ——RFC test-asset-completion 输掉的方案 3）。
//
// 每场景三层判据（本脚本钉的，逐层独立报告）：
//   A 回放通路：录制的会话流在**零真模型调用**下完整回放——回合结束后最终 assistant 文本
//     = 录制流的收尾文本（canned 响应逐条回放的直接证据：活模型不可能逐字复现）。只认
//     **本次 boot 之后新写**的会话日志（mtime 过滤 + 新者先——否则第二跑起会命中上一跑的
//     旧日志假绿）。
//   B 组装请求 diff：回放会话持久化日志的 persona（`system/message`）与 `request/header`
//     全序列（config provider/model + 工具 schema），以及三处 `user/message` 注入（工作区
//     指令 / skill 目录 / 运行时上下文）逐条对录制基线比对——这些**模型可见文本**变化在此红
//     （机制边界：canned 响应本身不随 persona 变化，A 层抓不到——这正是本层存在的理由）。
//     定向归一化只覆盖源机制确实挥发的身份（GUI 端口、构建戳、工作区路径），实现 =
//     scripts/lib/replay-request.mjs（逐条判据：persona/headers/agent-instructions/
//     skill-catalog/runtime-context）。
//   C 渲染金标准（场景声明了 renderExpected 的场景，如 lead）：Playwright 读对话流研究语义卡
//     （web_search 卡标题）与「研究状态」页签人性化活动行（🔍/💬），与场景声明的期望文件
//     逐字比对。窄带：只钉录制流驱动的确定性面；不钉工具结果体/时间戳/bundle 渐进面（依赖
//     工作区态，非录制流）。`--update-expected` 从真实回放渲染重写金标准——只许重写金标准，
//     不许放宽比对或归一化凑绿（fix fixtures, not normalizers）。
//
// 录制：新角色或重录用 `node --import tsx/esm dev/record-role-fixture.mjs --role <r>`
// （with-key 一次，之后 keyless 永久回放；录制品人审后入库，并在场景声明登记 source 身份）。
//
// 用法：source dev/env.sh && node scripts/smoke/snapshot-replay-smoke.mjs [--port 3103] [--update-expected] [--scenario <id>]
// 红证（实录）：改 fixture 内一条 assistant 文本 → A 红；改 fixture persona/注入文本或工具 schema
//   一词 → 对应 B 条红；改 fixture 一条 web_search 查询词 → C 红；各自还原 → 绿。
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync, readdirSync, mkdtempSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { scrubbedEnv } from '../lib/env.mjs';
import { presetRoles } from '../lib/roles.mjs';
import { loadReplayScene } from '../lib/replay-scene.mjs';
import { compareReplayRequests, unjudgedInjectionKinds, unexpectedInjectionKinds } from '../lib/replay-request.mjs';
import { loadChromium, launchChromium } from '../lib/playwright.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argvOf(i);
};
const argvOf = (i) => process.argv[i + 1];
const PORT = Number(arg('port', '3103'));
const ONLY = arg('scenario'); // --scenario <id> 单场景跑（红证定向/迭代用；缺省全场景）
const UPDATE_EXPECTED = process.argv.includes('--update-expected');
const BOOT_TIMEOUT_MS = 120_000;
const TURN_TIMEOUT_MS = 240_000;
const RENDER_TIMEOUT_MS = 60_000;
const FACE_DIR = join(ROOT, 'snapshots', 'replay', 'research-face');
const UNIQUE_TITLE = '快照回放冒烟·渲染面探针';
const SENTINEL = '探针完成';
const DSH_HOME = process.env.DSH_HOME ?? join(ROOT, 'runtime', 'harness-home');
const SESSIONS = join(DSH_HOME, 'sessions');

// manifest 是实际驱动的输入；完整角色集、全部判据与文件引用由 consumer 校验。
let scene;
try { scene = loadReplayScene(FACE_DIR, presetRoles(ROOT), { only: ONLY }); }
catch (error) { console.error(`snapshot-replay-smoke: ${error.message}`); process.exit(2); }
const SCENARIOS = scene.cases;
if (!process.env.DSH_HOME) {
  console.error('snapshot-replay-smoke: 未 source dev/env.sh（DSH_HOME 缺席）——与 L1/L2 同档自拒');
  process.exit(2);
}
// 端口预检（verdict 契约：未跑 = exit 2）：端口已被占用时 boot 会以 EADDRINUSE 死掉，
// 若按断言红（exit 1）上报就是把"未跑"谎报成"跑了但失败"（实测：占用时报 3 FAILURE）。
{
  const [busy] = execSync(`lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t 2>/dev/null || true`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  if (busy) {
    console.error(`snapshot-replay-smoke: 端口 ${PORT} 已被 pid ${busy} 占用——本次未跑（exit 2）；换端口用 --port，或先释放该端口`);
    process.exit(2);
  }
}

// ── B 层共享：组装请求面提取 + 挥发性 tokenize（双侧同规——录制/回放身份差异不构成红）──
const parseLines = (text) => text.split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean);
const diffExcerpt = (a, b) => {
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i += 1;
  const lo = Math.max(0, i - 60);
  return `首个差异 @${i}：\n  期望：…${a.slice(lo, i + 80)}\n  实得：…${b.slice(lo, i + 80)}`;
};

const failures = [];
const step = (ok, label, info = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${info ? `（${info}）` : ''}`);
  if (!ok) failures.push(label);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const sc of SCENARIOS) {
  if (ONLY !== undefined && ONLY !== '' && sc.id !== ONLY) continue
  console.log(`\n── 场景 ${sc.id} ──`);
  const FIXTURE = sc.fixture;
  const fixtureLines = parseLines(readFileSync(FIXTURE, 'utf8'));
  const userTexts = fixtureLines.filter((j) => j.type === 'user/message')
    .map((j) => (j.data?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
    .filter((t) => !t.startsWith('<system-reminder>'));
  const firstPrompt = userTexts[0];
  const assistantTexts = fixtureLines.filter((j) => j.type === 'assistant/message')
    .map((j) => (j.data?.message?.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join(''))
    .filter(Boolean);
  if (!firstPrompt || assistantTexts.length === 0) {
    failures.push(`[${sc.id}] fixture 折算失败（缺用户 prompt 或 assistant 文本）`);
    continue;
  }

  // ── 回放 patch：禁真 LLM → 插 llm-replay（接线模板 = vendor web-search-endpoint-guidance）──
  const tmp = mkdtempSync(join(tmpdir(), 'snapshot-replay-'));
  const patchPath = join(tmp, 'replay.patch.yml');
  writeFileSync(patchPath, [
    '- id: llm-deepseek',
    '  disabled: true',
    // title LLM 也是一条 llm/stream 调用——不禁用会与用户回合交错、按 first-call 序偷吃一个
    // 脚本位（实测：title 拿走第 2 个 settlement，3 次搜索只回放 2 次——vendor 场景用 headless
    // 档无 title LLM 故从未踩过；本档 research 必须显式禁用，title 走 fallback）
    '- id: session-title-llm',
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
  const BOOT_START = Date.now();
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
  const cleanup = () => {
    try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') }
  };
  // 释放到静默（scripts/AGENTS 纪律）：kill 后等子进程真退出再开下一场景——不等会让上一场景的
  // 监听/启动资源与下一场景的 boot 交叠（实测：横幅超时与 "Plugins waiting for services" 假红）。
  const childExited = () => new Promise((resolve) => {
    if (childGone) return resolve(true);
    const timer = setTimeout(() => resolve(false), 15_000);
    child.once('exit', () => { clearTimeout(timer); resolve(true); });
  });
  let replayLogText = null;
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

    // 建研究会话（workspaceId 形态——手册注入与侧栏可见同正式 run；agentPreset = 场景角色）
    const ws = await rpc('workspace/create', { request: { path: join(ROOT, 'research-workspace') } });
    const workspaceId = ws?.workspace?.workspaceId ?? ws?.workspaceId;
    const created = await rpc('session/create', { request: { workspaceId, agentPreset: sc.id } });
    const sessionId = created?.id ?? created?.sessionId;

    // 送录制的同一条 prompt（回放按 first-call 序绑定脚本）
    await rpc('session/prompt', { request: { requestId: randomUUID(), sessionId, mode: 'queue', content: [{ type: 'text', text: firstPrompt }] } });

    // ── A 层：轮询**本场景本次创建的会话 id** 的日志（mtime ≥ BOOT_START——旧回放会话不算数）──
    // 不扫同组其他会话目录：四角色共用同一 session 组，跨目录扫描会把上一场景的日志当成本场景的
    // （实测假红：某场景比到了前一场景的 persona 与 skill catalog）。
    const group = readdirSync(SESSIONS).find((d) => d.includes('research-workspace'));
    const ownLog = join(SESSIONS, group, sessionId, 'session.v4.jsonl.zstd');
    const readLog = (log) => {
      try { return execSync(`zstd -dc "${log}" 2>/dev/null`, { maxBuffer: 64 * 1024 * 1024 }).toString('utf8') }
      catch { return null }
    };
    let finalOk = false;
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(4000);
      const fresh = existsSync(ownLog) && statSync(ownLog).mtimeMs >= BOOT_START;
      if (fresh) {
        const text = readLog(ownLog);
        if (text !== null && text.includes(SENTINEL)) { finalOk = true; replayLogText = text; break }
      }
      if (childGone) { failures.push(`[${sc.id}] web 进程在回合结束前退出`); break }
    }
    step(finalOk, `[${sc.id}] A 回放通路（零真模型调用完整回放；收尾文本逐字命中；只认本次新写日志）`,
      finalOk ? '' : `回放回合未在 ${TURN_TIMEOUT_MS / 1000}s 内出现录制收尾文本（"${SENTINEL}"）——canned 回放未走通`);

    // ── B 层：组装请求 diff（persona + 全序列 request/header + 三处 user/message 注入，
    //    双侧定向归一化后逐条比对；判据由 manifest 声明、consumer 固定为全集）──
    if (finalOk) {
      const liveLines = parseLines(replayLogText);
      for (const verdict of compareReplayRequests(fixtureLines, liveLines)) {
        step(verdict.ok, `[${sc.id}] B·${verdict.id}`, verdict.ok ? verdict.detail.replace(`${verdict.id}: `, '') : verdict.detail);
      }
      // 覆盖面自守（BUG-018 的失败类 = 声明的覆盖 > 实际的覆盖）：两个方向都要响——
      // ① 基线（人审过的录制）不得携带未被比对面覆盖的注入种类：重录把新面静默吸进基线 = 盲区复长；
      // ② 回放里出现基线没有的种类 = 新的模型可见注入面，须先入比对面再重录基线。
      const uncovered = unjudgedInjectionKinds(fixtureLines);
      step(uncovered.length === 0, `[${sc.id}] B·coverage 基线注入种类均在比对面内`,
        uncovered.length === 0 ? '' : `基线携带未登记注入种类：${uncovered.join(', ')}——先加入 replay-request 的 JUDGED_KINDS 与对应判据，再重录`);
      const drifted = unexpectedInjectionKinds(fixtureLines, liveLines);
      step(drifted.length === 0, `[${sc.id}] B·coverage 回放无基线外注入种类`,
        drifted.length === 0 ? '' : `回放新增基线未记录的注入种类：${drifted.join(', ')}——重录基线并把该面加入比对面`);
    }

    // ── C 层：渲染金标准（仅声明了 renderExpected 的场景；Playwright 文本捕获：研究语义卡 + 研究状态页签活动行）──
    if (sc.renderExpected !== null && finalOk) {
      await rpc('session/rename', { request: { sessionId, title: UNIQUE_TITLE } });
      const chromium = await loadChromium(ROOT);
      const browser = await launchChromium(chromium);
      try {
        const page = await browser.newPage();
        await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {});
        const cont = page.getByRole('button', { name: /continue/i }).first();
        if (await cont.isVisible().catch(() => false)) await cont.click({ timeout: 6000 }).catch(() => {});
        await sleep(1500);
        // reload 回干净列表态（改名后侧栏重排，直接找行会点到 stale 元素——client-load-smoke 同款教训）。
        // ⚠ reload 会带回首访模态（全屏 _mask_ 盖住一切控件，不关则行点击全打在遮罩上静默失效）——
        //   关模态必须在 reload **之后**（首跑没 reload 才侥幸过）。
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => (document.body?.innerText ?? '').includes('New Session'), null, { timeout: RENDER_TIMEOUT_MS }).catch(() => {});
        await sleep(1500);
        const cont2 = page.getByRole('button', { name: /continue/i }).first();
        if (await cont2.isVisible({ timeout: 10_000 }).catch(() => false)) await cont2.click({ timeout: 6000 }).catch(() => {});
        await sleep(1500);
        // 工作区选择态兜底（实测竞态：reload 后 app 可能停在 "Choose a workspace to start"，
        // 此时侧栏会话行尚未存在，C0 必然误红）。等的是显式状态消失，不是固定 sleep。
        const chooserVisible = () => page.evaluate(() => (document.body?.innerText ?? '').includes('Choose a workspace to start'));
        const chooserCleared = async () => {
          if (!(await chooserVisible().catch(() => false))) return true;
          const wsRow = page.getByText('research-workspace', { exact: true }).first();
          if (await wsRow.isVisible({ timeout: 10_000 }).catch(() => false)) await wsRow.click({ timeout: 8000 }).catch(() => {});
          else {
            const choose = page.getByRole('button', { name: /choose workspace/i }).first();
            if (await choose.isVisible().catch(() => false)) await choose.click({ timeout: 8000 }).catch(() => {});
          }
          return page.waitForFunction(() => !(document.body?.innerText ?? '').includes('Choose a workspace to start'), null, { timeout: 30_000 })
            .then(() => true).catch(() => false);
        };
        const workspaceOpen = await chooserCleared();
        step(workspaceOpen, `[${sc.id}] C0a 回放工作区已打开（非工作区选择态）`,
          workspaceOpen ? '' : '工作区选择态未消失——侧栏会话行不会出现');
        // 侧栏找本次会话（唯一标题；只认左栏可见行——client-load-smoke 同款配方）。点击后验证
        // 对话区真渲染（录制 prompt 文本在场），未开成则试下一个同命行（重排竞态兜底）。
        const rowsMatching = async (text) => {
          const rows = page.locator('span[class*="_root_"]');
          const n = await rows.count();
          const hits = [];
          for (let i = 0; i < Math.min(n, 60); i++) {
            const el = rows.nth(i);
            if (!(await el.isVisible().catch(() => false))) continue;
            const box = await el.boundingBox().catch(() => null);
            if (box === null || box.x >= 256) continue;
            const rowText = (await el.textContent() ?? '').trim();
            if (rowText.includes(text)) hits.push(el);
          }
          return hits;
        };
        const chatOpened = async () => page.evaluate(() => (document.body?.innerText ?? '').includes('观察面录制探针'));
        const matchedRows = await rowsMatching(UNIQUE_TITLE);
        let opened = false;
        for (const el of matchedRows) {
          await el.click({ timeout: 10000 }).catch(() => {});
          await sleep(2500);
          // Completed 会话可能默认落 Trajectory 页签（Chat 内容不进 DOM）——显式切 Chat
          const chatTab = page.getByRole('button', { name: /^Chat$/ }).first();
          if (await chatTab.isVisible().catch(() => false)) await chatTab.click({ timeout: 5000 }).catch(() => {});
          await sleep(1500);
          if (await chatOpened().catch(() => false)) { opened = true; break }
        }
        const openDiag = opened ? '' : await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
            .filter((b) => b.offsetParent !== null)
            .map((b) => (b.textContent ?? '').trim()).filter((t) => t !== '' && t.length < 24).slice(0, 24);
          return `匹配行 ${0}；可见按钮：${buttons.join(' | ')}；正文：${(document.body?.innerText ?? '').replace(/\n+/g, ' ⏎ ').slice(0, 500)}`;
        });
        step(opened, `[${sc.id}] C0 回放会话在侧栏可开且对话区真渲染（唯一标题定位 + Chat 页签 + 录制 prompt 在场）`,
          openDiag.replace('匹配行 0', `匹配行 ${matchedRows.length}`));
        if (opened) {
          // 等 chat 历史真渲染（工具调用锚点在场——ToolCall 的 DOM 锚 data-chat-call-id）
          await page.waitForFunction(
            () => document.querySelectorAll('[data-chat-call-id]').length >= 3,
            null,
            { timeout: 30_000 },
          ).catch(() => {});
          // 虚拟化窗口兜底：chat 长列表虚拟化时窗口外节点不在 DOM（实测：3 次搜索只挂载 2 张卡）。
          // 扫掠 = 所有可滚动容器滚到顶 → 提取 → 滚到底 → 提取，按首见序合并去重。
          const scrollTo = async (where) => page.evaluate((w) => {
            for (const el of document.querySelectorAll('*')) {
              if (el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 0) el.scrollTop = w === 'top' ? 0 : el.scrollHeight;
            }
          }, where);
          const collectCards = () => page.evaluate(() => {
            const cards = [];
            for (const div of document.querySelectorAll('div')) {
              const spans = Array.from(div.children).filter((el) => el.tagName === 'SPAN');
              if (spans.length !== 2) continue;
              const b = (spans[1].textContent ?? '').trim();
              if (b.startsWith('检索：')) cards.push(b);
            }
            return cards;
          });
          await scrollTo('top');
          await sleep(1000);
          const seen = new Set(await collectCards());
          await scrollTo('bottom');
          await sleep(1200);
          for (const c of await collectCards()) seen.add(c);
          const cardList = [...seen];
          // console 错误捕获（诊断面：卡片不渲染时先看有没有 apply/渲染抛错）
          const consoleErrors = [];
          page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) });
          // 调用锚倾印（诊断：卡片缺时看 chat 到底挂载了哪些工具调用节点）
          const anchors = await page.evaluate(() =>
            Array.from(document.querySelectorAll('[data-chat-call-id]'))
              .map((el) => `${(el.getAttribute('data-chat-call-id') ?? '').slice(0, 14)}:${(el.textContent ?? '').trim().slice(0, 40)}`));
          step(cardList.length > 0, `[${sc.id}] C1 对话流研究语义卡提取非空（防空语料——空提取 = 假绿）`,
            `${cardList.length} 卡；chat 调用锚 ${anchors.length} 个${anchors.length > 0 ? `：${anchors.slice(0, 4).join(' / ')}` : ''}`);
          // 「研究状态」页签：展开右栏 + 点 guide 胶囊（client-load-smoke 同款配方）
          const expand = page.getByRole('button', { name: 'Open right sidebar' });
          if (await expand.count() > 0) await expand.first().click({ timeout: 8000 }).catch(() => {});
          await sleep(1500);
          const capsule = page.getByRole('button', { name: /研究状态/ }).first();
          const capOk = await capsule.isVisible({ timeout: 12000 }).catch(() => false);
          let paneRows = [];
          if (capOk) {
            await capsule.click({ timeout: 5000 }).catch(() => {});
            await sleep(4500);
            // DOM 行走提取活动行（textContent 不受折叠态/innerText 块级化影响——实测：活动行
            // flex 块级化把 icon 与文本拆成两行，行过滤法抓不到文本）
            paneRows = await page.evaluate(() => {
              const rows = [];
              for (const div of document.querySelectorAll('div')) {
                const spans = Array.from(div.children).filter((el) => el.tagName === 'SPAN');
                if (spans.length !== 2) continue;
                const a = (spans[0].textContent ?? '').trim();
                const b = (spans[1].textContent ?? '').trim();
                if (a === '🔍' || a === '👥' || a === '💬' || a === '📦') rows.push(`${a} ${b}`);
              }
              return rows;
            });
          }
          step(capOk, `[${sc.id}] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点）`);
          step(paneRows.length > 0, `[${sc.id}] C3 页签活动行提取非空（防空语料）`, `${paneRows.length} 行`);
          step(consoleErrors.filter((t) => t.includes('research-status') || t.includes('deep-research')).length === 0,
            `[${sc.id}] C4 本包 client 无 console 报错`, consoleErrors.slice(0, 2).join(' | ').slice(0, 200));
          const EXPECTED = sc.renderExpected;
          const projection = [
            `# ui.expected —— 渲染金标准（scenario: ${scene.scenario}）`,
            '',
            '> 生成物：`node scripts/smoke/snapshot-replay-smoke.mjs --update-expected` 从真实回放渲染捕获；',
            '> 比较 = 逐字。窄带：只钉录制流驱动的确定性面（卡片标题行 + 人性化活动行）；',
            '> 不钉工具结果体/时间戳/bundle 渐进面（后者依赖工作区态，非录制流）。',
            '',
            '## 对话流 · 研究语义卡（web_search 卡标题，状态符不钉）',
            '',
            ...cardList,
            '',
            '## 研究状态页签 · 人性化活动行（icon + 文本）',
            '',
            ...paneRows,
            '',
          ].join('\n');
          if (UPDATE_EXPECTED) {
            writeFileSync(EXPECTED, projection);
            step(true, `[${sc.id}] C5 金标准已重写（--update-expected）`, `卡片 ${cardList.length} · 活动行 ${paneRows.length}——内容需人审后提交`);
          } else if (existsSync(EXPECTED)) {
            const expected = readFileSync(EXPECTED, 'utf8');
            const ok = expected === projection;
            step(ok, `[${sc.id}] C5 渲染金标准逐字一致（卡片 + 活动行）`, ok ? `${cardList.length} 卡 · ${paneRows.length} 行` : diffExcerpt(expected, projection));
          } else {
            step(false, `[${sc.id}] C5 渲染金标准缺席`, `先跑 --update-expected 生成（${EXPECTED}）`);
          }
        }
      } finally {
        await browser.close().catch(() => {});
      }
    }
  } catch (error) {
    failures.push(`[${sc.id}] ${error.message}`);
  } finally {
    cleanup();
  }
}

const ranCount = SCENARIOS.filter((sc) => ONLY === undefined || ONLY === '' || sc.id === ONLY).length;
console.log(failures.length === 0
  ? `\nsnapshot-replay-smoke: ALL PASS（${ranCount} 场景 A 回放通路 + B 组装请求 diff + 声明的渲染金标准${UPDATE_EXPECTED ? '——金标准已重写待人审' : ''}）`
  : `\nsnapshot-replay-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`);
process.exit(failures.length === 0 ? 0 : 1);
