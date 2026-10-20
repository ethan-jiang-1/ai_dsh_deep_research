#!/usr/bin/env node
// cdp-probe —— DSH deep-research 驾驶舱的真浏览器场景（裸 CDP，见 scripts/lib/cdp-driver.mjs）。
//
// 为什么存在：执行冒烟（client-load-smoke，Playwright）断言面是"能渲染"，但**交互驱动**在
// Playwright 里会被 DSH 自身的 UI 挡死——Preview Notice 横幅盖住右栏开关、会话行内嵌
// Answer 按钮抢点击（actionability 检查不过 = 超时）。裸 CDP 的 evaluate/click 走 JS 派发，
// 绕开全部可点性检查——本脚本是"执行冒烟"和"owner 亲眼看"之间的那一环（模式与场景层
// 借鉴自 ai_dsh_loop_advisor，2026-10-01 owner 指令内化）。
//
// 用法：
//   node scripts/probe/cdp-probe.mjs '<gui-url>' [--open-session '<标题>'] [--open-status]
//        [--expect-face '<文本>'] [--expect-no-leak '<文本>'] [--ask '<消息>']
//        [--session '<会话 id>'] [--sessions '<会话根>'] [--keep-browser]
//
//   '<gui-url>'  boot 好的 GUI URL（含 ?token=，boot-run 横幅给出的那条）
//   --open-session '<标题>'  按标题点开侧栏会话行（最深层元素 JS 派发——行内嵌按钮不抢）
//   --open-status            展开右栏并点「研究状态」胶囊（JS 派发，绕过遮挡）
//   --expect-face '<文本>'   断言页面文本含该串（如本场 bundle 的问题行片段）
//   --expect-no-leak '<文本>' 断言页面文本**不含**该串（如旧 run 的问题行——BUG-001 回归哨）
//   --ask '<消息>'           向当前会话的输入框输入并发送；**判据 = 会话日志落盘对账**（BUG-021
//                            修复：日志里出现本条 user/message 才算送达），UI 回复等待只作次信号
//   --session '<会话 id>'    覆盖自动探测（缺省从页面 `[data-conversation-session]` 读前台会话）
//   --sessions '<会话根>'     会话根覆盖（缺省 $DSH_HOME/sessions，再退本仓 runtime/harness-home）
//   --keep-browser           保留无头浏览器（打印调试端口供手工检查）
//
// stdout 输出一个 JSON verdict；全部期望成立 exit 0，否则 1，用法/环境错 2。
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { launchCdpBrowser } from '../lib/cdp-driver.mjs';
import { readSessionEvents, resolveSessionLog } from '../lib/session-log.mjs';
import { reconcileInjectedMessage } from '../lib/inject-reconcile.mjs';
import { pickSendTarget } from '../lib/probe-send-target.mjs';
import { pickStatusTab } from '../lib/probe-status-tab.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const args = process.argv.slice(2);
const guiUrl = args.find((a) => !a.startsWith('--'));
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? undefined) : undefined;
};
const openSessionTitle = opt('--open-session');
const openStatus = flag('--open-status');
const expectFace = opt('--expect-face');
const expectNoLeak = opt('--expect-no-leak');
const ask = opt('--ask');
const sessionOverride = opt('--session');
const keepBrowser = flag('--keep-browser');
const screenshotPath = opt('--screenshot');
// 会话根：显式 > 环境（source dev/env.sh 后 = 本仓 dev home）> 本仓缺省。用哪个根进 verdict
// （不复刻 evidence-audit 的"外来 DSH_HOME 自拒"：那儿误审会判出假 CRITICAL；这儿错根只会
//  报 session-log-not-found，可见、fail-loud，不静默给绿）。
const sessionsRoot = opt('--sessions') ?? join(process.env.DSH_HOME ?? join(ROOT, 'runtime', 'harness-home'), 'sessions');

