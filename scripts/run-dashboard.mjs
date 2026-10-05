#!/usr/bin/env node
// run-dashboard — M2 run 只读观察面（RFC：notes/implemented/2026-09-24-m2-run-dashboard.md
// + debug-dashboard-plus：notes/implemented/2026-09-24-debug-dashboard-plus.md）
//
// 用法：
//   node --import tsx/esm scripts/run-dashboard.mjs <runDir> [--out <html>]          一次性生成
//   node --import tsx/esm scripts/run-dashboard.mjs --latest [--out <html>]          多场扫描取最新（SCENE_ROOTS）
//   加 --watch --interval <秒> 持续再生成（配合页面 meta refresh；默认 5s）
//
// 原则（RFC 定死，勿破）：
//   1. 投影不是真相——只读解析 run 文件，不写 run 目录，不缓存派生状态；
//   2. 被动观察——不构成第三个交互点，不从观察面向角色发指令；
//   3. keyless——纯 fs + node:zlib（zstd 会话日志解压，HITL 等待检测用），无模型/网络/子进程；
//   4. fail-soft——缺失/畸形文件显示"未开始 / 无法解析"并继续渲染其余部分。
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveSessionLog, readSessionEvents } from './lib/session-log.mjs';
import { deriveSteps } from '../packages/deep-research-pack/src/lib/run-fold.ts';
import { foldHitlPending } from '../packages/deep-research-pack/src/lib/hitl-fold.ts';

export { decompressSessionLog } from './lib/session-log.mjs';

/** 多 run 场根（debug-dashboard-plus）：drt 正规场 + ad-hoc 场（无契约，标注呈现不隐藏） */
const SCENE_ROOTS = [
  { dir: 'research-workspace', kind: 'drt', label: 'drt' },
  // 归档场（2026-09-27）：已交付 run 移入 archive/ 后仍进多 run 总表（历史不丢）；
  // label 区分归档，避免与活跃场混淆。
  { dir: 'research-workspace/archive', kind: 'drt', label: 'drt·归档' },
  { dir: 'dev/harness-home/runs', kind: 'ad-hoc', label: 'ad-hoc·无契约' },
];
/** lead 会话日志根（HITL 等待检测；选择器按 v4/v3 canonical 代际挑选一个物理日志）。 */
const SESSIONS_ROOT = 'dev/harness-home/sessions';
/** web 日志（boot-run tee 的横幅，含 token URL——deep-link 用；缺席即不链） */
const WEB_LOG = 'dev/smoke-workspace/web.log';

// ── 纯解析函数（测试面；全部对畸形输入 fail-soft，永不 throw）──────────────────

/** 拆 frontmatter：`---` 围栏内的 `key: value` 行 → 对象；无围栏返回 fm: null */
export function splitFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { fm: null, body: text };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return { fm, body: m[2] };
}

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

/** review.md → { readiness, critical, major, minor }；无 readiness 行返回 null。
 *  readiness 取**最后一处** = 终局判定：review.md 允许两相（首审 + lead 改稿后的复核终审，
 *  复核在文末再写一次 `## readiness:`），首审判定留在文中作为留痕。取首个匹配会把已交付的
 *  run 报成 FAIL（真实形态实证；见 Note 2026-09-26-signal-to-noise-remediation §问题③）。 */
