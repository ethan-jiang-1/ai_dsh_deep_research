// 真模型档 verdict 契约机械钉住（scripts/AGENTS §冒烟脚本可靠性纪律；test-strategy 语料
// 防假绿机制采纳）。契约：exit 0 = 全绿 / 1 = 断言红 / 2 = 未跑（前置缺席）——未跑 ≠ 通过。
// 四个真模型档脚本的行为本已合规，此处把契约钉成形状断言，防将来脚本改动漂移。
// 反证：删任一脚本的 preflight exit(2) 或收尾 exit(绿?0:红1) 判定 → 本文件红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const REAL_MODEL = [
  'l4-lite-smoke.mjs',
  'team-preflight-smoke.mjs',
  'entry-chain-probe.mjs',
  'client-hitl-smoke.mjs',
];

test('真模型档脚本：preflight exit(2) 在场（前置缺席 = 未跑，不降级为静默绿）', () => {
  for (const f of REAL_MODEL) {
    const src = readFileSync(join(SCRIPTS, f), 'utf8');
    assert.match(src, /process\.exit\(2\)/, `${f} 缺 preflight exit(2)——前置缺席会静默继续或误报`);
  }
});

test('真模型档脚本：收尾 exit(断言红 1 / 全绿 0) 在场（失败必须非零退出）', () => {
  for (const f of REAL_MODEL) {
    const src = readFileSync(join(SCRIPTS, f), 'utf8');
    assert.match(src, /process\.exit\([^()]*\?\s*0\s*:\s*1\s*\)/, `${f} 缺收尾 exit(绿0/红1) 判定——断言红可能以退出码 0 溜走`);
  }
});
