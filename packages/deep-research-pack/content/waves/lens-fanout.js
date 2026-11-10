// lens-fanout.js —— workflow wave 的固定配方 body（`content/waves/` 的唯一正本）。
//
// 运行环境 = DSH workflow PTC 沙箱：只有 `args` / `agent` / `pipeline` / `phase` / `log`
// 五个全局；没有 fs、network、timer、Node API。脚本只做三件事：
//   ① 显式校验 args（缺字段/空/超 8 → 整脚本 error，不静默跑 0 个 cell）；
//   ② 为每个 cell 调 `agent(prompt, { schema, label, phase })`；
//   ③ 按 cell 顺序返回 typed 结果，**null 不丢**，由 executor 对账。
//
// 配方不是证据：child 必须先写 `evidence/<cell>.md`（八字段），再调 `structured_output`；
// 脚本拿不到 fs，无法验证文件。对账（文件存在/字段齐/缺失）是 analyst executor 的活。

const cfg = args && typeof args === 'object' ? args : null;
if (!cfg || typeof cfg.wave !== 'string' || cfg.wave.trim() === ''
  || !Array.isArray(cfg.cells)
  || typeof cfg.bundle_dir !== 'string' || cfg.bundle_dir.trim() === '') {
  throw new Error('lens-fanout: args.wave (string), args.bundle_dir (string) and args.cells (array) are required');
}
if (cfg.cells.length < 1 || cfg.cells.length > 8) {
  throw new Error(`lens-fanout: cells must be 1..8 (got ${cfg.cells.length})`);
}

const REQUIRED = ['id', 'topic', 'question', 'lens', 'lens_path', 'output_path'];
const seen = new Set();
for (let index = 0; index < cfg.cells.length; index += 1) {
  const cell = cfg.cells[index];
  if (cell === null || typeof cell !== 'object' || Array.isArray(cell)) {
    throw new Error(`lens-fanout: cells[${index}] must be an object`);
  }
  for (const key of REQUIRED) {
    if (typeof cell[key] !== 'string' || cell[key].trim() === '') {
      throw new Error(`lens-fanout: cells[${index}].${key} is required`);
    }
  }
  if (seen.has(cell.id)) {
    throw new Error(`lens-fanout: cells[${index}].id "${cell.id}" is duplicated`);
  }
  seen.add(cell.id);
}

const SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ok', 'partial', 'failed'] },
    path: { type: 'string' },
    evidence_count: { type: 'integer' },
    gaps: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['status', 'path'],
  additionalProperties: false,
};

const EVIDENCE_CONTRACT = [
  'frontmatter must contain these eight fields: source_url, retrieved_at, quality (A-D), found_by,',
  'supports (topic id), source_tier (primary|secondary|tertiary|weak), publisher (registered domain),',
  'and lens (the single lens id). One card = one lens; split multi-lens evidence into separate files.',
  'Body: verbatim excerpt section and interpretation section, clearly separated; do not present interpretation as quotation.',
].join(' ');

function briefOf(cell) {
  const digest = typeof cell.lens_digest === 'string' && cell.lens_digest.trim() !== ''
    ? cell.lens_digest
    : '(read the lens file; no digest was provided)';
  return [
    'You are a Deep Research evidence worker inside one workflow wave. Do only this cell; do not synthesize a report and do not decide a final verdict.',
    `Run bundle: ${cfg.bundle_dir}`,
    `Wave: ${cfg.wave}; cell: ${cell.id}; topic: ${cell.topic}; lens: ${cell.lens}`,
    `Question to answer: ${cell.question}`,
    `Lens file (read it first): ${cell.lens_path}`,
    `Lens digest: ${digest}`,
    `Output file (write it before returning): ${cell.output_path}`,
    `Evidence contract: ${EVIDENCE_CONTRACT}`,
    `Budget: ${typeof cell.budget === 'string' && cell.budget.trim() !== '' ? cell.budget : 'at most 3 searches and 6 fetches'}.`,
    `Boundaries: ${typeof cell.boundaries === 'string' && cell.boundaries.trim() !== '' ? cell.boundaries : 'use only this lens evidence surface; do not synthesize; do not write final.md or plan.md'}.`,
    'Required order: (1) read the lens file and gather evidence; (2) write the evidence card at the output path; (3) call structured_output exactly once with status, path, evidence_count, gaps, and optional note.',
    'status definitions: ok = file written with all eight fields; partial = file written but evidence or fields are incomplete; failed = no usable file. Never claim ok without writing the file.',
    'Do not call workflow. Do not call subagent. Do not ask the user. If a decision is needed, write the gap into the card or the gaps array and return partial/failed; the analyst executor will escalate after the wave.',
    'Do not fabricate sources, quotes, dates, or fields. If the lens surface cannot answer the question, say so in gaps and return partial/failed.',
  ].join('\n\n');
}

phase('lens-fanout');
log(`wave ${cfg.wave}: ${cfg.cells.length} cells`);

const rows = await pipeline(cfg.cells, async (cell) => {
  const result = await agent(briefOf(cell), {
    schema: SCHEMA,
    label: `${cfg.wave}:${cell.id}`,
    phase: 'lens-fanout',
  });
  return {
    id: cell.id,
    topic: cell.topic,
    lens: cell.lens,
    path: cell.output_path,
    child_status: result === null ? null : result.status,
    result,
  };
});

const counts = { ok: 0, partial: 0, failed: 0 };
const cells = cfg.cells.map((cell, index) => {
  const row = rows[index];
  if (row === null || row === undefined) {
    counts.failed += 1;
    return {
      index,
      id: cell.id,
      topic: cell.topic,
      lens: cell.lens,
      path: cell.output_path,
      child_status: null,
      status: 'failed',
      evidence_count: 0,
      gaps: [],
      error: 'pipeline item dropped',
    };
  }
  const result = row.result;
  if (result === null || result === undefined) {
    counts.failed += 1;
    return {
      index,
      id: row.id,
      topic: row.topic,
      lens: row.lens,
      path: row.path,
      child_status: null,
      status: 'failed',
      evidence_count: 0,
      gaps: [],
      error: 'agent returned null',
    };
  }
  const status = result.status === 'ok' || result.status === 'partial' || result.status === 'failed'
    ? result.status
    : 'failed';
  counts[status] += 1;
  const evidenceCount = Number.isInteger(result.evidence_count) && result.evidence_count >= 0
    ? result.evidence_count
    : 0;
  const gaps = Array.isArray(result.gaps) ? result.gaps.filter((gap) => typeof gap === 'string') : [];
  return {
    index,
    id: row.id,
    topic: row.topic,
    lens: row.lens,
    path: row.path,
    child_status: result.status,
    status,
    evidence_count: evidenceCount,
    gaps,
    ...(typeof result.path === 'string' && result.path !== row.path ? { reported_path: result.path } : {}),
    ...(typeof result.note === 'string' && result.note.trim() !== '' ? { note: result.note } : {}),
  };
});

return {
  wave: cfg.wave,
  recipe: 'lens-fanout',
  requested: cfg.cells.length,
  cells,
  counts,
};
