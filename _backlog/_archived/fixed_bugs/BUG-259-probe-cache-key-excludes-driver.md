---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-259：probe 缓存键只含 3 个 dev-shell 文件——run-driver 的探针逻辑变化仍命中旧 GREEN

> 严重级别：P2 ｜ 发现：2026-11-18 ｜ 状态：已修（2026-11-18）— 结论：probe 缓存键 = run-driver 本地 import 闭包；驱动/缓存实现变即 miss；去向：implemented — [批 Note](../../../notes/implemented/2026-11-18-model-visible-semantics.md)；审查：agent — 红证回放 + 全量 verify/test + pack.e2e
>
> 位置：[tools/channel/run-driver.mjs](../../../tools/channel/run-driver.mjs) 第 54–78 行
> （`PROBE_CACHE` / `DEV_SHELL_FILES`）；键实现 = [checks/lib/channel/channel-cache.mjs](../../../checks/lib/channel/channel-cache.mjs)。
> 探索轮 = [模型可见语义卡](../settled_issues/2026-11-18-model-visible-semantics.md)。

## 症状

`run-driver` 的 probe 缓存（30 分钟 GREEN）键 = pack 指纹 + runtime 构建 + `DEV_SHELL_FILES`：

```js
const DEV_SHELL_FILES = [
  'tools/record/research.overlay.yml',
  'tools/channel/boot-run.sh',
  'tools/record/render-overlay.mjs',
];
```

**`tools/channel/run-driver.mjs` 本身、`checks/lib/channel/channel-cache.mjs`、探针断言/归一化实现都不在键里**。
改了探针逻辑（例如新增断言、改 face 判定、改 cache 判据）后，同一 pack/runtime 仍命中旧 GREEN，
最多 30 分钟内展示“探针通过”的旧证据；`--force-probe` 才能强制重验。这正是「缓存键窄于证据生成器」
的假绿。

## 分诊与授权

- 严重级：P2 — 运行态证据新鲜度；不阻断运行，但把旧探针结论冒充当前逻辑。
- 表面 / 边界：run 通道 probe 缓存 / ② 行为（缓存键）
- DSH 不变量：verify the world；缓存键必须覆盖被验证逻辑本身
- 触及面：none（缓存/测试）
- 授权：自授权（P2 修理型）
- 批：模型可见语义（第 4 轮）

## 复现

复现状态：稳定（读码/可控）。

```sh
grep -n 'DEV_SHELL_FILES' -A 5 tools/channel/run-driver.mjs
# 改 run-driver 内任一 probe 断言（不改 3 个 shell 文件）→ 再 up 仍命中同一 probe-cache 条目
# 观察：payload.reason 出现“缓存命中（同一 pack 源 + runtime 构建 + dev 外壳）”
```

## 根因（已证）

`devShellFingerprint` 手抄 3 个“外壳”文件；`run-driver` 自己（探针驱动）与 `channel-cache`（键实现）
被视为“不随页面变化”，但实际它们决定**断言**，不是页面内容。上一轮 237/242/243 修 profile 守卫时
就改了 run-driver；若有旧 GREEN 缓存，仍会复用。

## 牵出的失败类

- 运行态 C9（缓存键窄）/ C7（旧证据冒充）；与 237 的镜像新鲜度同族。
- 类级方向 = 缓存键 = pack + runtime + **所有断言/驱动源文件**（可用一个 `probeSourceFingerprint`
  从 `run-driver` 的 import 闭包或显式清单派生）。

## 修法

1. `DEV_SHELL_FILES` 加 `tools/channel/run-driver.mjs`、`checks/lib/channel/channel-cache.mjs`、
   以及探针断言所在的 `checks/lib`/`tools/record` 文件（显式清单或 import 闭包）；
2. 或缓存条目写 `driverHash`（run-driver 文件哈希）+ `cacheImplHash`，不匹配即 miss；
3. 测试：改 run-driver 注释/断言 → key 变；同内容 → key 不变；
4. 文档：缓存 reason 列出 driver hash。

## 修复判据

- 改 run-driver/探针实现 → probe-cache miss（强制重验）；同 pack/runtime/驱动 → hit；
- `--force-probe` 仍可用；`pnpm test` 绿。

## 修复落地（2026-11-18）

```json fix-evidence
{
  "changes": [
    "checks/lib/channel/channel-cache.mjs",
    "tools/channel/run-driver.mjs",
    "tests/run/channel/channel-cache.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/run/channel/channel-cache.spec.mjs",
    "exit": 1,
    "output": "not ok 1 - tests/run/channel/channel-cache.spec.mjs（关闭 import 闭包递归后用例红）"
  },
  "green": {
    "command": "node --test tests/run/channel/channel-cache.spec.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/run/channel/channel-cache.spec.mjs"
  }
}
```
