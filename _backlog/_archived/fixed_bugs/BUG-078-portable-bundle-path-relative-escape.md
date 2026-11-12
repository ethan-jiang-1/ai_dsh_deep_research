---
status: 已修
severity: P2
opened: 2026-11-12
---

# BUG-078：portableBundlePath 把相对 `..` 路径当可移植——门② 接受 bundle 外 present（PASS），repair 保留外部指针

> 严重级别：P2 ｜ 发现：2026-11-12 ｜ 状态：已修 — `portableBundlePath` 对相对路径先 resolve + 包含性检查，含 `..` 一律 null；bundle 内相对路径归一成 `drt_<slug>/…`；repair 对相对逃逸写 null + unportable（2026-11-12，去向：none — 门②/回执路径修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`scripts/lib/path-hygiene.mjs` 的 `portableBundlePath`（门② `presentGate` 与 `repairReceiptPaths`
> 共用）。

## 症状

`portableBundlePath` 对**相对路径**直接原样返回（只把 `\\` 换成 `/`），不做 bundle 内包含性检查：

```js
if (!isAbsolute(raw)) return raw.replace(/\\/g, '/')   // ← `../drt_x/final/v1.md` 也照过
```

于是门② 拿到一条指向 **bundle 外** 的相对 present 路径时，会把它当「可移植标签」放行：

| present 事件里的路径 | 期望 | 实测 |
|---|---|---|
| `<bundle>/final/v1.md`（绝对、内部） | PASS | PASS ✓ |
| `/tmp/elsewhere/drt_x/final/v1.md`（绝对、外部） | RED | RED ✓ |
| **`../drt_x/final/v1.md`（相对、逃逸）** | **RED（bundle 外）** | **PASS**（detail 还称「不可变快照」） |
| `final/v1.md`（相对、内部） | 视契约 | RED（pathRe 要求 `drt_x/` 前缀） |

`repairReceiptPaths` 同病：`present.path = '../other/final/v1.md'` 的 delivered.json 被原样保留，
`actions` 为空、`ok=true`——回执仍指向 bundle 外，且没有任何标注。

## 复现（合成 bundle + 真实形状会话日志，已实跑）

```sh
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { presentGate } from './scripts/lib/node-gate-session-gates.mjs';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'pres-'));
const b = join(root, 'drt_x'); mkdirSync(join(b,'final'),{recursive:true});
writeFileSync(join(b,'run.md'),'# Run\n\n- contract: 2026-10-23\n');
writeFileSync(join(b,'final.md'),'# Final\n'); writeFileSync(join(b,'final/v1.md'),'# v1\n');
writeFileSync(join(b,'review.md'),'readiness: PASS\n');
const T = Date.parse('2026-10-23T10:00:00+08:00'); const at=(o,t=T)=>JSON.stringify({...o,time:t});
const head = at({ type:'session', version:4, id:'s', cwd:'/x', delegationDepth:0, agentPreset:'lead' });
const bind = at({ type:'tool/call', data:{ turn:1, callId:'w1', name:'write', arguments: JSON.stringify({ file_path:'drt_x/question.md', content:'# Q' }) } });
const ask = at({ type:'tool/call', data:{ turn:1, callId:'ask1', name:'ask_user_question', arguments: JSON.stringify({ questions:[{ id:'hitl2_delivery', header:'交付审阅（HITL2）', question:'定稿？drt_x' }] }) } });
const reply = at({ type:'tool/result', data:{ turn:1, step:1, message:{ role:'tool', toolCallId:'ask1', content:[{ type:'text', text: JSON.stringify({ answers:[{ id:'hitl2_delivery', selected:['定稿（按现稿交付）'] }] }) }] } } }, T+60000);
const present = at({ type:'deliverables/presented', data:{ turn:1, callId:'p1', files:[{ path:'../drt_x/final/v1.md' }] } }, T+120000);
const sessions = join(root,'sessions'); const g = join(sessions,'grp','sess1'); mkdirSync(g,{recursive:true});
writeFileSync(join(g,'session.v4.jsonl'), [head,bind,ask,reply,present].join('\n')+'\n');
console.log(presentGate(b, sessions, []));   // → { status: 'PASS', detail: '…指向 ../drt_x/final/v1.md…' }
rmSync(root,{recursive:true,force:true});
"
```

## 根因（已证）

1. `portableBundlePath` 的「相对 = 已是可移植标签」假设（为 repair 的旧标签写的）没有排除 `..` 段；
2. 门② 的 `portableBundlePath(hit.path, bundleDir) === null` 是唯一的「bundle 外」拒收判据——相对逃逸
   绕过它；
3. `pathRe` 只要求字符串尾是 `drt_x/final/vN.md`，`../drt_x/...` 有 `/` 前缀即命中。

## 可达性（如实）

vendor `present` 工具正常写**绝对路径**（门② 的绝对外部用例已正确 RED），所以这条需要**相对路径的
present 事件**才触发：可能是历史日志、手工构造、或未来某个工具改传相对路径。当前真实日志未见实例
（本轮扫描 0 例）。属**包含性缺口/纵深防御**，不是现行运行故障。

## 影响面

- 门② 的「bundle 外 = 不可移交，拒收」承诺被相对路径绕过；回执里的 present 可指向 bundle 外；
- `repairReceiptPaths`（BUG-044 的历史回执修复）对外部相对指针静默 `ok`，修完仍不可移交；
- 与 BUG-077（协议写盘崩溃）不同：这条是判据缺口，不阻塞流程。

## 修复判据

1. `portableBundlePath`：相对路径先 `resolve(bundleDir, raw)` 再做包含性检查；`..` 逃逸 → `null`
   （repair 侧落 `unportable: true`，与绝对外部同处置）；
2. 门② 的绝对外部 RED、内部绝对 PASS 不回归；相对逃逸 → RED；相对内部（如 `final/v1.md`）按契约
   决定（建议同样 resolve 后检查包含性，命中则返回 `drt_x/final/v1.md` 标签）；
3. 先红后绿：上表四行 + repair 的外部相对指针用例（当前 repair 无动作 = 红；修复后
   `present.path=null` + `unportable:true` + action 记录）；
4. `pnpm test` + `pnpm verify` 绿；真实 bundle 扫描（delivered.json 里 `..` 指针）应为 0 或按新规则修正。

## 修复关联

与 [BUG-074](BUG-074-readiness-inline-quote-hijack.md)/[BUG-075](BUG-075-hitl2-pending-row-counted-as-decision.md)
同属门禁判据缺口，但方向是**包含性**而非语义；触及门②，按 `_backlog/AGENTS` 需用户/评审放行。

## 已落地（2026-11-12）

- 证据 = `tests/run/path-hygiene.test.mjs` BUG-078 三形态；`tests/run/run-receipt.test.mjs` 相对逃逸 repair 用例；全量测试绿。
- 去向 = none（路径判据修复）。
