---
status: 等人拍板
severity: P2
opened: 2026-11-17
---

# BUG-219：tarball 的 `lib/types` 111 个 `.d.ts` 只有 7 个是 exports 类型入口——104 个内部类型随发布物出货

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：等人拍板（pack 公共行为）
>
> 位置：[packages/deep-research-pack/package.json](../../packages/deep-research-pack/package.json) 的
> `files`（`lib/**` + 仅 `!lib/types/**/*.js`）与 `exports.*.types`（7 个入口）；
> 发布物 = `_dist/dsh-deep-research-pack-0.3.6.tgz`。
> 探索轮 = [运行时/开发边界卡](../issues/2026-11-17-runtime-dev-boundary.md) R1/R3。

## 症状

发布 tarball 共 186 个条目，其中 **111 个是 `lib/types/**/*.d.ts`**；而 `exports` 只声明 **7 个**
类型入口。其余 104 个内部模块 `.d.ts` 对消费者不可达（Node 的 exports map 封死子路径），
却随运行时包一起发布：

```sh
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep -c '^package/lib/types/.*\.d\.ts$'   # 111
node -e "const p=require('./packages/deep-research-pack/package.json'); const t=Object.values(p.exports).filter(v=>v&&v.types).map(v=>v.types); console.log(t.length); console.log(t.join('\n'))"
# 7：index / client/index / fetch-fallback/index / method-library-tool / content/index / startup/index / defaults/index
```

发布物 60% 的条目是开发期类型产物；消费者拿到的是一棵内部源码形状的类型树（`lib/types/lib/...`、
`lib/types/client/...`），不是 7 个公开类型面。

## 分诊与授权

- 严重级：P2 — 发布体积/内容边界；不影响功能，但把开发期类型树当运行时载荷，且未来内部模块增删都会进入发布物。
- 表面 / 边界：发布物（pack tarball）/ ② 静态（manifest + tarball 清单）
- DSH 不变量：fail-loud —— 发布清单应与公开合同（exports）双向相等，而不是「碰巧多带」
- 触及面：pack 公共行为（发布内容）
- 授权：等人拍板（pack 公共行为触面）
- 批：运行时/开发边界第一轮（R1/R3）

## 复现

复现状态：稳定（tarball 现成）。

```sh
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | grep '^package/lib/types/' | sed 's/.*\.//' | sort | uniq -c
# 111 ts
tar -tzf _dist/dsh-deep-research-pack-0.3.6.tgz | wc -l   # 186
```

## 根因（已证）

`files` 用 `lib/**` 广白名单 + 负模式只排 `.js`/`.map`/`.tsbuildinfo`；`lib/types` 由构建
（tsc 声明输出）生成一棵与 `src` 同形的内部树，`exports` 只暴露 7 个入口。`pack.e2e` 只断言
**必需件在场**（`lib/index.js`、`lib/client.js` 等），没有断言「tarball 类型文件集合 = exports 类型入口集合」，
所以多带的 104 个不会被任何门禁看见。

## 牵出的失败类

- 发布清单 = 白名单而非「公开合同的反投影」；C2 消费者遗忘/过度交付 + C7 假绿（只验在场）。
- 与 [BUG-228](BUG-228-pack-files-broad-allowlist-no-set-assertion.md) 同源：`files` 广模式 + 无集合对账。

## 修法

1. `files` 收窄：只列 exports 的 7 个类型入口（或用构建产物清单生成），不再 `lib/**` 全带；
2. `pack.e2e` 加集合断言：tarball `lib/types/**/*.d.ts` 集合 = `exports.*.types` 集合；
3. 邻接：`lib/*.js` 8 个运行时入口 + 内部 chunk 仍保留（它们被 exports/内部 import 消费）。

## 修复判据

- tarball 中 `.d.ts` 数量 = exports 类型入口数（7），无 `lib/types/lib/...` 内部树；
- `pack.e2e` / `package-contract` 同 diff 加集合断言，注入多一个 `.d.ts` → 红；
- `lifecycle.entry` / `release.entry` 仍绿；`pnpm verify` / `pnpm test` 绿。

## 修复关联

与 [BUG-228](BUG-228-pack-files-broad-allowlist-no-set-assertion.md)（`files` 广白名单）同批；
建议先定「公开类型面 = exports.types」再收 `files`。
