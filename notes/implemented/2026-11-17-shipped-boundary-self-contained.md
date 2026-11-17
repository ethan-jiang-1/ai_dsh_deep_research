# 发布面自足（批 H：BUG-219…228）

> 状态：implemented

## 决定

1. **发布面自足 = 两条可证伪判据，一个正本模块**（BUG-227）。`checks/lib/repo/shipped-surface.mjs`
   同时提供「文本」与「集合」两类判据：随包文本零 dev 引用；`files` = `exports.types` 的反投影、
   tarball 顶层 = 允许集、`lib/types/**/*.d.ts` = `exports.*.types`。消费方分两层：
   `tests/checks/shipped-surface.test.mjs`（keyless，扫随包源码文本 + manifest 不动量，`pnpm test` 每轮跑）
   与 `checks/smoke/pack.e2e.mjs`（真 `npm pack` 清单 + 构建产物文本，nightly 档）。
   两层共用同一规则，不存在第二份手写面。
2. **公开类型面 = `exports.types` 的 7 个入口**（BUG-219）。`files` 不再 `lib/**` 全带：改为
   `lib/*.js`（入口 + 共享 chunk）+ 7 个类型入口逐条列出。已验证入口 `.d.ts` 无相对 import
   （可达闭包 = 7），所以 104 个内部 `.d.ts` 是纯过度发布，收窄不会破坏消费者类型解析。
   tarball 条目 186 → 82，`lib/types/**/*.d.ts` 111 → 7。
3. **注释修法 = 改源注释，不构建剥离**（BUG-224/225）。源码即发布文本：`tests/…`/`checks/…`/
   `_backlog/…` 改成行为/契约描述；keyless 测试直接扫 `src/**`，夜间档再扫构建产物。
   这样开发线索的丢失是显式的（测试归属改由 `tests/INDEX` 与资产账承担），而不是构建开关的隐性副作用。
4. **README 用户段 vs 维护者折叠段**（BUG-220）。用户段（`<details>` 之外）零开发命令/路径；
   维护者段保留 `pnpm build` / `npm pack`。规则住 `shipped-surface`，`readme-shape` 门禁与 keyless
   测试消费同一函数——verify 阶段就红，不等到打包。
5. **状态合同的随包载体 = `content/generic/state-and-recovery.md`**（BUG-222）。把 run bundle /
   session log / goal·任务板 / 观察面的 canonical 与恢复优先级补进该文件；`nodes-contract` 的
   模型可见文本指向它，不再指向开发仓 `docs/design/50…`。design/50 仍是维护者设计文档
   （project-map / guides/61 继续链接它）。
6. **dev 引用的边界按「可判性」划**：无歧义根（`checks/` `tests/` `tools/` `probes/` `_backlog/`
   `_dist/` `.agents/`）出现即红；有自然语言歧义的根（`docs/` `notes/` `runtime/` `vendor/` `snapshots/`）
   只认真实子目录（`docs/design/` 是，`release notes/` 不是）；开发实例名 `research-workspace/`
   独立判红（用户工作区是任意目录，BUG-223）。

## 输掉的方案

1. **构建时剥注释**：批量、快，但丢掉开发线索且要确认 sourcemap/公开类型文档不依赖；隐性副作用
   比显式的「源码即发布文本」更难守。用户拍板改源注释。
2. **保留 104 个内部类型树并登记为调试面**：需要给「内部类型」造一个消费者合同，而实际上没有
   消费者可达它们；收窄更简单且可机械断言。
3. **把 tarball 文本扫描放进 `tests/` 并 spawn**：layering ①/② 禁回归层子进程；判据的**规则**住纯函数、
   **真产物**住 smoke 是同样成立的分解。
4. **README 规则只写进 `readme-shape` 或只写进新测试**：两处手写 = 必然漂移；改为门禁与测试都
   消费 `readmeUserSectionIssues` 一个函数。
5. **对 `notes/` / `docs/` 采用「出现即红」**：会把 `release notes/registry` 这类自然语言误判成路径；
   歧义根按真实子目录表判，边界写在模块头注。

## 实际跑过的验证

- `pnpm verify` 全绿（含 `readme-shape` 新增的用户段断言与 `shipped-surface` 资产）。
- `pnpm test` 全绿（新增 `tests/checks/shipped-surface.test.mjs`：随包源码文本、README 用户段、
  `files`/`exports.types` 反投影、类型/顶层集合纯函数矩阵）。
- `node checks/smoke/pack.e2e.mjs` 全绿：82 个 tarball 条目、`lib/types` 7 个入口、顶层 = 允许集、
  随包文本（含 `lib/client.js` 与 `.d.ts`）零 dev 引用、README 用户段零开发命令。
- `node tools/release/export-dist.mjs` 重导出：tarball 186 → 82 条目，手册 sha256 同步（tracked 生成物同变更）。
- `pnpm build` 后逐面复扫：`lib/client.js` 0 处、`lib/types/**/*.d.ts` 0 个文件含 dev 引用。
- 逐卡红证回放（临时还原旧行为/注入 → 同一命令红 → 还原 → 绿）：219 `files` 回 `lib/**`；
  220 README 折叠区外 `pnpm build`；221–223 skill 写回 dev 路径；224 `lib/client.js` 注入；
  225 `lib/types/index.d.ts` 注入；226 `scripts/lib` 写回 `tests/…`；228 `files` 回 `lib/**`（pack.e2e 集合断言）。
  命令与输出逐卡记在 `fix-evidence.red`。
- gates.e2e 新增 `readme-shape-user-section-dev-command`（注入折叠区外开发命令 → 点名红）；全量 157 个注入案例
  （含零注入对照组）全绿。
- `node checks/smoke/lifecycle.entry.mjs`（vendored dsh wrapper）ALL PASS：新 tarball 安装 → dump 出 10 个
  entry id → 真启动无 activate/module 失败 → `readPluginMeta` 四个 specifier 中英标题/描述/图标 →
  `remove` 后 roster 回到 base + web-app。L2 安装形态在新发布物上复核通过。

## 残余风险

- **nightly 侧未真跑**：`pack.e2e` 的扩展只在本地以当前构建跑过；`nightly.yml` 的真实执行
  要等下一次夜间/手动触发（「跑了但不在门里」与「声明」是两件事）。
- **歧义根的直接文件边界**：`docs/<file>.md` / `notes/<file>.md` 作为「根下直接文件」被认作 dev 引用；
  若未来出现 `release notes.md` 这类自然语言同形，会误报，届时按真实子目录表收紧。
- **只扫文本扩展名**：二进制/图片/压缩产物不扫（发布物里目前没有可携带文本的二进制）。
- **source map 不进包**：`lib/*.js.map` 与 `.d.ts.map` 仍被 `files` 负模式排除；调试堆栈的源码定位
  由仓库与 source repository 承担，这是既有取舍（本轮未改）。
- 本轮未改运行期代码路径；改动面 = 源码注释 / 用户与模型可见文案 / 发布清单 / 类型面。L2（lifecycle.entry）
  已在新 tarball 上复核；**L1 真挂载与 L4 未跑**：三个 skill 的文案会进模型上下文，快照 B 未重录
  （下一轮模型可见变更窗口按 snapshot-playbook 重录）。
