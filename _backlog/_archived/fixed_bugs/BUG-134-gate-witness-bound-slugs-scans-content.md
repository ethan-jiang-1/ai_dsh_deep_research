---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-134：门③见证绑定扫描整段 args 文本——content 里提到 `drt_<别的>/` 就把会话绑到别的 bundle，拍板见证可被借用

> 严重级别：P1 ｜ 发现：2026-11-13 ｜ 状态：已修 — 门侧 boundSlugsOf 改用 pack `slugInArgs` 路径字段白名单，content 提及别的 bundle 不再借见证（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/node-gate-session-gates.mjs:70`（`BIND_PATH_RE = /drt_([a-z0-9][a-z0-9-]*)\//g`）
> 与 `boundSlugsOf`（111-120 行）。对照正本：`packages/deep-research-pack/src/lib/bundle-bind.ts`
> 的 `slugInArgs`（只认 `file_path/path/paths/filename/file` 等真实路径字段，**explicitly 排除 content**，
> BUG-090）。

## 症状

门②/③的会话绑定（`boundSlugsOf`）对 `tool/call` 的 **arguments 原文**做 `drt_<slug>/` 子串扫描，
不区分「路径字段」与「文件正文」。于是一个**只在 drt_a 里干活**的 lead 会话，只要某次 write 的
`content` 里出现 `drt_b/final/v1.md`（引用/对比/笔记），就会被当成 **drt_b 的绑定见证会话**：

```
drt_b 门③（会话只写过 drt_a，content 提到 drt_b）→
{ status: 'PASS', detail: 'HITL2 事件链在场：最新 ask callId ask1 选定「按现稿定稿（Recommended）」' }
```

即：drt_b 没有任何自己的写入/拍板，门③（交付拍板见证）却拿到 drt_a 会话的 HITL2 答复而 **PASS**。
同一绑定还喂给 `bundle-sessions` 反查与 `presentGate` 的会话范围。

## 复现

```sh
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hitl2RowGate } from './scripts/lib/node-gate-session-gates.mjs';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'bind-'));
const b = join(root, 'drt_b'); mkdirSync(join(b, 'final'), { recursive: true });
writeFileSync(join(b, 'run.md'), '# Run\n\n- contract: 2026-10-23\n');
writeFileSync(join(b, 'question.md'), '# Q\n\n## Decisions\n\n- 2026-10-23 HITL2 按现稿定稿\n');
writeFileSync(join(b, 'final', 'v1.md'), '# v1\n'); writeFileSync(join(b, 'review.md'), 'readiness: PASS\n');
const T = Date.parse('2026-10-23T10:00:00+08:00'); const at = (o,t=T) => JSON.stringify({...o,time:t});
const head = at({ type:'session', version:4, id:'s', cwd:'/x', delegationDepth:0, agentPreset:'lead' });
const writeA = at({ type:'tool/call', data:{ turn:1, callId:'w1', name:'write', arguments: JSON.stringify({ file_path:'drt_a/notes.md', content:'参考 drt_b/final/v1.md 的写法' }) } });
const ask = at({ type:'tool/call', data:{ turn:1, callId:'ask1', name:'ask_user_question', arguments: JSON.stringify({ questions:[{ id:'hitl2_delivery', header:'交付审阅（HITL2）', question:'按现稿定稿？drt_a' }] }) } });
const reply = at({ type:'tool/result', data:{ turn:1, step:1, message:{ role:'tool', toolCallId:'ask1', content:[{ type:'text', text: JSON.stringify({ answers:[{ id:'hitl2_delivery', selected:['按现稿定稿（Recommended）'] }] }) }] } } }, T+60000);
const sessions = join(root,'sessions'); const g = join(sessions,'grp','sess1'); mkdirSync(g,{recursive:true});
writeFileSync(join(g,'session.v4.jsonl'), [head,writeA,ask,reply].join('\n')+'\n');
console.log(hitl2RowGate(b, sessions).gate);   // → PASS（期望 RED：会话未碰过 drt_b）
rmSync(root,{recursive:true,force:true});
"
```

## 根因（已证）

1. pack 侧 `slugInArgs` 已经修过 BUG-090（只认真实路径字段，content/pattern 正文不参与），但**门侧**是
   另一份实现：`boundSlugsOf` 直接 `String(arguments).matchAll(BIND_PATH_RE)`；
2. 两处共享的只有 `WRITE_TOOLS`（注释声称「正本口径 = pack bundle-bind.ts」，**实际未共享**路径字段判据）；
3. `BIND_PATH_RE` 无字段边界：JSON 文本里的任何 `drt_x/`（content、pattern、URL、注释）都会命中。

## 影响面

- **门③ fail-open**：别的 run 的 HITL2 答复可以为本 bundle 作证（上例 PASS）；同理门②的
  `presented` 会话范围也会包含「只提到」本 bundle 的会话（present 路径仍需匹配本 bundle，风险较低，
  但 `bundle-sessions` 会给出错误归因）；
- **归因污染**：`run-accept` 回执的 `sessions`、`bundle-sessions` 诊断、HITL provenance 都可能把
  无关会话算进本 run；
- 现实触发：报告/笔记里引用另一场 `drt_<slug>/final.md`（对比、补研究说明、方法笔记）——是自然写法，
  不是恶意构造。

## 修复判据

1. **门侧与 pack 正本共用判据**：`boundSlugsOf` 改用 `slugInArgs` 的路径字段白名单（`file_path/path/
   paths/filePath/file`，`glob` 的 pattern），**不再扫 content**；两份实现收敛为一个共享函数（避免
   再次漂移——本卡即是「注释说同源、实现各一份」的后果）；
2. 先红后绿：上例当前 PASS（红）→ 修复后 RED（会话未写 drt_b）；对照组：真实写过
   `drt_b/final/v1.md` path 的会话 + HITL2 答复 → 仍 PASS；
3. 回归：门②/③ 既有 witness 测试（含 `\/` 编码、绝对路径、archive 前缀、非 lead、子 agent、
   契约纪元）全绿；`bundle-sessions` 反查结果与 `sessionBindingOf` 一致；
4. 可选加固：给「content 里出现 drt_ 跨 bundle」加 warning（不是本卡必需，schema-scan 已禁
   `[来源:]` 形态）；
5. `pnpm test` + `pnpm verify` 绿。

## 修复关联

[BUG-090](BUG-090-bundle-bind-content-false-positive.md)（pack 侧
content 误绑）的**门侧漏网**；与 [BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)（门③语义）
相邻但不同层：那条是行语义，本条是会话归属。触及门禁/验收合同 → 按 `_backlog/AGENTS` 需评审放行。
发现方式 = 把 pack 的 `slugInArgs` 与门侧 `boundSlugsOf` 做同源对账（探索卡上轮遗留的「共享判据」面）。

## 已落地（2026-11-13）

- 证据 = `tests/run/node-gate-witness.test.mjs` BUG-134。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
