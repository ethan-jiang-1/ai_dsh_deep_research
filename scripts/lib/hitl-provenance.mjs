// hitl-provenance.mjs — hitl-answer 代答的 provenance 写盘（BUG-014 正修）。
// 代理模拟必须显式记账进 bundle 的 question.md §Decisions 与 journal.md（两点交互边界的
// 代驱显式纪律 + running-a-research-run 技能 §2）——此前驱动只打印承诺不写盘，拍板行
// 误归因"用户"（BUG-014 症状实录 = mistral run，操作侧手工补记救回）。
// 纯函数与写盘器分离；keyless 契约测试钉住（tests/hitl-provenance.test.mjs——含缺件
// fail-loud 反证）。消费方 = dev/hitl-answer.mjs（盘侧裁决通过后调用）。
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { sessionBindingOf } from '../../packages/deep-research-pack/src/lib/bundle-bind.ts';
import { join } from 'node:path';

/**
 * 盘侧 answer 批 → provenance 的 answered 形态（BUG-014 第二缺口正修：DSH UI 会预选推荐项，
 * 驱动零点击直接 Submit 时点击日志为空——provenance 数据源必须是**实际提交的批**而非点击日志；
 * 批形态 = [{id, selected: [...]}]）。
 * BUG-017 题面富集：批可能带空 id（'' 非 nullish，旧 ?? 链不回退 → Q1「」空题面，mcp-hosts
 * 实证）——questions 参数（ask-drive.parseAskQuestions 产出，含 header/prompt）按 id join、
 * 位序回退解析标签；标签链 = header > id > prompt >「（题面缺席）」诚实标记（空串 = 静默，
 * 与「显性化而不是静默」纪律相悖）。
 * @param {Array<{id?: string, prompt?: string, selected?: string[]}>} batch
 * @param {Array<{id?: string, header?: string, prompt?: string}>} [questions]
 * @returns {Array<{step: number, prompt: string, selected: string}>} 批缺席 → 空数组（不猜）。
 */
export function batchToAnswered(batch, questions = []) {
  if (!Array.isArray(batch)) return [];
  const qs = Array.isArray(questions) ? questions : [];
  return batch.map((b, i) => {
    const q = (b?.id ? qs.find((x) => x && x.id === b.id) : undefined) ?? qs[i];
    const label = (q && q.header) || (b?.id ? String(b.id) : '') || (q && q.prompt) || (b?.prompt ? String(b.prompt) : '') || '（题面缺席）';
    return {
      step: i + 1,
      prompt: String(label),
      selected: String(Array.isArray(b?.selected) ? (b.selected[0] ?? '') : (b?.selected ?? '')),
    };
  });
}

/**
 * 生成两行 provenance 记账文本（纯函数）。
 * @param {{date: string, pick: string, answered: Array<{step: number, prompt: string, selected: string}>}} params
 *   date = YYYY-MM-DD；pick = 驱动选取模式；answered = 实际作答序列（驱动侧已逐题记录）。
 * @returns {{decisions: string, journal: string}} §Decisions 拍板行 + journal 记账行。
 */
export function provenanceLines({ date, pick, answered }) {
  const pairs = answered.map((a) => `Q${a.step}「${a.prompt}」→「${a.selected}」`).join('；');
  return {
    decisions: `- ${date}｜**HITL 交互 = 操作侧代理模拟（hitl-answer 驱动，pick=${pick}）**：${pairs}——作答者非用户本人，按代驱显式记账纪律落此行。`,
    journal: `- ${date}｜**HITL 代答 provenance（hitl-answer 自动落账）**：${pairs}（操作侧代理模拟，pick=${pick}）。`,
  };
}

/**
 * 把两行追加进 bundle 的 question.md 与 journal.md（追加式，不改写既有内容；重复调用 =
 * 多行，与手工补记形态一致）。缺件 fail-loud：bundle 缺任一契约件即抛，报出文件名与修正
 * 入口，不静默跳过。
 * @param {{bundle: string, date: string, pick: string, answered: Array<object>}} params
 * @returns {{question: string, journal: string}} 实际写入的两个文件路径。
 */
export function appendProvenance({ bundle, date, pick, answered }) {
  if (typeof bundle !== 'string' || bundle.length === 0) {
    throw new Error('appendProvenance: bundle 路径缺席——无 run bundle 可落账，拒绝静默（修正入口：核对工作区根 drt_* 在场）');
  }
  const question = join(bundle, 'question.md');
  const journal = join(bundle, 'journal.md');
  for (const f of [question, journal]) {
    if (!existsSync(f)) {
      throw new Error(`appendProvenance: ${f} 缺席——bundle 契约件不全，拒绝静默跳过（修正入口：核对 bundle 目录）`);
    }
  }
  const lines = provenanceLines({ date, pick, answered });
  appendFileSync(question, `\n${lines.decisions}\n`);
  appendFileSync(journal, `\n${lines.journal}\n`);
  return { question, journal };
}

