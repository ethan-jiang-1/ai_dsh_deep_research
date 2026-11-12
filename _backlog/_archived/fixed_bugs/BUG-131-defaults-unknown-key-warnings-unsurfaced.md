---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-131：research-defaults 的 unknown-key warning 无人消费——打错关键字静默失效，下一次写入静默删除

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — defaults show 返回 warn，set/unset 遇未知键拒绝写入（不再静默删除）（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁）。
>
> 位置：`packages/deep-research-pack/src/lib/research-defaults.ts`（`parseDefaults` 的 warnings）、
> `packages/deep-research-pack/src/defaults/command.ts`（`show`/`set` 的返回文本）、
> `packages/deep-research-pack/src/client/defaults/store.ts`（`warnings` 存了但 UI 不消费）。

## 症状

手写 `research-defaults.json` 时打错关键字（极常见：`efort`、`audiance`），系统**完全静默**：

```json
{ "schema": 1, "revision": 3, "efort": "deep", "effort": "deep",
  "output": { "shape": "full_report", "audiance": "CFO" } }
```

```
/research-defaults show      → ok revision=3 effort=deep output=full_report
                               （efort / audiance 两个未知键：零提示）
再执行一条 set（改 source）   → ok revision=4 …
写回的文件                   → {"schema":1,"revision":4,"effort":"deep",
                                 "output":{"shape":"full_report"},
                                 "source":{"authority":"primary"}}
                               （efort 与 audiance 被静默删除）
```

即：用户以为设置了「深度 + 读者」，实际两项都没生效；错误拼写还会在下一次写入时被**静默抹掉**，
连事后追查的线索都不留。客户端 UI 同样不显示：`store.ts` 把 `parseDefaults().warnings` 存进快照，
但 `DefaultsPanel.tsx` / `DefaultsButton.tsx` 没有任何对 `warnings` 的渲染（grep 零命中）。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { mkdtempSync, realpathSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDefaultsCommand } from './packages/deep-research-pack/src/defaults/command.ts';
const root = mkdtempSync(join(realpathSync(tmpdir()), 'def2-'));
writeFileSync(join(root, 'research-defaults.json'), JSON.stringify({ schema: 1, revision: 3, efort: 'deep', effort: 'deep', output: { shape: 'full_report', audiance: 'CFO' } }, null, 2));
console.log(runDefaultsCommand({ cwd: root, rawInput: 'show' }).text);
console.log(runDefaultsCommand({ cwd: root, rawInput: 'set {\"patch\":{\"source\":{\"authority\":\"primary\"}}}' }).text);
console.log(readFileSync(join(root, 'research-defaults.json'), 'utf8'));
"
```

## 根因（已证）

1. `parseDefaults` 把未知键归为 **warnings**（而不是 problems），值里只保留已知字段；
2. `runDefaultsCommand` 的 `show` 只打印 `summaryOf(value)`，**warnings 不进返回文本**（code-like 词表里
   没有 warn 通道）；
3. `set`/`unset` 的 `readCurrent` 只看 `problems`，warnings 不阻断也不提示，`serializeDefaults(value)`
   按已知字段重建 → 未知键被丢弃；
4. 客户端 `store.refresh()` 虽把 warnings 解析进快照，但面板没有渲染/提示位（死数据）。

## 影响面

- **静默配置错误**：拼错的关键字看起来「已设置」，实际未生效（深度/读者/来源等任一轴）；
- **静默数据丢失**：下一次任意写入会把未知键永久删除，用户失去排查线索；
- 与「缺席 = 自动」的设计相冲突：用户以为约束了系统，实际系统按自动处理；
- 面板（D50 的 UI）与命令（`/research-defaults show`）两条路都无提示。

## 修复判据

1. **命令面**：`show`/`set`/`unset` 的返回文本带上 warnings（如 `warn=output.audiance:unknown,efort:unknown`），
   面板按 code 映射本地化文案；或改为 problems（fail-loud 拒绝写入）——二选一，需保持「未知键不静默」；
2. **客户端面**：`DefaultsPanel` 渲染 warnings（至少一行「忽略的字段：…」），与 problems 分色；
3. **写路径**：未知键要么保留（不破坏用户手写内容），要么在返回文本中明确「已移除未知键 X/Y」；
   不允许既删又不说；
4. 先红后绿：上表用例——修复前 show 无 warn、文件键被删（红）；修复后 show 含 warn（或 set 拒绝），
   未知键的处置有显式说明；真实 JSON 无未知键时行为不变；
5. `pnpm test` + `pnpm verify` 绿；client-load 的 D50 面板断言补一条 warnings 可见。

## 修复关联

D50（项目研究默认）实现内；与 [BUG-123](BUG-123-default-marker-in-provenance.md)
类「未知/畸形输入必须有出口」的纪律一致。发现方式 = D50 命令面实测（解析 warnings 的消费链追踪）。

## 已落地（2026-11-13）

- 证据 = `tests/pack/defaults-command.test.mjs` BUG-131。
- 全量 `pnpm test` 1341 绿、`pnpm verify` 全绿；run-accept-smoke 复跑。
- 去向 = none。
