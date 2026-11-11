---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-051：回放冒烟的 C3/C5 引用被删掉的 `paneRows`——渲染金标准断言永远抛 ReferenceError

> 严重级别：P2 ｜ 发现：2026-11-11 ｜ 状态：已修 — 已恢复 1f15379 删除的 `collectPaneRows` + `paneRows` 采集 + 稳定窗（保留 `capDiag`）；反证 = HEAD 版本 TS 检查 5×TS2304「Cannot find name 'paneRows'」→ 修复后 0；浏览器复跑（同一命令）C0a/C0/C0b/C1/C2/C3/C4/C5 全 PASS（C5 1 卡 · 2 行，金标准经 `--update-expected` 重写并人工核对新增活动行）；唯一红 = B·persona（D48 后快照待 with-key 重录，本卡范围外）（2026-11-12，去向：none — 机械修复，审查：agent 自审 + 真浏览器证据）

## 症状

`snapshot-replay-smoke`（dev-only 回放档）在 lead 场景走到 C3 时抛 `paneRows is not defined`，
导致：

- `C3 页签活动行提取非空` 从不真正断言；
- `C4` 之后的 `C5 渲染金标准逐字一致`（唯一钉「研究状态」页签活动行的渲染回归）从不执行；
- `--update-expected` 同样在这行崩溃，金标准无法重写；
- 整个 smoke 以 exit 1 收场，失败的 `C2` 与真正的 ReferenceError 混在同一张失败清单里，归因被噪声掩盖。

现场（2026-11-11，`--face research-face`）：

```
FAIL [research-face/lead] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点）
...
snapshot-replay-smoke: 3 FAILURE(S)
[research-face/lead] B·persona
[research-face/lead] C2 「研究状态」页签在场（右栏展开 + guide 胶囊可点）
[research-face/lead] paneRows is not defined
```

## 复现

```sh
source dev/env.sh
node scripts/smoke/snapshot-replay-smoke.mjs --face research-face --scenario lead
```

`scout` / `analyst` / `critic` 三个场景不走 C 层（无 `renderExpected`），所以只有 lead 崩。
`node --check scripts/smoke/snapshot-replay-smoke.mjs` 是过的——这是**运行时** ReferenceError，静态检查抓不到。

## 根因（已证）

提交 `1f15379`（2026-11-11 17:30，D47 worker profiles）在改 C2 诊断时**整块删除了活动行提取**：

- 删掉了 `const collectPaneRows = () => page.evaluate(...)`（DOM 行走提取 `🔍/👥/💬/📦` 行）；
- 删掉了 `let paneRows = []` 以及 `capOk` 时的点击胶囊 + 稳定窗采样循环；
- **保留了四处 `paneRows` 引用**：C3 判据（`scripts/smoke/snapshot-replay-smoke.mjs` 第 403 行附近）、
  C5 投影拼接、`--update-expected` 分支、C5 逐字比对。

证据：`git show 1f15379^:scripts/smoke/snapshot-replay-smoke.mjs | grep -n paneRows` 有声明与采集块；
`git show HEAD:scripts/smoke/snapshot-replay-smoke.mjs | grep -n paneRows` 只有四处使用、零声明
（`grep -n "const paneRows\|let paneRows"` 在 HEAD 无命中）。

## 牵出的失败类

**被删的守卫不报「守卫没了」**：删声明 + 留引用 = 运行时才炸，静态检查与 CI（本 smoke 是 dev-only）
都不拦；而它炸出来的形态是「冒烟红了」，看起来像产品回归，实际是测试资产自伤。横切检查方向：
`node --check` 之外的未声明标识符（可用 `eslint no-undef` 或一次 `node --experimental-strip-types` 运行），
优先扫 dev-only 档（不进 CI 的脚本最容易烂）。

**同场另一条红（B·persona）与本卡无关**：lead 的 model-visible 文本在快照录制后有改动（D48 于 22:15
落地），回放 B 层按设计判红——归快照重录，不归本卡。

## 修复判据

1. 恢复活动行提取（可从 `1f15379^` 的同名块还原：`collectPaneRows` + `let paneRows` + 点击胶囊 +
   连续两次采样一致的稳定窗），保留新的 `capDiag` 诊断；
2. lead 场景 C3 至少 1 行（防空语料）；C5 与金标准逐字一致（或先 `--update-expected` 重写后一致）；
3. `--update-expected` 不再抛 ReferenceError；
4. 先红后绿：还原前跑一次拿到本卡的 ReferenceError，修复后同一命令绿；`C2` 若仍红，其诊断行须能独立
   显示（不得与 ReferenceError 混在一起）；
5. `pnpm verify` 绿（本脚本改动不涉及门禁清单）。

## 修复关联

已落地（2026-11-11）：`scripts/smoke/snapshot-replay-smoke.mjs` 恢复 `collectPaneRows`、`let paneRows = []`、点击 guide 胶囊 + 连续两次采样一致的稳定窗；新增的 `capDiag` 诊断保留，C2 失败时独立显示。证据 = HEAD vs 修复后 TS 检查（`tsc --allowJs --checkJs --noEmit --noResolve`，`paneRows` TS2304 5 → 0）+ `node --check`；未取到的证据 = 浏览器复跑在 A 层（回放回合）停住——本次环境里首个 `web_search` 工具调用无返回，同一命令 240s 超时，故 C3/C5/`--update-expected` 未执行。浏览器复跑于 2026-11-12 完成：C2 在场、C3 2 行、C5 逐字一致；唯一红是 B·persona（D48 后快照待重录，本卡范围外）。**2026-11-12 状态翻转为已修。**

原始处置（留档）：P2 测试资产修理型，按 [缺陷通道](../README.md) 可凭本卡自授权落地（不触及产品行为、门禁与验收合同）。
快照重录（B·persona 的那条红）是另一件事：需要 with-key 重录 + 人审，另按用户预算决定，不在本卡范围。
