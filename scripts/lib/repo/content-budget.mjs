// content-budget.mjs — 研究手册常驻面（T0）的两级预算：下放触发 / 硬顶。
//
// 为什么两级：10,000 是 2026-11-11 首刀后的“该下放了”触发，由
// tests/pack/content-disclosure.spec.mjs 在每次回归里把守；12,288 是 content-shape 门禁的
// 失控硬顶（历史值 = 11,227 + ~9% 余量）。触发不是硬顶的豁免：过 10,000 先下放/压缩，
// 不挪用硬顶余量。两个数只在本文件定义。
export const T0_TRIGGER_CHARS = 10_000;
export const T0_HARD_MAX_CHARS = 12_288;

// Lead persona 是另一条每请求常驻面：YAML 解析口径 5,760 字符（原始缩进块 6,067），
// 预算 6,500 = 原始口径 + ~7% 余量。合计守（T0 + persona）防止两面互相挪用——
// 当前解析口径 9,991 + 5,760 = 15,751，预算 16,500（原始口径 16,058）。
export const LEAD_PERSONA_MAX_CHARS = 6_500;
export const RESIDENT_TOTAL_MAX_CHARS = 16_500;

// 常驻面的真实 payload 与固定密度估计（2026-11-13 实测）：
//   lead persona 10,750 B / 1,444 tok；T0 16,991 B / 2,502 tok；
//   合计 27,741 B / 3,946 tok。byte 是硬 payload；token 是 DSH
//   fixed-density 估计（CHARS_PER_TOKEN=4 + BLOCK_OVERHEAD=4；CJK 会低估）。
export const LEAD_PERSONA_MAX_BYTES = 11_500;
export const RESIDENT_TOTAL_MAX_BYTES = 29_000;
export const LEAD_PERSONA_MAX_TOKENS = 1_550;
export const RESIDENT_TOTAL_MAX_TOKENS = 4_150;

/**
 * DSH fixed-density estimate（与 vendor token-meter/estimate.ts 同式；CJK 低估）。
 * @param {string} text - model-visible text.
 * @returns {number} heuristic tokens.
 */
export function estimateFixedDensity(text) {
  return Math.ceil(text.length / 4) + 4;
}
