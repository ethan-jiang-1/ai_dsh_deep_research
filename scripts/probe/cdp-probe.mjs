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
//        [--keep-browser]
//
//   '<gui-url>'  boot 好的 GUI URL（含 ?token=，boot-run 横幅给出的那条）
//   --open-session '<标题>'  按标题点开侧栏会话行（最深层元素 JS 派发——行内嵌按钮不抢）
//   --open-status            展开右栏并点「研究状态」胶囊（JS 派发，绕过遮挡）
//   --expect-face '<文本>'   断言页面文本含该串（如本场 bundle 的问题行片段）
//   --expect-no-leak '<文本>' 断言页面文本**不含**该串（如旧 run 的问题行——BUG-001 回归哨）
//   --ask '<消息>'           向当前会话的输入框输入并发送，等待模型回复出现——完整产品环
//   --keep-browser           保留无头浏览器（打印调试端口供手工检查）
//
// stdout 输出一个 JSON verdict；全部期望成立 exit 0，否则 1，用法/环境错 2。
import { launchCdpBrowser } from '../lib/cdp-driver.mjs';
import process from 'node:process';

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
const keepBrowser = flag('--keep-browser');

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
const { evaluate, consoleProblems, exceptions } = handle;
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
  const openStatusPane = async () => {
    await evaluate(`(() => { const b = document.querySelector('[aria-label="Open right sidebar"]'); if (b) b.click(); return !!b })()`);
    await new Promise((resolve) => { setTimeout(resolve, 1500) });
    const visible = await evaluate(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent ?? '').includes('研究状态')); if (b) { b.click(); return true } return false })()`) === true;
    await new Promise((resolve) => { setTimeout(resolve, 5000) });
    return visible;
  };
  const paneText = async () => evaluate(`(() => {
    const t = document.body?.innerText ?? '';
    const i = t.indexOf('研究状态');
    return i >= 0 ? t.slice(i, i + 4000) : t.slice(0, 300)
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

  // 完整产品环：向当前会话输入框输入 → 发送 → 等回复出现
  if (ask !== undefined && verdict.sessionOpened) {
    verdict.askQuestion = ask;
    const before = (await evaluate(`document.body?.innerText ?? ''`)) ?? '';
    verdict.typed = await evaluate(`(() => {
      const editable = document.querySelector('[contenteditable="true"]') ?? document.querySelector('textarea');
      if (editable === null || editable === undefined) return 'no-editable';
      editable.focus();
      const ok = document.execCommand('insertText', false, ${JSON.stringify(ask)});
      return ok === true ? 'typed' : 'insert-failed';
    })()`);
    verdict.sent = await evaluate(`(() => {
      const send = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? '').includes('Send'));
      if (send === undefined) return 'no-send-button';
      send.click();
      return 'sent';
    })()`);
    if (verdict.sent === 'sent') {
      // 回复信号 = 发送后正文出现"探针回复"标记 + 长度增长（模型回合真完成）
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
  if (ask !== undefined && verdict.answered !== true) verdict.failed = 'ask 后未见模型回复（探针收到）';
} finally {
  verdict.consoleProblems = consoleProblems.slice(0, 10);
  verdict.exceptions = exceptions.slice(0, 10);
  if (!keepBrowser) await handle.settle();
}

console.log(JSON.stringify(verdict, null, 2));
let exitCode = 0;
if (verdict.booted === false || verdict.error !== undefined || verdict.failed !== undefined) exitCode = 1;
process.exit(exitCode);
