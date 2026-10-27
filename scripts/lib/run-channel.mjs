// scripts/lib/run-channel.mjs —— run 通道驱动入口的纯判据（keyless 可钉住的部分）。
//
// 为什么住 lib（2026-10-19 分层实测）：dev/run-driver.mjs 是壳（子进程 spawn boot-run、
// 起浏览器探针、读 web.log），而 tests/ 的 import 闭包必须零禁物（spawn/exec/网络）——
// 契约测试若直接 import 壳，layering 守卫当场判红。故判据下沉本模块（无子进程、无网络、
// 纯函数），壳与测试都 import 它：与 probe-send-target / probe-status-tab 同款分层。
//
// 消费方 = dev/run-driver.mjs（壳）、tests/run-driver-contract.test.mjs（契约）。

/**
 * web.log 文本 → 最后一条横幅的完整 GUI URL。
 * boot-run 每次 boot 以 `tee` **截断写** web.log，故最后一条即当前通道；旧横幅 = 旧 token
 * （每次启动都是新 token，用旧的必 401）——取 newest，不取 first。
 * @param {string} text - web.log 全文。
 * @returns {string|null} 无横幅 / 无 token → null（调用方据此 fail-loud，不猜端口）。
 */
export function guiUrlFromWebLog(text) {
  const hits = [...String(text).matchAll(/dsh web: (https?:\/\/\S+)/g)];
  if (hits.length === 0) return null;
  const url = hits[hits.length - 1][1];
  return url.includes('token=') ? url : null;
}

/**
 * 浏览器面 probe verdict → 呈交判决。
 *
 * 六条硬检查全绿才 exit 0（= 可呈交）：**通道镜像（pack 发布集 ↔ 安装镜像）一致** / 宿主就位
 * （booted + frameMounted）/ 首屏无遮挡（Preview Notice 已清场）/ 右栏页签可开 / expect-face
 * 命中 / 零 console 错误与异常。任何一条不绿 → 1（不得呈交）。首屏遮罩是**人看得见**的判据：
 * 探针的 JS 派发绕过 hit-testing，没有这条时 DOM 在位就能判绿，而人打开 URL 正对着一屏
 * Continue（2026-10-27 实测）。
 *
 * `drift` 是镜像一致性的取证（应跑 = `bash dev/boot-run.sh --drift-only`）。未取证（null /
 * 缺 clean:true）或取证为脏 → 2（**未跑**，不是通过——旧页面验不出当前代码）。2026-10-28
 * 实测：通道 18:47 起、pack `lib/client.js` 02:50 重建，probe 仍报 GREEN——通道加载的是
 * 五天前的镜像。复用通道必须先过镜像门，否则"绿"只是旧页面的绿。
 *
 * @param {{probe: object, expectFace: string, drift: {clean: boolean, detail?: string} | null}} input
 * @returns {{exit: 0|1|2, level: 'GREEN'|'RED'|'NOT-RUN', checks: Array<{id: string, ok: boolean, detail: string}>, reason: string}}
 */
export function runDriverVerdict({ probe, expectFace, drift }) {
  if (drift === null || drift === undefined || drift.clean !== true) {
    const detail = drift?.detail === undefined
      ? '镜像一致性未取证'
      : String(drift.detail).split('\n').slice(-8).join('\n');
    return {
      exit: 2,
      level: 'NOT-RUN',
      checks: [{ id: 'channel-mirror', ok: false, detail }],
      reason: '通道镜像未取证或与当前 pack 源漂移——当前页面不是当前代码；先重建/重启通道再验（未跑，不是通过）',
    };
  }
  const p = probe ?? {};
  const checks = [
    { id: 'channel-mirror', ok: true, detail: 'pack 发布集 ↔ 安装镜像一致' },
    { id: 'host-mounted', ok: p.booted === true && p.frameMounted === true, detail: `booted=${p.booted} frameMounted=${p.frameMounted}` },
    // overlayCleared 为 null（probe 没取证）**不许**当绿——未跑 ≠ 通过
    { id: 'overlay-clear', ok: p.overlayCleared === true, detail: `overlayPresent=${p.overlayPresent} overlayCleared=${p.overlayCleared}` },
    { id: 'status-pane-open', ok: p.statusPaneOpen === true, detail: `statusPaneOpen=${p.statusPaneOpen}` },
    // expectFaceHeld 为 null（页签没开、断言根本没执行）**不许**当绿
    { id: 'expect-face', ok: p.expectFaceHeld === true, detail: `${expectFace}=${p.expectFaceHeld}` },
    {
      id: 'console-clean',
      ok: (p.consoleProblems?.length ?? 0) === 0 && (p.exceptions?.length ?? 0) === 0,
      detail: `consoleProblems=${p.consoleProblems?.length ?? 0} exceptions=${p.exceptions?.length ?? 0}`,
    },
  ];
  const failed = checks.filter((c) => !c.ok);
  return {
    exit: failed.length === 0 ? 0 : 1,
    level: failed.length === 0 ? 'GREEN' : 'RED',
    checks,
    reason: failed.length === 0
      ? '浏览器面全绿——可呈交'
      : `浏览器面红：${failed.map((c) => `${c.id}(${c.detail})`).join(', ')} ｜ probe=${p.failed ?? 'n/a'}`,
  };
}
