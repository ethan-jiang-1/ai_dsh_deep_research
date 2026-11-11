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

// ── pack-bundle-compat（dsh.bundle.patch 指向真实文件；engines.dsh 覆盖当前 vendor tag）──
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
    // 宿主只认 engines.dsh（没有第二个版本字段；`dsh.compatibility` 之类的自造键由 pack-manifest 拦）。
    const engine = pkg?.engines?.dsh;
    if (typeof engine !== 'string' || engine.trim() === '')
      fail(gate, 'engines.dsh 未声明——宿主兼容检查会退回 peer 范围（补 packages/deep-research-pack/package.json 的 engines.dsh）');
    else if (!satisfiesVersion(VENDOR_TAG.replace(/^dsh-v/, ''), engine))
      fail(gate, `engines.dsh ${engine} 不覆盖当前 vendor tag ${VENDOR_TAG}——范围写窄或写错`);
    else {
      // 同一版本事实有 5 处人类副本（根 README / 包 README / design/40 / 手册源 / 生成手册）。
      // 当前一致，但没有任何机械对账；2026-11-10 接手复查把它们钉住：精确副本必须含完整范围，
      // 根 README 至少含两端点。范围一改，本门禁点名所有未同步副本。
      const range = engine.trim();
      const endpoints = range.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/g) ?? [];
      if (endpoints.length < 2) fail(gate, `engines.dsh ${range} 解析不出两个端点——无法对账人类副本`);
      const copies = [
        ['packages/deep-research-pack/README.md', true],
        ['docs/design/40-research-cockpit.md', true],
        ['_dist/安装手册.md', true],
        ['README.md', false],
      ];
      for (const [rel, exact] of copies) {
        const path = join(ROOT, rel);
        if (!existsSync(path)) {
          if (rel === '_dist/安装手册.md') continue; // 缺席由 dist-manual-version 负责
          fail(gate, `${rel} 缺席——engines.dsh 的人类副本无法对账`);
          continue;
        }
        const text = readFileSync(path, 'utf8');
        const ok = exact ? text.includes(range) : endpoints.every((v) => text.includes(v));
        if (!ok) fail(gate, `${rel} 的 engines.dsh 副本与 package.json 不一致（应为 ${exact ? range : endpoints.join(' / ')}）——同一事实多副本必须同步`);
      }
      // 手册源是模板：{dshEngine} 由 export-dist 注入；占位符改名/删除会让生成物失去版本事实。
      const manualSource = readFileSync(join(ROOT, 'scripts/dist/product-manual.md'), 'utf8');
      if (!manualSource.includes('{{dshEngine}}')) fail(gate, 'scripts/dist/product-manual.md 缺 {{dshEngine}} 占位——手册生成物拿不到 engines.dsh');
    }
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
  const WORKERS = join(PACK, 'workers');
  const declFiles = [
    ...readdirSync(PRESETS).filter((f) => f.endsWith('.patch.yml')).map((f) => join(PRESETS, f)),
    ...(existsSync(WORKERS) ? readdirSync(WORKERS).filter((f) => f.endsWith('.patch.yml')).map((f) => join(WORKERS, f)) : []),
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

// ── pack-manifest（发布清单合同：DSH 读什么、我们只写什么）──
// 依据：宿主只消费 `dsh.bundle` / `dsh.client` 与 `engines.dsh`（其余 `dsh.*` 键无消费者 = 自造
// 字段）；Plugins 页与市场靠 locale + icon 显示（子路径插件读不到 package.json，只能在自己的
// specifier 上导出）。反证：往 pkg.dsh 注入 compatibility → 红；删 locale/en.json → 红；
// 给 files 加 lib/**/*.js.map → 红。
{
  const gate = 'pack-manifest';
  const pkgPath = join(PACK, 'package.json');
  if (!existsSync(pkgPath)) fail(gate, 'deep-research-pack/package.json 不存在');
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const allKeys = Object.keys(pkg.dsh ?? {}).sort();
    const unknown = allKeys.filter((k) => k !== 'bundle' && k !== 'client');
    if (unknown.length > 0) fail(gate, `dsh.* 出现 DSH 不读的键：${unknown.join(', ')}——版本合同只在 engines.dsh，显示面只在 locale/icon`);
    if (typeof pkg.engines?.dsh !== 'string' || pkg.engines.dsh.trim() === '')
      fail(gate, 'engines.dsh 缺失——宿主安装/启动都会拒绝不兼容插件，没有它就等于不设准入');
    if (typeof pkg.description !== 'string' || pkg.description.trim() === '')
      fail(gate, 'package.json.description 缺失——Plugins 页卡片只剩包名');
    const files = Array.isArray(pkg.files) ? pkg.files : [];
    for (const required of ['icon.svg', 'locale/**', 'locale-content/**', 'locale-startup/**', 'locale-fetch-fallback/**']) {
      if (!files.includes(required)) fail(gate, `files 缺 ${required}——显示元数据不会进 tarball（修正入口 = packages/deep-research-pack/package.json 的 files）`);
    }
    const forbidden = files.filter((f) => !f.startsWith('!') && (/\.map$/.test(f) || /^src\//.test(f)));
    if (forbidden.length > 0) fail(gate, `files 放进构建中间产物：${forbidden.join(', ')}（DSH 包约定不发布 src 与 maps）`);
    const iconPath = join(PACK, pkg.icon ?? 'icon.svg');
    if (!existsSync(iconPath)) fail(gate, `icon 指向的文件不存在：${pkg.icon ?? '（缺 icon 字段）'}`);
    else {
      const bytes = readFileSync(iconPath);
      if (bytes.length > 256 * 1024) fail(gate, `icon 超过 256 KiB（${bytes.length}）——宿主会判无效元数据`);
      if (!/^\s*<svg[\s>]/u.test(bytes.toString('utf8'))) fail(gate, 'icon.svg 不是自包含 SVG');
    }
    // 显示面：四个 specifier 各自要有 en+zh 的 title/description（子路径不读 package.json）。
    const locales = ['locale', 'locale-content', 'locale-startup', 'locale-fetch-fallback'];
    for (const dir of locales) {
      for (const lang of ['en', 'zh']) {
        const file = join(PACK, dir, `${lang}.json`);
        if (!existsSync(file)) { fail(gate, `locale 缺 ${dir}/${lang}.json`); continue; }
        let meta;
        try { meta = JSON.parse(readFileSync(file, 'utf8')).meta } catch (error) { fail(gate, `${dir}/${lang}.json 不是合法 JSON：${String(error)}`); continue; }
        for (const field of ['title', 'description']) {
          if (typeof meta?.[field] !== 'string' || meta[field].trim() === '')
            fail(gate, `${dir}/${lang}.json 缺 meta.${field}——插件卡片会回退到包名/空描述`);
        }
      }
    }
    const exports = pkg.exports ?? {};
    for (const key of ['./locale/*.json', './icon', './content/locale/*.json', './content/icon',
      './startup/locale/*.json', './startup/icon', './fetch-fallback/locale/*.json', './fetch-fallback/icon']) {
      if (!Object.hasOwn(exports, key)) fail(gate, `exports 缺 ${key}——显示资源无法被宿主按 specifier 解析`);
    }
  }
}

// ── market-index（发现面：_dist/market.json 是 format 1，且与包清单同源同版本）──
// 依据：发现页/`plugin_market` 只读静态索引；格式 1 的硬字段 = name / versions[].version /
// publishTimestamp / source / engines.dsh（规则源 = vendor 的 plugin-market index 格式文档）。
// L0 是零依赖层，不 import workspace 里的校验器——真 `parseMarketIndex` 归 lifecycle-smoke
// （那里有完整 node_modules）。本门禁判：结构合法 + 与包清单一致 + 图标在格式上限内。
// 反证：staged 索引里放回一个插件条目 → 红；删 staged 文案 → 红；把 format 改成 2 → 红。
{
  const gate = 'market-index';
  const indexPath = join(ROOT, '_dist', 'market.json');
  if (!existsSync(indexPath)) fail(gate, '_dist/market.json 缺席——跑 node scripts/dist/export-dist.mjs 导出');
  else {
    let doc;
    try { doc = JSON.parse(readFileSync(indexPath, 'utf8')) } catch (error) { fail(gate, `market.json 不是合法 JSON：${String(error)}`) }
    if (doc !== undefined) {
      if (doc.format !== 1) fail(gate, `format 必须是 1（当前 ${String(doc.format)}）`);
      const localized = (value) => typeof value === 'string' || (typeof value === 'object' && value !== null && typeof value.en === 'string');
      if (!localized(doc.title)) fail(gate, '索引缺 title（LocalizedText，必须含 en）');
      if (!localized(doc.description) || !/staged/i.test(String(doc.description?.en ?? ''))) {
        fail(gate, 'staged 索引必须在 description.en 写明 staged（未发布 npm，本地 tarball 交付）');
      }
      if (!Array.isArray(doc.plugins)) fail(gate, 'plugins 必须是数组');
      else if (doc.plugins.length !== 0) fail(gate, `staged 索引不得包含可安装条目（当前 ${doc.plugins.length} 个）——npm 未发布，列出 source=npm 会让用户点到 404`);
    }
  }
}

// ── readme-shape（文档合同：DSH package-bundle + 安装手册默认路径）──
// 依据：DSH doc-standard 机械推导 dsh.bundle.patch → package-bundle；75 七问；70 十一段；
// 手册默认首装 = CLI 建 custom profile（DSH 没有 UI 建 profile）+ 应用内 Plugins 页装包，
// CLI 装包只作 web 自动化。反证：kind 改成 bundle → 红；删七问/模板节 → 红；手册缺 profile
// 引导或把引导挪到 Plugins 页之后 → 红；手册缺安全/平台/Discover 前置 → 红；README 超预算 → 红。
{
  const gate = 'readme-shape';
  const readmePath = join(PACK, 'README.md');
  const manualPath = join(ROOT, 'scripts', 'dist', 'product-manual.md');
  if (!existsSync(readmePath)) fail(gate, 'pack README 缺席');
  else {
    const readme = readFileSync(readmePath, 'utf8');
    if (!readme.startsWith('---\n')) fail(gate, 'README 缺前置字段块（description/kind 在首块）——文档生成器不认');
    else {
      const front = readme.slice(4, readme.indexOf('\n---', 3));
      const keys = [...front.matchAll(/^([a-z][a-z0-9-]*):/gm)].map((m) => m[1]);
      const unexpected = keys.filter((k) => k !== 'description' && k !== 'kind');
      if (unexpected.length > 0) fail(gate, `README 前置字段只允许 description/kind，发现 ${unexpected.join(', ')}`);
      if (!/^description:\s*\S/m.test(front)) fail(gate, 'README 前置字段缺 description');
      if (!/^kind:\s*"?package-bundle"?\s*$/m.test(front)) fail(gate, 'README 前置字段 kind 必须是 package-bundle（dsh.bundle.patch 的机械推导）');
    }
    for (const heading of ['## Summary', '## Table of Contents', '## Use this package', '## Data', '## Understand the implementation', '## Further Exploration', '## Model Experience', '## Known Limitations and Deferred Work', '## Dev Note']) {
      if (!readme.includes(heading)) fail(gate, `README 缺 DSH package-bundle 模板节：${heading}`);
    }
    for (const heading of ['## 研究怎么跑', '## 新增一个研究角色', '## 新增一个 skill', '## 发布（维护者）']) {
      if (readme.includes(heading)) fail(gate, `README 不应包含维护者/教程节：${heading}（内容应下沉到 docs/，README 只留链接）`);
    }
    const questions = [...readme.matchAll(/^\*\*([1-7])\. /gm)].map((m) => m[1]);
    if (questions.join('') !== '1234567') fail(gate, `README 首屏七问不全（找到 ${questions.join(',') || '无'}）——装什么/怎么装/版本前置/怎么验证/配置在哪层/升级回退/卸载数据`);
    // 首次安装顺序（2026-11-10 接手卫生）：pack README 曾把 tarball 装包写在 profile 引导之前；
    // 干净机器照做会先得到 base-only profile（缺 web-app，dump 出 3 条 patch entry not found），
    // 再跑 --from-default-profile 又会替换掉已装包。只查"有引导"不够，必须查先后。
    const bootstrapAt = readme.indexOf('--from-default-profile web');
    const installAt = readme.indexOf('add file:');
    if (bootstrapAt === -1) fail(gate, 'README 没有写 custom profile 的 CLI 引导（--from-default-profile web）——DSH 没有 UI 建自定义 profile');
    else if (installAt !== -1 && bootstrapAt > installAt) fail(gate, 'README 把 profile 引导放在 tarball 装包之后——首次安装必须先建 profile（顺序不可反）');
    if (/dsh\.compatibility/.test(readme)) fail(gate, 'README 仍写已删除的 dsh.compatibility 字段（版本合同只有 engines.dsh）');
    if (readme.split('\n').length > 310) fail(gate, `README 超出 310 行预算（当前 ${readme.split('\n').length}）——把维护者/架构内容下沉，不要扩顶`);
  }
  if (!existsSync(manualPath)) fail(gate, '安装手册源 scripts/dist/product-manual.md 缺席');
  else {
    const manual = readFileSync(manualPath, 'utf8');
    const sections = [...manual.matchAll(/^## [一二三四五六七八九十]+、/gm)].length;
    if (sections < 10) fail(gate, `安装手册应有至少十个编号节（当前 ${sections}）`);
    for (const heading of ['一、这是什么', '二、前置', '三、选择运行时与安装方式', '四、安装', '五、首次启动', '六、验证', '七、配置', '八、升级', '九、卸载与数据', '十、故障排查', '十一、安全与平台']) {
      if (!manual.includes(`## ${heading}`)) fail(gate, `安装手册缺节：${heading}`);
    }
    const bootstrap = manual.indexOf('--from-default-profile web');
    const plugins = manual.indexOf('### A. Plugins 页');
    const cli = manual.indexOf('dsh plugin');
    if (bootstrap === -1) fail(gate, '安装手册没有写 custom profile 的 CLI 引导（--from-default-profile web）——DSH 没有 UI 建自定义 profile，缺这一步默认路径到不了 deep-research');
    else if (plugins !== -1 && bootstrap > plugins) fail(gate, '安装手册把 profile 引导放在 Plugins 页之后——默认路径必须先有 custom profile');
    if (!manual.includes('dsh --profile deep-research')) fail(gate, '安装手册没有写 dsh --profile deep-research 启动');
    if (plugins === -1) fail(gate, '安装手册没有写 Plugins 页（发布后路径；当前 staged）');
    else if (cli !== -1 && cli < plugins) fail(gate, '安装手册先讲 CLI 装包再讲 Plugins 页——Plugins 页是发布后路径，CLI 只作 web 自动化');
    if (!manual.includes('本地 tarball')) fail(gate, '安装手册没有写当前唯一发布形态 = 本地 tarball');
    if (!/staged/i.test(manual)) fail(gate, '安装手册没有标注 npm/Plugins/Discover 为 staged（当前版本未上 npm）');
    if (!/仅 `dsh web`/.test(manual)) fail(gate, '安装手册没有标注 CLI 只适用 `dsh web`');
    if (!manual.includes('Custom plugin markets')) fail(gate, '安装手册没有写 Discover 的 experimental “Custom plugin markets” 前置');
    if (!manual.includes('--trusted-host')) fail(gate, '安装手册的安全节没有写 --trusted-host / 反代边界');
    if (!manual.includes('engines.dsh')) fail(gate, '安装手册没有写 engines.dsh');
  }
}

// ── release-vocab（现行合同文档不复活退役词）──
// 依据：D41 的退役词清单；只扫现行合同文件，历史 notes/_backlog/decisions/terms 由历史注记承载。
// 反证：向 README 注入“产品 profile” → 点名红；还原 → 绿。
{
  const gate = 'release-vocab';
  const files = [
    'README.md', 'CONTRIBUTING.md',
    'packages/deep-research-pack/README.md', 'packages/deep-research-pack/AGENTS.md',
    'scripts/dist/product-manual.md',
    'docs/00-index.md', 'docs/evaluation.md', 'docs/project-map.md', 'docs/discipline-map.md',
    'docs/guides/60-dev-loop.md', 'docs/guides/61-run-playbook.md', 'docs/guides/62-plugin-authoring.md',
    'docs/guides/63-git-boundary.md', 'docs/guides/64-release-versioning.md', 'docs/guides/65-run-forms.md',
    'docs/design/10-architecture.md', 'docs/design/40-research-cockpit.md', 'docs/design/50-agent-loop-and-state.md',
    'docs/design/60-intent-carriers.md',
  ];
  // 中文裸子串匹配；`产品内(?!容)` 豁免复合词「产品内容」（BUG-072）——真正要退的「产品内嵌」仍红。
  const banned = /插件即产品|产品 profile|产品形态|产品设置|产品用户|产品启动|产品面|产品化|产品包|产品账本|产品内(?!容)|P0–P4/;
  for (const rel of files) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) continue;
    readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
      if (banned.test(line) && !line.includes('term-policy: allow')) fail(gate, `${rel}:${i + 1} 复活退役词：${line.trim().slice(0, 80)}`);
    });
  }
}

