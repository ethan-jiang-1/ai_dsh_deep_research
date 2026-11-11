# 驾驶舱 i18n 覆盖：组件字面量与数据面折叠文案

> 状态：implemented

## 决定

驾驶舱的用户可见文案**全部由 `client/locales/` 的字典拥有**，分两层：chrome 字典（`zh.ts` / `en.ts`，页签、按钮、空态、提示）与数据面字典（`zh-fold.ts` / `en-fold.ts`：七步标签、业务摘要、图谱状态词、版本面、活动行、回执、rerun 三改法、执行面/标本）。`zh` 拥有键集，`en` 由 `Record<DeepResearchPackLocaleKey, string>` 约束；`locales.ts` 只做再导出。

产文案的折层函数（`run-fold` / `brief-fold` / `activity-fold` / `member-activity` / `run-version` / `graph-model` / `plan-diff` / `plan-index` / `plan-graph` / `state-note` / `config-model` / `rerun-triage` / `tool-card` / `receipt-fold`）接受可选 `PackTranslate`（`src/lib/i18n.ts`），**UI 组件必须传 `props.t`**；非 UI 消费面（run-dashboard、冒烟、keyless 测试）缺省走 `translateZh`，保持中文优先（延续 2026-11-03 用户拍板口径）。模型面指令（方法编辑首问上下文/动作/手改回传、写库工具指令）搬进 `coach-prompts.ts` / `operation-prompts.ts`，与 UI 面分离；内置打法名、摘要、四字段内容、领域示范与判型映射是产品数据，不是 chrome，保持原文。

守卫面四层：① `tests/cockpit/locales.test.mjs` 钉 zh/en 键集、逐键占位符、en 值零 CJK，并静态渲染方法库视图 + 研究状态/研究图谱空态断言英文零 CJK；② `tests/cockpit/i18n.test.mjs` 对每个产文案的折层函数在 `en` 下断言零 CJK；③ `tests/cockpit/cjk-source.test.mjs` 用 TS AST 扫 `src/client` + `src/lib` 的中文字面量（注释不算、`console.*` 参数不算），模型面/数据面/格式面按文件登记理由，孤立数据键用同行 `i18n-ignore:` 标注；④ 既有 `tests/pack/client-locale.test.mjs` 继续钉 index.ts 的 chrome 不走字面量。

## 输掉的方案

- **让 `t` 成为折层函数的必填参数**：要改 100+ 个测试与 scripts 调用点，而 dashboard/冒烟/测试本来就该保持中文优先；缺省 `translateZh` 让非 UI 面零改动，UI 漏传由守卫面兜。
- **整文件 allowlist `MethodLibraryView` / `useOperationQueue`**：这两件同时有 UI 与模型面，整文件豁免会掩盖未来 UI 硬编码；改成把 prompt 段搬进独立模型面模块，组件本身接受扫描。
- **翻译模型面指令**：会改变模型行为与 prompt 字节；bug 判据明确不在此列。
- **翻译内置打法/领域示范内容**：属产品内容本地化决定，不是 chrome 覆盖；英文界面里这些条目保持中文原文，另案处理。
- **保留单文件 `locales.ts`**：521 键会越过 client 单文件 500 行上限；拆 chrome/fold 两个文件后各自可读，键集仍由 zh 侧统一约束。

## 实际跑过的验证

- `pnpm typecheck` → exit 0。
- `pnpm test` → 1,209 pass / 0 fail（含新增 locales、i18n、cjk-source 三组守卫）。
- `pnpm build` → exit 0（host + client bundle 重建）。
- `pnpm verify` → 全绿（含 cockpit-doc-registry：新件已登记在 `docs/design/40-research-cockpit.md` §2 件表）。
- `node --import tsx/esm scripts/smoke/client-load-smoke.mjs --seed tests/fixtures/client-load-home --port 3114` → ALL PASS（观察面 / 方法库新建-编辑-窄屏全链 / 研究配置 / 图谱 / 终稿；浏览器档钉 `zh-CN`（BUG-059），英文面由静态 en 渲染 + 数据面 en 断言 + 源码扫描覆盖）。
- CJK 扫描守卫反证：首跑即红出 client 组件与宿主文件的中文字面量（随后按模型面/数据面登记 allowlist）；`cjk-source.test.mjs` 自检对合成源码断言「JSX 文本/字符串字面量红、`i18n-ignore` 豁免、`console.*` 不咬」。

## 环境状态

macOS；Node 22.23.1；pnpm 11.7.0；Playwright 浏览器来自本仓 devDependencies。
