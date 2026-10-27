// context.mjs — L0 门禁的共享上下文：路径常量、门禁名单、子进程缓存、tracked 枚举与
// fail/note 收集器。各域门禁（gates/*.mjs）只 import 本件；入口 verify.mjs 负责配置与汇总。
//
// 为什么拆（2026-10-27 卫生轮 维度2）：47 道门禁单文件 1848 行，改一道要么全读要么盲改；
// 拆后"改某域门禁"只读该域模块（每域 200–450 行），判据与文案逐字未改。**精确保形**：
// 助手只搬不改语义（gitOnce 缓存键、trackedFiles 四件套、matchSimpleGlob 的 `?` 保守语义）。
//
// 顺序契约：gates 数组 = 域内顺序 = 入口调用顺序（gate-ledger-sync 用集合比对，不依赖序；
// 但输出行序仍是 A–F，排障时与 evaluation §L0 表同序）。
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, lstatSync, readlinkSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backlogLivenessProblems } from '../lib/backlog-liveness.mjs';
import { satisfiesVersion } from '../../packages/deep-research-pack/scripts/lib/version-range.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 极简 glob（align-ledger 的 na 活性检查用）：`**` 匹配任意层段，`*` 匹配段内任意字符。
 *  仓内路径统一按 `/` 规范化后再比——不引第三方 glob 依赖（stdlib-only 分层纪律）。 */
export function matchSimpleGlob(pathStr, pattern) {
  const norm = pathStr.split('\\').join('/');
  const rx = pattern
    .split('\\').join('/')
    // `?` 必须转义（2026-10-08 二轮自审抓获）：漏了它会变成正则量词——`a?b` 匹配 `ab`、
    // 反而不匹配 `axb`，静默错误。**本匹配器不支持 `?` 单字符语义**（转义后按字面量处理，
    // 故 `a?b` 只匹配字面 `a?b`）——这是刻意的保守选择：宁可少匹配也不静默错配。
    // 当前所有 glob 全是 `*` 形态，未用到 `?`。
    .replace(/[.+^${}()|[\]\\?]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${rx}$`).test(norm);
}
export const PACK = join(ROOT, 'packages', 'deep-research-pack');
export const PRESETS = join(PACK, 'presets');

// 实际门禁名集合（gate-ledger-sync 与 docs/evaluation.md §L0 登记表对账——集合比对，不序；
// 新增门禁两处同步）。数组与文件块同按域分组（A–F）排序，域横幅见各节。
export const gates = [
  'md-utf8-newline', 'md-links', 'md-anchors', 'archived-note-pointer', 'count-free', 'doc-now-only', 'doc-budgets',
  'preset-structure', 'pack-bundle-compat', 'client-half', 'row-deps', 'pack-contract-sync', 'role-list-sync', 'client-keys', 'client-effect-wrap', 'cockpit-doc-registry', 'run-context-single-source',
  'note-format', 'note-status', 'note-graduation-rewrite', 'dev-skill-format', 'proposed-pointer-live',
  'vendor-pin', 'vendor-clean', 'pin-agreement', 'align-ledger', 'discipline-na-trigger', 'discipline-state-vocab', 'repo-conventions', 'vendor-links',
  'workspace-contract', 'handbook-budget', 'workspace-versioning', 'dev-runtime-clean', 'overlay-fresh', 'pack-workspace-fresh', 'release-version', 'dist-manual-version',
  'claude-symlink', 'secrets-untracked', 'host-paths', 'guard-red-record', 'gate-ledger-sync', 'entry-chain', 'backlog-liveness', 'port-exclusive', 'hooks-active',
];

// vendor/dsh 钉身份的 tag 面（commit 面 = vendor-pin 门禁的 PIN；pack-bundle-compat 消费它
// 断言 pack 兼容矩阵含当前 tag——升 pin 时两处同 diff 改；本文件里的 tag 复述受 pin-agreement 对账）
export const VENDOR_TAG = 'dsh-v0.2.1-rc.2';

// `--only=<gate[,gate]>`：只判指定门禁（输出与退出码都只看它们）。为什么需要——门禁 47 道
// 一格到底，改一道要么全跑、要么盲改；有了它，改门禁的循环 = `node scripts/verify/verify.mjs
// --only=<名>`，不必读 1800 行也不必等无关门禁的输出（2026-10-27 卫生轮）。**不改变判据**：
// 其余门禁照常执行（读文件、无副作用），只是失败不计入、汇总不打印——所以它省的是噪声与
// 注意力，不是时间；想跑全量就省略该参数。
export let only = null;
export const failures = [];
export const notes = [];
/** 由入口按 argv 配置（`--only=<gate[,gate]>`；空 = 全量）。 */
export function configureOnly(names) {
  only = names.length === 0 ? null : new Set(names);
}
/** 当前 --only 集合（null = 全量）；入口汇总用。 */
export function activeOnly() { return only; }
export const fail = (gate, msg) => { if (only === null || only.has(gate)) failures.push(`[${gate}] ${msg}`); };
export const note = (gate, msg) => { if (only === null || only.has(gate)) notes.push(`[${gate}] ${msg}`); };

export function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === '.DS_Store') continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
let allFilesCache = null;
/** 全树懒扫描（只有 align-ledger 的 globAbsent 需要；role-list-sync 走 walkMany 的定向扫描）。 */
export function allFiles() { return allFilesCache ??= walk(ROOT); }
/** 定向扫描多个根（只走该根，不下潜到全仓运行区）。 */
export function walkMany(dirs) { const out = []; for (const dir of dirs) { if (existsSync(dir)) walk(dir, out); } return out; }

/** git 子进程缓存（gitOnce）：同参数只起一个进程——本脚本多处 git spawn 是五组完全相同的
 *  参数（ls-files 族 + submodule status），逐门禁各起一个纯属重复。**精确保形**：参数与
 *  选项原样（不注入 quotepath、不剥 env——需要特形 env 的 spawn 不走本助手），返回原始
 *  结果对象，各门禁保留自己的 fail-loud 判定与消息——本助手只去重子进程，不改任何语义。 */
const gitSpawnCache = new Map();
export function gitOnce(args) {
  const key = args.join('\u0000');
  if (!gitSpawnCache.has(key)) gitSpawnCache.set(key, spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }));
  return gitSpawnCache.get(key);
}

