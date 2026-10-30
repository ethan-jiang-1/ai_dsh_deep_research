// b-pack.mjs — 域 B · pack 与驾驶舱：preset/bundle 形状、client 半声明、keyed 字面量、构成正本登记。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { satisfiesVersion } from '../../../packages/deep-research-pack/scripts/lib/version-range.mjs';
import { ROOT, PACK, PRESETS, VENDOR_TAG, fail, walk, walkMany, trackedFiles } from '../context.mjs';

export function runB() {
// ── preset-structure（0.1.7 形态：presets/<role>.patch.yml 一条 @deepseek-ai/dsh-agent-preset
//    行，行内 config 带 id/name/description/order/plugins；角色技能仍在 presets/<role>/skills/，
//    ≥1 个且 frontmatter name = 目录名）──
{
  const gate = 'preset-structure';
  if (!existsSync(PRESETS)) fail(gate, `presets 目录不存在: ${relative(ROOT, PRESETS)}`);
  else {
    const patches = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml'));
    if (patches.length === 0) fail(gate, 'presets/ 下没有任何 <role>.patch.yml（0.1.7 preset = 一条行）');
    for (const f of patches) {
      const id = f.replace(/\.patch\.yml$/, '');
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(gate, `角色 id 不合规: ${id}（须 ^[a-z0-9][a-z0-9-]*$）`);
      const yml = readFileSync(join(PRESETS, f), 'utf8');
      if (!new RegExp(`^\\s*- id: preset-${id}\\s*$`, 'm').test(yml))
        fail(gate, `${f}: 缺 \`- id: preset-${id}\` 声明行`);
      if (!/^\s+name:\s*'@deepseek-ai\/dsh-agent-preset'\s*$/m.test(yml))
        fail(gate, `${f}: 声明行 name 须为 '@deepseek-ai/dsh-agent-preset'`);
      for (const field of ['id:', 'name:', 'description:', 'order:', 'plugins:']) {
        if (!new RegExp(`^\\s+${field}`, 'm').test(yml)) fail(gate, `${f}: config 缺字段 ${field}`);
      }
      // 时钟行（D32）：日期类事实必须有原生读数来源，每个角色统一挂 time-context。
      // 缺席不是风格问题——手册的日期契约会退回「用网页校准」，实测 4 处 journal 未来日期。
      const clocks = [...yml.matchAll(/^\s*- id: time-context\s*$/gm)].length;
      if (clocks !== 1) fail(gate, `${f}: 须恰有一条 \`- id: time-context\`（D32 时钟行，当前 ${clocks} 条）——补 \`- id: time-context\` + name: '@deepseek-ai/dsh-time-context'`);
      else if (!/^\s+name:\s*'@deepseek-ai\/dsh-time-context'\s*$/m.test(yml))
        fail(gate, `${f}: time-context 行的 name 须为 '@deepseek-ai/dsh-time-context'`);
      const skillsDir = join(PRESETS, id, 'skills');
      if (!existsSync(skillsDir)) { fail(gate, `${id}: 缺 presets/${id}/skills/`); continue; }
      const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
      if (skills.length === 0) fail(gate, `${id}: skills/ 下没有任何技能目录`);
      for (const s of skills) {
        const skillMd = join(skillsDir, s.name, 'SKILL.md');
        if (!existsSync(skillMd)) { fail(gate, `${id}: skills/${s.name}/ 缺 SKILL.md`); continue; }
        const fm = readFileSync(skillMd, 'utf8').split('---');
        if (fm.length < 3) { fail(gate, `${id}/skills/${s.name}/SKILL.md: 缺 frontmatter`); continue; }
        if (!new RegExp(`^name:\\s*${s.name}\\s*$`, 'm').test(fm[1]))
          fail(gate, `${id}/skills/${s.name}/SKILL.md: frontmatter name ≠ 目录名`);
      }
    }
  }
}

// ── pack-bundle-compat（dsh.bundle.patch 指向真实文件；dshReleases 非空）──
{
  const gate = 'pack-bundle-compat';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) { fail(gate, 'deep-research-pack/package.json 不存在'); }
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const patch = pkg?.dsh?.bundle?.patch;
    if (!patch) fail(gate, 'dsh.bundle.patch 未声明');
    else {
      const list = Array.isArray(patch) ? patch : [patch];
      if (list.length === 0) fail(gate, 'dsh.bundle.patch 为空');
      for (const rel0 of list) {
        if (typeof rel0 !== 'string' || !existsSync(join(PACK, rel0))) fail(gate, `dsh.bundle.patch 指向的文件不存在: ${String(rel0)}`);
      }
      // 0.1.7：preset 即行，bundle 必须随包携带自己的 preset patch（否则角色根本没被声明）
      const presetPatches = list.filter((x) => typeof x === 'string' && /presets\/[a-z0-9-]+\.patch\.yml$/.test(x));
      if (presetPatches.length === 0) fail(gate, 'dsh.bundle.patch 未携带任何 presets/<role>.patch.yml（0.1.7 preset 行随 bundle 装载）');
      // 覆盖完整性（2026-09-26 复验发现：原判据只要"≥1 条"，新增角色忘登记第 5 条会**绿而坏**）：
      // 盘上每个 presets/<role>.patch.yml 都必须在数组里——事实源 = 盘上目录（同 role-list-sync）。
      if (existsSync(PRESETS)) {
        const onDisk = readdirSync(PRESETS).filter((f) => /\.patch\.yml$/.test(f)).map((f) => `./presets/${f}`);
        if (onDisk.length === 0) fail(gate, '防空语料：presets/ 下零个 .patch.yml');
        for (const rel1 of onDisk) {
          if (!list.includes(rel1)) fail(gate, `presets/${rel1.replace('./presets/', '')} 在盘上但未登记进 dsh.bundle.patch——新增角色漏登记 = 绿而坏`);
        }
      }
    }
    const rel = pkg?.dsh?.compatibility?.dshReleases;
    if (!Array.isArray(rel) || rel.length === 0) fail(gate, 'dsh.compatibility.dshReleases 为空');
    // 含当前 tag（release-smoke-hardening 件⑤b）：升 pin 忘把新 tag 加进兼容矩阵，原本要到
    // L2 安装冒烟才现形——提前到 L0 秒级红（判据同 release-smoke ④，事实源前移到 verify）。
    else if (!rel.includes(VENDOR_TAG.replace(/^dsh-v/, '')))
      fail(gate, `compatibility.dshReleases 不含当前 vendor 版本 ${VENDOR_TAG.replace(/^dsh-v/, '')}——升 pin 忘加列（补 packages/deep-research-pack/package.json 的 dsh.compatibility.dshReleases）`);
    // 宿主只认 engines.dsh；兼容矩阵是“已测基线”，不要求等于精确值，但必须是范围覆盖的版本。
    const engine = pkg?.engines?.dsh;
    if (typeof engine !== 'string' || engine.trim() === '')
      fail(gate, 'engines.dsh 未声明——宿主兼容检查会退回 peer 范围（补 packages/deep-research-pack/package.json 的 engines.dsh）');
    else if (!satisfiesVersion(VENDOR_TAG.replace(/^dsh-v/, ''), engine))
      fail(gate, `engines.dsh ${engine} 不覆盖当前 vendor tag ${VENDOR_TAG}——范围写窄或写错`);
  }
}

