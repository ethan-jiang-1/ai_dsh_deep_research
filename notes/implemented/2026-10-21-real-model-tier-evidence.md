# 真模型档补跑与 cdp-ask 前置修复

> 状态：implemented

六维卫生轮把 `l4-lite-smoke` / `client-hitl-smoke` / `cdp-ask-smoke` 列为"未跑（≠通过）"。本轮补跑三档，并在补跑中抓出一条**真模型档长期不跑就会静默失准**的实例。决定与理由记在这里；逐次断言输出住 `runtime/smoke-workspace/` 与各次运行日志。

## 决定

- **三档全部实跑，不沿用"未跑"登记**：l4-lite（四角色 assistant 响应 + scout `web_search` 真调用）、client-hitl（活标题翻转 + 挂起横幅 + ⑤a–f 全链）、cdp-ask（空闲态发出并落盘 + 续跑唤醒对账 + 在飞态 `Queue message` 标签）均 ALL PASS。
- **cdp-ask-smoke 的前置必须镜像 vendor `agent-team-profile` 的 host + 工具行对**：D16 把团队组合下沉到 profile 层后，只注入 `agent-team` **host** 行不会暴露 `spawn_teammate`；模型会退回 `subagent`（立即返回、turn 随即闭合），而"running 且非挂起的长时 turn"正是 `Queue message` 的触发条件。补 `tool-agent-team` 行后阶段③命中。
- **前置缺失记「未跑」而不是断言红**：阶段③在探针前显式读会话日志判 `turnOpen`（`runStateOf`，与 watch-run 同一谓词）；不 open → 跳过阶段③、整轮 exit 2。理由：前置漂移不是探针回归，把两者混为一谈会让下一次 D16 式漂移继续伪装成产品缺陷（本次就是这么发生的）。
- **常驻反证覆盖 27→39/43**（A 档）：12 道此前只有一次性 Note 红证的门禁补齐 `gates-smoke` 注入案例；剩 4 道（vendor-pin / vendor-clean / pin-agreement / hooks-active）断言对象是 submodule 或本机 git config 的真实状态，副本不可造，理由登记在 evaluation §L0 反证列。注入案例必须做**自咬防护**——`gates-cases.mjs` 自身在 `proposed-pointer-live` / `port-exclusive` 的扫描面内，路径与端口号只能运行时拼接/现取，否则门禁在真仓与对照组就红（首跑实录）。
- **测试输出改 `spec` reporter**（C1，已先行提交）：非 TTY 下 node:test 默认 TAP，597 测试 3592 行；spec 606 行且失败行可读。命令钉（layering ④）与 pre-commit 同 diff 同步。

## 输掉的方案

- **继续只登记"未跑"**：本轮证明代价——三档长期不跑期间，cdp-ask 的前置已被 D16 悄悄废掉而无人察觉；真模型档的价值恰在它能咬住 keyless 层造不出的组合。
- **放宽阶段③断言或加长 sleep/重试**：会把前置漂移永久藏起来（脚本纪律明写"固定 sleep 不是证据"）。
- **给 4 道结构性不适门禁硬造副本注入**：副本没有 submodule/git config，注入只能造出假红或假绿；诚实登记两态口径比伪造覆盖更安全。
- **让阶段③前置失败只打警告、仍判标签**：等于把"未跑"冒充"已判"。

## 实际跑过的验证

- `l4-lite-smoke`：ALL PASS——4 角色会话挂载 + 4 条 assistant 标记响应 + scout `tool/call name=web_search`。
- `client-hitl-smoke`：ALL PASS——盘侧末位事件 = 未答 `ask_user_question`；活标题翻转 + 横幅；⑤b 真起 `hitl-answer` 子进程（"Submit 已点击"）⇒ **六维轮 hitl-answer 导航收敛（web-ui-nav 主锚）的浏览器证据缺口就此闭合**；⑤d–f 二次挂起与右栏自动展开；截图留档 `runtime/smoke-workspace/client-hitl-*.png`。
- `cdp-ask-smoke`：首跑 1 红（阶段③ `Send message`）→ 日志定位到 lead 自述"工具箱里没有 spawn_teammate"、turn 3 立即 completed ⇒ 前置失效；补 `tool-agent-team` 行 → ALL PASS；再加前置显式检查后第三次跑仍 ALL PASS（`turnOpen=true`，阶段③ `Queue message`）。三次会话日志均在 `runtime/harness-home/sessions/…-cdp-ask-*--/`。
- 机械面：`gates-smoke` 全绿（零注入对照组全 PASS + 76 注入案例点名红）；`pnpm verify` 43 门禁全绿；`pnpm test` 597/597（spec 输出 606 行）。
- 未跑：完整 L4 全量（真实研究 run，按设计仅里程碑跑）；`client-hitl` 与 `cdp-ask` 的失败分支（本次未触发）无额外证据。

## 环境状态

- 三档均消耗真实模型调用；运行留档在 `runtime/`（gitignored）。
- 复用提示：`session-events` 读 smoke 组会话需 `--group <子串>`，且同一前缀可能有多个组（`cdp-ask` 每跑一组）——用带时间戳的精确子串；`findGroup` 取首个命中，宽子串会指到别的组。
