// hitl-provenance.mjs — hitl-answer 代答的 provenance 写盘（BUG-014 正修）。
// 代理模拟必须显式记账进 bundle 的 question.md §Decisions 与 journal.md（两点交互边界的
// 代驱显式纪律 + running-a-research-run 技能 §2）——此前驱动只打印承诺不写盘，拍板行
// 误归因"用户"（BUG-014 症状实录 = mistral run，操作侧手工补记救回）。
// 纯函数与写盘器分离；keyless 契约测试钉住（tests/hitl-provenance.test.mjs——含缺件
// fail-loud 反证）。消费方 = dev/hitl-answer.mjs（盘侧裁决通过后调用）。
import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 盘侧 answer 批 → provenance 的 answered 形态（BUG-014 第二缺口正修：DSH UI 会预选推荐项，
 * 驱动零点击直接 Submit 时点击日志为空——provenance 数据源必须是**实际提交的批**而非点击日志；
 * 批形态 = [{id, selected: [...]}]，以 id 作题目标签）。
 * @param {Array<{id?: string, prompt?: string, selected?: string[]}>} batch
 * @returns {Array<{step: number, prompt: string, selected: string}>} 批缺席 → 空数组（不猜）。
 */
export function batchToAnswered(batch) {
  if (!Array.isArray(batch)) return [];
  return batch.map((b, i) => ({
    step: i + 1,
    prompt: String(b?.id ?? b?.prompt ?? ''),
    selected: String(Array.isArray(b?.selected) ? (b.selected[0] ?? '') : (b?.selected ?? '')),
  }));
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
