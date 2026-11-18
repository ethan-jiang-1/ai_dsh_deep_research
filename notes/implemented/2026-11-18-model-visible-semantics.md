# 模型可见语义：模板/技能声明接上机械消费者（批 K：BUG-250…259）

> 状态：implemented
>
> 历史注记：增补 [runtime-deps-install-boundary](2026-11-17-runtime-deps-install-boundary.md) 与
> [move-residuals-ii](2026-11-18-move-residuals-ii.md) 的发布面判据；前两批的路径/安装面仍现行。

## 决定

1. **模板字段 = 机械契约**（250 / 251 / 252 / 256）。evidence 八字段逐一进 `evidence-audit-core`：
   `lens` 入硬字段并与 `topics.md` 的 `lenses:` 集合对账；`quality ∈ A–D`、`source_tier ∈
   primary/secondary/tertiary/weak`、`publisher` 注册域（`host.tld`，localhost 例外）为闭集。
   `findings` 的 `gap` 四态由 `findings-core` 消费；`lenses` 存在时 `lens_gaps` 必须显式
   （`无` 或差集 id；空列表 = 红），并与 `topics.lenses − 支撑证据的 lens` 差集对账。
2. **topics 的 `scope_role` 先校验再算覆盖**（253）。四值闭集 `primary/synthesis/comparison/supporting`；
   未知值/大小写错 → 门 L 红，不再静默当 supporting 豁免。
3. **review 的结构化摘要与 readiness 同级**（254 / 257）。`review-contract` 解析
   `topic × lens` 覆盖表：有 lens 的 run 必须有表、每个 lens-bearing topic 有行、`—`/空格同行
   必须有 gap/n-a、表内 `evidence/*.md` 必须存在且 `lens` 等于所在列；review 的 `- C#` 清单在
   readiness PASS 时不得有未解释项，解释 = 显式 `resolved-critical: C1, C2`（或 all）。
4. **protocol.output.sections 是机器骨架，final 是投影**（255）。新增显式映射
   `decision→决策摘要 / options→备选与取舍 / criteria→关键依据 / tradeoffs→备选与取舍 /
   risks→目前不能判断`；final 的 H2 必须覆盖映射后的节（final 缺席不在协议门判，交付门管）。
5. **skill 正文独立金标准**（258）。`skills/*/SKILL.md` 的 sha256 清单住
   `tests/fixtures/skill-golden/manifest.json`，`record-skill-golden.mjs --update` 显式重录；
   快照 B 仍只比 catalog（正文不在初始请求），正文回归由该 keyless 测试抓。
6. **probe 缓存键覆盖驱动 import 闭包**（259）。`channel-cache.importClosureHash` 从
   `run-driver.mjs` 出发递归跟随相对 import/export-from/动态 import，键 = pack + runtime +
   dev 外壳 + 驱动闭包；探针断言/缓存实现变化即 miss。
7. **旧场只严新交付**：已归档 run 不重审计；新门作用于当前交付的 run。review 的
   `resolved-critical` 是新增的结构化解释语法，写进 critic skill。

## 输掉的方案

1. **skill 正文全文快照**：资产大、更新重；git 本身已有全文 diff，hash 清单足够把“改正文”
   变成显式动作，具体语义评审仍在 diff 里做。
2. **review 覆盖表做强校验（逐格卡数/质量）**：表格格式在技能里是散文，强解会假红；
   本轮只钉“表在、行在、引用真、空格有解释”，卡数质量留给 critic。
3. **`gap` 按旧归档词表兼容（answered/partial）**：旧归档不重审，新交付用四态；兼容会稀释
   状态机，不选。
4. **枚举值域手抄两份**：常量从 gate 模块导出，模板契约与审计共用（单一正本）。
5. **probe 缓存键显式扩清单**：会再漂；import 闭包从入口派生，闭包内任何文件变都 miss。
6. **把 `output.sections` 改成 final 六节**：会改模型可见协议示例；选映射表，保住 JSON 合同。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 全绿（新增 `findings-contract` / `review-contract` /
  `skill-golden` 与 evidence/protocol/channel 用例；模板契约值域对账）。
- `node-gate` 新增门 F（findings 契约）并接入渲染；`deliveryGate` 接入 review 覆盖/severity。
- 十卡红证回放：250 从硬字段删 lens → 缺 lens 用例红；251 关值域 → 值域用例红；
  252 关 gap 四态 → gap 用例红；253 关 scope_role 校验 → 门 L 用例红；254 关覆盖表 →
  覆盖用例红；255 关 final 映射 → 协议用例红；256 关 lens_gaps → 差集用例红；
  257 关 severity → C1+PASS 用例红；258 篡改金标准哈希 → skill 用例红；259 关闭包递归 →
  缓存键用例红；各自还原 → 绿。
- `node checks/smoke/pack.e2e.mjs`：86 条目（skill 文本变更后重导出 `_dist`）。

## 残余风险

- **review 覆盖表只做结构判据**：逐格“卡数 + 质量（A/B 数）”未机械核；表造假的高级形态
  （格内写一个真 evidence 但结论不支持）仍靠 critic 抽查。
- **`resolved-critical` 是新语法**：旧 review 若在 PASS 后保留 `- C#` 会被判红；已归档不重审，
  新评审按 skill 写解释行。
- **skill 金标准是 hash 不是语义**：正文改动会红，但改得对不对仍靠 diff 评审；重录必须与
  变更同 diff 提交。
- **probe 闭包只跟相对 import**：node:/包名依赖不在闭包内（它们不是本仓探针逻辑）；
  `--force-probe` 仍是最终逃生口。
- **旧归档不重审**：新语义门对历史 bundle 可能报红，属预期；不回头改历史交付。
- nightly / 发布门未在本轮触发；L1/L4 未跑（无模型调用变更）。
