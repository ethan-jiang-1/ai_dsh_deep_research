// run-dashboard-core.mjs — M2 run 只读观察面的解析/场景/模型管线（全 fail-soft；tests 消费的
// 纯函数面；HTML 渲染 = run-dashboard-html.mjs，2026-10-28 拆出）。从 scripts/run-ops/run-dashboard.mjs 下沉（2026-10-13 结构重构——
// 同 node-gate-core / schema-scan-core 形态：CLI 壳（参数/watch 循环/写盘）住 run-ops）。
//
// 原则（RFC 定死，勿破）：
//   1. 投影不是真相——只读解析 run 文件，不写 run 目录，不缓存派生状态；
//   2. 被动观察——不构成第三个交互点，不从观察面向角色发指令；
//   3. keyless——纯 fs + node:zlib（zstd 会话日志解压，HITL 等待检测用），无模型/网络/子进程；
//   4. fail-soft——缺失/畸形文件显示"未开始 / 无法解析"并继续渲染其余部分。
// 出处：RFC notes/implemented/2026-09-24-m2-run-dashboard.md + debug-dashboard-plus（同目录）。
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { resolveSessionLog, readSessionEvents } from './session-log.mjs';
import { splitFrontmatter } from './frontmatter.mjs';
import { deriveSteps, latestRunVersion } from '../../packages/deep-research-pack/src/lib/run-fold.ts';
import { foldHitlPending } from '../../packages/deep-research-pack/src/lib/hitl-fold.ts';
import { terminalReadiness } from '../../packages/deep-research-pack/src/lib/review-readiness.ts';

/** 多 run 场根（debug-dashboard-plus）：drt 正规场 + ad-hoc 场（无契约，标注呈现不隐藏） */
const SCENE_ROOTS = [
  { dir: 'research-workspace', kind: 'drt', label: 'drt' },
  // 归档/停放场（D28：位置=操作桶，不是状态）：仍进多 run 总表（历史不丢）；
  // label 区分桶，避免与根场混淆。
  { dir: 'research-workspace/archive', kind: 'drt', label: 'drt·归档' },
  { dir: 'research-workspace/_abandoned', kind: 'drt', label: 'drt·停放' },
  { dir: 'runtime/harness-home/runs', kind: 'ad-hoc', label: 'ad-hoc·无契约' },
];
/** lead 会话日志根（HITL 等待检测；选择器按 v4/v3 canonical 代际挑选一个物理日志）。 */
const SESSIONS_ROOT = 'runtime/harness-home/sessions';
/** web 日志（boot-run tee 的横幅，含 token URL——deep-link 用；缺席即不链） */
const WEB_LOG = 'runtime/smoke-workspace/web.log';

// ── 纯解析函数（测试面；全部对畸形输入 fail-soft，永不 throw）──────────────────

// frontmatter 拆分正本 = lib/frontmatter.mjs（2026-10-16 收敛，两 core 曾各持逐字副本）