// ── client-half（pack 的 client 半声明闭环——release-smoke-hardening 件⑤a）──
// 为什么：vendor 的 validateClientHalvesDeclared() 只 glob vendor 树内 packages/client/*，仓外
// pack 的 client 半在它射程外（company postmortem 0002 §Why every safety net missed it：上游
// 门禁有 scope，out-of-tree pack 落在外面——本地镜像同款规则）。任一方向脱钩都是静默失效：
// 有 exports 无声明 = 浏览器模块表永不枚举（client 半等于不存在）；有声明无 exports = 装载
// 入口缺席。本门禁守声明面；真实安装形状（lib/client.js 在场）归 L2 release-smoke。
{
  const gate = 'client-half';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) fail(gate, 'deep-research-pack/package.json 不存在');
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const exportsClient = pkg?.exports?.['./client'] !== undefined;
    const declaresClient = pkg?.dsh?.client !== undefined;
    if (exportsClient && !declaresClient)
      fail(gate, 'exports ./client 但未声明 dsh.client——浏览器模块表永不枚举本包 client 半（补 package.json 的 dsh.client 声明；company postmortem 0002 同款）');
    else if (declaresClient && !exportsClient)
      fail(gate, '声明 dsh.client 但 exports 无 ./client——client 半无装载入口（补 exports 的 "./client" 行）');
  }
}

