---
status: 推敲中
opened: 2026-11-03
---

# 推敲：驾驶舱 E2E 不在 CI——终稿页签坏了 11 天没人发现

> 立卡：2026-11-03 ｜ 状态：推敲中 ｜ 类型：未定 ｜ 结论倾向：未定 ｜ 可关闭：否

**问题与期望结果：** `client-load-smoke`（61 条真浏览器断言，覆盖驾驶舱页签、终稿页签、
方法库、配置页签与盘侧真值对账）只在本机手工跑。2026-11-03 卫生审计实跑发现终稿页签
5 条断言红：`ee8755a`（reader-final，2026-10-23）把认领 glob 写成带分隔符形态后，
vendor 按 basename 编译 → 终稿页签从不参与认领，交付门点开落到文档预览。回归活了 11 天，
因为 CI 的 keyless/deploy 两个 job 都没有这一步（CI = verify / test / gates-smoke /
run-accept-smoke / doctor / pack / release 等，全是 keyless 非浏览器或安装面）。

期望：驾驶舱的主 E2E 在 CI 有稳定位置，或至少有一个"必须手工跑"的显式闸门（缺跑 = 未跑，
不是绿），让同类回归在合并前暴露。

**当前情况：**
- `client-load-smoke` 需要开发 home 里存在 `research-workspace` 会话组 + 绑定 `drt_*` 的
  带历史会话（缺 = exit 2）；CI 没有这种 home。
- `snapshot-replay-smoke` 能回放录制会话，但场景集是角色组装面，不含已交付 run bundle。
- CI 已有 chromium 可用的先例？未见；deploy job 不装浏览器。
- **2026-11-03 实测可行性数据**：seed 体积很小——绑定会话 zstd 423K + 已交付 bundle 192K
  ≈ 615K，可入库为 `tests/fixtures/client-load-home/`。但三处仍缺：①`bootWeb` 从 vendor
  源码起，CI 需要先跑 `dev/vendor-build.sh`（deploy job 目前只 build pack）；②chromium 需
  `playwright install`（仓库无直接 dep，`scripts/lib/playwright.mjs` 从 .pnpm store 找）；
  ③smoke 目前只认 `DSH_HOME`，无 `--home/--fixture` 参数——seed 注入要加显式参数
  （并同时给 `DSH_RUN_WORKSPACE`/bundle 根）。
- 已单独修掉一类"假反馈"：smoke 现在做**构建新鲜度**自检（`lib/client.js` 旧于 src 即
  exit 2，提示 `pnpm build`），不会再拿旧产物评分。

**未决问题：**
1. 用"录制一份最小 dev home（会话 + 已交付 bundle）进 fixtures"喂 client-load，还是让
   client-load 支持 `--seed <fixture>` 自建 home？
2. 若成本过高，退而求其次：把"本轮改动面含 `src/client/` 时必跑 client-load"做成
   pre-push/交付检查的机械判据（仓内有没有可靠的执行点？CI 之外只有 pre-commit）。
3. 浏览器依赖（chromium 下载）在 CI 的稳定性与时长预算。

**下一步：** 先做 1 的最小可行切片（fixture home 的形状与体积评估），拿数据再定。

## 已知与未决

## 方案与取舍

## 验收标准
