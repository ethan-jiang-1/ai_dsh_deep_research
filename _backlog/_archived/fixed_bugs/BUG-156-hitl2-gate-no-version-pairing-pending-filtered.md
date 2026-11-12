---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-156：门③过滤掉 pending 行后，旧拍板行 + 旧答复仍放行新版本——没有「最新版本必须已拍板」的仲裁

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — 门③按日期取最新 HITL2 行；最新行 pending 即 RED；最新拍板行版本落后最新 final 也 RED（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs` 的 `hitl2RowGate`（`dec.filter(isHitl2Row)` 后只要
> 存在任一答复即 PASS）。关联：075/140/144/149 修的是**行分类**，本条是**版本配对**（另一层）。

## 症状

§Decisions 同时有**旧拍板行**与**最新 pending 行**，会话只有旧版本的一次交付审阅答复：

```md
## Decisions

- 2026-11-01 HITL2 定稿（v1）
- 2026-11-23 HITL2 待用户确认（v2）      ← 最新行是 pending（isHitl2Row 正确判 false）
```

`final/v1.md` + `final/v2.md` 都在场；会话里只有 v1 那次 ask 的答复。实测：

```
v1 定稿 row: true   | v2 待用户确认 row: false
gate = PASS | HITL2 事件链在场：最新 ask callId ask1 选定「定稿（按现稿交付）」
```

即：**v2 尚未拍板，门③仍 PASS**——因为 pending 行被过滤掉后，剩下的旧 v1 行 + v1 答复满足了「有行 +
有答复」。若把最新行写成 `未决` 则更糟：149 的 pending 词表不含「未决」，它被当成**拍板行**（同一场景
同样 PASS）。

## 复现

```sh
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hitl2RowGate } from './scripts/lib/node-gate-session-gates.mjs';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'multi2-'));
const b = join(root,'drt_x'); mkdirSync(join(b,'final'),{recursive:true});
writeFileSync(join(b,'run.md'),'# Run\n\n- contract: 2026-11-01\n');
writeFileSync(join(b,'question.md'),'# Q\n\n## Decisions\n\n- 2026-11-01 HITL2 定稿（v1）\n- 2026-11-23 HITL2 待用户确认（v2）\n');
writeFileSync(join(b,'final','v1.md'),'# v1\n'); writeFileSync(join(b,'final','v2.md'),'# v2\n'); writeFileSync(join(b,'review.md'),'readiness: PASS\n');
const T=Date.parse('2026-11-01T10:00:00+08:00'); const at=(o,t=T)=>JSON.stringify({...o,time:t});
const head=at({type:'session',version:4,id:'s',cwd:'/x',delegationDepth:0,agentPreset:'lead'});
const bind=at({type:'tool/call',data:{turn:1,callId:'w1',name:'write',arguments:JSON.stringify({file_path:'drt_x/question.md',content:'# Q'})}});
const ask=at({type:'tool/call',data:{turn:1,callId:'ask1',name:'ask_user_question',arguments:JSON.stringify({questions:[{id:'hitl2_delivery',header:'交付审阅（HITL2）',question:'定稿？drt_x'}]})}});
const reply=at({type:'tool/result',data:{turn:1,step:1,message:{role:'tool',toolCallId:'ask1',content:[{type:'text',text:JSON.stringify({answers:[{id:'hitl2_delivery',selected:['定稿（按现稿交付）']}]})}]}}}, T+60000);
const sessions=join(root,'sessions'); const g=join(sessions,'grp','sess1'); mkdirSync(g,{recursive:true});
writeFileSync(join(g,'session.v4.jsonl'),[head,bind,ask,reply].join('\n')+'\n');
console.log(hitl2RowGate(b, sessions).gate);   // → PASS（期望 RED）
rmSync(root,{recursive:true,force:true});
"
```

## 根因（已证）

1. `hitl2RowGate` 的判定是「存在至少一条 `isHitl2Row` 行」+「本 run 有最新 ask 的答复」——**两者都不绑定
   版本**；
2. `isHitl2Row` 把 pending 行排除后，pending 语义**不再参与门判**（排除 ≠ 红），于是「最新一行是 pending」
   这个事实被丢弃；
3. 门④有版本记账/最高版本概念，门③没有；v2 的交付与 v1 的拍板之间没有对账；
4. 075 加的 `latestAsk` 只保证「答复对应最新 ask」，但**最新 ask 是 v1 的**（v2 根本没问）——所以仍过。

## 影响面

- **多版本 run 的 G8 形态**（075 的原目标）在「先拍板 v1、后做 v2 但未拍板」时原样成立；
- 补研究/修订的每一条新版本路径都可能被旧拍板放行；
- 149 的「未决」词表洞会把它进一步扩大（未决被当拍板行）。

## 修复判据

1. **最新行裁决**：§Decisions 里与 HITL2 相关的**最新一行**必须是 decisicve（isHitl2Row true）；若最新
   一行是 pending（含词表扩展后的所有 pending 语义）→ 门③ RED，无论前面有多少旧拍板行；
2. **版本配对**：从行里提取 `vN`（或 final/ 的最高版本）：最新 final 版本 vN 必须有**对应的**拍板行
   （同一 vN 或更晚）与**对应的**答复（ask 的 args 提及该版本/时间晚于该版本落盘？按设计二选一）；
3. 先红后绿：上面两个场景（`待用户确认` / `未决`）→ 修复后 RED；单一 v1 拍板（无 pending 行）+ v1 答复
   仍 PASS；144 的代理记账行仍 PASS；
4. 与 149 的 pending 词表修复**分开**评审（149 修分类，本条修版本仲裁）；
5. `pnpm test` + `pnpm verify` 绿；真实多版本 run（补研究 v2/v3）语料抽查。

## 修复关联

[BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)（行分类）/
[BUG-140](BUG-140-hitl2-vocabulary-two-way-misclassification.md)/
[BUG-144](BUG-144-kickoff-provenance-rows-not-counted-as-hitl2.md)/
[BUG-149](BUG-149-hitl2-pending-vocabulary-holes.md)（均为行级）与本条（**版本级**）构成完整修复面。
发现方式 = 把「门③的 pending 过滤」与「多版本 §Decisions」交叉。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-156。
- 全量 `pnpm test` 1364 绿、`pnpm verify` 全绿；run-accept-smoke ALL PASS。
- 去向 = none。