// ── row-deps（preset 与 bundle 行引用的 @deepseek-ai/* 包必须在 peerDependencies）──
{
  const gate = 'row-deps';
  const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
  const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
  const declFiles = [
    ...readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => join(PRESETS, f)),
    join(PACK, 'cordis.patch.yml'),
  ];
  for (const f of declFiles.filter(existsSync)) {
    const yml = readFileSync(f, 'utf8');
    for (const m of yml.matchAll(/name:\s*['"](@deepseek-ai\/[^'"]+)['"]/g)) {
      if (!peers.has(m[1])) fail(gate, `${relative(ROOT, f)}: 行依赖 ${m[1]} 未声明进 peerDependencies`);
    }
  }
}

// ── pack-contract-sync（pack 的 tracked yml/md 零 runs/ 旧契约路径——persona
//    经系统提示注入、skill 经加载注入，携带已废目录契约即污染 run；D17 事故 2：pack
//    不在首轮 sweep 清单，13 处残留漏网被用户实测抓到）──
{
  const gate = 'pack-contract-sync';
  const r = spawnSync('git', ['ls-files', '--', 'packages/deep-research-pack'], { cwd: ROOT, encoding: 'utf8' });
  const files = (r.stdout || '').split('\n').filter((f) => /\.(yml|md)$/.test(f));
  if (files.length === 0) fail(gate, 'packages/deep-research-pack 下无 tracked yml/md（ls-files 空）');
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    const m = text.match(/runs\//g);
    if (m) fail(gate, `${f}: 携带已废目录契约 runs/（×${m.length}）——D17 后 run bundle = drt_<slug>/`);
  }
}

// ── role-list-sync（角色清单单一事实源 = 盘上 presets/；代码里出现角色清单字面量 → 红）──
// 检测名从盘上目录现取（门禁自身零硬编码，新角色入列即自动纳入检测）。典型咬合形态：
//   ① 单行 ≥3 个角色名 token（JS 数组 / bash for-in 列表）；② [...] 数组块内 ≥3 个角色名字符串。
// 合法的 ≤2 共现（探针成员名、prompt 覆盖对象逐行键）不触发。消费点应 import scripts/lib/roles.mjs。
{
  const gate = 'role-list-sync';
  const roleNames = readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => f.replace(/\.patch\.yml$/, ''));
  if (roleNames.length === 0) fail(gate, 'presets/ 下没有任何 <role>.patch.yml（单一事实源为空）');
  else {
    const tokenOf = (n) => new RegExp(`(^|[^a-z0-9-])${n}([^a-z0-9-]|$)`);
    const codeFiles = walkMany([join(ROOT, 'scripts'), join(ROOT, 'tests'), join(ROOT, 'dev')])
      .filter((f) => /\.(mjs|sh)$/.test(f) && !f.includes('smoke-workspace') && !f.includes('node_modules'));
    for (const f of codeFiles) {
      const text = readFileSync(f, 'utf8');
      for (const line of text.split('\n')) {
        const hits = roleNames.filter((n) => tokenOf(n).test(line));
        if (hits.length >= 3) fail(gate, `${relative(ROOT, f)}: 角色清单硬编码（单行 ${hits.length} 个角色名：${hits.join(', ')}）——清单事实源 = 盘上 presets/，JS 用 scripts/lib/roles.mjs、bash 用目录枚举`);
      }
      for (const m of text.matchAll(/\[[^\[\]]*\]/gs)) {
        const hits = roleNames.filter((n) => new RegExp(`['"\`]${n}['"\`]`).test(m[0]));
        if (hits.length >= 3) fail(gate, `${relative(ROOT, f)}: 角色清单硬编码（[...] 数组块含 ${hits.length} 个角色名：${hits.join(', ')}）——清单事实源 = 盘上 presets/，JS 用 scripts/lib/roles.mjs`);
      }
    }
  }
}

