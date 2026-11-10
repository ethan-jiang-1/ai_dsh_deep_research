---
status: 已结
opened: 2026-11-11
---

# 推敲：内容组织的 T0 缝——manual 渐进披露与 generic 下放

> 立卡：2026-11-11 ｜ 状态：已结 ｜ 类型：Task ｜ 结论倾向：现在做 ｜ 可关闭：是
> 去向：implemented — [Note](../../../notes/implemented/2026-11-11-content-organization-t0.md)（T0/generic 缝、首刀证据与后续 trigger）。
>
> **研究依据**：[presets/content 测试与内容组织题名页](../research/presets-content-test-coverage/README.md) → [参照仓阅读](../research/presets-content-test-coverage/2026-11-11-reference-reading.md) + [本仓实验](../research/presets-content-test-coverage/2026-11-11-our-experiment.md)
> **组织约定**：[design/70 内容组织](../../../docs/design/70-content-organization.md)（四槽三层、按寿命分家、T0/generic 缝、生长协议与 trigger）
> **开工边界**：本卡只做 manual 的**增量 T0 下放**与配套守卫；不改角色 persona、不改研究协议语义、不重排 presets/content 顶层目录。

**问题与期望结果：** `content/manual.md` 现在 **12,038 / 12,288 字符**（约 98%），下一次新增跨角色规则就会撞 `content-shape` 预算。manual 是每个角色每轮都注入的常驻面，但里面混了“不加载 skill 也必须知道”的不变量和“可以按需读”的细则；结果既是预算债，也是注意力债。期望：按 [design/70 §5/§8](../../../docs/design/70-content-organization.md) 的 T0 缝，把细则增量下放到 `content/generic/`，T0 只留不变量 + 指针；每刀独立可回退、带模型可见证据；T0 余量恢复到能继续长。

**当前情况：**

- [design/70](../../../docs/design/70-content-organization.md) 已定约定：manual = T0；`content/generic/` = 跨角色按需细则；撞顶处置 = 下放 > 压缩 > 升顶；新内容五步 + trigger 已写清。
- manual 字符数最大的三节：目录约定 3,734；状态头/读序/恢复 2,484；证据文件契约 1,595。其余各节 ≤771。
- 还没有 `content/generic/` 目录，也没有“T0 指针可解析 / generic 无孤儿”的守卫；`content-shape` 只查 manual 预算、模板在场与 workspace 种子。
- 现有接线守卫：`tests/pack/presets-wiring.test.mjs`（6 例）、`tests/pack/content-coverage.test.mjs`（5 例）；`content-injection` 仍手写 10 件模板清单。
- `presets.test.mjs` 拆分已裁决**不拆**（[已结卡](2026-11-11-presets-content-test-coverage.md)；trigger = 单文件 >500 行 / 第二个独立合同模型）。
- 本卡不改任何内容；下面只是推荐的首刀与验收。

**未决问题：**

1. **首刀选哪节**：状态头/读序/恢复（主要消费者是 lead，有 `nodes-contract` 可承接）／证据文件契约（analyst+critic+scout 共用）／目录约定（所有角色都要写对路径）。推荐**状态/读序/恢复**：消费者最窄，先把缝走通；证据契约与目录树随后各一刀。
2. **T0 目标**：首刀后 ≤10,000 字符（余量 ≥1,000）即可，还是直接压到 6–8KB？推荐先 ≤10,000，量一轮再决定下一刀；不一次追求终态。
3. **证据窗口**：L1 真挂载是 keyless；snapshot B 重录 / L4-lite 需要真模型凭据。谁在哪个窗口跑、失败怎么回退，需要开工前定。
4. **`content-disclosure` 守卫的粒度**：只查“T0 指针存在 + generic 无孤儿 + 指针可解析”，还是也查“T0 不再包含被下放小节的标题/长段”？推荐前者 + 一条“下放小节标题不在 T0 正文重复”的窄断言，后者只查标题，不抄内容。

**下一步：** 用户确认首刀与证据窗口 → 建 `content/generic/<首刀>.md` + T0 指针 → 加 `content-disclosure` 测试（先红）→ 跑 `pnpm test`/`pnpm verify` + L1 preset-smoke + snapshot/L4 → 量 T0 余量、记读数 → 写 Note 并归档；若首刀行为证据不过，回退该刀并回 `推敲中`，不硬推。

## 已知与未决

### 已知（证据锚点）

- **预算**：[`content-shape` 门禁](../../../scripts/verify/gates/e-workspace.mjs) 的 `MANUAL_MAX_CHARS = 12_288`；manual 当前 12,038；准入规则写在该门禁注释（“不加载任何 skill 也必须知道的不变量与索引；程序住 skill、结构住 template；撞顶 = 下放 > 压缩 > 升顶”）。
- **注入面**：[`src/content/index.ts`](../../../packages/deep-research-pack/src/content/index.ts) 只把 `manual.md` 作为 `research:manual` context 注入；`{{research_pack_root}}` 变量已注册，generic 指针可直接用；研究角色都有 `tool-fs`，可按需 `read`。
- **现测**：`content-injection`（manual/模板/注入行）、`content-coverage`（类型闭集、P1–P8×lens、模板消费面）、`presets-wiring`（skill 根/孤儿/加载器）、`content-shape`（预算/模板/种子）。
- **历史**：2026-10-05 判“全量覆盖账不做”；2026-10-20 分域按被测面；本卡不推翻；T0 缝是内容寿命问题，不是测试组织问题。
- **验证现状**：`pnpm test` 1122/1122；`pnpm verify` 全绿。