// ── dist-manual-fresh（源手册与 _dist 生成物正文一致）──
// 依据：安装手册是 tracked 生成物；表头版本由 dist-manual-version 管，本门禁管正文漂移。
// 反证：向 _dist/安装手册.md 正文追加一行 → 红；重导出 → 绿。
{
  const gate = 'dist-manual-fresh';
  const sourcePath = join(ROOT, 'scripts', 'dist', 'product-manual.md');
  const generatedPath = join(ROOT, '_dist', '安装手册.md');
  if (!existsSync(generatedPath)) fail(gate, '_dist/安装手册.md 缺席——先 node scripts/dist/export-dist.mjs');
  else {
    const marker = '## 一、';
    const pkg = JSON.parse(readFileSync(join(PACK, 'package.json'), 'utf8'));
    const source = readFileSync(sourcePath, 'utf8');
    const generated = readFileSync(generatedPath, 'utf8');
    const a = source.slice(source.indexOf(marker))
      .replaceAll('{{version}}', pkg.version)
      .replaceAll('{{tarballName}}', `dsh-deep-research-pack-${pkg.version}.tgz`)
      .replaceAll('{{dshEngine}}', pkg.engines?.dsh ?? '');
    const b = generated.slice(generated.indexOf(marker));
    if (a !== b) fail(gate, '源手册正文与 _dist/安装手册.md 不一致——改源后跑 node scripts/dist/export-dist.mjs');
  }
}

// ══ 域 C · notes 与开发技能（开发记忆骨架与时态/技能形状/RFC 指针） ══
}
