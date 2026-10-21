// session-replay.mjs — 历史会话定位与判读整形（纯函数；2026-10-21 反馈通路事后半边）。
//
// 为什么存在：`scene-capture` 只抓"当场"；三天前那场 run 的页面当时长什么样、现在打开是什么样，
// 此前没有一条命令能把任意历史会话在真实 UI 里重新渲染出来。本模块收"找会话 + 读元信息 +
// 判读整形"这半边（可 keyless 钉住），浏览器半边（起通道 → 登记工作区 → 按 id 打开 → 抓包）
// 住 CLI 壳 `scripts/run-ops/session-replay.mjs`。
//
// 诚实边界（工具卖什么/不卖什么，别让下一个 agent 误解）：
// - 渲染的是「**现在的客户端代码** + 当年的会话数据」——不是像素级复现；客户端代码若已改动，
//   当年那个渲染 bug 不会因此重现（那要靠当时抓包或 snapshot-replay 金标准）。
// - 当年的浏览器 console 报错已不可得（console 不进会话日志）；本工具抓到的是**现在**打开时的
//   console——它只对"当前代码的渲染问题"有意义。
// - 会话日志首事件带 `cwd`（实测 v4），故会话 → 工作区可靠可解，不用猜目录名编码。
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readSessionEvents, resolveSessionLog } from './session-log.mjs';
import { sessionTitleOf } from './run-state.mjs';

/**
 * 跨组枚举会话目录（字典序稳定：组 → 会话）。
 * 缺日志的目录（残缺/被清）跳过——它们无法回放，也不该让枚举崩。
 * @param sessionsRoot `<DSH_HOME>/sessions`
 * @param {{groupSubstring?: string|null}} [opts] 组名子串过滤（大小写敏感，与 session-log 一致）
 * @returns {Array<{group: string, sessionId: string, dir: string, logPath: string}>}
 */
export function listSessionDirs(sessionsRoot, { groupSubstring = null } = {}) {
  if (!existsSync(sessionsRoot)) return [];
  const out = [];
  for (const g of readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!g.isDirectory()) continue;
    if (groupSubstring !== null && !g.name.includes(groupSubstring)) continue;
    const groupDir = join(sessionsRoot, g.name);
    for (const s of readdirSync(groupDir, { withFileTypes: true })) {
      if (!s.isDirectory()) continue;
      const dir = join(groupDir, s.name);
      const logPath = resolveSessionLog(dir);
      if (logPath === null) continue;
      out.push({ group: g.name, sessionId: s.name, dir, logPath });
    }
  }
  return out.sort((a, b) => (a.group + a.sessionId).localeCompare(b.group + b.sessionId));
}

/**
 * 解析查询：**全名 id 优先**（跨组直取，不做标题扫描）；否则按标题子串匹配。
 * 歧义必须如实报候选——静默取第一个会把"复看错了那场"变成新的假现场。
 * @param {{sessionsRoot: string, query: string, groupSubstring?: string|null, maxCandidates?: number}} p
 * @returns {{status:'found', match: object, scanned: number}
 *   | {status:'ambiguous', candidates: Array<object>, scanned: number}
 *   | {status:'not-found', scanned: number}}
 */
export function resolveSessionQuery({ sessionsRoot, query, groupSubstring = null, maxCandidates = 8 }) {
  const all = listSessionDirs(sessionsRoot, { groupSubstring });
  const q = String(query ?? '').trim();
  const exact = all.find((s) => s.sessionId === q);
  if (exact !== undefined) return { status: 'found', match: exact, scanned: all.length };

  const hits = [];
  for (const entry of all) {
    const { readable, events } = readSessionEvents(entry.logPath);
    if (!readable) continue; // 坏日志不参与标题匹配（先被 listSessionDirs 纳入是为了 id 直取仍可用）
    const title = sessionTitleOf(events);
    if (title !== null && title.includes(q)) hits.push({ ...entry, title });
  }
  if (hits.length === 1) return { status: 'found', match: hits[0], scanned: all.length };
  if (hits.length > 1) return { status: 'ambiguous', candidates: hits.slice(0, maxCandidates), scanned: all.length };
  return { status: 'not-found', scanned: all.length };
}

/**
 * 会话元信息：首事件 `session` 里的 cwd / preset / origin / createdAt + 标题事件。
 * 缺 session 事件 → 全 null（调用方按"不可读"处置，不猜工作区）。
 */
export function sessionMetaOf(events) {
  const list = Array.isArray(events) ? events : [];
  const head = list.find((e) => e !== null && typeof e === 'object' && e.type === 'session') ?? null;
  const str = (v) => (typeof v === 'string' && v.trim() !== '' ? v : null);
  return {
    readable: head !== null,
    cwd: str(head?.cwd),
    title: sessionTitleOf(list),
    agentPreset: str(head?.agentPreset),
    origin: str(head?.origin),
    createdAt: typeof head?.createdAt === 'number' ? head.createdAt : null,
  };
}

/**
 * 判读整形（给人看，CLI 直接 print）：四要素 + 成败 + 诚实边界一句。
 * @param {{sessionId: string, group?: string, cwd?: string|null, title?: string|null, logPath: string,
 *   sceneDir?: string|null, openedVia?: string|null}} facts
 * @returns {string[]}
 */
export function formatReplaySummary(facts) {
  const lines = [];
  lines.push(`会话 ${facts.sessionId}${facts.title ? `（${facts.title}）` : ''}${facts.group ? ` @ ${facts.group}` : ''}`);
  lines.push(`  工作区 cwd: ${facts.cwd ?? '(未知——日志缺 session 事件)'}`);
  lines.push(`  日志: ${facts.logPath}`);
  lines.push(facts.sceneDir
    ? `  场景包: ${facts.sceneDir}（读回 = scene-capture --show <name>）`
    : '  场景包: （未捕获）');
  if (facts.openedVia) lines.push(`  打开方式: ${facts.openedVia}`);
  if (facts.statusPane) lines.push(`  右栏页签: 研究状态（命中方式 = ${facts.statusPane}）`);
  lines.push('  边界: 渲染的是「现在的客户端代码 + 当年的会话数据」，不是像素级复现；当年的浏览器 console 已不可得。');
  return lines;
}