/** 会话 id → 物理日志路径（会话按 cwd 分组存放：<根>/<组>/<会话 id>/<log>）。 */
const sessionLogOf = (sessionId) => {
  if (!existsSync(sessionsRoot)) return null;
  for (const group of readdirSync(sessionsRoot)) {
    const dir = join(sessionsRoot, group, sessionId);
    if (!existsSync(dir)) continue;
    const log = resolveSessionLog(dir);
    if (log !== null) return log;
  }
  return null;
};

if (guiUrl === undefined || !/^https?:\/\//.test(guiUrl) || !guiUrl.includes('token=')) {
  console.error("cdp-probe: PASS a booted GUI URL like 'http://127.0.0.1:<port>/?token=<t>'");
  process.exit(2);
}

const verdict = {
  booted: false,
  frameMounted: false,
  sessionOpened: false,
  statusPaneOpen: false,
  statusPaneText: '',
  expectFaceHeld: null,
  expectNoLeakHeld: null,
  asked: false,
  answered: null,
  consoleProblems: [],
  exceptions: [],
};

// 会话 cookie 先行取得（token-GET 的 303+Set-Cookie 在 curl/fetch 流程里时序确定），
// 再注入 CDP Chrome——auth 不依赖浏览器首航时序（BUG：CDP 首航 401 实测）。
let authCookie;
for (let attempt = 0; attempt < 3 && authCookie === undefined; attempt++) {
  try {
    const res0 = await fetch(guiUrl, { redirect: 'manual' });
    authCookie = (res0.headers.get('set-cookie') ?? '').split(';')[0] || undefined;
  } catch {}
  if (authCookie === undefined) await new Promise((r) => { setTimeout(r, 1500) });
}
const handle = await launchCdpBrowser({ url: guiUrl, cookie: authCookie }).catch((error) => ({ failed: String(error?.message ?? error) }));
if (handle.failed !== undefined) {
  verdict.error = handle.failed;
  console.log(JSON.stringify(verdict, null, 2));
  process.exit(1);
}
verdict.booted = true;
const { evaluate, screenshot, consoleProblems, exceptions } = handle;
verdict.consoleProblems = consoleProblems;
verdict.exceptions = exceptions;

