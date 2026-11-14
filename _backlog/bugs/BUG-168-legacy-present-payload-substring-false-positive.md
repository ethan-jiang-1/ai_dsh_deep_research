---
status: 等人拍板
severity: P2
opened: 2026-11-14
---

# BUG-168：旧场 present 证据按整段载荷找 slug——别的 bundle 的 present 含一句提及即放行

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及门②交付见证，需用户放行
>
> 位置：[scripts/lib/node-gate-session-gates.mjs](../../scripts/lib/node-gate-session-gates.mjs) 的
> `presentInLogs`（旧场无 `run.md` 的兼容分支）；同族前科 = BUG-090（pack 绑定扫 content）、
> [BUG-134](../_archived/fixed_bugs/BUG-134-gate-witness-bound-slugs-scans-content.md)（门侧绑定扫 content）。

## 症状

`presentInLogs` 只把 present 事件的**整段 JSON** 序列化后做子串匹配：

```js
const payload = JSON.stringify(d ?? {}).replace(/\\\//g, '/')
if (payload.includes(slug)) return true
```

因此一个**指向别的 bundle** 的 present，只要在 `note`/`summary`/其他自由文本里提到本 bundle
的 slug，就会让本 bundle 的门② PASS——即使 `present` 的 `files[].path` 根本不指向本 bundle。

## 复现（2026-11-14 实测）

最小合成：无 `run.md` 的旧场 bundle `drt_legacy`，会话日志里只有一条 present：

```json
{"type":"tool/call","data":{"name":"present","arguments":"{\"files\":[{\"path\":\"drt_other/final/v1.md\"}],\"note\":\"supersedes drt_legacy/main\"}"}}
```

```sh
TSX_TSCONFIG_PATH="$(pwd)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { presentGate } from './scripts/lib/node-gate-session-gates.mjs';
const base = mkdtempSync(join(tmpdir(), 'probe-present-'));
const b = join(base, 'drt_legacy');
mkdirSync(join(b, 'final'), { recursive: true });
writeFileSync(join(b, 'final.md'), '# F\n');
writeFileSync(join(b, 'final', 'v1.md'), '# v1\n');
writeFileSync(join(b, 'review.md'), 'readiness: PASS\n');
const sessions = join(base, 'sessions', 'sess'); mkdirSync(sessions, { recursive: true });
writeFileSync(join(sessions, 's.jsonl'), JSON.stringify({ type: 'tool/call', time: Date.now(), data: { callId: 'p1', name: 'present', arguments: JSON.stringify({ files: [{ path: 'drt_other/final/v1.md' }], note: 'supersedes drt_legacy/main' }) } }) + '\n');
console.log(presentGate(b, join(base, 'sessions'), []));
rmSync(base, { recursive: true, force: true });
"
# 实测：{"status":"PASS","detail":"会话日志含指向本 bundle 的 present 声明（旧场无 run.md，按 epoch 豁免结构化事件）"}
```

负对照：把 `note` 里的 `drt_legacy/main` 删掉，同一 present 对 `drt_legacy` 应 RED（无本 bundle 的
present）——当前实现会正确 RED；差别只在是否有一句提及。

## 根因（已证）

判据层把「present 载荷里出现 slug」当成「present 指向本 bundle」：没有解析 `arguments.files[].path`，
没有路径前缀/根校验，也没有排除自由文本字段。结构化分支（新 run）已用 `scanWitnessLogs` 的
`files[].path` 与 `portableBundlePath`；旧场兼容分支没有共享这套路径判据。BUG-090/134 的
「内容提及 ≠ 绑定路径」在同一文件的旧场分支复发。

## 影响面

- 旧场（无 `run.md`、epoch 豁免）交付门②可被别的 run 的 present + 一句 `supersedes drt_x` 冒充；
  `PASS` 文案还声称「指向本 bundle」，与事实不符。
- 交付证据是 L4 验收链的地基；旧场兼容路径是唯一还在扫 content 的 present 判据。
- 当前新 run 走结构化分支，不受影响；属旧场路径的假绿（P2）。

## 牵出的失败类

- **C7 假绿**（在场/提及冒充路径）+ **C3 双份事实**（结构化与旧场两套 present 判据，一套有路径边界，
  一套没有）。
- 同机制第 **3** 次（BUG-090 写侧绑定、BUG-134 门侧绑定、本条旧场 present）。类修：present 路径
  解析抽成共享 codec，所有分支只读 `files[].path`/`path` 字段，统一 `portableBundlePath` + 精确前缀。

## 修复判据

- `presentInLogs` 解析 present 的 `arguments`（JSON 字符串或对象），只收集 `files[].path`（以及
  真实语料里的等价路径字段）；对每个路径用 `portableBundlePath` / 精确 `drt_<slug>/final[/vN].md`
  判定，**不**序列化整段 payload 做 `includes`。
- 反证：上面的 `drt_other` + note 提及 → 必须 RED；把 path 改成本 bundle 的 `drt_legacy/final/v1.md`
  → 绿（正对照）；note-only 提及 → 红。
- 与结构化分支共用路径判据或补一条跨分支一致测试；`tests/run/node-gate-witness.spec.mjs` 增旧场 present 两例。

## 修复关联

未修。触面 = 门②交付见证（验收合同），按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`；
可与 BUG-090/134 的路径字段类修同批。
