# 通道镜像漂移的恢复快路径：client 产物标记同步 + 热载就绪判据

> 状态：implemented

## 决定

- **漂移恢复按产物类分桶，只有能热载的那类走快路径**。`boot-run.sh --sync-mirror` 用与漂移门
  同一份发布清单比对，把漂移文件分成 client 产物 / 非运行时文档 / host 运行时，前两桶逐文件
  **同目录 temp + rename 原子替换**后复验同一道门，host 桶非空即拒绝（exit 1，逐条点名）。
  理由：client 产物由 vendor `client-hmr` 的 node 半每 500ms stat-poll 热载（`rebuilt()` 读新
  bytes、以新 rev 重组 boot graph），盘上换文件就够了；host 运行时文件在 boot 时装载并缓存于
  进程，同步盘上文件不更新加载面——同一动作对两类文件的效果不同，混在一起做就是假修。
- **`--sync-mirror` 与 `--drift-only` 一样不取启动锁**。服务在其整个生命期持有 canonical home
  锁（正是「禁止重建已加载 profile」的机制），取锁的同步永远进不来；同步是服务持锁期间**唯一
  允许的镜像写**，边界由分类判据守（只写 client/文档），不是放宽锁语义。
- **同步之后必须证明运行进程已发布新 rev，再验浏览器面**。期望 rev = 同步后镜像 stat 三元组的
  `framedHash('plugin-artifact', …)`（与 vendor `artifactRevision` 同公式），轮询首页 boot graph
  直到 pack 条目 rev 命中；未命中即红，不拿旧页面冒充绿。缓存与探针都排在这道检查之后。
- **`.d.ts` 退出判红集**。类型声明从不被运行时加载，与 README/LICENSE 同类（G-20 的同一原则）；
  此前它们参与判红，把纯类型变更也算成"页面不是当前代码"。
- **快路径失败一律回到原处方**：`up` 打印同步结果与拒绝原因后仍走 NOT-RUN，报错文本改成
  「先 `--sync-mirror`，host 漂移才停通道重建」——报错文本承诺的路径现在盘上真有一条。

## 输掉的方案

- **发现漂移就自动重启通道**：在飞 run 的会话日志尾部会丢（BUG-007），且每次新 token 让旧 URL
  与已打开页面作废——这正是本卡要消掉的税。
- **把 host 漂移也纳入就地同步**：盘上文件会变绿、漂移门复验通过，而运行进程仍用旧 host 代码，
  等于用门禁的绿冒充页面的绿。
- **用 mtime 猜新鲜度决定是否同步**：`touch`/checkout 制造假信号；判据只能是内容比对（沿用发布集
  逐文件 diff）。
- **按文件名硬编码 client 产物路径**：真源是 `package.json` 的 `exports["./client"]`；写死会在
  构建产物改名时静默失准（缺导出即 fail-loud）。
- **只查「镜像 stat = 源 stat」当作热载证据**：那是镜像侧事实，不是运行进程侧事实；必须读回
  boot graph 的 rev。

## 实际跑过的验证

- **机制证明（隔离 home/state/端口，真进程）**：污染镜像 client 产物 → 1.2s 内运行进程 served
  bytes 随盘更新、`rev` 变化、web pid 与 token 不变；原子恢复后 served bytes 回到源、漂移门复验
  由红转绿。
- **真入口计时（同一隔离通道）**：造 client 漂移后 `up` 自动同步 → 热载就绪 → 真探针 GREEN，
  全程 15.2s；只同步不探针（`--no-probe`）2.6s；对照卡上的整包重建 63s（冷 npm 缓存时更长）。
- **拒绝路径（真入口）**：改 `lib/defaults.js` → `up` exit 2 / NOT-RUN，逐条点名 host 漂移，
  且**不改动 host 文件**；恢复后漂移门转绿。
- **活通道（3083）**：改 pack 后 `up` 复用同一通道自动同步并 GREEN，token 与重启前逐字相同、
  web pid 未变；随后以本变更后的 `run-driver` 复验 GREEN（14.6s，含真探针）。
- `node checks/smoke/channel-start.e2e.mjs`：14 项全绿（新增 `mirror sync recovery` 案例覆盖
  client 同步 / host 拒绝 / 文档与 `.d.ts` 同步 / driver 复用自动同步）。
- **变异反证（三轮，均实跑）**：分类器"未知文件 → doc"→ spec 3 红；删 host 拒绝 → e2e 红；
  还原均转绿。第二轮变异首跑不咬，查证发现是 `$rel（` 全角括号被 bash 当变量名（`set -u`
  下炸成 exit 1，恰好与拒绝的 exit 1 同值）——补花括号后变异能咬，说明该 e2e 断言真的可红。
- `pnpm verify` 全绿；`pnpm test` spec 1649 / checks 273 全绿（含新增
  [mirror-sync](../../tests/run/channel/mirror-sync.spec.mjs) 7 例与 run-driver 契约 5 条）。
- **顺带修掉一处存量红**：`channel-start.e2e` 的复制清单漏了 BUG-349 引入的
  `sandbox-capability.mjs`（以及 `port.mjs`），该 e2e 在本轮之前就已经因模块缺席而红。

## 环境状态

- 报告例的恢复代价从「停 supervisor + `rm -rf profile` + 冷重建 ≈2–3 min + 换 token」变为
  「`up` 自动同步 + 热载就绪 ≈2.6s（含真探针 15s）」，且**旧 URL 与已打开页面继续有效**。
- host 侧漂移仍要求停通道重建，`guides/61 §0.1` 与 `tools/README` 的对应行已写明分界。
- 未覆盖：client 产物同步只依赖 vendor stat-poll 的 rev 语义；若换 pin 后 vendor 改了
  `artifactRevision` 公式，契约测试的漂移锁断言会先红（提醒重核），不会静默失准。