/** 取 `## <title>` 节正文（到下一个 ## 为止）；不存在返回 null */
function sectionBody(text, title) {
  const lines = text.split(/\r?\n/);
  const head = new RegExp(`^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
  const start = lines.findIndex((l) => head.test(l));
  if (start < 0) return null;
  const rest = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) break;
    rest.push(lines[i]);
  }
  return rest.join('\n');
}

/** question.md → { question, purpose, profile, depth, decisions }（缺节为 null）。
 *  双形态容纳（debug-dashboard-plus）：模板契约节名 + ad-hoc 场的变体节名/表格行。 */
export function parseQuestion(text) {
  const out = { question: null, purpose: null, profile: null, depth: null, decisions: 0 };
  let qSec = sectionBody(text, '研究问题（定稿）');
  if (!qSec) qSec = sectionBody(text, '一句话问题'); // ad-hoc 变体
  if (qSec) {
    const line = qSec.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith('<!--') && !l.trim().startsWith('<'));
    if (line) out.question = line.trim().replace(/^ <|> $/g, '').trim();
  }
  const pSec = sectionBody(text, 'Purpose——为谁决策什么');
  if (pSec) {
    const line = pSec.split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith('<!--'));
    if (line) out.purpose = line.trim();
  }
  const hSec = sectionBody(text, 'HITL1 Alignment Snapshot');
  if (hSec) {
    let p = /^-\s+研究类型:\s*(.+)$/m.exec(hSec);
    let d = /^-\s+深度与篇幅:\s*(.+)$/m.exec(hSec);
    if (!p) p = /^\|\s*研究类型\s*\|\s*([^|]+)\|/m.exec(hSec); // ad-hoc 表格行
    if (!d) d = /^\|\s*深度与篇幅\s*\|\s*([^|]+)\|/m.exec(hSec);
    if (p) out.profile = p[1].trim();
    if (d) out.depth = d[1].trim();
  }
  const dSec = sectionBody(text, 'Decisions（append-only，最新在上）');
  if (dSec) out.decisions = (dSec.match(/^- (?:19|20)\d{2}-/gm) || []).length;
  return out;
}

/** topics.md → [{ id, name, questions }]（must_answer 问题列表条数） */
export function parseTopics(text) {
  const topics = [];
  let cur = null;
  let inMust = false;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+T(\d+):\s*(.+?)\s*$/.exec(raw);
    if (h) {
      cur = { id: `T${h[1]}`, name: h[2], questions: 0 };
      topics.push(cur);
      inMust = false;
      continue;
    }
    if (!cur) continue;
    if (/^-\s+must_answer:\s*$/.test(raw)) {
      inMust = true;
      continue;
    }
    if (inMust) {
      if (/^\s{2,}-\s+/.test(raw)) {
        cur.questions++;
        continue;
      }
      inMust = false;
    }
  }
  return topics;
}

/** evidence/ 目录 → [{ file, ok, ungraded, quality, supports, sourceUrl, retrievedAt, sourceTier, publisher }]
 * （无 frontmatter 不算证据）*/
export function parseEvidenceDir(dir) {
  if (!existsSync(dir)) return { missing: true, files: [] };
  let names = [];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  } catch {
    return { missing: true, files: [] };
  }
  return {
    missing: false,
    files: names.map((f) => {
      const rec = { file: f, ok: false, ungraded: false, quality: null, supports: null, sourceUrl: null, retrievedAt: null, sourceTier: null, publisher: null };
      try {
        const { fm } = splitFrontmatter(readFileSync(join(dir, f), 'utf8'));
        // 有效证据谓词（分层，正本 = 研究手册 §证据文件契约；渲染层实现，tests 机械对账）：
        // 硬五字段全齐才有效；软二字段（source_tier/publisher）缺失不否决——标 ungraded（旧
        // run 存量证据按此显示，不回填：run bundle 是交付记录）。
        if (fm && fm.source_url && fm.retrieved_at && fm.quality && fm.found_by && fm.supports) {
          Object.assign(rec, {
            ok: true,
            quality: fm.quality,
            supports: fm.supports,
            sourceUrl: fm.source_url,
            retrievedAt: fm.retrieved_at,
            sourceTier: fm.source_tier ?? null,
            publisher: fm.publisher ?? null,
          });
          rec.ungraded = fm.source_tier === undefined || fm.publisher === undefined;
        }
      } catch {
        /* 畸形文件 → ok: false，继续 */
      }
      return rec;
    }),
  };
}

/** leads.md → [{ direction, status: 'dig'|'excluded', excludedReason, grades }] */
export function parseLeads(text) {
  const leads = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+方向:\s*(.+?)\s*$/.exec(raw);
    if (h) {
      cur = { direction: h[1], status: null, excludedReason: null, grades: [] };
      leads.push(cur);
      continue;
    }
    if (!cur) continue;
    const st = /^-\s+状态:\s*(.+)$/.exec(raw);
    if (st) {
      const v = st[1].trim();
      if (v.startsWith('建议挖深')) cur.status = 'dig';
      else if (v.startsWith('已排除')) {
        cur.status = 'excluded';
        const r = /已排除（(.+?)）/.exec(v);
        cur.excludedReason = r ? r[1] : v;
      }
      continue;
    }
    if (/^-\s+支持来源:/.test(raw)) {
      for (const g of raw.matchAll(/（([ABCD])）/g)) cur.grades.push(g[1]);
    }
  }
  return leads;
}

/** findings.md → [{ id, conclusion, gap, evidence: [evidence/xx.md] }] */
export function parseFindings(text) {
  const findings = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const h = /^##\s+F(\d+):\s*(.+?)\s*$/.exec(raw);
    if (h) {
      cur = { id: `F${h[1]}`, conclusion: h[2], gap: null, evidence: [] };
      findings.push(cur);
      continue;
    }
    if (!cur) continue;
    const g = /^-\s+gap:\s*(\w+)\s*$/.exec(raw);
    if (g) {
      cur.gap = g[1];
      continue;
    }
    if (/^-\s+支撑证据:/.test(raw)) {
      cur.evidence = [...raw.matchAll(/evidence\/[\w.-]+\.md/g)].map((m) => m[0]);
    }
  }
  return findings;
}

/** review.md → { readiness, critical, major, minor }；无判定行返回 null。
 *  readiness 取**终局判定**：规则收在 pack lib `review-readiness.terminalReadiness`（只认**行首**
 *  判定行、取最后一条）。2026-10-11 实测修正：旧的未锚行首末位匹配会把 review.md 文末附录按
 *  critic skill 契约保留的首轮 `readiness: FAIL`（轮次血统）读成终局，把已交付 run 报成 FAIL。 */
export function parseReview(text) {
  const readiness = terminalReadiness(text);
  if (readiness === null) return null;
  const count = (re) => (text.match(re) || []).length;
  return {
    readiness,
    critical: count(/^- C\d+:/gm),
    major: count(/^- M\d+:/gm),
    minor: count(/^- m\d+:/gm),
  };
}

/** journal.md 尾部 n 条（非空行） */
export function tailJournal(text, n = 15) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-n);
}

/** topic × evidence 矩阵：每 topic 证据数与 A–D 分布 */
export function topicEvidenceMatrix(topics, evidence) {
  const valid = evidence.filter((e) => e.ok);
  return topics.map((t) => {
    const ev = valid.filter((e) => e.supports === t.id);
    const dist = { A: 0, B: 0, C: 0, D: 0 };
    for (const e of ev) if (e.quality in dist) dist[e.quality]++;
    return { topic: t.id, name: t.name, questions: t.questions, count: ev.length, dist };
  });
}

/** gap 四态统计 */
export function gapStats(findings) {
  const s = { supported: 0, needs_search: 0, contradicted: 0, insufficient: 0 };
  for (const f of findings) if (f.gap in s) s[f.gap]++;
  return s;
}

// ── debug-dashboard-plus 新增纯函数（测试面）──────────────────────────────────

/** 多 run 场扫描：全部场按 mtime 降序。drt 场只认 drt_*（桥接 symlink 经 statSync 跟随亦算）；
 *  ad-hoc 场全收（标注"无契约"呈现，不隐藏）。根缺席 → 该场为空（fail-soft）。 */
export function listScenes(roots = SCENE_ROOTS) {
  const scenes = [];
  for (const root of roots) {
    try {
      for (const d of readdirSync(root.dir)) {
        try {
          if (root.kind === 'drt' && !/^drt_/.test(d)) continue;
          const p = join(root.dir, d);
          if (!statSync(p).isDirectory()) continue;
          scenes.push({ dir: p, slug: d, kind: root.kind, label: root.label, mtimeMs: statSync(p).mtimeMs });
        } catch {
          /* 单条目 stat 失败跳过 */
        }
      }
    } catch {
      /* 根不存在/不可读 → 该场空 */
    }
  }
  return scenes.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** 场是否归档场（--latest stdout 归档标注的判据正本：哪个 label 算归档住 core，CLI 壳
 *  只问本函数不重复持知识）。label 缺席/无场 → false（不标注，不猜）。 */
export function isArchivedScene(scene) {
  return typeof scene?.label === 'string' && scene.label.includes('归档');
}

/** 场是否停放场（D28：_abandoned = 操作桶，不是“未交付”状态证明）。 */
export function isParkedScene(scene) {
  return typeof scene?.label === 'string' && scene.label.includes('停放');
}

/** 场内进度速览（stat-only，不解析内容）：走到哪一步 / 完成几件。
 *  final 双命名容纳：final/v*.md（契约）或 final.md（ad-hoc 化石命名）；review 同理。 */
export function sceneState(dir) {
  const has = (f) => {
    try {
      statSync(join(dir, f));
      return true;
    } catch {
      return false;
    }
  };
  let ev = false;
  try {
    ev = readdirSync(join(dir, 'evidence')).some((f) => f.endsWith('.md'));
  } catch {
    /* evidence/ 缺席 */
  }
  let fin = has('final.md');
  if (!fin) {
    try {
      fin = readdirSync(join(dir, 'final')).some((f) => /^v\d+\.md$/.test(f));
    } catch {
      /* final/ 缺席 */
    }
  }
  const steps = [
    ['question', has('question.md')],
    ['team', has('question.md')],
    ['leads', has('leads.md')],
    ['evidence', ev],
    ['findings', has('findings.md')],
    ['review', has('review.md') || has('review-critic.md')],
    ['final', fin],
  ];
  let last = -1;
  steps.forEach(([, v], i) => {
    if (v) last = i;
  });
  return { lastStep: last >= 0 ? steps[last][0] : null, done: steps.filter(([, v]) => v).length };
}

/** 流程步骤条（纯文件事实，零发明）：done ✓ / 当前 ● / 待办 ○。当前步 = 最后一个有内容的步。
 *  步序正本 = m2-run-mechanics「运行流程总览」：立项（question+topics 一体）→ 组队 → 侦察 →
 *  挖掘 → 综合 → 审查 → 交付；组队无独立文件，在场性随立项（cursor 停靠语义，与 run-fold 同）。 */
export function deriveStep(model) {
  return deriveSteps({
    question: !!model.question,
    team: !!model.question,
    leads: model.leads.length > 0,
    evidence: model.stats.evidence,
    findings: model.findings.length > 0,
    review: !!model.review,
    final: !!model.final,
  });
}

/** HITL 等待检测：会话日志选择与状态折算分别复用 shared modules；扫描范围（**只扫 run 工作区组**，
 * 见循环内注释）与最近时间策略由 dashboard owner 保持。损坏的 canonical 日志不降级到旧代。
 * @param opts.groupMarker 组名必须含该子串；传 `null` 表示不筛（测试与特殊场景用）。 */
export function detectHitlWait(sessionsRoot = SESSIONS_ROOT, { maxAgeMs = 12 * 3600 * 1000, groupMarker = 'research-workspace' } = {}) {
  const waiting = [];
  const cutoff = Date.now() - maxAgeMs;
  let groups = [];
  try { groups = readdirSync(sessionsRoot); } catch { return waiting; }
  for (const g of groups) {
    // 只扫 **run 工作区** 的会话组：dashboard 是 run 投影，冒烟/开发工作区的会话不是 run。
    // 2026-10-11 实测：冒烟会话里遗留的挂起问被报成「⏳ 等你拍板（HITL）」，与盘侧 run-state
    // 谓词（RUN-SETTLED）不一致——两处观察面就同一问题给出相反答案，正是本仓要避免的形态。
    // 组名 = cwd 的 slug，故 run 工作区的判据与 watch-run 同款（`includes('research-workspace')`）。
    if (groupMarker !== null && !g.includes(groupMarker)) continue;
    const gdir = join(sessionsRoot, g);
    let sessions = [];
    try { sessions = readdirSync(gdir); } catch { continue; }
    for (const s of sessions) {
      const logFile = resolveSessionLog(join(gdir, s));
      if (!logFile) continue;
      try {
        if (statSync(logFile).mtimeMs < cutoff) continue;
        const { readable, events } = readSessionEvents(logFile);
        if (!readable) continue;
        const state = foldHitlPending(events);
        if (!state.pending) continue;
        const since = normalizeEventTime(state.since);
        waiting.push({ session: s.replace(/^session-/, '').slice(0, 8), group: g, since });
      } catch {
        /* 无日志/解压失败/畸形 → 跳过 */
      }
    }
  }
  return waiting.sort((a, b) => String(b.since).localeCompare(String(a.since)));
}

function normalizeEventTime(time) {
  if (typeof time === 'number' && Number.isFinite(time)) return new Date(time).toISOString();
  if (typeof time === 'string') {
    const date = new Date(time);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return '未知时间';
}

/** web GUI 基址（deep-link）：从 boot-run tee 的 web 日志抓横幅 URL；缺席返回 null */
export function readGuiBase(webLog = WEB_LOG) {
  try {
    const m = /dsh web: (https?:\/\/\S+)/.exec(readFileSync(webLog, 'utf8'));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// ── 汇总模型 ─────────────────────────────────────────────────────────────────

/** 汇总模型：run 目录 → 一个可渲染对象（fail-soft，永不 throw）。
 *  final：final/v*.md（契约，取最大版号）或 final.md（ad-hoc 化石命名）→ { file, versioned }；
 *  review：review.md 或 review-critic.md（ad-hoc 化石命名）双命名容纳。 */
export function buildModel(runDir) {
  const model = {
    runDir,
    slug: basename(runDir),
    generatedAt: new Date().toISOString(),
    missing: [],
    question: null,
    topics: [],
    evidence: [],
    leads: [],
    findings: [],
    review: null,
    final: null,
    journal: [],
    stats: { evidence: 0, drafts: 0, lastModified: null },
  };
  const read = (f) => {
    try {
      return readFileSync(join(runDir, f), 'utf8');
    } catch {
      model.missing.push(f);
      return null;
    }
  };
  const q = read('question.md');
  model.question = q ? parseQuestion(q) : null;
  const t = read('topics.md');
  model.topics = t ? parseTopics(t) : [];
  const ev = parseEvidenceDir(join(runDir, 'evidence'));
  if (ev.missing) model.missing.push('evidence/');
  model.evidence = ev.files;
  const l = read('leads.md');
  model.leads = l ? parseLeads(l) : [];
  const f = read('findings.md');
  model.findings = f ? parseFindings(f) : [];
  let rText = null;
  for (const rf of ['review.md', 'review-critic.md']) {
    try {
      rText = readFileSync(join(runDir, rf), 'utf8');
      break;
    } catch {
      /* 下一个命名 */
    }
  }
  if (rText === null) model.missing.push('review.md');
  model.review = rText ? parseReview(rText) : null;
  try {
    const versions = readdirSync(join(runDir, 'final'));
    const latest = latestRunVersion(versions);
    if (latest > 0) model.final = { file: `final/v${latest}.md`, versioned: true };
  } catch {
    /* final/ 缺席 → 试 final.md */
  }
  if (!model.final) {
    try {
      statSync(join(runDir, 'final.md'));
      model.final = { file: 'final.md', versioned: false };
    } catch {
      /* 未交付 */
    }
  }
  const j = read('journal.md');
  model.journal = j ? tailJournal(j) : [];
  model.stats.evidence = model.evidence.filter((e) => e.ok).length;
  try {
    model.stats.drafts = readdirSync(join(runDir, 'drafts')).length;
  } catch {
    /* drafts/ 可缺席 */
  }
  let last = 0;
  try {
    for (const name of readdirSync(runDir)) {
      try {
        const st = statSync(join(runDir, name));
        if (st.isFile()) last = Math.max(last, st.mtimeMs);
      } catch {
        /* 单文件 stat 失败忽略 */
      }
    }
  } catch {
    /* 目录本身不可读：留 null */
  }
  if (last) model.stats.lastModified = new Date(last).toISOString();
  return model;
}
