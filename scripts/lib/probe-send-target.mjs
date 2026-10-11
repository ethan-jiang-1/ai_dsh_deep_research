// scripts/lib/probe-send-target.mjs —— 「该点哪个提交按钮」的纯判据（cdp-probe 的 DOM 规则核心）。
//
// 为什么单独成模块：BUG-021 的生产现场坏在这一层——提交按钮的 aria-label 是**状态机**
// （vendor ui-conversation locales 的 `input.send*` 族：空闲 `Send message`／在飞 `Queue message`／
// 插话 `Steer message`，中文对应 `发送消息`／`排队发送`／`插话发送`），而旧探针只找含 "Send" 的
// 字符串 → 在飞时构造性零命中。更危险的是同一位置在 `running && 草稿为空` 或**有挂起交互**时
// 变成 `input.stop`（`Stop generating`／`停止生成`）——盲点"composer 区最后一个按钮"会**掐断
// 在飞 turn**。这两条规则原先只活在页面 `evaluate()` 字符串里，唯一证据是一次性的真模型 harness；
// 抽成纯函数后由 keyless 测试常驻钉住（消费方 = cdp-probe 与 cdp-ask-smoke）。
//
// 分工：**页面只读 DOM 与执行点击**，判定（选谁 / 拒点）住这里。

/** send 家族（可安全点击的提交标签）——与 vendor locales 的 `input.send*` 三态 × 双语对齐。 */
export const SEND_LABELS = [
  'Send message', 'Queue message', 'Steer message',
  '发送消息', '排队发送', '插话发送',
];

/** stop 家族（**绝不可点**：同一位置在主按钮为停止态时出现，点了会掐断在飞 turn）。 */
export const STOP_LABELS = ['Stop generating', '停止生成'];

/** composer 纵向邻近窗（px）：页面上别处也可能有同名标签的按钮，只认挨着 composer 的那个。 */
export const COMPOSER_Y_WINDOW = 140;

/**
 * 从页面按钮表里挑出**本次该点的提交按钮**。
 *
 * @param {object} o
 * @param {Array<{label:string, y:number}>} o.buttons 页内按钮（label = aria-label，已 trim；y = 视口纵坐标）
 * @param {number|null} [o.composerY] composer 的纵坐标（null = 读不到，退化为"全页候选"）
 * @returns {{picked:string|null, pickedIndex:number|null, reason:string,
 *            candidateLabels:string[], stopLabelsNear:string[], labelsNear:string[]}}
 *   `reason` ∈ `picked`（选中）｜`stop-only`（该位置只有 stop——**拒点**，是挂起/运行中的危险态）
 *   ｜`no-send-family`（没有 send 家族按钮）｜`empty`（按钮表为空，防空语料）
 */
export function pickSendTarget({ buttons, composerY = null }) {
  const list = Array.isArray(buttons) ? buttons.filter((b) => b !== null && typeof b === 'object') : [];
  const labelOf = (b) => typeof b?.label === 'string' ? b.label.trim() : '';
  const yOf = (b) => (typeof b?.y === 'number' ? b.y : null);
  const near = (b) => composerY === null || yOf(b) === null || Math.abs(yOf(b) - composerY) < COMPOSER_Y_WINDOW;

  const candidates = list.filter((b) => SEND_LABELS.includes(labelOf(b)));
  const stopNear = list.filter((b) => STOP_LABELS.includes(labelOf(b)) && near(b));
  const nearLabels = list.filter(near).map(labelOf).filter((l) => l !== '').slice(0, 12);
  const hit = candidates.findIndex((b) => near(b));

  if (list.length === 0) {
    return { picked: null, pickedIndex: null, reason: 'empty', candidateLabels: [], stopLabelsNear: [], labelsNear: [] };
  }
  if (hit >= 0) {
    return {
      picked: labelOf(candidates[hit]),
      pickedIndex: list.indexOf(candidates[hit]),
      reason: 'picked',
      candidateLabels: candidates.map(labelOf),
      stopLabelsNear: stopNear.map(labelOf),
      labelsNear: nearLabels,
    };
  }
  return {
    picked: null,
    pickedIndex: null,
    reason: stopNear.length > 0 ? 'stop-only' : 'no-send-family',
    candidateLabels: candidates.map(labelOf),
    stopLabelsNear: stopNear.map(labelOf),
    labelsNear: nearLabels,
  };
}