// ── client-keys（观察面 client 的 keyed 字面量单一正本——company 坑 1：
//    "a typo simply never renders"，key 拼错不报错永不渲染。规则：① src/client/ 下任意层级的
//    key/槽名字面量只许住 src/client/keys.ts（别处出现即红——杜绝第二份会漂移的清单）；② slots.inject 的第一参，
//    register 描述符的 name/key/id 只许用标识符（引号字面量即红），且必须出自 keys.ts 的导出；
//    ③ keys.ts 至少一个导出、src/client 至少一个文件（防空集——D18 边界内 client 面常在）。）──
{
  const gate = 'client-keys';
  const clientDir = join(PACK, 'src', 'client');
  if (!existsSync(clientDir)) { fail(gate, 'packages/deep-research-pack/src/client/ 缺席（D18：观察面 client 面常在）'); }
  else {
    const files = walk(clientDir).filter((abs) => /\.(ts|tsx)$/.test(abs)).map((abs) => relative(clientDir, abs));
    if (files.length === 0) fail(gate, 'src/client/ 无 .ts/.tsx（防空集：D18 边界内 client 面常在）');
    const keysPath = join(clientDir, 'keys.ts');
    const keysFile = existsSync(keysPath) ? readFileSync(keysPath, 'utf8') : '';
    if (!existsSync(keysPath)) fail(gate, 'src/client/ 缺 keys.ts（keyed 字面量的唯一正本）');
    else {
      const keyExports = new Set([...keysFile.matchAll(/export const (\w+) = '/g)].map((m) => m[1]));
      if (keyExports.size === 0) fail(gate, 'keys.ts 无 `export const X = \x27…\x27` 导出（防空集）');
      // keyed 数组族（工具名族）也以 keys.ts 为唯一正本（审计 P3 件①）：族导出只许住
      // keys.ts，族值（wire 工具名等）在别处以引号字面量出现即红——值位拼错同样永不渲染。
      const familyExports = new Map(
        [...keysFile.matchAll(/export const (\w+) = \[([^\]]*)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((q) => q[1])]),
      );
      const familyValues = new Map();
      for (const [name, vals] of familyExports) for (const v of vals) familyValues.set(v, name);
      for (const f of files) {
        if (f === 'keys.ts') continue;
        const text = readFileSync(join(clientDir, f), 'utf8');
        // ① 槽名/包键字面量只许住 keys.ts。**类型位豁免**：PropsRuntime<'…'> 的泛型参数是
        //    编译期对 SlotMap 键检查的（拼错 = TS 红），不是本门禁要防的值位静默失效面——
        //    先抹掉类型位再扫（边界形态实证：Stage 2 的 PropsRuntime 用法被本门禁误咬，
        //    2026-09-25 收窄）。
        const valuePositionText = text.replace(/PropsRuntime<[^>]*>/g, '')
        for (const m of valuePositionText.matchAll(/['"](sidebar\.right\.[a-z.]+|dsh-deep-research-pack\/[a-z-]+)['"]/g))
          fail(gate, `src/client/${f}: keyed 字面量 ${m[1]} 出现在 keys.ts 之外（单一正本 = keys.ts，用导出的常量）`);
        // ② inject 首参与描述符 name/key/id 只许标识符，且出自 keys.ts
        for (const m of text.matchAll(/slots\.inject\(\s*(['"][^'"]+['"])/g))
          fail(gate, `src/client/${f}: slots.inject 首参是字面量 ${m[1]}——须用 keys.ts 导出的常量（拼错即永不渲染）`);
        for (const m of text.matchAll(/\b(name|key|id):\s*(['"][^'"]+['"])/g)) {
          if (/^(name|key|id)$/.test(m[1]) && /sidebar\.right\.|dsh-deep-research-pack\//.test(m[2]))
            fail(gate, `src/client/${f}: 描述符 ${m[1]}: 是 keyed 字面量 ${m[2]}——须用 keys.ts 导出的常量`);
        }
        for (const m of text.matchAll(/slots\.inject\(\s*(\w+)\s*[,)]/g))
          if (!keyExports.has(m[1])) fail(gate, `src/client/${f}: slots.inject(${m[1]}) 的标识符不在 keys.ts 导出里`);
        for (const m of text.matchAll(/\b(?:name|key|id):\s*(\w+)\s*[,}]/g)) {
          if (/^(RESEARCH|TAB|PANE|KEY|SLOT)/.test(m[1]) && !keyExports.has(m[1]))
            fail(gate, `src/client/${f}: 描述符用的 ${m[1]} 不在 keys.ts 导出里`);
        }
        // ③ keyed 数组族导出只许住 keys.ts（件①反证：RESEARCH_TOOL_KEYS 曾住 ResearchToolCard.tsx——
        //    族清单的第二份家 = 漂移面）。豁免 `inject`：Cordis 函数式插件的具名依赖声明
        //    （宿主合同，非 keyed 槽族——DSH 插件术语页的 name/inject/Config/apply 形态）。
        for (const m of text.matchAll(/export const (\w+)\s*=\s*\[/g))
          if (m[1] !== 'inject')
            fail(gate, `src/client/${f}: keyed 数组族导出 ${m[1]} 出现在 keys.ts 之外（单一正本 = keys.ts）`);
        // ④ 族值字面量（wire 工具名等）在 keys.ts 之外以引号出现即红——用 keys.ts 的族导出
        for (const m of text.matchAll(/['"]([^'"]+)['"]/g))
          if (familyValues.has(m[1]))
            fail(gate, `src/client/${f}: 工具名族值 "${m[1]}" 字面量出现在 keys.ts 之外（用 ${familyValues.get(m[1])} 导出）`);
        // ⑤ register 描述符的 shorthand `key,` 形态（无冒号——②的盲区）：取值来源必须可溯到
        //    keys.ts 导出（for-of 迭代或赋值右值 ∈ keyExports/familyExports）
        for (const m of text.matchAll(/slots\.register\(\s*\{([^}]*)\}/g)) {
          for (const s of m[1].matchAll(/\b(key|name|id)\s*[,}]/g)) {
            const ident = s[1];
            const bound = new RegExp(`(?:for\\s*\\(\\s*const\\s+${ident}\\s+of\\s+(\\w+)|const\\s+${ident}\\s*=\\s*(\\w+))`).exec(text);
            const src = bound ? (bound[1] ?? bound[2]) : null;
            if (!src || (!keyExports.has(src) && !familyExports.has(src)))
              fail(gate, `src/client/${f}: 描述符 shorthand ${ident}, 的取值来源不可溯到 keys.ts 导出（拼错即永不渲染）`);
          }
        }
      }
    }
  }
}

// ── client-effect-wrap（驾驶舱 slot/页签/活标题注册全量包 scoped.effect——
//    registrations are effects 的 dispose 即撤销贡献（test-strategy 语料台阶③；裸注册在
//    重应用/卸载语义下无撤销边界）。防空语料：src/client/index.ts 零注册调用即红——驾驶舱
//    必须注册。层边界：只查 index.ts（唯一登记装配位），组件文件不管。）──
//    反证：把工具卡循环的 effect 包裹还原成裸 scoped.slots.inject 语句 → 红；复包 → 绿。
{
  const gate = 'client-effect-wrap';
  const entry = join(PACK, 'src', 'client', 'index.ts');
  if (!existsSync(entry)) {
    fail(gate, 'packages/deep-research-pack/src/client/index.ts 缺席（驾驶舱唯一登记装配位）');
  } else {
    const lines = readFileSync(entry, 'utf8').split('\n');
    const registration = /\b(?:slots\.inject|sidebarRightTabs\.register)\(/;
    if (!lines.some((l) => registration.test(l)))
      fail(gate, 'src/client/index.ts 无任何 slots.inject / sidebarRightTabs.register（防空语料：驾驶舱必须注册）');
    lines.forEach((l, i) => {
      if (registration.test(l) && !/\bscoped\.effect\(/.test(l))
        fail(gate, `src/client/index.ts:${i + 1}: 注册调用不在 scoped.effect 包裹内——registrations are effects（dispose 即撤销贡献），包 effect 或并入既有 effect`);
    });
  }
}

// ── cockpit-doc-registry（驾驶舱构成正本 ↔ 盘上模块登记；issue ③-b 用户拍板
//    「补一条窄 verify 门」）。规则：`packages/deep-research-pack/src/client/` 任意层级与 `src/lib/`
//    下每个 .ts/.tsx 的 pack-root-relative path（src/client/... 或 src/lib/...）必须出现在构成正本
//    `docs/design/40-research-cockpit.md` 里——只比 basename 会让同名模块互相遮盖。
//    正本是驾驶舱构成的唯一说明，模块上了盘而正本没跟上 = 文档说谎（2026-10-11 实测形态：
//    业务摘要层 brief-fold 与 review-readiness 上线后，正本仍写「七区」「六件」）。
//    防空集：两目录合计 0 个模块 / 正本缺席 → 红（静默变空集的门禁等于不存在）。──
{
  const gate = 'cockpit-doc-registry';
  const docPath = join(ROOT, 'docs', 'design', '40-research-cockpit.md');
  const moduleDirs = [join(PACK, 'src', 'client'), join(PACK, 'src', 'lib')];
  if (!existsSync(docPath)) fail(gate, 'docs/design/40-research-cockpit.md 缺席（驾驶舱构成正本）');
  else {
    const doc = readFileSync(docPath, 'utf8');
    const modules = moduleDirs.flatMap((dir) => (existsSync(dir) ? walk(dir).filter((f) => /\.(ts|tsx)$/.test(f)) : []));
    const registeredModulePath = (modulePath) => doc.includes(`\`${modulePath}\``) || doc.includes(`/${modulePath})`);
    if (modules.length === 0) fail(gate, 'src/client 与 src/lib 下 0 个 .ts/.tsx（防空集：驾驶舱 client 面与折算层常在）');
    else for (const abs of modules) {
      const modulePath = relative(PACK, abs).split(sep).join('/');
      if (!registeredModulePath(modulePath))
        fail(gate, `${relative(ROOT, abs)} 未在构成正本登记（修正 = 在 docs/design/40-research-cockpit.md §2 的件表或折算层表加一行：pack-root-relative 路径 + 职责）`);
    }
  }
}

// ── run-context-single-source（三操作桶的发现实现只有 run-context 一份）──
// 客户端源码不得再出现 `_abandoned` 候选链（注释除外）：D28 的发现规则归
// `src/lib/run-context.ts`，页签只消费 openRun / bundleCandidates。词法是窄代理；
// 宽语义仍由模块测试与 review 把守。
{
  const gate = 'run-context-single-source';
  const files = trackedFiles({ gate, glob: 'packages/deep-research-pack/src/client' });
  if (files !== null) {
    const tsFiles = files.filter(({ rel }) => /\.(ts|tsx)$/.test(rel));
    if (tsFiles.length === 0) fail(gate, 'src/client 下 0 个 tracked .ts/.tsx（防空集：驾驶舱 client 面常在）');
    else {
      const offenders = [];
      for (const { rel, text } of tsFiles) {
        for (const [index, line] of text.split('\n').entries()) {
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
          if (trimmed.includes('_abandoned')) offenders.push(`${rel}:${index + 1}`);
        }
      }
      if (offenders.length > 0) {
        fail(gate, `客户端出现三位置回退候选链（发现实现归 src/lib/run-context.ts）——${offenders.join('、')}（修正 = 用 openRun / bundleCandidates，不在页签里拼 archive/_abandoned）`);
      }
    }
  }
}

// ══ 域 C · notes 与开发技能（开发记忆骨架与时态/技能形状/RFC 指针） ══
}
