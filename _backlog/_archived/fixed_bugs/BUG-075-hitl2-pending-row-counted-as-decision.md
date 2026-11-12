---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-075：门③ 把「HITL2 未拍板」当拍板行——同 run 的旧答复即可放行（G8 形态 fail-open）

> 严重级别：P1 ｜ 发现：2026-11-12 ｜ 状态：已修 — `isHitl2Row` 只认决策形（未决/待确认不入）；§Decisions 最新 HITL2 行未决即 RED；门③改用最新 ask 的 callId 答复，旧 ask 答复不再为更新的版本作证（2026-11-12，去向：none — 门③修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs` 的 `isHitl2Row` + `hitl2RowGate`（node-gate 门③）。

## 症状

`isHitl2Row` 只做**词面存在**判断：

```js
export function isHitl2Row(line) {
  if (/HITL2/.test(line)) return true
  return /交付审阅/.test(line) && /代理模拟|hitl-answer/.test(line)
}
```

于是 §Decisions 里一行**明确的未决记录**（如「HITL2：未拍板（等待用户确认）」）也被当成**拍板行**。
门③ 随后只要求「本 run 纪元内存在一条交付审阅答复」，不要求它对应最新版/最新一轮。结果：

- final/v2.md 在场、§Decisions 写「HITL2（v2）：未拍板」、同 run 里 **v1 的旧答复**仍在纪元内
  → **门③ PASS**（版本落盘先于 v2 的用户裁决，正是 G8 要堵的形态）。

## 复现（合成 bundle + 真实形状的会话日志，已实跑）

```sh
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hitl2RowGate } from './scripts/lib/node-gate-session-gates.mjs';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'dsh-hitl2-pending2-'));
const b = join(root, 'drt_x'); mkdirSync(join(b, 'final'), { recursive: true });
writeFileSync(join(b, 'run.md'), '# Run\n\n- contract: 2026-10-23\n');
writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-10-23 HITL2：未拍板（等待用户确认）\n');
writeFileSync(join(b, 'final', 'v1.md'), '# v1\n');
const T = Date.parse('2026-10-23T10:00:00+08:00'); const at = (o,t=T) => JSON.stringify({ ...o, time:t });
const head = at({ type:'session', version:4, id:'s', cwd:'/x', delegationDepth:0, agentPreset:'lead' });
const bind = at({ type:'tool/call', data:{ turn:1, callId:'w1', name:'write', arguments: JSON.stringify({ file_path:'drt_x/question.md', content:'# Q' }) } });
const ask = at({ type:'tool/call', data:{ turn:1, callId:'ask1', name:'ask_user_question', arguments: JSON.stringify({ questions:[{ id:'hitl2_delivery', header:'交付审阅（HITL2）', question:'定稿？drt_x' }] }) } });
const reply = at({ type:'tool/result', data:{ turn:1, step:1, message:{ role:'tool', toolCallId:'ask1', content:[{ type:'text', text: JSON.stringify({ answers:[{ id:'hitl2_delivery', selected:['定稿（按现稿交付）'] }] }) }] } } }, T+60000);
const sessions = join(root, 'sessions'); const g = join(sessions,'grp','sess1'); mkdirSync(g,{recursive:true});
writeFileSync(join(g,'session.v4.jsonl'), [head,bind,ask,reply].join('\n')+'\n');
console.log(hitl2RowGate(b, sessions).gate);
rmSync(root,{recursive:true,force:true});
"
```

实测输出（**应为 RED，实为 PASS**）：

```
{ status: 'PASS', detail: 'HITL2 事件链在场：callId ask1 选定「定稿（按现稿交付）」' }
```

即使 §Decisions 只有**一行**「HITL2：未拍板（等待用户确认）」，结论相同（已另跑一份 pending-only 变体）。

## 根因（已证）

1. **行判据 = 关键词存在**：`/HITL2/` 不区分「已拍板 / 未拍板 / 待确认 / 等待 / 尚未」；
2. **见证不绑轮次/版本**：`hitl2RowGate` 只汇总本 run 纪元内的交付审阅答复（asks 的 args 含
   `交付审阅|hitl2|审阅与拍板|定稿（按现稿交付）`），**任何一条**都满足；v1 的答复给 v2 作证；
3. **无「最新一行才是终局」的仲裁**：§Decisions 是 append-only、最新在上，但门只问「有没有 HITL2 字样」。

同一「README 宣称」的问题：门③ 的注释写着「callId 绑定 ask 的 §Decisions 拍板行」，实现里 §Decisions
行与 ask callId 之间没有绑定关系。

## 影响面

- **G8 形态 fail-open**：补研究多版本 run（v1 已拍板、v2 待拍板）的交付可被门③放行；
- 错误方向是**放行**，且发生在验收链（node-gate 门③）——下游 present/acceptance 都会继续；
- 与 [BUG-074](BUG-074-readiness-inline-quote-hijack.md) 同属「词面存在 ≠ 语义成立」一类；那条在
  readiness，这条在拍板行。

## 修复判据

1. **行语义**：`isHitl2Row` 只认**决策形**——须含决策词（定稿 / 追认 / 拍板 / 按现稿 / 批准），且
   **排除否定形**（未拍板 / 待确认 / 等待 / 未定 / 待补 / 尚未 / 未决）；
2. **最新一行裁决**：§Decisions 最新在上——最新一条 HITL2 行必须是决策形，否则门③ RED；
3. **见证绑最新 ask**：只认**最新一条**交付审阅 ask 的答复（更早 ask 的答复不得为更新的版本作证）；
   若最新 ask 未答复 → RED（与 G8 语义一致）；
4. 先红后绿：把上表「pending-only + 旧答复」「pending + 无答复」「决策形 + 答复」「决策形 + 答复早于
   契约纪元」四态写进 `tests/run/node-gate-witness.test.mjs`——前两态当前是绿（红），后两态保持绿；
5. `pnpm test` + `pnpm verify` 绿；既有 witness 测试不回归。

## 修复关联

P1 但**触及交付门（门③/验收合同）**——按纪律需评审后落地。与
[BUG-074](BUG-074-readiness-inline-quote-hijack.md)（同 discovered-by-mutation 类）相邻；G8 的历史
语义见 `_backlog/_archived/settled_issues/` 与门③注释。

## 已落地（2026-11-12）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-075 四例（pending+旧答复 RED、pending 无答复 RED、最新 ask 未答 RED、最新 ask 已答 PASS）；真实 bundle 门③ PASS 不变。
- 去向 = none（门③语义修复）。
