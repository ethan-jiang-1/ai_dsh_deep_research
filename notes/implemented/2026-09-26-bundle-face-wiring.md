# 研究状态页签渐进面接通（根因链与修复）

> 状态：implemented

## 决定

渐进面（步骤条/证据计数/交付状态/研究问题行）的数据面 = **会话工作区根的 `workspaceFiles` 读取**
（`list('.')` → 最新 `drt_*` → 文件在场性 → `run-fold.deriveSteps`）。诊断结论：该面此前"空"
不是 API 不可用，而是**四个前提同时缺失**——逐条修复后全通。

## 根因链（实测，按发现顺序）

| # | 现象 | 真因 | 修复 |
|---|---|---|---|
| 1 | 页签渐进面永远空 | `listDir(sessionId, '')` 空路径 → `gateway/bad-request`（vendor `inspect` 契约：`path.length > 0`） | 改用 `'.'`（工作区根本身） |
| 2 | 即使路径对也读不到 bundle | 会话的**工作区根**才是可读范围（`confine` 拒工作区外路径）；首场 run 的会话 cwd = `dev/harness-home`，bundle 在 `research-workspace/` → 在工作区外 | 会话必须建在 research-workspace 里 |
| 3 | 想建在 research-workspace 却建不了 | 该目录**从未注册为工作区**（`$DSH_HOME/storages/workspace.json` 只有 harness-home / rehearsal-workspace）→ 侧栏选不到；用 `cwd` 形态建的会话不进侧栏 | `workspace/create` 注册（幂等）；会话用 `workspaceId` 形态建 |
| 4 | 修好代码后页签仍旧 | web 以 `--profile research` 起，加载的是 **profile 镜像**里的 `lib/client.js`，不是工作副本 | 同步镜像（boot-run 的漂移检测会咬；直接起 web 时须手工同步） |

**附带发现（重要）**：首场 run 的会话 cwd = harness-home，而研究手册在 `research-workspace/AGENTS.md`
——`agent-instructions` 从 cwd 向上发现（本仓 preset 的 `projectRootMarkers: []`），故**该 run 一份
手册都没注入**（system 消息无手册特征串，实证）。这解释了 evidence-audit 基线审计揭出的
"31 份证据全无 frontmatter"：跨角色契约（证据文件格式）根本没进上下文，run 靠 persona + 角色
skill 跑完。修好工作区注册后，新会话实测 `手册注入? true`。

## 关键契约（写进代码注释与 smoke）

- `session/create` 的 `workspaceId` 与 `cwd` **互斥**（同传 → `bad-request`）；`workspaceId`
  形态才会把会话**关联进工作区**（侧栏可见 + 服务端 reconciliation 认它）；
- 侧栏**只列有回合历史的会话**（无回合的新会话不出现——`session/rename` 也不产生回合）；
- 侧栏**只展开当前会话所在的组**（找别组的会话行前须点组头展开）；
- `workspaceFiles.list` 的 `path` 非空、且解析后必须在工作区内。

## 实施记录

- 组件：`ResearchStatusTab.tsx` 的 bundle 扫描改用 `'.'`；`listDir`/`readFile` 的错误显式
  打 console（区分"数据面不可达"与"目录为空"——静默吞错曾让诊断绕远路）；
- `dev/run-kickoff.mjs`：默认路径改为 **workspaceId 形态**（先 `workspace/create` 拿 id 再建
  会话）；`--cwd` 保留兼容并在 stderr 提示副作用（不进侧栏 / 手册可能不注入）；
- `scripts/client-load-smoke.mjs`：从"观察点"升级为**硬断言**——冒烟自己造前提
  （注册工作区 → workspaceId 建会话 → 展开组 → 点会话 → 断言步骤条七步 / 证据计数 / ✅ 已交付
  / 问题行），并保留活动流断言（既有会话路径）。13 断言 ALL PASS；
- 首场 run 的 bundle 成为断言真值来源（步骤条"交付"current、证据 31 份）。

## 输掉的方案

- **让页签读工作区外路径**：不可行——`confine` 是安全边界（工作区外一律拒），不该绕过；
- **把 bundle 挪进会话工作区**（复制一份到 harness-home）：否决——run bundle 是交付记录，
  不能为看板方便而复制/移动；
- **冒烟里用 `session/prompt` 造有回合的会话**：否决——冒烟必须 keyless（真模型调用属另一档）；
  改用"选组内第一个有历史的会话"（渐进面只依赖工作区根，与会话身份无关）。
