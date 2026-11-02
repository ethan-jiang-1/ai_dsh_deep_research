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
- **2026-11-03 实测可行性数据**：seed 体积很小——绑定会话 zstd 423K / 明文 JSONL 1.25MB +
  已交付 bundle 192K，可入库为 `tests/fixtures/client-load-home/`。
- **2026-11-03 本地 seed spike（已跑通前半段，边界如下）**：
  1. **空 home + shipped `web` profile 可启动**（smoke 传 `--profile web` 用的是 vendor 随带
     profile，不需要 `--from-default-profile`；实测 `dsh --profile web --from-default-profile web`
     直接报错"shipped profile cannot be a custom profile target"）。
  2. **不要复制带 `profiles/` 的旧 home**：副本里的 custom `web` profile 遮蔽 shipped 版，
     `workspaceController` 等服务 pending，`workspace/create` 直接 service-unavailable。
  3. **会话身份约束（vendor `assertStoredIdentity`）**：日志头 `id` + `cwd` 必须与文件路径
     吻合——组目录名 = `projectKey(cwd)`（`--<path 编码>--`），cwd 必须真实存在。行为：
     放进 `--seed-research-workspace--` 这类组名 → 启动报 corrupt session log，workspace
     服务整体不激活。
  4. **mtime 必须早于 30 分钟**：smoke 的绑定候选过滤排除"30 分钟内仍写盘"的会话（在飞
     run 防竞态），刚拷贝的文件会被当成在飞而丢弃——seed 要 `touch` 回拨。
  5. 满足 3+4 后：磁盘扫描能绑定、侧栏能列出，但行键点开的主视图切到了另一个会话
     （active=session-c9d6b79b / bound=session-2473…，marker 未命中）——下一步要查
     窗口内 marker 与 probe 会话干扰；spike 到此收束，不猜。
  6. **明文 `.jsonl` 被 vendor 接受**（`session-persistence-jsonl` 同时认 `.jsonl` 与
     `.jsonl.zstd`）→ fixture 可以是带 `__WORKSPACE__` 占位的明文，seed 时字符串替换 +
     按 `projectKey` 落组目录；比 zstd 重压缩省一步。
- 仍缺：①`bootWeb` 从 vendor 源码起，CI 需要先跑 `dev/vendor-build.sh`；②chromium 需
  `playwright install`；③`--seed` 参数与 materialize 工具（明文替换 + projectKey + mtime 回拨）。
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
