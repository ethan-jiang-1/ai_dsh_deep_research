# 低置信区第 7 轮：plan 门/覆盖金标准/缓存身份（批 M：BUG-280…299）

> 状态：implemented
>
> 历史注记：续 [low-confidence-20](2026-11-18-low-confidence-20.md) 的 plan/覆盖/缓存面；
> 前批决定仍现行。

## 决定

1. **plan-gate 按执行图正本从严**（280–285）。plan.md 在场但节点表空/畸形 → 红；`图版本：vN`
   必填，v>1 前版快照必须非空、可解析且版本相符；active 节点 `question/output/acceptance/
   budget/depth` 必填（depth ∈ L0–L3）；`task_id` 重复红；`## Wave 执行` 表头不得含
   engine/channel，Wave 层节点 `task_id=plan-only`；`## 剩余工作` 必须有条目，`- 无` 合法，
   否则每条要 owner+next；plan 模板补上 `## 剩余工作` 节（门与模板同正本）。
2. **critical_exemption 必须有理由格式**（286）：≥20 字且说明“为什么没有 critical/关键结论”，
   不再接受 `x`。
3. **critic: light 有独立语义**（287）：`claimPolicyOf` 分 `full/claims/none`；light 要求
   `review/claims.json` 在场但跳过 verdict-audit；report/none 不要求 claims；跳过 claim 验证
   仍必须有 `approval_basis`（沿用 273）。
4. **review 覆盖表逐格可核**（288）：格内必须写 `N 卡` 或 evidence 引用；写 `N 卡` 时与盘上
   `topic × lens` 的 evidence 数对账；`—` 仍要 gap/n-a 解释。
5. **方法库多候选 + 缺库 N/A**（289）：先找 bundle 父目录、再找 `DEEP_RESEARCH_WORKSPACE`；
   找不到库文件 = N/A（不假红）；找到库但条目/字段缺 = 红；sha 仍从库字段重算。
6. **skill 金标准覆盖 `.agents/skills`**（290/293）：`skillBodyManifest` 同时遍历随包 presets
   与 `.agents/skills`（26 份）；正文变更 → 红，重录工具同一条。
7. **C 渲染是场景级，不是逐角色**（291/294）：`renderExpected` 由 lead case 声明、场景复用；
   逐角色 C 是重复证据。补 keyless 契约测试与 README 边界，不伪造每角色金标准。
8. **role picker 纳入 Method Editor**（292/295）：抽 `rolePickerIssues` 纯判据（四研究角色连续 +
   Method Editor），client-load 与 keyless 测试共用；逐角色渲染归 snapshot C。
9. **probe 缓存键 = pack 内容 + runtime + dev 外壳 + 驱动闭包 + profile/bootstrap/workspace**
   （296–299）；`packFingerprint` 改用文件 sha256（内容哈希），同 size/mtime 的内容替换也失效。

## 输掉的方案

- **plan.md 在场但空表当 N/A**：执行图正本是“在场即声明”，0 节点不能算通过；畸形表更不能。
- **逐角色 C 金标准**：渲染面与角色无绑定，逐角色复制只会得到重复证据与假红（见 snapshots/README）。
- **method-library 缺文件就红**：自定义工作区/归档布局下这是假红；改为多候选 + N/A。
- **critical_exemption 任意字符串**：等于给零 critical 开后门；要求理由格式。
- **pack 指纹继续 size/mtime**：touch 回填/检出保留时间会假命中；内容哈希只多一次读。
- **client-load 逐角色渲染断言**：与 C 重复，且浏览器成本高；role picker + C 分工。

## 实际跑过的验证

- `pnpm verify` / `pnpm test` 全绿；`pack.e2e` 86 条目；skill 金标准 26 份（随包 + `.agents`）。
- 红证回放：plan 门 280–285 各自红；286 critical_exemption 格式红；287 claim 政策红；
  288 卡数不符红；289 缺库 N/A 红；290/293 `.agents` 哈希红；291/294 场景级 C 契约红；
  292/295 角色选择器红；296–299 身份/内容哈希红；各自还原 → 绿。
- `run-driver` 缓存键加入 profile/bootstrap/workspace；`channel-cache` 用 sha256 内容指纹。
- client-load 角色选择器断言加入 Method Editor（真浏览器档，本轮未跑）。

## 残余风险

- **291/294 是设计收口**：C 仍是场景级；若要逐角色 C，需要真实录制每角色的渲染面，属另一次
  录制/资产工作，不在本批伪补。
- **client-load 未在本机真跑**：只改了断言与纯判据；下一次 nightly/手动 entry 才能证明浏览器面。
- **review 卡数对账只按 evidence 文件计数**：同一卡多 topic/lens 时按格计；卡内质量（A/B 数）
  仍未逐格核。
- **plan 旧场**：无 `图版本`/`## 剩余工作` 的旧 plan 会红；旧归档不重审，新 plan 按新模板。
- **method-library**：`DEEP_RESEARCH_WORKSPACE` 未设且 bundle 在非工作区布局时按 N/A；声明了
  library 但文件不在候选路径不会红（只核找到的库）。
- **长度/缓存**：pack 内容哈希增加一次全量读；probe 键含 workspace 绝对路径，跨机不复用（预期）。
- nightly / L1 / L4 未触发；无真实模型调用。