/**
 * 代答 provenance 的归属判定（BUG-020 正修）：目标 bundle = **被答会话自己的 bundle-bind**
 * （sessionBindingOf，与驾驶舱同一谓词），不再查工作区根字典序——旧 bundleStateOf().activeBundle
 * 启发式在"别的在飞 bundle 在场 + 新 run 未实例化"时误归（2026-10-11 MCP run 三问卡与
 * sibling 卡两次实测，误落 drt_cn-moe-2026）。
 * 规则 = **仅写命中归属**：write/edit 进某 bundle 是"这场 run 是它"的权威信号；仅读命中
 * （立项预检 / 恢复会话）一律延迟——两种读在此不可靠区分（任何 ask 都置 kickoff 信号），而
 * 误归的代价（污染他 run 的 append-only 记录）远大于延迟的代价（操作侧按打印内容补记）。
 * @param {ReadonlyArray<unknown>} events 被答会话 journal 事件（调用方现读，勿用陈旧快照）。
 * @returns {string | null} bundle slug（无 drt_ 前缀）；无可归属 → null（延迟补记分支）。
 */
export function attributionBundleOf(events) {
  const binding = sessionBindingOf(events);
  return binding.boundBy === 'write' ? binding.slug : null;
}

/**
 * 自由文本关闭挂起的记账行（BUG-041，2026-10-18）：`run-kickoff --session <id> --prompt "<文本>"`
 * 是仓里官方的恢复手段，但它不走结构化作答 → 此前**不落任何记账**，于是交付段 §Decisions 无 HITL2 行、
 * 门②/门③ 如实判红，而复盘看不出"谁在何时答的、答了什么"。
 * 措辞与门侧 `isHitl2Row` **同钉**：交付审阅卡的行必须写明「交付审阅」+「代理模拟」，否则记账白落。
 * @param obs cardKey（'anchor-1'|'anchor-2'|其它）/ text（操作者发的自由文本）/ date。
 * @returns §Decisions 行（字符串）。
 */
export function closingProvenanceRow({ cardKey = 'unknown', text = '', date = '' } = {}) {
  const card = cardKey === 'anchor-2'
    ? '交付审阅'
    : cardKey === 'anchor-1' ? '计划确认（HITL1）' : `未知卡（${cardKey}）`
  const excerpt = String(text).replace(/\s+/g, ' ').trim().slice(0, 60)
  return `- ${date}｜**HITL 交互 = 操作侧代理模拟（run-kickoff 自由文本关闭挂起）**：${card} → 「${excerpt}」`
    + '——作答者非用户本人，按代驱显式记账纪律落此行。'
}

/**
 * 把一行 §Decisions 追加进目标 bundle（question.md 节内插入 + journal.md 双写——与
 * appendProvenance 同契约：bundle 路径缺席或契约件不全即 throw，拒绝静默）。
 * 节内插入 = 下一个 `## ` 节之前、§Decisions 既有行之后（节在文件尾的模板形态两者等价）；
 * §Decisions 节缺席 fail-loud——盲 append 到文件尾在尾随节形态下会把记账行落到节外，
 * 而 node-gate 门③（isHitl2Row）只读节内行 = 记账白落（2026-10-21 卫生轮立红实录）。
 * @param obs bundle（bundle 目录路径）/ row（要追加的记账行）/ journalNote（journal 侧人话备注；空串 = 不写 journal）。
 */
export function appendDecisionsRow({ bundle, row, journalNote = '' }) {
  if (typeof bundle !== 'string' || bundle.length === 0) {
    throw new Error('appendDecisionsRow: bundle 路径缺席——无 run bundle 可落账，拒绝静默')
  }
  const question = join(bundle, 'question.md')
  const journal = join(bundle, 'journal.md')
  for (const f of [question, journal]) {
    if (!existsSync(f)) throw new Error(`appendDecisionsRow: ${f} 缺席——bundle 契约件不全，拒绝静默跳过`)
  }
  writeFileSync(question, insertDecisionsRow(readFileSync(question, 'utf8'), row))
  if (journalNote !== '') appendFileSync(journal, `\n- ${journalNote}\n`)
  return { question, journal }
}

/** §Decisions 节内插入一行（纯函数；追加式不改写既有内容，空 journalNote 形态由调用方持有）。 */
function insertDecisionsRow(text, row) {
  const head = /^##\s*Decisions.*$/m.exec(text)
  if (head === null) throw new Error('appendDecisionsRow: question.md 缺 ## Decisions 节——拒绝静默落错节（修正入口：核对 bundle 的 question.md 模板形态）')
  const after = text.slice(head.index + head[0].length)
  const next = /^##\s.*$/m.exec(after)
  const at = next === null ? text.length : head.index + head[0].length + next.index
  const before = text.slice(0, at)
  const rest = text.slice(at)
  const sep = before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  return before + sep + row + '\n' + (rest === '' ? '' : rest.startsWith('\n') ? rest.slice(1) : '\n' + rest)
}
