#!/usr/bin/env node
// run-dashboard — M2 run 只读观察面（RFC：notes/proposed/2026-09-24-m2-run-dashboard.md）
//
// 用法：
//   node scripts/run-dashboard.mjs <runDir> [--out <html>]          一次性生成
//   node scripts/run-dashboard.mjs --latest [--root <runsDir>] ...   永远画最新 run
//   加 --watch --interval <秒> 持续再生成（配合页面 meta refresh；默认 5s）
//
// 原则（RFC 定死，勿破）：
//   1. 投影不是真相——只读解析 run 文件，不写 run 目录，不缓存派生状态；
//   2. 被动观察——不构成第三个交互点，不从观察面向角色发指令；
//   3. keyless——纯 fs，无模型/网络/子进程；
//   4. fail-soft——缺失/畸形文件显示"未开始 / 无法解析"并继续渲染其余部分。
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

/** question.md → { question, purpose, profile, depth, decisions }（缺节为 null） */
export function parseQuestion(text) {
  const out = { question: null, purpose: null, profile: null, depth: null, decisions: 0 };
  const qSec = sectionBody(text, '研究问题（定稿）');
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
    const p = /^-\s+研究类型:\s*(.+)$/m.exec(hSec);
    const d = /^-\s+深度与篇幅:\s*(.+)$/m.exec(hSec);
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

/** evidence/ 目录 → [{ file, ok, quality, supports, sourceUrl, retrievedAt }]（无 frontmatter 不算证据） */
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
      const rec = { file: f, ok: false, quality: null, supports: null, sourceUrl: null, retrievedAt: null };
      try {
        const { fm } = splitFrontmatter(readFileSync(join(dir, f), 'utf8'));
        // 有效证据谓词：五字段全齐（正本 = 研究手册 research-workspace/AGENTS.md §证据文件契约；
        // 本处是渲染层实现，tests/evaluation-contract.test.mjs 机械对账）
        if (fm && fm.source_url && fm.retrieved_at && fm.quality && fm.found_by && fm.supports) {
          Object.assign(rec, {
            ok: true,
            quality: fm.quality,
            supports: fm.supports,
            sourceUrl: fm.source_url,
            retrievedAt: fm.retrieved_at,
          });
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

/** review.md → { readiness, critical, major, minor }；无 readiness 行返回 null */
export function parseReview(text) {
  const rd = /readiness:\s*(PASS|FAIL)/.exec(text);
  if (!rd) return null;
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

/** 汇总模型：run 目录 → 一个可渲染对象（fail-soft，永不 throw） */
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
  const r = read('review.md');
  model.review = r ? parseReview(r) : null;
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

export function renderHtml(model) {
  const q = model.question;
  const head = q
    ? `<p><b>问题</b>：${esc(q.question ?? '无法解析')}</p>
       <p><b>Purpose</b>：${esc(q.purpose ?? '—')}</p>
       <p><b>类型/深度</b>：${esc(q.profile ?? '—')} / ${esc(q.depth ?? '—')} · <b>Decisions</b> ${q.decisions} 条</p>`
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
 .tag{display:inline-block;padding:0 .4rem;border-radius:.3rem;font-size:.8rem}
 .dig{background:#e6f4ea}.exc{background:#fdecea}.pass{background:#e6f4ea}.fail{background:#fdecea}
 .gap-supported{background:#e6f4ea}.gap-needs_search{background:#fef7e0}.gap-contradicted{background:#fdecea}.gap-insufficient{background:#eee}
 .soft{color:#999}
</style>
</head>
<body>
<h1>run dashboard — ${esc(model.slug)}</h1>
${head}${missing}
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
<p class="soft">生成于 ${esc(model.generatedAt)} · 只读投影（runs/ 目录是唯一真相）· 5s 自动刷新</p>
</body>
</html>
`;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function latestRunDir(root) {
  try {
    let best = null;
    let bestMtime = 0;
    for (const d of readdirSync(root)) {
      try {
        const p = join(root, d);
        if (!statSync(p).isDirectory()) continue; // 只认目录（.gitkeep 等文件不是 run）
        const m = statSync(p).mtimeMs;
        if (m > bestMtime) {
          bestMtime = m;
          best = p;
        }
      } catch {
        /* 跳过不可 stat 的条目 */
      }
    }
    return best;
  } catch {
    return null;
  }
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : null;
  };
  const out = flag('--out');
  const interval = Number(flag('--interval') ?? 5);
  const root = flag('--root');
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
    console.error('用法: run-dashboard.mjs <runDir> [--out <html>] [--watch] [--interval <s>] | --latest [--root <runsDir>]');
    process.exit(1);
  }
  const generate = () => {
    const dir = latest ? latestRunDir(root ?? 'research-workspace/runs') : runDir;
    const model = dir
      ? buildModel(dir)
      : { runDir: '(无 run)', slug: '未开始', generatedAt: new Date().toISOString(), missing: ['runs/'], question: null, topics: [], evidence: [], leads: [], findings: [], review: null, journal: [], stats: { evidence: 0, drafts: 0, lastModified: null } };
    const html = renderHtml(model);
    if (out) {
      writeFileSync(out, html);
      console.error(`run-dashboard: 写 ${out}（run: ${model.slug}${dir ? '' : '，等待 lead 建 runs/<slug>/'}）`);
    } else {
      process.stdout.write(html);
    }
  };
  generate();
  if (watch) setInterval(generate, Math.max(1, interval) * 1000);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