export function parseReview(text) {
  const all = [...text.matchAll(/readiness:\s*(PASS|FAIL)/g)];
  if (all.length === 0) return null;
  const rd = all[all.length - 1];
  const count = (re) => (text.match(re) || []).length;
  return {
    readiness: rd[1],
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

/** HITL 等待检测：会话日志选择与状态折算分别复用 shared modules；扫描范围和
 * 最近时间策略仍由 dashboard owner 保持。损坏的 canonical 日志不降级到旧代。 */
export function detectHitlWait(sessionsRoot = SESSIONS_ROOT, { maxAgeMs = 12 * 3600 * 1000 } = {}) {
  const waiting = [];
  const cutoff = Date.now() - maxAgeMs;
  let groups = [];
  try { groups = readdirSync(sessionsRoot); } catch { return waiting; }
  for (const g of groups) {
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
    const fins = readdirSync(join(runDir, 'final')).filter((x) => /^v\d+\.md$/.test(x)).sort();
    if (fins.length) model.final = { file: `final/${fins[fins.length - 1]}`, versioned: true };
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

// ── 渲染薄壳（纯字符串拼接；数据全来自上面的纯函数）──────────────────────────

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const distLine = (d) => `A:${d.A} B:${d.B} C:${d.C} D:${d.D}`;

const STEP_LABELS = { question: '立项', team: '组队', leads: '侦察', evidence: '挖掘', findings: '综合', review: '审查', final: '交付' };

function renderMatrix(model) {
  const rows = topicEvidenceMatrix(model.topics, model.evidence);
  if (!rows.length) return '<p class="soft">topics 未开始/无法解析</p>';
  return `<table><tr><th>topic</th><th>问题数</th><th>证据数</th><th>A–D 分布</th></tr>${rows
    .map(
      (r) =>
        `<tr><td>${esc(r.topic)} ${esc(r.name)}</td><td>${r.questions}</td><td>${r.count}</td><td>${distLine(r.dist)}</td></tr>`,
    )
    .join('')}</table>`;
}

function renderLeads(model) {
  if (!model.leads.length) return '<p class="soft">leads 未开始/无法解析</p>';
  const dig = model.leads.filter((x) => x.status === 'dig').length;
  const exc = model.leads.filter((x) => x.status === 'excluded').length;
  const items = model.leads
    .map((x) => {
      const tag = x.status === 'excluded' ? `<span class="tag exc">已排除（${esc(x.excludedReason ?? '')}）</span>` : '<span class="tag dig">建议挖深</span>';
      return `<li>${esc(x.direction)} ${tag} <span class="soft">分级 ${esc(x.grades.join('/') || '—')}</span></li>`;
    })
    .join('');
  return `<p>方向 ${model.leads.length}（挖深 ${dig} / 已排除 ${exc}）</p><ul>${items}</ul>`;
}

function renderFindings(model) {
  if (!model.findings.length) return '<p class="soft">findings 未开始/无法解析</p>';
  const s = gapStats(model.findings);
  const items = model.findings
    .map(
      (f) =>
        `<li>${esc(f.id)}: ${esc(f.conclusion)} <span class="tag gap-${esc(f.gap ?? 'unknown')}">${esc(f.gap ?? 'gap 未标')}</span> <span class="soft">${esc(f.evidence.join(', ') || '无证据链接')}</span></li>`,
    )
    .join('');
  return `<p>gap 四态：supported ${s.supported} / needs_search ${s.needs_search} / contradicted ${s.contradicted} / insufficient ${s.insufficient}</p><ul>${items}</ul>`;
}

function renderReview(model) {
  if (!model.review) return '<p class="soft">review 未开始/无法解析</p>';
  const r = model.review;
  const cls = r.readiness === 'PASS' ? 'pass' : 'fail';
  return `<p>readiness: <span class="tag ${cls}">${r.readiness}</span> · CRITICAL ${r.critical} / MAJOR ${r.major} / MINOR ${r.minor}</p>`;
}

function renderStepBar(model) {
  const steps = model.steps ?? [];
  if (!steps.length) return '';
  const chips = steps
    .map((s) => `<span class="chip ${s.state}">${s.state === 'done' ? '✓' : s.state === 'current' ? '●' : '○'} ${esc(s.label)}</span>`)
    .join(' ');
  return `<p class="steps">${chips}</p>`;
}

function renderBanners(model) {
  const out = [];
  const link = model.guiBase ? ` · <a href="${esc(model.guiBase)}" target="_blank">打开 web GUI</a>` : '';
  for (const w of model.hitlWait ?? []) {
    out.push(`<p class="banner wait">⏳ 等你拍板（HITL）——会话 ${esc(w.session)}（自 ${esc(String(w.since).slice(11, 19))} 挂起）${link}</p>`);
  }
  if (model.silentZone) out.push('<p class="banner silent">静默自主区——角色在干活，无需等待</p>');
  return out.join('');
}

function renderScenes(model) {
  const scenes = model.scenes ?? [];
  if (!scenes.length) return '';
  const rows = scenes
    .map((s, i) => {
      const cur = s.dir === model.runDir ? ' class="cur"' : '';
      const lead = i === 0 && s.dir === model.runDir ? '● ' : i === 0 ? '○ ' : '';
      const badge = s.state?.lastStep ? STEP_LABELS[s.state.lastStep] ?? s.state.lastStep : '未开始';
      return `<tr${cur}><td>${lead}${esc(s.slug)}</td><td><span class="tag ${s.kind === 'drt' ? 'dig' : 'exc'}">${esc(s.label)}</span></td><td>${badge}（${s.state?.done ?? 0}/7）</td><td>${esc(new Date(s.mtimeMs).toISOString().slice(11, 19))}</td></tr>`;
    })
    .join('');
  return `<h2>run 场清单（多场扫描）</h2><table><tr><th>场</th><th>类型</th><th>进度</th><th>最后修改</th></tr>${rows}</table>`;
}

export function renderHtml(model) {
  const q = model.question;
  const head = q
    ? `<p><b>问题</b>：${esc(q.question ?? '无法解析')}</p>
       <p><b>Purpose</b>：${esc(q.purpose ?? '—')}</p>
       <p><b>类型/深度</b>：${esc(q.profile ?? '—')} / ${esc(q.depth ?? '—')} · <b>Decisions</b> ${q.decisions} 条${model.final ? ` · <b>交付</b> ${esc(model.final.file)}` : ''}</p>`
    : '<p class="soft">question.md 未开始/无法解析</p>';
  const journal = model.journal.length
    ? `<ul>${model.journal.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : '<p class="soft">journal 未开始</p>';
  const missing = model.missing.length
    ? `<p class="soft">缺失（未开始或路径不对）：${esc(model.missing.join(', '))}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="5">
<title>run dashboard — ${esc(model.slug)}</title>
<style>
 body{font-family:system-ui,sans-serif;margin:2rem;max-width:60rem;color:#222}
 h1{font-size:1.3rem} h2{font-size:1.05rem;border-bottom:1px solid #ddd;padding-bottom:.3rem;margin-top:1.6rem}
 table{border-collapse:collapse} td,th{border:1px solid #ddd;padding:.3rem .6rem;font-size:.9rem}
 tr.cur td{background:#f5f8ff}
 .tag{display:inline-block;padding:0 .4rem;border-radius:.3rem;font-size:.8rem}
 .dig{background:#e6f4ea}.exc{background:#fdecea}.pass{background:#e6f4ea}.fail{background:#fdecea}
 .gap-supported{background:#e6f4ea}.gap-needs_search{background:#fef7e0}.gap-contradicted{background:#fdecea}.gap-insufficient{background:#eee}
 .soft{color:#999}
 .banner{padding:.5rem .8rem;border-radius:.4rem;margin:.4rem 0}
 .banner.wait{background:#fef7e0;border:1px solid #e8d48a}
 .banner.silent{background:#e6f4ea;border:1px solid #b7dfc2}
 .steps .chip{display:inline-block;padding:.15rem .5rem;border-radius:.9rem;font-size:.8rem;margin-right:.3rem;border:1px solid #ddd}
 .chip.done{background:#e6f4ea;border-color:#b7dfc2}
 .chip.current{background:#f59e0b33;border-color:#e8c48a;font-weight:600}
 .chip.pending{color:#999}
</style>
</head>
<body>
<h1>run dashboard — ${esc(model.slug)}</h1>
${renderBanners(model)}${renderStepBar(model)}
${head}${missing}
${renderScenes(model)}
<h2>topic × evidence 矩阵</h2>
${renderMatrix(model)}
<h2>leads 概览</h2>
${renderLeads(model)}
<h2>findings</h2>
${renderFindings(model)}
<h2>review</h2>
${renderReview(model)}
<h2>journal（尾部）</h2>
${journal}
<h2>文件统计</h2>
<p>证据（有效 frontmatter）${model.stats.evidence} 条 · drafts ${model.stats.drafts} 个 · 最后修改 ${esc(model.stats.lastModified ?? '—')}</p>
<p class="soft">生成于 ${esc(model.generatedAt)} · 只读投影（run bundle 是唯一真相）· 5s 自动刷新</p>
</body>
</html>
`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : null;
  };
  const out = flag('--out');
  const interval = Number(flag('--interval') ?? 5);
  const take = (name) => {
    const i = args.indexOf(name);
    if (i >= 0) args.splice(i, 1);
  };
  const watch = args.includes('--watch');
  take('--watch');
  const latest = args.includes('--latest');
  take('--latest');
  const runDir = args.find((a) => !a.startsWith('--'));
  if (!runDir && !latest) {
    console.error('用法: run-dashboard.mjs <runDir> [--out <html>] [--watch] [--interval <s>] | --latest [--out <html>]（多场扫描）');
    process.exit(1);
  }
  const generate = () => {
    const scenes = listScenes();
    const dir = latest ? (scenes[0]?.dir ?? null) : runDir;
    const model = dir
      ? buildModel(dir)
      : { runDir: '(无 run)', slug: '未开始', generatedAt: new Date().toISOString(), missing: ['drt_<slug>/'], question: null, topics: [], evidence: [], leads: [], findings: [], review: null, final: null, journal: [], stats: { evidence: 0, drafts: 0, lastModified: null } };
    model.scenes = scenes.map((s) => ({ ...s, state: sceneState(s.dir) }));
    model.steps = deriveStep(model);
    model.hitlWait = detectHitlWait();
    model.silentZone = !model.hitlWait.length && scenes.some((s) => Date.now() - s.mtimeMs < 10 * 60 * 1000);
    model.guiBase = readGuiBase();
    const html = renderHtml(model);
    if (out) {
      writeFileSync(out, html);
      console.error(`run-dashboard: 写 ${out}（run: ${model.slug}${dir ? '' : '，等待 lead 建 drt_<slug>/'}${model.hitlWait.length ? '，HITL 等待 ×' + model.hitlWait.length : ''}）`);
    } else {
      process.stdout.write(html);
    }
  };
  generate();
  if (watch) {
    // 孤儿自退出（boot-run trap 的第二道保险：job_kill SIGKILL 掉父 shell 时，trap 不会跑，
    // 但父死后 ppid 变化 → 本进程 2s 内自行退出——2026-09-24 事故 ① 的机制化收尾）。
    const ppid = process.ppid;
    setInterval(() => {
      if (process.ppid !== ppid) process.exit(0);
    }, 2000);
    setInterval(generate, Math.max(1, interval) * 1000);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
