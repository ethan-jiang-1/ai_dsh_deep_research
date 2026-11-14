---
status: 等人拍板
severity: P2
opened: 2026-11-14
---
# BUG-189：fix-evidence 的「改动」接受目录路径——任意同目录 staged 文件即可满足配对

> 严重级别：P2 ｜ 发现：2026-11-14 ｜ 状态：等人拍板 — 修复触及修复卡实证/暂存配对，需用户放行
>
> 位置：[scripts/lib/fix-evidence.mjs](../../scripts/lib/fix-evidence.mjs) 的 `fixChangePathsOf` 与
> [scripts/lib/staged-change-pairing.mjs](../../scripts/lib/staged-change-pairing.mjs) 的 `hit` 目录分支。

## 症状

`改动` 里任何反引号串都算路径，`staged-change-pairing` 对以 `/` 结尾的路径做「任意 staged 文件
前缀匹配」：

```sh
node --import tsx/esm -e '
import { fixEvidenceProblems } from "./scripts/lib/fix-evidence.mjs";
const t = "## 修复落地\n\n- 改动：`scripts/lib/`\n- 红证：`node --test tests/checks/foo.test.mjs` FAIL\n- 绿证：`pnpm test` PASS\n";
console.log(JSON.stringify(fixEvidenceProblems(t))); // []
'
```

`改动：`scripts/lib/`` 会匹配 staged 集里任意 `scripts/lib/*.mjs`；一张卡只要在同一变更里
附带一个无关的 scripts/lib 文件（或修改一个已有文件），就能通过「同暂存集」配对，即使修复的
真正位置不在那里。`tests/`、`scripts/smoke/` 同理。

## 根因（已证）

- `fixChangePathsOf` 不检查路径形态（文件 vs 目录），任何 inline code 都收；
- `staged-change-pairing` 的 `hit` 显式支持 `path.endsWith('/')` 的前缀匹配；
- `fixEvidenceProblems` 只要求「至少一个路径」，不要求路径与被测面/卡内声明一致。

## 影响面

- 2026-11-14 假修防线可被「目录 + 任意同目录变更 + 文本红绿证」绕过；staged 集有噪声时用目录
  最容易命中。
- 与 BUG-186（文本 marker 可被否定/exit 冒充）叠加：两道文本门都绿，实际修复可能没落。

## 牵出的失败类

- **C7 假绿**（配对判据宽于「改动」语义）+ **C11 合同漂移**（目录路径不是文件）。
- 同机制第 **2** 次（186 文本 → 本条路径）。类修：`改动` 只收**文件**路径（或以 `改动文件:` +
  `改动目录:` 分列）；目录必须列出具体文件；配对按文件精确相等（或明确的 glob 白名单）。

## 修复判据

- `fixChangePathsOf` 拒绝以 `/` 结尾的目录路径（或要求 `改动文件：` 标签才收）；
- `staged-change-pairing` 不再做目录前缀匹配；`改动文件` 里的路径必须与 staged 路径精确相等；
- 反证：`改动：`scripts/lib/`` 的卡 → 红；改成 `改动：`scripts/lib/foo.mjs`` 且该文件在 staged 集 → 绿；
  `tests/checks/fix-evidence.test.mjs` / `staged-change-pairing.test.mjs` 增目录负例。

## 修复关联

未修。触面 = 修复卡实证/暂存配对，按 [_backlog/AGENTS](../AGENTS.md) 转 `等人拍板`。