### 未决（实施期才回答）

- 首刀小节移动到 generic 后，T0 摘要要保留哪几句才能让 lead 不读 generic 也知道“何时去读”；
- snapshot B 的期望更新方式（重录 vs 只更新注入文本的 expected；后者不能当行为证据）；
- 是否顺带把 `content-injection` 的 10 件手写模板清单改成盘上枚举（推荐同批做，避免第二份清单）；
- `content-disclosure` 测试放 `tests/pack/` 还是并入 `content-coverage`（推荐独立文件，主语是“披露缝”不是“接线”）。

## 方案与取舍

### 方案 A（推荐）：增量 T0 下放，一刀一节

1. 首刀 = 状态头/读序/恢复：抽到 `content/generic/state-and-recovery.md`；T0 留“run.md 五键 + 读序一句话 + 指针”；`nodes-contract` 补一句“恢复/读序细则读 generic”。
2. 加 `tests/pack/content-disclosure.test.mjs`：T0 超预算红；generic 文件无 T0 指针红；指针目标不存在红；T0 正文重复被下放小节标题红。
3. 跑 `pnpm test` / `pnpm verify` / L1 preset-smoke；snapshot B 重录 / L4-lite（用户确认窗口）。
4. 量 T0 余量；写 Note；归档。下一刀（证据契约）按同一形状，不预建 empty 层。

### 方案 B：一次性把三节都下放

- 模型可见 diff 太大，snapshot/行为归因困难；首刀失败时不知道是哪节导致；否决。

### 方案 C：只压缩/改写 manual，不建 generic

- 能缓一轮，但下一次仍撞顶；没有“按需读”的缝，细则继续挤在常驻面；否决——除非首刀证据证明模型不读 generic。

### 输掉的方案

| 方案 | 否决理由 |
|---|---|
| 把 generic 做成 manifest/索引文件 | 清单会腐；T0 指针 + 盘上枚举足够 |
| 把细则塞进某个角色的 skill | 证据契约/目录树是跨角色的，只有该角色看得到 = 其他角色失守 |
| 直接抬 `MANUAL_MAX_CHARS` | 预算不是障碍，注意力才是；抬顶只会把债推后 |
| 先改 manual 文案再补测试 | 模型可见变更没有先红守卫，失败无法归因 |

## 范围

| 做 | 不做（本卡外） |
|---|---|
| `content/generic/` 首刀 + T0 指针 | 重排 presets/content 顶层目录 |
| `content-disclosure` keyless 守卫 | 改 persona / 研究协议语义 / 研究类型 |
| `content-shape` / `content-injection` 必要同步 | 新增角色、共享 skill、product-type/company 层 |
| L1 + snapshot/L4 证据与读数 | 全量覆盖台账/百分比 |
| Note + 归档 | `presets.test.mjs` 拆分（已裁决不拆） |

## 验收标准

1. 首刀 generic 文件在场；`manual.md` 用 `{{research_pack_root}}` 指针指向它；被下放的小节标题不再在 T0 正文重复。
2. `manual.md` 字符数较首刀前下降 ≥ 被下放小节的 80%，且 ≤10,000（余量 ≥1,000）；`content-shape` 绿。
3. `content-disclosure` 测试先红后绿：T0 超预算 / generic 无指针 / 指针悬空 / T0 重复小节标题四类注入各红一次；还原后绿。
4. `content-injection` 手写模板清单改为盘上枚举或与新测试共用读取器；`pnpm test` 全绿。
5. L1 `preset-smoke` 真挂载绿；snapshot B 重录 / L4-lite 按用户确认窗口跑绿，或在交付报告里如实写“未跑 + 原因”，不得用 keyless 绿冒充。
6. `design/70 §8` 的读数更新（T0 新字符数、首刀文件、下一刀 trigger）；若首刀边界与 design/70 推荐不同，同 diff 改 design/70。
7. 不改 pack 行为、不新增门禁、不动 presets/content 顶层形状。

## 交付证据

- **已落**：`content/generic/state-and-recovery.md`；`manual.md` 12,038 → 9,995 字符；
  `content-disclosure` 4 例；`handbook-surface` 让手册断言覆盖 T0 + generic；`design/70 §8` 读数更新。
- **验证**：`pnpm test` 1131/1131；`pnpm verify` 全绿；L1 `preset-smoke` ALL PASS；
  L4-lite ALL PASS（全角色响应 + scout `web_search`）。
- **snapshot B**：旧回放 ALL PASS，但回放的是旧录制对，**不捕获**本次 manual 变更；重录窗口未开，
  已在 Note 记为残余风险，不冒充新手册组装证据。
- 红证 4 组（generic 孤儿 / 删 T0 指针 / T0 复制 generic H1 / T0 超 10,000）全部先红后绿。
- **Note**：[2026-11-11-content-organization-t0](../../../notes/implemented/2026-11-11-content-organization-t0.md)

## 关闭条件

- 上述验收 1–5 满足，用户确认首刀行为可接受；
- 同变更写 `notes/implemented/2026-11-11-content-organization-t0.md`（首刀读数、证据、下一刀 trigger），`可关闭：是` 并归档；
- 若 L1/snapshot 证据不过或用户不接受 T0 摘要，回退首刀、回 `推敲中`，不以“目录已建”关闭。