/** tracked 文件枚举四件套（gitOnce 同款纪律——ls-files 族 fail-loud 文本面的共同形态收口）。
 *  沿革：2026-10-07 ls-files 清扫把逐文件读盘门禁统一为 quotepath=false + 缺席/不可读 fail-loud
 *  + 目录型 symlink 放行（实证 = notes/implemented/2026-10-07-lsfiles-gate-coverage-sweep.md）；
 *  门禁继续增长后四件套逐字抄写开始漂移（2026-10-21 六维卫生轮 维度2），收口为本助手。
 *  收口面（只此四件，不多不少）：
 *   ① 枚举：`git -c core.quotepath=false ls-files [glob]`（经 gitOnce 去重子进程；quotepath=false =
 *      非 ASCII 路径（_dist/安装手册.md 实测）不得被引号转义成 join 后 existsSync 永远 miss 的假名）；
 *   ② ls-files 不可用 → fail-loud（覆盖面依赖仓库态，静默空转的门禁等于不存在）；
 *   ③ 过滤后防空语料下限（exclude = 门禁自己的范围声明，扫描集被收窄成空集 → 红）；
 *   ④ 逐文件三判：盘上缺席 fail-loud（迁移/清扫残留态不是合法稀疏态——静默跳过曾让 npm
 *      缓存件的误入库漏检到目录迁移才现形，2026-10-07 目录治理第二轮实证）/ 目录型 symlink 放行
 *      （.claude/skills→.agents/skills——结构面归 claude-symlink 门禁，非文本面）/ 不可读 fail-loud。
 *  **精确保形**（沿 gitOnce 先例：助手只去重样板，不改语义）：失败消息三要素（失败对象+违反
 *  规则+修正入口）不丢，文案收敛为族内最富模板；门禁保留自己的 exclude、检测逻辑与特形防空
 *  下限。不套本助手的特形（勿为收口而硬套）：防空按"检查对象计数"而非文件数的门禁
 *  （pin-agreement 的 hex/tag 下限留在门禁内、port-exclusive 的端口声明计数）、tracked 文件
 *  缺席走稀疏态防御的 md 链接族（md-utf8-newline / md-links / md-anchors /
 *  archived-note-pointer——缺席对它们是合法稀疏态）、纯名单不读盘的门禁（secrets-untracked /
 *  doc-budgets）、-z 定径枚举（backlog-liveness）。
 *  返回 null = 枚举层已红（②③），调用方结束本门禁；否则返回 [{rel, text}]（rel = 仓根相对路径）。 */
export function trackedFiles({ gate, glob, exclude, emptyMsg }) {
  const r = gitOnce(['-c', 'core.quotepath=false', 'ls-files', ...(glob ? [glob] : [])]);
  if (r.status !== 0) {
    fail(gate, `git ls-files 不可用（${String(r.stderr).slice(0, 120)}）——本门禁覆盖面依赖仓库态，fail-loud`);
    return null;
  }
  const files = r.stdout.split('\n').filter(Boolean).filter((f) => !(exclude ?? (() => false))(f));
  if (files.length === 0) {
    fail(gate, emptyMsg ?? '防空语料：tracked 扫描集为空——范围被收窄或 git ls-files 失效，fail-loud');
    return null;
  }
  const out = [];
  for (const rel of files) {
    const f = join(ROOT, rel);
    if (!existsSync(f)) { fail(gate, `tracked 文件 ${rel} 盘上缺席——迁移/清扫残留态（git rm --cached 或恢复文件），fail-loud`); continue; }
    if (statSync(f).isDirectory()) continue; // 目录型 symlink（.claude/skills→.agents/skills）非文本面——结构面归 claude-symlink 门禁
    let text;
    try { text = readFileSync(f, 'utf8'); } catch (e) { fail(gate, `tracked 文件 ${rel} 不可读（${e.code || e.message}）——fail-loud`); continue; }
    out.push({ rel, text });
  }
  return out;
}
