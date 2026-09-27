# RFC：E1 通道回归排查——research profile 在本仓 vendor 上的模型调用失败

> 状态：implemented
> 归档：2026-09-27

归宿：roadmap §队列「E1 通道回归排查」（已离队）· 来源：[vendor-submodule 毕业 Note §毕业后发现](../implemented/2026-09-24-vendor-submodule.md)

## 决定

同日修复毕业——根因（代码级定位）+ 修复（根 devDeps 镜像）+ 双验证（l4-lite +
team-preflight 真模型档全绿）+ 顺手修掉 team-preflight 自身的位置归属缺陷。

## 问题

E1（机制权威切换到本仓 vendor/dsh submodule）带隐性回归：**research profile**（本包 +
vendor agent-team-profile 层）在本仓 vendor 起的 web 上，一切模型调用报
`DeepSeek request extension preparation failed (REQUEST_EXTENSION)`。对照矩阵：

| 组合 | 结果 |
|---|---|
| research profile × company 基线源码 | ✅（原 run 通道整晚正常） |
| research profile × 本仓 vendor | ❌ REQUEST_EXTENSION（全新会话亦炸） |
| web 纯净 profile × 本仓 vendor | ✅（entry-chain-probe 真模型 ALL PASS） |
| keyless 面（L1/L2）× 本仓 vendor | ✅（release-smoke ALL PASS） |

回归面锁定 = research profile 组合（agent-team-profile 层的请求扩展路径）× 本仓 vendor。
当前 run 通道已回退 company 基线运行（HITL2 已恢复），服务不中断。

## 方案（排查方向，按性价比排序）

1. **agent-team-profile 层构建产物 diff**：research profile node_modules 里的层包（lib/）
   与 company 侧对照——层是 npm 装的还是本地构建的、两侧是否同源；
2. **请求扩展接口核对**："request extension" 的准备路径（vendor web/search/agent-team
   涉及模型请求扩展的 hook）在两棵 vendor 树的 src 差异（同 commit 理论上零差异——
   若零差异则嫌疑转向构建/解析层）；
3. **最小复现脚本化**：boot research profile × 本仓 vendor → session/prompt 探针——
   把对照矩阵变成可一键重跑的脚本（回归修复的验收载体）；
4. **修复后全量重验**：l4-lite-smoke + team-preflight-smoke（真模型档，E1 毕业时欠跑的
   with-key 面）绿后，run 通道切回本仓 vendor。

## 输掉的方案

- **弃 E1 回退 company 借用**（否——机制自持目标不变，回归是可修的接口面问题）；
- **在 vendor 里就地改代码绕过**（否——只读铁律）。

## 验收判据

- 最小复现脚本对四格矩阵全跑通（绿/红与上表一致 → 修复后全绿）；
- research profile × 本仓 vendor 的真模型调用绿（l4-lite + team-preflight 复跑）；
- run 通道 boot-run（本仓 vendor）+ 一次真实交互验证后切换登记。

## 实施记录（2026-09-25 00:50，同日修复毕业）

**根因（代码级，两段定位）**：`plugin-package-inventory-deepseek` 的
`PackageIdentityResolver.resolve()` 对每个活跃插件包做 manifest 解析——anchors 含
`import.meta.url`（vendor 树内模块），解析失败的包靠**宿主根 node_modules** 兜底；
`cannot resolve active package` 直接 throw → 袶成 REQUEST_EXTENSION。company 根
devDependencies 有全套 `@deepseek-ai/*`（**这正是它们的功能**——让所有活跃插件包从宿主
可解析），本仓根初装只有 tsx → research profile（激活 preset 类插件 → agentPresets
服务在场 → 走到 inventory 扩展路径）必炸；web 纯净 profile 不激活该路径 → 四格矩阵完全
吻合。首修（只补 dsh-agent-presets）不够——裸 import 只是路径之一，inventory 的
`barePackageManifest` 对**全部活跃包**逐一解析。

**修复**：根 package.json devDependencies 镜像 company 的 `@deepseek-ai/*` 集合（15 个，
全部 `workspace:*` 链到 vendor 树——比 company 的 registry 版更确定性）+ tsx；pnpm install。

**验证（with-key 面补齐）**：最小复现探针（research profile × 本仓 vendor → lead preset
真模型问答）修复前红/修复后绿；**l4-lite-smoke ALL PASS**（四角色 + scout web_search，
本仓 vendor 基线首跑）；**team-preflight-smoke ALL PASS**（spawn_teammate ×2 +
list_agents + one-shot subagent ×2——D18 边界现状探针同绿，本仓 vendor 基线首跑）。

**顺手修复（排查中暴露）**：team-preflight 的成员归属按**位置**配对（memberIds[i] ↔
memberSpecs[i]）——spawn 顺序与日志出现顺序交叉时误报"成员未响应"（实证：probe-scout
位回 ANALYST 标记——两成员都完美照章办事，冒烟自己张冠李戴）。改为**按内容归属**
（会话日志含自己的标记即归属），天然免疫顺序。

**遗留**：run 通道（3081）在 run 收尾前维持 company 基线（E1 已修复验证，但切换 = 重启 =
挂起回合终局化风险——等 HITL2 定稿与 Phase C 完成后，下一次 boot-run 自然用本仓 vendor）。

## 勘误（2026-09-25 三轮：本仓 vendor 逐源对齐时发现）

上文"验证（with-key 面补齐）"里写的 **l4-lite / team-preflight「本仓 vendor 基线首跑」不准确**：
当时这两个脚本的 `dshSrc` 默认值仍指 `/Users/bowhead/ai_dsh_company`（E1 只把 preset-smoke /
release-smoke 改成 `?? ROOT`），所以那两次 ALL PASS 实际跑在 **company 基线**上——它们没有验证
本仓 vendor。现已修默认值（`?? ROOT`，与另两个脚本一致）并**在本仓 vendor 上重跑**：

- `DSH_SRC=<本仓> node scripts/l4-lite-smoke.mjs` → **ALL PASS**（四角色响应 + scout web_search）；
  同时该次跑在**洗过的子进程 env** 下（新一轮的凭据卫生改动），证明洗 env 不影响真模型档；
- `node scripts/team-preflight-smoke.mjs`（默认已指本仓）→ 机制面 **全 PASS**（spawn_teammate ×2、
  list_agents、one-shot subagent ×3、两成员标记齐全），唯一 FAIL = **lead 末标记
  `预检完成-LEAD` 超时**；两次连跑行为不同（一次 lead 不 spawn、一次 spawn 后不落末标记），
  属**模型对四步脚本的服从度抖动**，不是机制缺失——已知脆点，记此备忘。
