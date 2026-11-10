# 内容组织 T0 首刀：状态/读序/恢复下放 generic

> 状态：implemented

来源卡：[2026-11-11-content-organization-t0](../../_backlog/_archived/settled_issues/2026-11-11-content-organization-t0.md)
组织约定：[design/70](../../docs/design/70-content-organization.md) · 研究：[presets/content 测试与内容组织](../../_backlog/_archived/research/presets-content-test-coverage/README.md)。

## 决定

- **manual 明确为 T0**：只留“不加载任何 skill 也必须知道”的不变量 + 指针；跨角色细则下放到
  `content/generic/<name>.md`，由 T0 用 `{{research_pack_root}}` 指针按需 read。撞顶处置仍是
  下放 > 压缩 > 升顶，不抬 `content-shape` 上限。
- **首刀 = 状态头/读序/恢复**：`content/generic/state-and-recovery.md` 承接五问、按意图读表、
  交付口径、终局块、旧 run 推导、冲突/过期与恢复步骤；T0 保留 `run.md` 键、声明不是事实、
  五问与指针。manual 从 12,038 → 9,995 字符（余量 2,293）。
- **披露守卫**：`tests/pack/content-disclosure.test.mjs` 断言 T0 ≤10,000、每个 generic 被 T0 指针
  点名、指针可解析、T0 不复制 generic 的 H1、generic 不依赖未注册插值；`tests/pack/handbook-surface.mjs`
  让“手册面” = T0 + generic，`run-bundle-charter` 等断言不再因下放假红。
- **不新增内容层/不重排顶层**：`content/{manual.md,generic/,templates/,lenses/,waves/}` 的寿命边界不变；
  下一刀 = 证据文件契约（1,595）或目录约定（3,734），按同一形状增量下放。
- **模型可见变更只动 T0 文本**：未改 persona/skill/研究协议语义；L1 真挂载与 L4-lite 真模型均绿。

## 输掉的方案

- **一次性把三节都下放**：模型可见 diff 太大，snapshot/行为归因困难；首刀失败时无法判断是哪节。
- **只压缩/改写 manual，不建 generic**：能缓一轮，下一次仍撞顶；没有“按需读”的缝。
- **直接抬 `MANUAL_MAX_CHARS`**：预算不是障碍，注意力才是；抬顶把债推后。
- **把细则塞进某个角色的 skill**：证据契约/目录树是跨角色的，只有该角色看得到 = 其他角色失守。
- **把 generic 做成 manifest/索引**：清单会腐；T0 指针 + 盘上枚举足够。

## 实际跑过的验证

- `pnpm test`：1131/1131 全绿（新增 `content-disclosure` 4 例；`handbook-surface` 让既有手册断言
  覆盖 T0 + generic）。
- `pnpm verify`：全绿。
- **L1**：`DSH_SMOKE_REAL=1 node scripts/smoke/preset-smoke.mjs` → ALL PASS（5 preset 真挂载、
  skills 隔离、client 行 served）。
- **L4-lite**：`node scripts/smoke/l4-lite-smoke.mjs` → ALL PASS（全角色 assistant 响应 + scout
  `web_search` 工具调用）。
- **snapshot B**：`node scripts/smoke/snapshot-replay-smoke.mjs` → ALL PASS，但回放的是**旧录制对**；
  它不捕获本次 manual 变更，**不作为新手册组装证据**。重录窗口未开，残余风险见下。
- 红证（逐条先红后绿）：
  - 新增 `content/generic/orphan.md` 且 T0 不指针 → `content-disclosure` 红；删除 → 绿。
  - 删 T0 的 `state-and-recovery` 指针 → 红；还原 → 绿。
  - 把 generic 的 H1 抄回 T0 → 红；还原 → 绿。
  - T0 人为超 10,000 字符 → 红；还原 → 绿。
- **残余风险**：L4-lite 证明角色在新手册注入下仍能响应，但没有专门触发“恢复时读 generic”；
  snapshot B 未重录，新手册的组装面没有进入回放基线。下一刀或下一轮模型可见窗口应补重录，
  并在真实恢复场景观察 lead 是否按指针 read。
