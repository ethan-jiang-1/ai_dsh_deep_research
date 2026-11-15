// run-accept-fixture — claim 夹具的 review/readiness 文本（D51 同源）。
//
// 为什么单列（2026-11-13）：D51 后 `review/` 在场必须有 `review/readiness.json`；claim 夹具
// 只写 `review.md` 的 `## readiness: PASS` 会被 `readinessOfSources` 判 missing，慢冒烟
// 因此在「测试资产」层红。夹具文本与判据同源，直测才能抓住“改判据没改夹具”。
export function claimReviewFixture() {
  return {
    reviewText: '# Review\n\n## readiness: PASS\n\n当前裁决 = verdicts-r1.json\n',
    declarationText: `${JSON.stringify({ version: 1, readiness: 'PASS' }, null, 2)}\n`,
    hasReviewDir: true,
  };
}
