# 搬家残差 II：owner 六分与发布面残余（批 J：BUG-240…249）

> 状态：implemented
> 历史注记：部分取代 [runtime-deps-install-boundary](2026-11-17-runtime-deps-install-boundary.md) 的干净室解析基、pack-deps 反向/动态面、发布 manifest 字段；该批的其余决定仍现行。

## 决定

1. **干净室从安装位置解析**（BUG-240 / 241）。`moduleLeakOf` 的解析基改为
   `home/profiles/<profile>`（profile 缺席 = 未装完，红）；探测集从 `peerDependencies` 全量派生
   （`peerNamesOf`），不再手抄三个包名。三个入口（cold-start / release / lifecycle）共用同一判据。
   解析从 profile 起会向上走到 home 根，所以 home 根的仓内 symlink 也可见；profile 内的泄漏
   是旧实现（从 home 根解析）完全看不见的那一类。
2. **profile 守卫覆盖所有直起入口**（BUG-242 / 243）。`run-driver` 的守卫判**本次实际会用的
   profile**（`DEFAULT_PROFILE` ∪ 显式 `--profile`）；`boot-run.sh` 对非默认 `DSH_RUN_PROFILE`
   同样 fail-loud（`DSH_ALLOW_STALE_PROFILE=1` 是显式逃生口）。判据与文案收口到
   `checks/lib/channel/profile-guard.mjs`：`profileGuardDecision` + `bootRunGuardProblems`，
   keyless 测试与两个真入口共用。
3. **发布面的 dev-root 闭集补源码根**（BUG-244 / 245）。`src` / `packages` 进入
   `FREE_DEV_ROOTS`；24 个源文件的 28 处 `src/…`/`packages/…` 注释改写成行为/契约描述；
   重建后 `lib/client.js` 的 10 条引用归零。`package.json` 从散文扫描中排除（`repository.directory`
   是 npm 元数据契约，不是 agent 可读路径指令）；README 的源码模块表改成“源码半（构建为 `lib/`）”。
4. **依赖闭包抽动态 import() + host peer 显式 allowlist**（BUG-246 / 247）。`pack-deps` 的 JS 面 =
   `require` ∪ 动态 `import()`；反向判据去掉 `@deepseek-ai/dsh-*` 前缀豁免，改成
   `HOST_ROW_PEERS` 逐条理由的 allowlist（10 条：agent / session / session-projection / tools /
   workspace / api-session-controller / web / web-deepseek-api / web-fetch-http / 团队 Web 层），
   并加 `hostRowIssues` 防 allowlist 腐烂（键必须仍是 peer、理由非空）。
5. **owner 规则允许 helper 间接**（BUG-248）。owner 集 = 直接 lib import ∪ 经
   `tests/**` 非测试 helper 递归得到的 lib import（带环防护）；跨 owner 仍归 `shared/`。
6. **发布 manifest 删除 scripts**（BUG-249）。staging 打包时 `stripScripts`，tarball 的
   `package.json` 不带 `build` / `prepack`；`pack.e2e` 在真 tarball 上断言 scripts 缺席或为空。

## 输掉的方案

1. **删除未消费的 host peer**（如团队 Web 层）：这些 peer 是 preset 依赖的 base 行契约，行以 id
   引用、包名不出现在 YAML；删除会把“合法宿主行”与“死 peer”一起误杀。选显式 allowlist，代价是
   10 条需要随团队层变化维护。
2. **保留前缀豁免 / 只加注释**：死 peer 永久不可见，正是 246 的失败类；不选。
3. **干净室继续从 home 根解析**：profile 级泄漏不可见（240 的假绿），且 home 根解析看不到
   profile 子目录；不选。
4. **禁止 helper 跨 owner 引 lib**：会阻断合理的共享 helper；选“间接闭包 + 跨 owner 归 shared”，
   代价是规则实现要递归。
5. **发布 scripts 白名单**：当前发布包不需要任何 scripts，空白名单与删除等价；删除更简单且
   不会留下“以后再加一个”的模糊空间。
6. **把 `package.json` 也做散文扫描**：会把 `repository.directory` 误判；机器清单由
   files/exports/manifest 判据负责，散文扫描只覆盖 agent 可读文本。

## 实际跑过的验证

- `pnpm verify` 全绿；`pnpm test` 全绿（新增/更新 `pack-deps`、`clean-room-policy`、
  `publish-manifest`、`profile-guard`、`shipped-surface`、`test-owner-mirror`）。
- `node checks/smoke/pack.e2e.mjs`：86 个 tarball 条目；随包文本零 dev 引用（含 `src`/`packages`）；
  tarball manifest 零 devDependencies / workspace / scripts；依赖闭包 = peers（含动态 import 与
  host allowlist）。
- 三个干净室入口：`cold-start` GREEN（仓外 home + tarball + 钉版 DSH）、`lifecycle` ALL PASS、
  `release` ALL PASS（含 `preset.e2e` 真挂载与端口释放）。
- 逐卡红证回放：240 解析基改回 home → profile 用例红；241 换回固定三名 → 新增 peer 用例红；
  242 决策改回只看 DEFAULT_PROFILE → 守卫决策用例红；243 删 boot-run 守卫 → 契约用例红
  （真入口直起旧 exit 1 / 新 exit 2）；244 重建前 `pack.e2e` 红；245 词表加根后当前树 62 条红；
  246 删 allowlist 条目 → `pack.e2e` 红；247 去掉动态抽取 → 端到端用例红；248 加 repo/ helper
  引 channel lib 的 test → owner 用例红；249 关闭 stripScripts 重导出 → `pack.e2e` 红。

## 残余风险

- **host allowlist 的维护面**：10 条理由随团队层/基础 bundle 变化需要复核；allowlist 只挡
  “未登记”，不证明该行仍被使用。
- **`src`/`packages` 词表依赖斜杠**：`AGENTS.md` 这类无斜杠开发件不单判（显式边界；README 随包，
  误伤风险高）。若将来要判，需单独白名单而不是塞进路径词表。
- **`package.json` 不做散文扫描**：其 `repository.directory` 指向仓库内路径是 npm 契约；
  manifest 的 files/exports/scripts 由专门判据覆盖。
- **boot-run 直起守卫的自动化**：keyless 只判脚本契约（静态），真行为红证是本轮手工跑出的
  exit 1→2；normal 路径由 run-driver 守卫覆盖。
- **nightly 未真跑**：三入口与 `pack.e2e` 的改动需下一次夜间/手动触发确认；L1/L4 未跑
  （本轮无模型可见文本变化）。
