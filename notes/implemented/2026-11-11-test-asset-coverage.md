# 测试资产覆盖收口：模板 schema 集、解析键、具名非 quick 类型

> 状态：implemented

来源卡：[2026-11-11-test-asset-coverage](../../_backlog/_archived/settled_issues/2026-11-11-test-asset-coverage.md)
研究依据：[presets/content 测试与内容组织](../../_backlog/_archived/research/presets-content-test-coverage/README.md) · 组织约定 = [design/70](../../docs/design/70-content-organization.md)。

## 决定

- **模板 schema 集与盘上集双向对账**：`tests/pack/template-files.mjs` 持有 `CORE_TEMPLATES`（8 md + 2 JSON），
  `templateFiles()` 读盘；`content-injection` 断言两者相等。新增模板必须有意改 schema 集，删除模板会同时
  让 schema 集/消费者断言红——不再有“只查存在、不查新增”的单向清单。
- **模板契约只钉解析器/门禁消费键**：`tests/pack/template-contract.test.mjs` 钉 question 的
  `研究类型`/`Decisions`、topics 的 `must_answer`/`scope_role`、leads 的状态/支持来源/关键线索/owner、
  findings 的 `F#`/`gap`。final 六节已由 `presets.test`（报告首屏）与 reader gate（读者版）把守，
  本文件不重复，避免把散文节名抄成第二份真相。
- **具名非 quick 类型用合成 bundle 验条件性**：`tests/run/schema-scan.test.mjs` 在
  `drt-clean-post` 上改写 `question.md` 为 exploratory_map / claim_verification、删 leads/review，
  断言 `runType` 不是 quick_factual 且两条件件缺席仍红；不新增持久 fixture 目录（分支确定、无新
  形状；避免 fixture taxonomy 为对称而膨胀）。
- **`presets.test.mjs` 拆分不做**：已按 323 行 / 19 个 test、按源面分域裁决归档；trigger = 单文件
  >500 行 / 第二个独立合同模型 / 一次改动跨 ≥3 个主题且 review 痛。
- **零 pack 行为变更**：只改测试与测试辅助件；无 persona/内容/门禁/组合改动。

## 输掉的方案

- **只做盘上枚举、不保留 schema 集**：新增模板会静默进入“随包”断言，删除模板可能没有消费者可红；
  两方向不对称。schema 集是 run bundle 的合同，不是文件清单。
- **五个模板都补完整字段/节集**：把模板正文的散文结构抄成第二份契约，改文案要同步两处；只钉机器/
  流程消费键，其余归模型可见审查与 L1/L4。
- **给 exploratory_map / claim_verification 各建持久 fixture 目录**：形状与 `drt-clean-post` 重复，
  唯一差异是类型标记；合成 bundle 已触发真实解析分支，持久目录只会增加 taxonomy 维护面。
- **把模板清单并回 `content-injection` 手写**：两处清单漂移；共享读取器让 `content-coverage` 的
  消费面断言与“随包”断言用同一盘上事实。

## 实际跑过的验证

- `pnpm test`：1127/1127 全绿（新增 template-contract 4 例 + 具名类型条件性 1 例；模板读取缝
  让 `content-injection`/`content-coverage` 共用同一盘上枚举）。
- `pnpm verify`：全绿。
- 红证（逐条先红后绿）：
  - 新增 `content/templates/run/orphan.md` → `content-injection` 红（盘上集 ≠ schema 集）；删除 → 绿。
  - findings.md 删 `- gap:` 行 → `template-contract` 红；还原 → 绿。
  - leads.md 删 `- 状态:` 行 → `template-contract` 红；还原 → 绿。
  - 具名类型测试把注入类型改成 `quick_factual` → 该测试红（`runType` 判 quick、条件件走豁免）；还原 → 绿。
- 未跑：L1/L2/L4 不属本卡判据面（纯 keyless 测试资产，无模型可见或安装面改动）。
