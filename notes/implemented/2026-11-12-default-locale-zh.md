# 界面默认语言 = 中文（bundle 层钉 `locale.preference`）

> 状态：implemented
> 关联：[D49](../../docs/decisions.md#d49)；合同 = [design/40 §4](../../docs/design/40-research-cockpit.md)；
> 文案覆盖面（不是缺省值）= [驾驶舱 i18n 覆盖](2026-11-11-cockpit-i18n-coverage.md)

## 决定

本包在 `cordis.patch.yml` 里替换 web-app 的 `locale` 行，把 `preference` 钉到 `zh`：装本包的 profile
首次启动即中文，不再跟随浏览器语言。用户在设置里显式选 English 时，选择写进 profile 的 patch 层
（在 bundle 之上），仍然覆盖这个缺省。

## 为什么

DSH 的 locale 解析顺序是「显式偏好 → 浏览器语言 → 英文兜底」；浏览器报 `en-US` 时整屏英文，而本产品
面向中文用户（用户 2026-11-12：「用户缺省的就是中文的用户就别用英文了」）。文案本身已经 day-one 双语
（chrome / 折层 / 产品内容显示投影三套字典），缺的只是缺省值；把缺省钉在 bundle 层，安装即生效，
不需要每个用户先去设置里点一次。

## 输掉的方案

- **只改开发 home 的 settings**：只修这一台机器的 run 通道，用户装包后仍是英文。
- **改 vendor locale 的 `FALLBACK_LOCALE`**：vendor 树只读（`vendor-clean` 门禁），且会改掉所有 profile 的语义。
- **在 client 启动时 `setLocale('zh')` 强制切换**：会把用户的显式选择也覆盖掉，语言开关形同虚设。
- **中英混排写死一个品牌名/标题**：不治本，界面其余部分仍跟随 locale。

## 实际跑过的验证

- 重启 run 通道（`node dev/run-driver.mjs up`，冷重建）→ GREEN；CDP 无头浏览器的 `navigator.languages`
  为 `en-US`，界面与「研究状态」探针文本仍全中文（`🎯 尚未确认 / 本会话尚未绑定研究 run …`）——
  证明缺省不再取决于浏览器语言。
- 方法库：`对话 / 方法库`、`我的库 / 内置参考`、`刷新 / 新建`、`事实核查 / 领域地图 …`、`内置只读 /
  以此为基础开始` 全部中文；选中态（tint + 边线 + accent bar + 加粗）在中文下同样成立。
- 品牌名 `Orca 深度搜索` 单行（BUG-069 的 24px 定高槽约束）。
- `pnpm test` 1233 绿、`pnpm typecheck` 绿、`pnpm verify` 全绿（含 `decisions-now`、`doc-budgets`）。

## 环境状态

开发通道（3083）已验证；用户安装形态（L2 `install-shape.entry` / `release.entry`）未在本次复跑——
缺省值走的是 bundle patch，与安装形态无关，但发布前仍应随发布清单复跑一次。
