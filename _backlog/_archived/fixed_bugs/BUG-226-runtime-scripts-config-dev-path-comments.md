---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-226：发布物脚本与配置注释带开发面路径——`scripts/lib/*` 的 `tests/`、`cordis/presets` 的 `_backlog`/`notes`/`docs`

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（自授权 P2：改注释 + 加扫描） — 结论：scripts/lib 与 cordis/presets 注释清 dev 路径；运行期理由保留；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e（2026-11-17）
>
> 位置：[packages/deep-research-pack/scripts/lib](../../../packages/deep-research-pack/scripts/lib)（随包 runtime 脚本）·
> [cordis.patch.yml](../../../packages/deep-research-pack/cordis.patch.yml) ·
> `presets/*.patch.yml`；探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-dev-boundary.md) R3。

## 症状

发布物里的**运行时脚本**（doctor 的依赖）和**运行时组合配置**，注释仍指开发仓：

```text
scripts/lib/version-range.mjs:6   扩测试（tests/pack/scripts/version-range.spec.mjs）。
scripts/lib/install-anchor.mjs:12 tests/pack/scripts/install-anchor.spec.mjs 直接断言。
scripts/lib/dsh-home.mjs:10       tests/pack/scripts/dsh-home.spec.mjs 直接断言。
cordis.patch.yml:49-50            _backlog/_archived/fixed_bugs/…；notes/implemented/…
cordis.patch.yml:73-74            _backlog/research/…；notes/implemented/…
presets/{lead,scout,analyst,critic}.patch.yml:3-4   docs/design/…；notes/archived/…
presets/method-editor.patch.yml:5  docs/design/…
```

`scripts/` 是 tarball 的运行时依赖（doctor 的 7 件），`cordis.patch.yml`/`presets/` 是随包组合行；
路径在包内不存在。`presets/*.patch.yml` 的注释还自述「（开发仓，不随包）」——知道不该随包，
却仍在随包文件里。

## 分诊与授权

- 严重级：P2 — 发布文本边界；不影响运行（YAML 注释被解析器忽略；JS 注释不执行）。
- 表面 / 边界：发布运行时脚本 + 组合配置 / ② 静态（tarball 文本）
- DSH 不变量：可发布性；运行时文件不应引用开发面
- 触及面：none（注释清理；不改脚本/配置行为）
- 授权：自授权（P2 修理型）
- 批：运行时/开发边界第一轮（R3）

## 复现

复现状态：稳定。

```sh
grep -rnE 'tests/|checks/|_backlog|docs/|notes/' packages/deep-research-pack/scripts packages/deep-research-pack/cordis.patch.yml packages/deep-research-pack/presets/*.patch.yml
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -E 'package/(scripts|cordis|presets)' | wc -l
```

## 根因（已证）

三处作者各自把「开发侧理由/迁移史」写进随包文件；没有发布物文本扫描（[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md)），
`doc-paths` 又只验仓内存在性（`tests/...` 在仓内存在 → 绿），所以从发布边界看是静默的。

## 牵出的失败类

- 发布面 C11 + C2；与 [BUG-224](BUG-224-pack-client-bundle-dev-path-comments.md) / [BUG-225](BUG-225-pack-dts-dev-path-comments.md)
  同族，但载体是手写 runtime 脚本/配置，不是构建产物。
- 类修方向 = 发布物文本零 dev 引用（scripts/config/lib/README/skills 同一守卫）。

## 修法

1. `scripts/lib/*` 注释改为行为描述（如「只依赖 node:path/os」），测试归属留给仓库 `scripts/lib` 的 dev 文档；
2. `cordis.patch.yml` / `presets/*.patch.yml` 注释只留运行期理由；迁移史/D 号/旧卡路径移入 `notes/`（仓内）；
3. 发布物扫描加 YAML/JS 注释面（BUG-227），负控 = 注入 `_backlog/__gone__.md` 必红。

## 修复判据

- `scripts/**`、`cordis.patch.yml`、`presets/*.patch.yml` 零 `tests/|checks/|_backlog|docs/|notes/`；
- doctor / preset 加载 / 组合行行为不变（`preset.e2e` / `doctor.e2e` / `lifecycle.entry` 绿）；
- 发布物扫描红证；`pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-224](BUG-224-pack-client-bundle-dev-path-comments.md) / [BUG-225](BUG-225-pack-dts-dev-path-comments.md) /
[BUG-227](BUG-227-pack-boundary-no-shipped-dev-ref-gate.md) 同变更。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/scripts/lib/credentials-status.mjs",
    "packages/deep-research-pack/scripts/lib/dsh-home.mjs",
    "packages/deep-research-pack/scripts/lib/install-anchor.mjs",
    "packages/deep-research-pack/scripts/lib/version-range.mjs",
    "packages/deep-research-pack/cordis.patch.yml",
    "packages/deep-research-pack/presets/lead.patch.yml",
    "packages/deep-research-pack/presets/scout.patch.yml",
    "packages/deep-research-pack/presets/analyst.patch.yml",
    "packages/deep-research-pack/presets/critic.patch.yml",
    "packages/deep-research-pack/presets/method-editor.patch.yml",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "scripts/lib/version-range.mjs:6 随包文本引用开发面 tests/pack/scripts/version-range.spec.mjs"
  },
  "green": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/repo/shipped-surface.test.mjs"
  }
}
```
