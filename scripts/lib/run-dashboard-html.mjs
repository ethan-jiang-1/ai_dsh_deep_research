// run-dashboard-html.mjs — M2 run 只读观察面的 HTML 渲染薄壳（纯字符串拼接；数据全来自
// run-dashboard-core 的模型/矩阵/统计）。2026-10-28 从 run-dashboard-core.mjs 拆出：
// “把文件折成模型”和“把模型画成 HTML”是两个变更面；拆开后 core 不再含渲染函数。
//
// 消费方：scripts/run-ops/run-dashboard.mjs（CLI 壳）、tests/run/run-dashboard.test.mjs。
import { gapStats, topicEvidenceMatrix } from './run-dashboard-core.mjs'

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
