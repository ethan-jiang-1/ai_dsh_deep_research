# 绿说真话：数据面显式、遮罩可见性、诊断下一步

> 状态：implemented

## 决定

- **run-driver verdict 增 `dataFace`**：`bound | unbound | unknown`，来自状态页文本。新会话未绑定是
  正常态，`up` 默认仍绿，但**呈交块必须写明**（`浏览器面：GREEN（数据面：unbound）`）；`--require-data`
  才把它升为硬检查（unbound/unknown 红，check id = `data-face`）。理由：10/10 份 GREEN 的
  `statusPaneText` 全是"本会话未绑定 run bundle"——旧 verdict 让"页面开了"冒充"驾驶舱数据面通了"。
- **遮罩判据只认可见元素**：`PREVIEW_NOTICE_PROBE_JS` 与 `dismissPreviewNotice` 都加
  `getBoundingClientRect`/`getComputedStyle` 可见性过滤。关闭后的模态节点仍留在 DOM（`display:none`），
  按"DOM 在场"判会把已关闭的遮罩报成 stuck（2026-11-03 本地 seed 实测：提示"遮罩关不掉"但后续
  断言全过 = 假报）。
- **client-load 的 stuck 升为红**：重试一次 `dismissPreviewNotice`，仍可见才 `step(false, ...)`。
  旧注释"只记提示，后续点击会暴露"已被 2026-10-27 事故推翻（JS 派发点击绕过 hit-testing，后续
  断言不会红）。
- **漂移门判"运行时集"，不判文档**：README/LICENSE 漂移只逐条提示、不判红；`lib/`/presets/content/
  locale/cordis.patch.yml 等运行时文件仍严格逐文件比对。理由：页面行为只由运行时文件决定，
  而改一行 README 曾把整条通道判 NOT-RUN、逼人 `rm -rf profile` 重建（2026-11-03 G-20）。
- **client-load 最近结果指针**：`runtime/smoke-workspace/client-load-latest.json`（PASS/SKIP/FAIL +
  失败 dir）；失败现场目录继续按时间戳保留，但"最近一次到底是红是绿"不再靠 `ls -t` 猜。
- **run verdict 带 `page.html`**：截图只能说明"哪里不对"，看不出"哪个节点没渲染"。`cdp-probe` 增
  `--html`（`document.documentElement.outerHTML`），run-driver 把它复制到每份
  `run-verdicts/<ts>-<kind>/page.html`（与 page.png 同址；失败也落）。实测活通道快照 595 KB。
- **`bundle-sessions` 的下一步给 session-id**：`watch-run` 的判据参数是 session-id，旧输出给 slug
  → 照抄即 exit 2（诊断第一步自带坏命令）。同轮加**状态摘要**：反查后直接打印
  `events/readable/hitlPending/runSettled` 一行（runStateOf 同一谓词），诊断不必再手拼两跳。

## 输掉的方案

- **unbound 一律判红**：`up` 面对新会话时永远红，等于把正常态当故障；正确做法是把数据面作为
  **显式字段**，由调用方用 `--require-data` 选择强度。
- **保留"遮罩只提示不拦绿"**：警告不改变呈交判断，agent 只读红绿；10-27 的 GREEN 截图事故已证。
- **按 DOM 在场判遮罩**：隐藏模态造成假红，反过来逼人忽略该判据；可见性才是"人会不会被挡"。
- **新造 `run-status` 聚合命令**：本轮先修坏提示与显式字段；聚合入口待下一轮（避免同一轮改太多面）。

## 实际跑过的验证

- `tests/run/run-driver-contract.test.mjs`：6/6 绿；新增 unbound/bound/`--require-data` 三态断言
  （unbound 默认绿 + dataFace 显式；require-data 时 unbound 红且 checks=7）。
- `tests/run/web-ui-nav.test.mjs`：5/5 绿；新增"标题节点不可见（零尺寸）→ present=false"用例——
  旧判据在该用例下会报 present=true（假 stuck）。
- 漂移门两态（临时 profile 镜像）：源 README 追加一行 → 绿（跳过 1 个非运行时文件）；删镜像
  `lib/client.js` → 红并点名该文件。函数本体从 `dev/boot-run.sh` 原样抽出执行，不测副本。
- client-load 成功后 `client-load-latest.json` 落 `{status:"PASS", dir:null}`；失败路径写
  `{status:"FAIL", dir:<现场>}`（代码同函数，本轮验 PASS 态）。
- 本地 `client-load-smoke --seed tests/fixtures/client-load-home`：**ALL PASS**（含新增的
  "首屏 Preview Notice 可关闭"硬断言；此前同一场景打印"遮罩关不掉"仍全绿）。
- `pnpm test` / `pnpm test:vendor` / `pnpm verify` 全绿（本变更的收尾轮）。
- CI run 41561543486（`ce1e917`）三 job 全绿；方法库 tool smoke 进 deploy 的尝试在 CI 红于
  `system.node` 缺席（native 产物），按"未跑 ≠ 通过"撤回该步并登记 trigger，证据留在开发档。
