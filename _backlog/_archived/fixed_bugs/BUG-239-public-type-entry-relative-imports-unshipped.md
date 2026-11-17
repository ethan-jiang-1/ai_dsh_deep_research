---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-239：公开类型入口的相对 import 目标没随包——tarball 只带 7 个入口，`./locales.ts` / `./config.ts` 解析失败

> 严重级别：P2 ｜ 发现：2026-11-17 ｜ 状态：已修（用户 2026-11-17 拍板：类型面按可达闭包 11 个随包） — 结论：公开类型面按 exports.types 可达闭包 11 文件随包；夹具 + 记录工具 + keyless/pack.e2e 双向对账；去向：implemented — [批 Note](../../../notes/implemented/2026-11-17-runtime-deps-install-boundary.md)；审查：agent — 红证回放 + 全量 verify/test/pack.e2e + 干净室三入口（2026-11-17）
>
> 位置：`packages/deep-research-pack/files` 的类型允许项（7 个入口）与
> `lib/types/client/index.d.ts:17` / `lib/types/fetch-fallback/index.d.ts:18-19` 的相对 import；
> 前序 = [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)（收窄到 7 入口）。
> 探索轮 = 运行时依赖/安装边界第三轮（复核 L2 时发现）。

## 症状

`exports.types` 的 7 个入口里，有两个包含相对 import：

```text
lib/types/client/index.d.ts:17        from './locales.ts'
lib/types/fetch-fallback/index.d.ts:18 from './config.ts'
lib/types/fetch-fallback/index.d.ts:19 from './config.ts'
```

这些目标（`locales.d.ts`、`config.d.ts`，以及 `locales/en.d.ts`、`locales/zh.d.ts`）**没有随包**。
消费者按 `NodeNext` 解析公开类型时直接失败：

```sh
# 解包 tarball 到临时 node_modules，消费者 import 两个公开入口后 tsc --noEmit
# lib/types/client/index.d.ts(17,48): error TS2307: Cannot find module './locales.ts'
# lib/types/fetch-fallback/index.d.ts(18,44): error TS2307: Cannot find module './config.ts'
```

## 分诊与授权

- 严重级：P2 — 运行期不受影响；公开类型面对消费者不可用（类型解析失败）。
- 表面 / 边界：发布类型面 / ② 静态（tarball + 消费者 tsc）
- DSH 不变量：可发布性 —— 公开入口的引用闭包必须随包
- 触及面：pack 公共行为（发布清单）
- 授权：用户 2026-11-17 拍板（类型面按可达相对闭包随包 → 修复就绪 = P2 修复授权）
- 批：运行时依赖/安装边界（第三轮）；前序 = [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md)

## 复现

复现状态：稳定（tarball + 消费者 tsc）。

```sh
rm -rf /tmp/tsconsumer && mkdir -p /tmp/tsconsumer/node_modules/dsh-deep-research-pack
tar -xzf _dist/dsh-deep-research-pack-0.3.6.tgz -C /tmp/tsconsumer/node_modules/dsh-deep-research-pack --strip-components=1
cat > /tmp/tsconsumer/tsconfig.json <<'JSON'
{ "compilerOptions": { "module": "NodeNext", "moduleResolution": "NodeNext", "noEmit": true }, "include": ["consumer.ts"] }
JSON
printf "import type { DeepResearchPackLocaleKey } from 'dsh-deep-research-pack/client'\n" > /tmp/tsconsumer/consumer.ts
./node_modules/.bin/tsc -p /tmp/tsconsumer/tsconfig.json   # TS2307 ./locales.ts
```

## 根因（已证）

BUG-219 的修法把「公开类型面」定义成 `exports.types` 的入口集合，判据也用入口集合比对；
但 declaration 输出的入口会相对 import 类型依赖。收窄 `files` 时按入口截断，闭包被截掉。
判据缺口 = 「发布类型集合 = 入口集合」应为「= 入口的相对 import 可达闭包（含 `.ts`/`.js` specifier 归一）」。

## 牵出的失败类

- 发布面 C2（消费者遗漏）+ C3（同一事实两份定义：入口 vs 闭包）；前序 219 的修法过窄。
- 类级方向 = 类型集合按**可达闭包**判（与 tarball 实际带的对账），不是按入口判。

## 修法

1. `files` 的类型允许项改为 11 个文件（7 入口 + `client/locales.d.ts`、`client/locales/en.d.ts`、
   `client/locales/zh.d.ts`、`fetch-fallback/config.d.ts`）；
2. `shipped-surface` 增加 `typeClosureOf`（纯函数，输入 = 入口 + 读取器）与 `typeSetIssues` 改为
   对闭包判；keyless 测试与 `pack.e2e` 都用同一闭包；
3. 负控 = 从 `files` 删掉任一闭包文件 → 红；多带一个非闭包类型文件 → 红；
4. 消费者 tsc 证据（NodeNext）作为修复判据的一部分。

## 修复判据

- tarball 的 `lib/types/**/*.d.ts` 集合 = 11 个闭包文件；消费者 tsc 解析两个公开入口无 `TS2307`；
- `files` 删一个闭包文件 → pack.e2e / keyless 测试红；多带非闭包文件 → 红；
- `pnpm verify` / `pnpm test` / `pack.e2e` 绿。

## 修复关联

与 [BUG-219](BUG-219-pack-types-unexported-dts-overshipped.md) 同机制（发行物类型面）；
本轮与 229–238 同批收口。修法若改用声明打包器，另开卡（本轮不引入新工具）。

## 修复落地（2026-11-17）

```json fix-evidence
{
  "changes": [
    "packages/deep-research-pack/package.json",
    "checks/lib/repo/shipped-surface.mjs",
    "tests/checks/shipped-surface.test.mjs",
    "checks/smoke/pack.e2e.mjs",
    "tools/record/record-type-closure.mjs",
    "tests/fixtures/shipped/type-closure.json",
    "tests/pack/contract/package-contract.spec.mjs"
  ],
  "red": {
    "command": "node --test tests/checks/shipped-surface.test.mjs",
    "exit": 1,
    "output": "not ok 4 - 发布清单 = 公开类型面可达闭包的反投影… files 缺公开类型文件 lib/types/client/locales.d.ts（exports.types 可达闭包成员）"
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
