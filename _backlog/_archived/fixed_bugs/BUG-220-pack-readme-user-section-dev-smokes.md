---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-220：pack README 的用户段让用户跑 `node checks/smoke/…`——`checks/` 不在 tarball 里

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 放行 pack/文档触面：用户段零 dev 命令，维护者折叠段保留） — 结论：README 用户段（折叠区外）零开发命令/路径；readme-shape 与 keyless 测试消费同一判据；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-shipped-boundary-self-contained.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e（2026-11-17）
>
> 位置：[packages/deep-research-pack/README.md](../../../packages/deep-research-pack/README.md) 第 250/264 行
> （zh 对应 [README.zh.md](../../../packages/deep-research-pack/README.zh.md) 第 234/248 行）；
> 发布物 = `_dist/dsh-deep-research-pack-0.3.6.tgz`（README 由 npm 自动包含）。
> 探索轮 = [运行时/开发边界卡](../settled_issues/2026-11-17-runtime-dev-boundary.md) R2。

## 症状

README 的「Token effect」用户段把开发仓的冒烟命令当作**重生成方法**写给读者：

```text
README.md:250  — regenerate via `node checks/smoke/method-library-tool.e2e.mjs`.
README.md:264  `node checks/smoke/model-experience.e2e.mjs` prices the real assembled first request.
README.zh.md:234/248  同两条的中文版
```

`checks/` 不在 tarball（186 条目里只有 `lib/`、`presets/`、`content/`、`scripts/`、`workers/`、
locale、README），用户按 README 敲会得到 `MODULE_NOT_FOUND`；README 又被 npm 自动打进包，
所以这是**发布文档里的开发命令**，不是仓库内维护者旁注。

维护者折叠段（`Working context for maintainers`）里的 `pnpm build` / `npm pack` 属显式维护者语境，
不是本卡的主症状；但同一 README 里用户段与维护者段都混有开发命令，读者无法区分。

## 分诊与授权

- 严重级：P2 — 用户按文档操作必失败；文档合同的准确性，不是运行期错误。
- 表面 / 边界：发布文档（pack README）/ ② 静态（README 文本 + tarball 内容）
- DSH 不变量：fail-loud —— 文档给用户的命令必须在用户可获得的包装里可执行
- 触及面：pack 公共行为 + 文档合同
- 授权：用户 2026-11-17 放行（pack/文档触面 → 修复就绪 = P2 修复授权；用户段/维护者段分界已拍板）
- 批：运行时/开发边界第一轮（R2）

## 复现

复现状态：稳定。

```sh
grep -n 'node checks/' packages/deep-research-pack/README.md packages/deep-research-pack/README.zh.md
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c '^package/checks/'   # 0
node checks/smoke/method-library-tool.e2e.mjs   # 仓内可跑；解包后的用户没有 checks/
```

## 根因（已证）

README 的「Token effect」段由包作者维护，把**重生成命令**写成了读者的操作步骤；`readme-shape`
门禁只查 README 形状（kind/模板节/七问/长度/安装序），不查「用户可见段是否引用仓内开发路径/命令」；
`doc-paths` / `call-surface` 只检查仓内路径是否存在（`checks/` 在仓内存在 → 绿），不检查
「该路径是否随包发布」。

## 牵出的失败类

- C11 文档/规则漂移 + 发布面 C2：开发命令进入用户可见段；门禁只验仓内存在，不验发布可达。
- 同族 = [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md)（模型可见 skill 引用 dev 文件）。

## 修法

1. 用户段删掉 `node checks/...`，改为面向用户的结果说明（重生成是维护者动作，见维护者折叠段）——用户 2026-11-17 拍板保留折叠段；原文的分支「整体移入
   `Working context for maintainers` 折叠区；
2. 维护者段保留但明确「仓库内命令，不随包」；
3. `readme-shape` 加一条：用户可见段（折叠区之外）不得出现 `node checks/|pnpm |npm pack|tools/|tests/`，
   负控 = 注入 `node checks/__gone__.mjs` 必红。

## 修复判据

- 用户可见段零 `node checks/` / `pnpm ` 命令；zh/en 同改；
- `readme-shape` 新判据在注入 dev 命令时红、正常 README 绿；
- `lifecycle.entry` / `release.entry` 绿；`pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-221](BUG-221-runtime-skill-references-dev-check-file.md) 同批（发布文本 dev 引用）；
建议同一修法评审（"发布文本零 dev 引用"）。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/README.md",
    "packages/deep-research-pack/README.zh.md",
    "checks/verify/gates/b-pack.mjs",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs",
    "checks/lib/harness/gates-cases.mjs",
    "docs/evaluation.md"
  ],
  "red": {
    "command": "node checks/verify/verify.mjs --only=readme-shape",
    "exit": 1,
    "output": "README 用户段出现开发命令「`pnpm build」（第 310 行）——维护者动作放 <details> 折叠段"
  },
  "green": {
    "command": "node checks/verify/verify.mjs --only=readme-shape",
    "exit": 0
  },
  "guard": {
    "path": "tests/checks/shipped-surface.test.mjs"
  }
}
```
