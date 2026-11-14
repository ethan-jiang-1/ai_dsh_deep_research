# 测试制度的 oracle 独立化：S1 沉淀、S2 换 oracle、S3 双账

> 状态：implemented
> 关联：[D55](../../docs/decisions.md#d55)；程序卡 = [issue](../../_backlog/_archived/settled_issues/2026-11-14-verification-oracle.md)；
> 证据 = [research](../../_backlog/_archived/research/verification-oracle/README.md)

## 决定

- **oracle 类型必须显式**：验证层判据的 oracle ∈ `structured | external | canonical |
  self-referential`；`self-referential` 只能是临时态并带 trigger，不得冒充「已关闭」。资产/守卫账让
  这个类型可见、可数。
- **S1 逐张沉淀**：普查 D-1 的 24 张旧账全部有永久 keyless 守卫或显式 source 形状 + 重录触发
  （守卫账：closed 29 / partial 2，自指 0，none 0）。
- **S2 换 oracle**：
  - Markdown：`dev/record-markdown-oracle.mjs` 用 cockpit 同源 mdast（真 CommonMark）录 36 例；
    note-scan 与 readiness 两 mask 对录制 oracle 逐行一致（不再只对「两份实现一致」）。
  - CI：`dev/record-ci-oracle.mjs` 用真 YAML（yaml@2）+ 真 bash + 失败 stub node 录 29 例；
    `executedSmokeFiles` 对录制执行集逐例一致。
  - fix-evidence：`## 修复落地` 改为 `json fix-evidence` 块（changes / red / green / guard），
    `exit` 是 oracle；删除否定词/引号/目录前缀启发式；重复键 fail-closed。
  - note：状态行规范形（全角冒号、裸值、无装饰）进 `note-format` 写入侧门禁；archived 冻结件
    grandfather。
- **S3 双账 + 关卡门**：`guard-ledger`（31 项，oracleType/status/redRecipe）+ `asset-ledger`
  （208 个 spec/check，生成物重算对账）；新卡缺 `guard`（守卫路径或 notMechanizable+trigger）→ 红，
  守卫路径不在场 → 红。
- **S4 停止条件**：换 oracle 后复扫声明面，0 新邻接变体；发现 5 个全部先红后绿（子 shell、列表 fence、
  跨行注释、绝对路径、重复键）。

## 判据形状

- **权威事实**：录制夹具（Markdown 36 / CI 29）、结构化 fix-evidence 字段、guard/asset ledger、
  note 规范形；散文只作人读副本。
- **读取方**：`markdown-mask-conformance`、`ci-workflow-oracle`、`fix-evidence` /
  `staged-change-pairing`、`guard-ledger`、`asset-ledger`、`note-format`。
- **坏输入**：缺/歧义 → 红；重复键 → 红；自指守卫只能 provisional + trigger；旧卡/旧 note
  grandfather；缺 guard/路径不在场 → 红。
- **旧形态**：CI/Markdown 的手写 SYNTHETIC 夹具保留为补充，不再作唯一 oracle；旧卡 grandfather。
- **反证**：每面一条红配方——子 shell、列表 fence、跨行注释、绝对路径、重复键、缺 guard、
  非规范状态行；红配方都写进对应测试头注。

## 为什么

D54 之后探索仍高产：31 张新卡里 22 张落在验证层自身；31 张里 24 张的邻接变体不红；根因是
**oracle 自指**——同一个 agent 写规则、写解析器、写测试，三者共享同一个心智模型。D54 的
「未证明」清单（消费者全矩阵、变异证明、hook/DOM、全 lane）就是本卡的验收来源。换 oracle 后，
5 个真实分歧被真值抓出，证明「再补例子/矩阵」补不到这些面。

## 输掉的方案

- **再加矩阵**：矩阵维度仍由同一心智模型选；自指 oracle 不变。
- **引运行时解析器依赖**：录制式夹具已够（dev 端录一次，测试只读 JSON）。
- **逐 bug 补例子**：实例修；41 张旧账已证明会复发。
- **194 个 uniqueClaim 手写**：生成账 + 显式覆盖代替；质量由重算对账与审计守。
- **强制所有 Note 加判据形状**：只对判据类；机械改动不写。

## 实际跑过的验证

- Markdown oracle 36/36（note-scan + readiness）；CI oracle 29/29；fix-evidence 10/10；
  guard-ledger 4/4；asset-ledger 3/3。
- S1 守卫：027/045/024/028/095/136 等；note-format 规范形 + `gates.e2e` 红案。
- `pnpm verify` 全绿；`pnpm test` 全绿；`pnpm typecheck` 绿。
- e2e 基线：**PASS 6 / FAIL 0 / SKIP 0**（149.3s，`runtime/smoke-workspace/e2e-baseline2.out`）。
- entry 基线：lifecycle **PASS**；client-load **PASS**（190.9s，`client-load-baseline.out`）；
  snapshot-replay **5 场景 A/B/C ALL PASS**（`snapshot-face2.out`）：5 个角色按当前 pack 重录
  （B 层 runtime-context 漂移修复），C 金标准以 `--update-expected --why <issue>` 重写，人审事项。
- 未证明：194 个 self-referential 资产的组合迁移（asset-ledger 已显式）；013/080 的 persona/同代性
  （source 形状 keyless、内容靠重录触发）；L4-lite 真模型档未跑（e2e 车道不含它）。

## 环境状态

旧卡/旧 note grandfather；录制器 dev-only（mdast/yaml 是传递依赖；测试不 import）；新卡 guard 必填。
`asset-ledger` 的 194 自指不是失败，是下一轮迁移面；先按失败类复发优先迁移，不再逐 bug 补例子。
