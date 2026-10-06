// 真模型档 verdict 契约机械钉住（scripts/AGENTS §冒烟脚本可靠性纪律；test-strategy 语料
// 防假绿机制采纳）。契约：exit 0 = 全绿 / 1 = 断言红 / 2 = 未跑（前置缺席）——未跑 ≠ 通过。
// 四个真模型档脚本的行为本已合规，此处把契约钉成形状断言，防将来脚本改动漂移。
// 登记制 closed set（命名即层）：真模型档 = 要凭据的档位，名单就是本文件的 REAL_MODEL——
// 任何顶层脚本引用 `.credentials.yaml`（凭据要求标记）而未登记 = 档位词表漂移即红；
// 反向（登记脚本摘掉凭据要求）同样红。语料事实：`withModelKey` 是条件透传（key 在才传），
// keyless 冒烟也合法调用，故判据用凭据**要求**而非透传。
// 反证：①给 keyless 脚本注入 .credentials.yaml 引用 → closed set 红；②删登记脚本的
// exit(2)/收尾判定 → 对应断言红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const REAL_MODEL = [
  'l4-lite-smoke.mjs',
  'team-preflight-smoke.mjs',
  'entry-chain-probe.mjs',
  'client-hitl-smoke.mjs',
  'discipline-probe.mjs',
];

test('真模型档 closed set：要求凭据（.credentials.yaml）的脚本恰为登记名单', () => {
  const files = readdirSync(SCRIPTS).filter((f) => f.endsWith('.mjs')).sort();
  const requiring = files.filter((f) => readFileSync(join(SCRIPTS, f), 'utf8').includes('.credentials.yaml'));
  assert.deepEqual(
    requiring,
    [...REAL_MODEL].sort(),
    '要求凭据的脚本集 ≠ 真模型档登记名单——档位词表漂移（新真模型档脚本同 diff 进本名单与 AGENTS §密钥；keyless 脚本不得引入凭据要求）',
  );
});

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
