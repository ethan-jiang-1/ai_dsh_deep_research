---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-139：research-defaults.json 带 UTF-8 BOM 即被判「parse 错」——整份设置失效，Windows 编辑器常规产出

> 严重级别：P2 ｜ 发现：2026-11-13 ｜ 状态：已修 — parseDefaults 剥 UTF-8 BOM；合法 BOM 文件正常读，坏 JSON 仍报 parse（2026-11-13，去向：none — 缺陷修复，审查：agent 自审 + 机械门禁/真模型探针）。
>
> 位置：`packages/deep-research-pack/src/lib/research-defaults.ts` 的 `parseDefaults`（`JSON.parse(text)`，未剥 BOM）。

## 症状

用户手工编辑（Windows 记事本、PowerShell `Out-File`、部分 IDE 的「UTF-8 with BOM」）后的
`research-defaults.json` 内容完全合法，但首字节是 BOM（`EF BB BF`）：

```
plain: {"value":{"schema":1,"revision":2,"effort":"deep"},"problems":[]}
BOM  : {"value":{"schema":1,"revision":0},"problems":[{"field":"file","code":"parse",
        "detail":"Unexpected token '﻿', \"﻿{\n  \"sche\"... is not valid JSON"}]}
```

后果链：

- 命令 `/research-defaults show` → `error invalid file=parse`（用户看到「无效」但不知是 BOM）；
- 客户端面板 → `problems` 非空 → invalid banner；`phase` 仍 ready，但写入被命令拒绝；
- `research:defaults` prompt 段 → `fatal`（parse）→ **整段不注入**，模型拿不到任何默认；
- 唯一修复路径是 `clear`（删文件）——用户会丢掉全部已设默认。

## 复现

```sh
TSX_TSCONFIG_PATH="$(pwd -P)/packages/deep-research-pack/tsconfig.client.json" \
node --import tsx/esm -e "
import { parseDefaults } from './packages/deep-research-pack/src/lib/research-defaults.ts';
const json = JSON.stringify({ schema: 1, revision: 2, effort: 'deep' }, null, 2);
console.log(JSON.stringify(parseDefaults('\uFEFF' + json).problems));   // → file=parse
"
# 或：printf '\xEF\xBB\xBF{"schema":1,"revision":2,"effort":"deep"}' > /tmp/ws/research-defaults.json
#     node scripts/run-ops/...（show 命令）→ error invalid file=parse
```

同类面：`scripts/lib/frontmatter.mjs` 的 `^---` 也不剥 BOM（但在场文件由工具写，风险低）；
`research-defaults.json` 是**明确允许用户手改**的设置文件，BOM 是常规产出。

## 根因（已证）

`parseDefaults` 直接 `JSON.parse(text)`；Node 的 JSON.parse 遵循严格 JSON，**拒绝 BOM**（U+FEFF 在值外）。
RFC 8259 §8.1 允许实现忽略 BOM，成熟配置读取器一般先剥。当前实现没有这一步，也没有把「BOM」识别为
可操作的错误（detail 只是一句 JSON 报错）。

## 影响面

- Windows/部分编辑器用户第一次手改设置就「整份无效」，且错误信息不指向 BOM；
- 面板 invalid + prompt 不注入（静默降级到 auto），用户以为设置生效而 Lead 完全没看到；
- 与 [BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md) 同属「用户输入的小偏差被静默/晦涩吞掉」。

## 修复判据

1. `parseDefaults` 入口剥 UTF-8 BOM（`text.replace(/^\uFEFF/, '')`；或先 `trimStart` 再剥），
   仅影响首字符，不改其他行为；
2. 先红后绿：BOM + 合法 JSON → problems 为空、value 正常（当前红）；无 BOM 行为不变；BOM + 坏 JSON
   仍报 parse 错；
3. 可选：`show` 的错误文案把 BOM 单独归类（`file=bom`）并提示「另存为 UTF-8（无 BOM）」；
4. 顺带核对：`frontmatter.mjs` 是否要同样剥 BOM（同一用户手改面若存在）——若不动，至少在 README 注明；
5. `pnpm test` + `pnpm verify` 绿；真实 BOM 文件手测 show/set/panel。

## 修复关联

D50 设置面；与 [BUG-131](BUG-131-defaults-unknown-key-warnings-unsurfaced.md)（未知键静默）/
[BUG-133](BUG-133-sanitize-patch-nested-unknown-keys-silent.md)（嵌套未知键静默）同族：用户输入的
小偏差要么正确容忍、要么可操作地报错。发现方式 = 设置文件编码边界。

## 已落地（2026-11-13）

- 证据 = `tests/pack/research-defaults.test.mjs` BUG-139。
- 全量 `pnpm test` 1355 绿、`pnpm verify` 全绿；defaults-probe ALL PASS。
- 去向 = none。
