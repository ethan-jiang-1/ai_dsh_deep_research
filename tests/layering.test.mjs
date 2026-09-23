// 测试分层守卫 — 回归层（tests/）禁止真实模型/浏览器/网络/子进程/密钥依赖。
// 定义：docs/evaluation.md §L0；移植自 ai_dsh_company tests/layering.spec.ts 的守卫语义。
// 守卫对象是 tests/ 自己（含本文件）。反证方法：在任一测试文件里 import 子进程模块
// 并调用其 spawn 函数、或读取模型 API key 的环境变量，本守卫必须红。
// ⚠ 教训（首版实证）：本文件的注释不要以"可匹配形态"引用违规示例——示例代码逐字
//   进注释会被自己的正则命中（守卫红是对的，命中的是文档不是代码）。描述违规用散文。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(TESTS).filter((f) => f.endsWith('.test.mjs'));

test('回归层无子进程/网络/浏览器/密钥依赖', () => {
  const forbidden = [
    /from ['"]node:child_process['"]/,
    /\bspawnSync?\(/,
    /\bexecSync?\(/,
    /from ['"]playwright/,
    /\bfetch\(/,
    /process\.env\.DEEPSEEK_API_KEY/,
    /process\.env\.EXA_API_KEY/,
    /process\.env\.PERPLEXITY_API_KEY/,
  ];
  for (const f of files) {
    const src = readFileSync(join(TESTS, f), 'utf8');
    for (const re of forbidden) {
      assert.doesNotMatch(src, re, `${f} 含回归层禁用依赖: ${re}`);
    }
  }
});
