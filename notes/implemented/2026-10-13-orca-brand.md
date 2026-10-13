# 研究通道品牌 = 虎鲸 Orca（mark + name 双槽）

> 状态：implemented

## 决定

- 本 run 通道的品牌名 = **Orca**，品牌标 = 虎鲸剪影；落地 =
  [BrandMark.tsx](../../packages/deep-research-pack/src/client/BrandMark.tsx)（`OrcaMark` + `OrcaName`）
  注册宿主 `sidebar.brand.mark` 与 `sidebar.brand.name` 两槽（kind: single / scope: root，
  契约 = vendor `ui-sidebar` contract/slots.ts）。本地构建下官方品牌插件不激活
  （`DSH_CLIENT_BUILD_PROFILE !== 'official'` 提前返回），两槽原为空位、渲染 fallback
  （鱼形 logo + 本地构建标签）——本登记把 fallback 一并替换，**vendor 零改动**。
- 用户定调 2026-10-13，从五个动物候选拍板 Orca。语义同构（不只是气质像）：声呐"以耳成像"
  （"耳听八方"的字面级载体）+ 群体协作狩猎（多角色队形）+ 名字干净、中英通用。
- 范围边界：**皮肤层（配色/主题/令牌纪律）维持不做**——[ui-skin 否决 Note](../rejected/2026-09-24-ui-skin.md)
  的重启条件被本决定**窄触发**（只品牌名与标），全皮肤复活仍归该 Note 拥有。
- 构成正本行 = [design/40 品牌行](../../docs/design/40-research-cockpit.md)；
  [pack README 已知限制行](../../packages/deep-research-pack/README.md) 同 diff 更新。

## 输掉的方案

- **渡鸦（Corvus）**：2026-10-12 曾定调并落地 `RavenMark`（只占 mark 槽）；本轮用户在五候选前
  改拍 Orca，RavenMark 同 diff 移除。留档理由：命名可重讼，输掉的备选必须留档防三讼
  （研究驾驶舱定名同款先例）。
- **DeepOcto（章鱼）**：一脑多腕 = agent-team 拓扑同构 + deep 双关；输在开发者圈
  octo→Octocat 联想强。
- **鸮（Owl）**：成语"眼观四路耳听八方"的字面最优解 + 智慧经典符号；输在工具圈 owl
  吉祥物最拥挤（Duolingo/Hootsuite 等）。
- **Fennec（耳廓狐）**：大耳最上镜、机敏萌系；输在叙事弱于声呐/团队，且曾是 Firefox 移动版代号。
- **只换标不占 name 槽**：保留 "DSH · Local BUILD" 文字；被否——用户明确要求文字与 icon 一起换。

## 实际跑过的验证

- 真浏览器面（cdp-probe 裸 CDP）：`--expect-face 'Orca'` 与 `--expect-no-leak 'Local BUILD'`
  双断言绿，console 零错误零异常（2026-10-13，profile 镜像按 boot-run 处方重建后的通道上实测）。
- `pnpm test`（keyless 回归）绿：415 pass / 0 fail。
- `pnpm verify`（L0 结构门禁）绿（含 md-links/md-anchors 对本 Note 与新链接的对账）。
- pack client 半重建 → profile 镜像按处方重建 → 漂移检测绿 → 通道 boot 幂等序全过。
