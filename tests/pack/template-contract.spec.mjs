// template-contract — 模板里“机器/流程真正消费”的键（keyless，key 级）。
//
// 为什么存在：`content-injection` 证模板随包，`content-coverage` 证模板被点名；两者都不证
// 模板内部还有没有解析器/流程要读的键。这里只钉**被代码或流程实际消费**的键，不抄散文节名：
//   - question.md：`- 研究类型:`（runType 的类型判定）+ `## Decisions`（schema-scan 的节点1）；
//   - topics.md：`- must_answer:`（仪表盘解析）+ `- scope_role:`（门 L 的覆盖判据）；
//   - leads.md：状态/支持来源/关键线索/建议 owner（门 L 的四字段）；
//   - findings.md：`## F#:` + `- gap:`（仪表盘解析与 gap 四态）。
// final.md 的六节已由 presets.test（报告首屏）与 reader gate（读者版）钉住，本文件不重复。
//
// 不证明：字段值语义正确、模型真的填写、报告质量（→ L1/L4）。
// 红配方：删 findings.md 的 `- gap:` 行 → 本文件红；删 leads.md 的 `- 状态:` 行 → 本文件红；还原 → 绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateText } from './template-files.mjs';

/** 文件 → 被解析器/门禁实际消费的键（命名即申报；新增键先确认有消费者）。 */
const CONTRACTS = {
  'question.md': [
    { pattern: /^-\s*研究类型\s*[:：]/m, why: 'runType 的类型判定与 quick_factual 豁免' },
    { pattern: /^##\s*Decisions/m, why: 'schema-scan 的节点1 / 版本记账' },
  ],
  'topics.md': [
    { pattern: /^-\s*must_answer\s*[:：]\s*$/m, why: '仪表盘 must_answer 解析' },
    { pattern: /^-\s*scope_role\s*[:：]/m, why: '门 L 的 primary/comparison 覆盖判据' },
  ],
  'leads.md': [
    { pattern: /^-\s*状态\s*[:：]/m, why: '门 L 的状态行（建议挖深/已排除）' },
    { pattern: /^-\s*支持来源\s*[:：]/m, why: '门 L 的 A–D 分级判据' },
    { pattern: /^-\s*关键线索\s*[:：]/m, why: '门 L 的关键线索行' },
    { pattern: /^-\s*建议\s*owner\s*[:：]/m, why: '门 L 的 owner/topic 覆盖判据' },
  ],
  'findings.md': [
    { pattern: /^##\s*F\d+\s*[:：]/m, why: '仪表盘 findings 解析' },
    { pattern: /^-\s*gap\s*[:：]\s*\S+/m, why: 'gap 四态与补搜判据' },
  ],
};

for (const [file, contracts] of Object.entries(CONTRACTS)) {
  test(`${file}：解析器/门禁消费的键在场`, () => {
    const text = templateText(file);
    for (const { pattern, why } of contracts) {
      assert.match(text, pattern, `${file} 缺被消费的键（${why}）——模板是 schema 实例，缺键会让门禁/解析器失明`);
    }
  });
}
