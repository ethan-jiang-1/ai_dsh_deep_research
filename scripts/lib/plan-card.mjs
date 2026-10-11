// scripts/lib/plan-card.mjs —— HITL1「计划确认卡」的识别与字数口径（唯一语义源）。
//
// 为什么单独成模块：同一判据曾有两版实现——node-gate 门①（交付时逐 bundle 记账，WARN）与
// 运行态的一次性标定扫描器（跨场分布）。两版各写一份"哪张 ask 是计划卡、正文多长"，正是
// readiness 终局判定刚踩过的**漂移**形态（见 notes/implemented/2026-10-11-review-readiness-terminal-rule.md）。
// 收成一处后：口径（= ask 的 `question` 字段全长）、标签（= options 里出现「按计划开跑」）与
// 阈值（≤200 字）只有一份，消费方 = 门禁（判严重级）与投影工具（判分布）。
//
// 严重级语义住消费方：门①把超限记为 **WARN**（不拦交付），理由与升格条件 =
// notes/implemented/2026-10-11-plan-card-length-warn.md。

/** 计划卡的签名标签（HITL1 第二段卡的固定选项之一）——比"正文含计划字样"稳。 */
export const PLAN_CARD_MARK = '按计划开跑';

/** 字数上限（skill §6 纪律：计划要点 ≤200 字）。口径 = `ask` 的 `question` 字段全长。 */
export const PLAN_CARD_LIMIT = 200;

const isPlanCardQuestion = (q) => (Array.isArray(q?.options) ? q.options : [])
  .some((o) => String(o?.label ?? '').includes(PLAN_CARD_MARK));

/**
 * 从会话日志全文里抽出全部**计划确认卡**（逐行解析 `tool/call`；畸形行容忍，不 throw）。
 *
 * @param {string} logText 会话日志全文（已解压）
 * @returns {Array<{seq:number|null, id:string|null, header:string, questionChars:number, overLimit:boolean}>}
 *   出现序；`questionChars` = `question` 字段全长（口径正本）；`overLimit` = 超 `PLAN_CARD_LIMIT`。
 */
export function planCardsOf(logText) {
  const out = [];
  if (typeof logText !== 'string' || logText === '') return out;
  for (const line of logText.split('\n')) {
    if (!line.includes('ask_user_question') || !line.includes(PLAN_CARD_MARK)) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const d = event?.data ?? event;
    if (d?.name !== 'ask_user_question') continue;
    const raw = d?.arguments;
    let payload = null;
    try { payload = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? null); } catch { payload = null; }
    for (const q of Array.isArray(payload?.questions) ? payload.questions : []) {
      if (!isPlanCardQuestion(q)) continue;
      const chars = String(q?.question ?? '').length;
      out.push({
        seq: typeof event?.seq === 'number' ? event.seq : null,
        id: typeof q?.id === 'string' ? q.id : null,
        header: typeof q?.header === 'string' ? q.header : '',
        questionChars: chars,
        overLimit: chars > PLAN_CARD_LIMIT,
      });
    }
  }
  return out;
}