try {
  // boot 等待：应用框体（侧栏列）挂载即算就位
  let frameMounted = false;
  for (let i = 0; i < 40 && !frameMounted; i++) {
    frameMounted = await evaluate(`document.querySelector('[class*="sidebarCol"], [class*="listArea"]') !== null`) === true;
    if (!frameMounted) await new Promise((resolve) => { setTimeout(resolve, 500) });
  }
  verdict.frameMounted = frameMounted;

  // 场景助手（全部走 JS 派发——本工具存在的理由）
  const clickRowByText = async (text) => {
    const dispatch = evaluate(`(() => {
      const t = ${JSON.stringify(text)};
      const all = Array.from(document.querySelectorAll('span,div')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.x < 256 && r.width > 0 && (el.textContent ?? '').trim().includes(t)
      });
      let target = null;
      for (const el of all) { if (target === null || el.querySelectorAll('*').length < target.querySelectorAll('*').length) target = el }
      if (target === null) return false;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true
    })()`) === true;
    if (dispatch) return true;
    // 行不可见的最常见原因 = 「Show N more sessions」折叠（组内 65+ 会话）→ 点开重试
    await evaluate(`(() => { const m = Array.from(document.querySelectorAll('button,span')).find(x => /Show \\d+ more sessions/.test(x.textContent ?? '')); if (m) { m.click(); return true } return false })()`);
    await new Promise((resolve) => { setTimeout(resolve, 2500) });
    return evaluate(`(() => {
      const t = ${JSON.stringify(text)};
      const all = Array.from(document.querySelectorAll('span,div')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.x < 256 && r.width > 0 && (el.textContent ?? '').trim().includes(t)
      });
      let target = null;
      for (const el of all) { if (target === null || el.querySelectorAll('*').length < target.querySelectorAll('*').length) target = el }
      if (target === null) return false;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true
    })()`) === true;
  };
  // 页签选择/打开判据 = scripts/lib/probe-status-tab.mjs（纯函数，keyless 钉住）。页面只读 DOM，
  // 选谁与判绿归纯函数——旧版有两个缺陷（2026-10-19 run-driver 落地时实测）：①点右栏后只等
  // 1.5s 就查按钮（右栏未挂载完 → 假红）；②paneText 取 body.innerText 里「研究状态」首现处
  // （会话正文提到这四个字 → 假阳）。现在：等页签**体**出现（`[data-sidebar-right-tab]` data
  // 钩子，不是会话正文）、按标题 span 精确匹配胶囊。
  const readStatusDom = () => evaluate(`(() => {
    // 标题 span 取按钮里最深的叶子（**不用 class*= 匹配**：哈希类名会连带容器，把描述串进来
    // ——2026-10-19 实测 [class*="entryTitle"] 命中的是含描述的容器，页签因此永远"找不到"）。
    const titleOf = (b) => {
      const leaves = Array.from(b.querySelectorAll('span,div')).filter(e => e.children.length === 0 && (e.textContent ?? '').length > 0);
      return leaves.length > 0 ? (leaves[0].textContent ?? '') : ''
    }
    return {
      buttons: [...document.querySelectorAll('button')].map(b => ({
        label: (b.getAttribute('aria-label') ?? '').trim(),
        title: titleOf(b),
        guideEntry: b.getAttribute('data-sidebar-right-guide-entry'),
      })),
      tabBodies: [...document.querySelectorAll('[data-sidebar-right-tab]')].map(e => e.textContent ?? ''),
    }
  })()`);
  const openStatusPane = async () => {
    // 右栏展开按钮**首屏可能尚未挂载**（2026-10-19 探针实测：frameMounted 后立即查仍是 missing，
    // 固定单击一次 = 什么都没发生，于是后面 12 轮都在"找不到页签"——假红）。故展开也进循环按
    // 状态重试（幂等：已展开时按钮变 Collapse right sidebar，不再点）。
    let expanded = false;
    for (let i = 0; i < 12 && !expanded; i++) {
      expanded = await evaluate(`(() => {
        if (document.querySelector('[data-sidebar-right-open]') !== null) return true;
        const b = document.querySelector('[aria-label="Open right sidebar"]');
        if (b === null) return false;
        b.click();
        return false
      })()`) === true;
      if (!expanded) await new Promise((resolve) => { setTimeout(resolve, 1000) });
    }
    // 等待页签体出现（显式状态，不用固定 sleep 当证据）：右栏挂载 + 页签点开后体才渲染。
    // 判据 = `[data-sidebar-right-tab]` 里出现了目标页签体（不是会话正文里出现这四个字）。
    let opened = false;
    let clicked = false;
    for (let i = 0; i < 12 && !opened; i++) {
      await new Promise((resolve) => { setTimeout(resolve, 1000) });
      const dom = await readStatusDom();
      const pick = pickStatusTab({ buttons: dom?.buttons ?? [], title: '研究状态' });
      if (!clicked && pick.pickedIndex !== null) {
        // 只点一次：点开后面板就位，下一次读到的已是页签体（重复点会把同一页签再切一次，
        // 实测无害但徒增噪声）——选中判据见下：`clicked` 计数进 --debug-pane。
        clicked = await evaluate(`(() => { const b = [...document.querySelectorAll('button')][${pick.pickedIndex}]; if (b === undefined) return false; b.click(); return true })()`) === true;
        await new Promise((resolve) => { setTimeout(resolve, 1500) });
      }
      const after = await readStatusDom();
      // 判据 = 页签体在场且**标题已切到目标**（页签体首轮可能只渲染标题 span——实测时序）：
      // 认标题或正文任一处，不要求正文里出现目标词（未绑定 run 的正常面也该算"页签开了"）。
      const bodies = after?.tabBodies ?? [];
      opened = bodies.some((t) => typeof t === 'string' && t.indexOf('研究状态') !== -1);
    }
    return opened;
  };
  const paneText = async () => evaluate(`(() => {
    // 页签体优先（不拿会话正文当观察面——那会把对话里提到的词读成页签内容）。多条命中时取
    // **最长**的一条：页签标题 span 与面板 body 共享同一 data 钩子，标题那条只有四个字。
    const bodies = [...document.querySelectorAll('[data-sidebar-right-tab]')].map(e => e.textContent ?? '');
    const hit = bodies.filter(t => t.includes('研究状态')).sort((a, b) => b.length - a.length)[0];
    if (hit !== undefined) return hit.slice(0, 4000);
    return (document.body?.innerText ?? '').slice(0, 300)
  })()`);

  if (openSessionTitle !== undefined) {
    verdict.sessionOpened = await clickRowByText(openSessionTitle);
    // 会话激活 + journal 装载需要一拍（固定延时后单次检查——高频轮询下同断言会抖）
    await new Promise((resolve) => { setTimeout(resolve, 5000) });
  }
  if (openStatus) {
    verdict.statusPaneOpen = await openStatusPane();
    if (verdict.statusPaneOpen) {
      await new Promise((resolve) => { setTimeout(resolve, 3000) });
      verdict.statusPaneText = (await paneText()) ?? '';
    }
  }

  // 断言面：开了状态页签 → 判 **pane 域**（泄漏哨兵不能拿对话区文本当误报源——会话正文
  // 天然会提到研究主题）；没开页签 → 退化为全文判。
  const scopeText = async () => verdict.statusPaneOpen ? (verdict.statusPaneText ?? '') : ((await evaluate(`document.body?.innerText ?? ''`)) ?? '');
  if (expectFace !== undefined) {
    verdict.expectFaceHeld = (await scopeText()).includes(expectFace);
  }
  if (expectNoLeak !== undefined) {
    verdict.expectNoLeakHeld = !(await scopeText()).includes(expectNoLeak);
  }

  // 完整产品环：向当前会话输入框输入 → 发送 → 等回复出现。
  // 选择器依据（2026-10-11 实测定源，BUG-021）：composer = 页内唯一 [contenteditable] 且带
  // 稳定钩子 `data-composer-input`（勿依赖哈希类名）；提交按钮的 aria-label 是**状态机**
  // （vendor ui-conversation locales 'input.send*'）：空闲 'Send message'／在飞 'Queue message'／
  // 插话 'Steer message'，中文对应 '发送消息'／'排队发送'／'插话发送'。**陷阱**：running + 空草稿
  // 时同一位置的主按钮是 'Stop generating'（'停止生成'）——盲点"composer 区最后一个按钮"会掐断
  // 在飞 turn，故这里显式匹配 send 家族并对 stop 设防。
  // ask 不再以 sessionOpened 为门（会话可能已在前台，标题行点不中≠没有输入面）——改为以
  // composer 在场为门，缺席时 fail-loud 报 no-composer，不再落进"未见模型回复"的误导分支。
  if (ask !== undefined) {
    verdict.askQuestion = ask;
    const before = (await evaluate(`document.body?.innerText ?? ''`)) ?? '';
    verdict.typed = await evaluate(`(() => {
      const editable = document.querySelector('[data-composer-input]')
        ?? document.querySelector('[contenteditable="true"]') ?? document.querySelector('textarea');
      if (editable === null || editable === undefined) return 'no-editable';
      editable.focus();
      const ok = document.execCommand('insertText', false, ${JSON.stringify(ask)});
      return ok === true ? 'typed' : 'insert-failed';
    })()`);
    if (verdict.typed === 'no-editable') verdict.sent = 'no-composer';
    else {
      const sendAtMs = Date.now();
      // 判定与 DOM 访问分工：**页面只读按钮表与 composer 坐标**，选谁/拒点住
      // `scripts/lib/probe-send-target.mjs`（纯函数，keyless 钉住状态机与 stop 陷阱），
      // 再由页面按索引点击——BUG-021 的两条现场规则因此有常驻资产，而不是只活在 evaluate 字符串里。
      const dom = await evaluate(`(() => {
        const composer = document.querySelector('[data-composer-input]')
          ?? document.querySelector('[contenteditable="true"]') ?? document.querySelector('textarea');
        const cy = composer === null ? null : composer.getBoundingClientRect().y;
        return {
          composerY: cy === null ? null : Math.round(cy),
          buttons: [...document.querySelectorAll('button')].map((b) => ({
            label: (b.getAttribute('aria-label') ?? '').trim(),
            y: Math.round(b.getBoundingClientRect().y),
          })),
        };
      })()`);
      const target = pickSendTarget({ buttons: dom?.buttons ?? [], composerY: dom?.composerY ?? null });
      verdict.sendProbe = {
        composerY: dom?.composerY ?? null,
        picked: target.picked,
        reason: target.reason,
        candidateLabels: target.candidateLabels,
        stopLabelsNear: target.stopLabelsNear,
        ariaLabelsNearComposer: target.labelsNear,
      };
      if (target.pickedIndex !== null) {
        await evaluate(`(() => {
          const b = [...document.querySelectorAll('button')][${target.pickedIndex}];
          if (b === undefined) return false;
          b.click();
          return true;
        })()`);
      }
      verdict.sent = target.picked === null ? (target.reason === 'stop-only' ? 'stop-only' : 'no-send-button') : 'sent';
      verdict.sentBy = target.picked;
      if (verdict.sent === 'sent') {
        // ── 落盘对账（BUG-021 修复核心）────────────────────────────────────────────
        // 「点了发送」≠「消息进了会话」。判据 = 会话日志里出现本条 user/message（时间下界 =
        // 点击时刻，防上一次同文注入假阳）。会话 id 优先取显式 --session，缺省从页面稳定钩子
        // `[data-conversation-session]` 读前台会话。三种"没落盘"必须分开报，不含糊：
        //   log-unreadable（在飞写入时尾帧可能不完整——fail-closed，重试后仍不可读就如实报）
        //   session-log-not-found（会话 id 没对上物理日志——多半是会话根不对）
        //   not-landed（日志可读、时间窗内就是没有这条消息 = 真没进去）
        const sessionIdFromDom = await evaluate(`(() => {
          const el = document.querySelector('[data-conversation-session]');
          return el === null ? null : el.getAttribute('data-conversation-session');
        })()`);
        const sessionId = sessionOverride ?? sessionIdFromDom ?? null;
        const reconcile = { sessionId, root: sessionsRoot, status: 'skipped', scanned: 0, seq: null, domSessionId: sessionIdFromDom ?? null };
        // 显式 --session 与页面前台会话不一致 = 注入进的是**另一个会话**，而对账盯的是它——
        // 两者不同源时必须显式报错（实测教训：同 workspace 里存在同名/同题会话时，按标题点开会话
        // 行可能落到别的会话上，于是"对账说没落盘"而"UI 显示有回复"，两头都不算错但结论会被误读）。
        if (sessionOverride !== undefined && sessionIdFromDom !== null && sessionIdFromDom !== sessionOverride) {
          reconcile.status = 'session-mismatch';
          verdict.reconcile = reconcile;
          verdict.landed = false;
        } else if (sessionId === null) reconcile.status = 'no-session-id';
        else {
          const logPath = sessionLogOf(sessionId);
          if (logPath === null) reconcile.status = 'session-log-not-found';
          else {
            reconcile.logPath = logPath;
            for (let i = 0; i < 6; i++) {
              const { readable, events } = readSessionEvents(logPath);
              if (!readable) reconcile.status = 'log-unreadable';
              else {
                const r = reconcileInjectedMessage({ events, text: ask, sinceMs: sendAtMs });
                reconcile.scanned = r.scanned;
                if (r.landed) { reconcile.status = 'landed'; reconcile.seq = r.seq; break; }
                reconcile.status = 'not-landed';
              }
              await new Promise((res) => { setTimeout(res, 3000) });
            }
          }
        }
        verdict.reconcile = reconcile;
        verdict.landed = reconcile.status === 'landed';
      }
    }
    if (verdict.sent === 'sent') {
      // 次信号：回复信号 = 发送后正文出现"探针回复"标记 + 长度增长（模型回合真完成）。
      // 注意它**不是**送达判据（送达 = verdict.landed 的日志对账）。
      let answered = false;
      for (let i = 0; i < 40 && !answered; i++) {
        await new Promise((resolve) => { setTimeout(resolve, 4000) });
        const now = (await evaluate(`document.body?.innerText ?? ''`)) ?? '';
        answered = now.length > before.length + ask.length + 40 && now.includes('探针收到');
      }
      verdict.answered = answered;
      verdict.transcriptTail = ((await evaluate(`document.body?.innerText ?? ''`)) ?? '').slice(-300);
    }
  }

  if (expectFace !== undefined && verdict.expectFaceHeld !== true) verdict.failed = `expect-face 未命中: ${expectFace}`;
  if (expectNoLeak !== undefined && verdict.expectNoLeakHeld !== true) verdict.failed = `expect-no-leak 失守: ${expectNoLeak}`;
  if (ask !== undefined && verdict.answered !== true) {
    // fail-loud：区分「没发出去」「发出去了没落盘」「落了盘但没等到回复」——旧版一律报最后一种，
    // 把真因盖掉，是 BUG-021 症状"静默失效"的直接来源。
    const rc = verdict.reconcile ?? {};
    if (verdict.sent !== 'sent') {
      // stop-only 是**危险态**（该位置只有"停止生成"）：探针按设计拒点——盲点会掐断在飞 turn。
      // 与"压根没有 send 家族按钮"分开报，免得把危险态读成普通缺按钮。
      verdict.failed = (verdict.sendProbe?.reason === 'stop-only'
        ? 'ask 未发出：该位置只有 stop 家族按钮（拒点，未掐断在飞 turn）'
        : `ask 未发出（sent=${verdict.sent}，sentBy=${verdict.sentBy ?? 'null'}）`)
        + `: send 家族候选=${JSON.stringify(verdict.sendProbe?.candidateLabels ?? [])} `
        + `composer 带 aria-label 按钮=${JSON.stringify(verdict.sendProbe?.ariaLabelsNearComposer ?? [])} `
        + `stop 家族在场=${JSON.stringify(verdict.sendProbe?.stopLabelsNear ?? [])}`;
    } else if (verdict.landed === true) {
      verdict.failed = `消息已落盘（journal 对账命中 seq=${rc.seq ?? 'null'}）但等待窗口内未见模型回复`;
    } else if (rc.status === 'session-mismatch') {
      verdict.failed = `注入目标与对账目标不一致：页面前台会话 = ${rc.domSessionId}，--session 指定 = ${rc.sessionId}`
        + '——消息可能进了另一个会话。请按标题确认点开的是哪个会话（同 workspace 同名会话会撞），'
        + '或去掉 --session 让探针按页面前台会话对账';
    } else if (rc.status === 'not-landed') {
      verdict.failed = `消息未落盘：journal 对账在时间窗内未命中（会话 ${rc.sessionId}，扫描 ${rc.scanned} 条用户事件）——`
        + '点击未生效或服务端未接受';
    } else {
      verdict.failed = `已点击发送但**无法对账**（reconcile=${rc.status ?? 'missing'}，会话=${rc.sessionId ?? 'null'}，`
        + `根=${rc.root ?? 'null'}${rc.logPath !== undefined ? `，日志=${rc.logPath}` : ''}）——`
        + '送达与否未知，按未证送达处理';
    }
  }
} finally {
  verdict.consoleProblems = consoleProblems.slice(0, 10);
  verdict.exceptions = exceptions.slice(0, 10);
  // 截图必须在 settle 前：agent 的可见证据（失败也留）——路径由调用方给，父目录自动建。
  if (screenshotPath !== undefined) {
    try {
      verdict.screenshot = (await screenshot(screenshotPath, { fullPage: true })).path;
    } catch (error) {
      verdict.screenshotError = String(error?.message ?? error).slice(0, 300);
    }
  }
  if (!keepBrowser) await handle.settle();
}

console.log(JSON.stringify(verdict, null, 2));
let exitCode = 0;
if (verdict.booted === false || verdict.error !== undefined || verdict.failed !== undefined) exitCode = 1;
process.exit(exitCode);
