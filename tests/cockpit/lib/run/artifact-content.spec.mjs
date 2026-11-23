// artifact-content 回归 — G25「非空 ≠ 有实质内容」/ G26 evidence sentinel（keyless 纯函数）。
// 反证：标题-only question、0 字节/空小节 leads、frontmatter-only evidence 都不得算正文。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasBodyText, hasPlanBody, hasQuestionBody, isEvidenceCard, isEvidenceCardName, questionBodyLineOf,
} from '../../../../packages/deep-research-pack/src/lib/run/artifact-content.ts'

test('hasBodyText：0 字节/空白/仅标题/仅 frontmatter/仅分隔线都不算正文', () => {
  assert.equal(hasBodyText(''), false)
  assert.equal(hasBodyText('  \n\t'), false)
  assert.equal(hasBodyText('# Scope\n## Notes\n### Decisions\n'), false)
  assert.equal(hasBodyText('---\nsource_url: x\n---\n'), false)
  assert.equal(hasBodyText('---\n---\n'), false)
  assert.equal(hasBodyText('调查要求：核对官方来源\n'), true)
  assert.equal(hasBodyText('- RQ1: 核验名单\n'), true)
});

test('questionBodyLineOf：标题-only/空小节 null；正文行剥装饰并截取', () => {
  assert.equal(questionBodyLineOf('# Question\n\n## Scope\n\n## Notes\n'), null);
  assert.equal(questionBodyLineOf('---\ntype: q\n---\n# Question\n'), null);
  assert.equal(questionBodyLineOf('# Question\n\n截至 2026 年，五常是哪五个国家？\n'), '截至 2026 年，五常是哪五个国家？');
  assert.equal(questionBodyLineOf('# Question\n\n**问题是**：五常名单\n'), '问题是：五常名单');
  assert.equal(hasQuestionBody('# Question\n\n## Notes\n'), false);
  assert.equal(hasQuestionBody('# Question\n\n五常名单\n'), true);
});

test('hasPlanBody：0 字节/仅标题 false；节点表/列表 true', () => {
  assert.equal(hasPlanBody(''), false);
  assert.equal(hasPlanBody('# Plan\n'), false);
  assert.equal(hasPlanBody('| id | title |\n|---|---|\n| W1 | x |\n'), true);
  assert.equal(hasPlanBody('- W1: 任务\n'), true);
});

test('isEvidenceCardName / isEvidenceCard：sentinel 排除，frontmatter-only 不算', () => {
  assert.equal(isEvidenceCardName('_failed.md'), false);
  assert.equal(isEvidenceCardName('_notes.md'), false);
  assert.equal(isEvidenceCardName('un-sc.md'), true);
  assert.equal(isEvidenceCardName('un-sc.txt'), false);
  assert.equal(isEvidenceCard(''), false);
  assert.equal(isEvidenceCard('---\nsource_url: x\n---\n'), false);
  assert.equal(isEvidenceCard('---\nsource_url: x\n---\n正文\n'), true);
});
