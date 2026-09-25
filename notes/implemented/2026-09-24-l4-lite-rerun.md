# l4-lite-smoke 复跑收口（队列条目销账）

> 状态：implemented

> 条目：roadmap ▶「l4-lite-smoke 复跑」——重写版脚本（会话日志轮询断言）首次整跑。
> 验收 = 脚本自己全绿。本 Note = 收尾记录（结果 / 顺带修掉的 bug / 决定 / 验证 / 环境）。

## 结果：ALL PASS（9/9）

四角色会话挂载 + 四角色 assistant/message 携带标记（seq 15–16）+ scout
`tool/call name=web_search` 真实发生（seq 17）。断言全程读落盘会话日志（zstd 解压），
零自述——verify the world 档位。重写版（日志轮询）自此有整跑绿灯背书。

## 顺带修掉的两个真 bug（红绿在案）

1. **zstd 守卫优先级 bug**（scripts/l4-lite-smoke.mjs）：`!spawnSync(...).status === 0`
   因运算符优先级恒 false——守卫从未生效，zstd 缺失时会以"等待超时"的迷惑方式失败。
   修正为 `spawnSync(...).status !== 0`，收敛掉无效的 homebrew 回退（readSessionLog
   直接调 PATH 上的 zstd，回退检查是死逻辑）。反证：旧式恒 false 的求值证明 + PATH
   剔除 zstd → 精确 exit 2 + 明确报错。
2. **env.sh 数据面合同 bug（本轮最大收获）**：原 `${DSH_HOME:-默认}` 预设优先——DSH
   会话内（agent shell / GUI 环境）平台级 `DSH_HOME=~/.dsh` 会让 source 后**静默指向
   日用 home**。首跑失败链：boot 拿日用 home 找不到 profile → 回退写
   `~/.dsh/profiles/web/cordis.yml` → 被会话沙箱 EPERM 拒（fail-loud 正确——沙箱在替
   我们执行双 home 纪律）。定位：对照探针（正确 DSH_HOME 下 `--profile web` 解析正常、
   不碰日用 home）→ 根因实锤（会话 env 自带 DSH_HOME + source 后不变）。修复：无条件
   覆盖 + 覆盖告警（stderr）。含义：**在 DSH 会话内 source env.sh 正是 agent 的标准
   用法**，预设优先写法恰好在该场景破坏隔离合同；修后命令表合同（source ⇒
   DSH_HOME=dev/harness-home）无条件成立。

## 决定

- **队列重排（用户定案）**：M2「首个完整研究 run」提前至 vendor-submodule 之前——
  实质优先；vendor-submodule / dsh-discipline 枚举 / entry-chain-probe 脚本化顺延，
  待实战证据反哺后再做（D10 借用 company checkout 不阻塞研究 run）。
- **M2 开工前置**：计划先落 `notes/proposed/` RFC（可切多件）→ 用户审阅打磨 →
  呈批后才实施（反馈门①；用户明示"切好了之后还要反复打磨"）。

## 实际跑过的验证

- `source dev/env.sh && node scripts/l4-lite-smoke.mjs` 两次整跑：首跑失败（暴露
  env.sh bug，EPERM 路径完整捕获）；修后复跑 ALL PASS；
- zstd 守卫：旧式求值证明 + PATH 剔除探针 exit 2（红绿反证）；
- `node scripts/verify.mjs` + `node --test tests/*.test.mjs`：收尾时点全绿。

## 环境状态

- dev home 凭据在位（内容未读）；boot 起自 company checkout 钉 tag 源码（D10 借用，
  队列条目 2 落地后切回本仓 vendor）；
- 本条目销账；▶ 移交「首个完整研究 run」（M2）——开工前先出 RFC。

<!-- grandfather: note-format 门禁生效（2026-09-24）前的遗留形态——内容有效不追改，新篇一律按 guides/60 §4 骨架 -->
