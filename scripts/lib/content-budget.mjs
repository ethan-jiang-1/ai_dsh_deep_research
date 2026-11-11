// content-budget.mjs — 研究手册常驻面（T0）的两级预算：下放触发 / 硬顶。
//
// 为什么两级：10,000 是 2026-11-11 首刀后的“该下放了”触发，由
// tests/pack/content-disclosure.test.mjs 在每次回归里把守；12,288 是 content-shape 门禁的
// 失控硬顶（历史值 = 11,227 + ~9% 余量）。触发不是硬顶的豁免：过 10,000 先下放/压缩，
// 不挪用硬顶余量。两个数只在本文件定义。
export const T0_TRIGGER_CHARS = 10_000;
export const T0_HARD_MAX_CHARS = 12_288;
