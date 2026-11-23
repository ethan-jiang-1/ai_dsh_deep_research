// plan-mdast.spec.mjs — planIndex / planDiffOf 对照 mdast-util-from-markdown 的属性与诱饵抗干扰测试。
//
// 归属：住 tests/cockpit/lib/plan/，依赖 src/lib/plan/* 与 checks/lib/test-infra/workspace-parsers（mdast）。
// 覆盖边界：围栏代码块 / HTML 注释内嵌的假节点表永不泄漏进 planIndex.nodes；自 diff 恒零变化；
// 噪声 Markdown 永不 throw；版本号取末位有效声明。
//
// 红证：在 plan-index 去掉 maskMarkdownLines 调用 → 围栏/注释内诱饵表当场泄漏进 nodes，本文件红。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fc from 'fast-check'
import { fromMarkdown } from '../../../../checks/lib/test-infra/workspace-parsers.mjs'
import { planIndex, planIssuesOf } from '../../../../packages/deep-research-pack/src/lib/plan/plan-index.ts'
import { planDiffOf } from '../../../../packages/deep-research-pack/src/lib/plan/plan-diff.ts'

const DECOY_TABLE = [
  '| id | parent | lifecycle | kind | question | ownerRole | deps | output |',
  '|---|---|---|---|---|---|---|---|',
  '| W99 | — | active | broad-scan | decoy | Scout-X | — | decoy.md |',
].join('\n')

test('PBT + mdast: 围栏/注释里的诱饵表与真实 AST 一致，永不泄漏为 plan 节点', () => {
  const realRowArb = fc.integer({ min: 1, max: 8 }).map((n) => `| W${n} | — | active | broad-scan | Q${n} | Scout-${n} | — | out-${n}.md |`)
  const decoyArb = fc.oneof(
    fc.constant(`\`\`\`markdown\n${DECOY_TABLE}\n\`\`\``),
    fc.constant(`~~~\n${DECOY_TABLE}\n~~~`),
    fc.constant(`<!--\n${DECOY_TABLE}\n-->`),
  )

  fc.assert(
    fc.property(
      fc.array(realRowArb, { minLength: 1, maxLength: 4 }),
      fc.array(decoyArb, { minLength: 1, maxLength: 3 }),
      fc.integer({ min: 1, max: 5 }),
      (rows, decoys, ver) => {
        const uniqRows = [...new Map(rows.map((r) => [r.split('|')[1].trim(), r])).values()]
        const doc = [
          `plan_version: v${ver}`,
          '',
          '| id | parent | lifecycle | kind | question | ownerRole | deps | output |',
          '|---|---|---|---|---|---|---|---|',
          ...uniqRows,
          '',
          ...decoys,
        ].join('\n')

        const ast = fromMarkdown(doc)
        // 验证 mdast 只见 code/html，不存在第二个表
        const nonTableDecoyKinds = ast.children.filter((n) => n.type === 'code' || n.type === 'html')
        assert.ok(nonTableDecoyKinds.length >= 1)

        const parsed = planIndex(doc)
        assert.equal(parsed.nodes.some((node) => node.id === 'W99'), false, '围栏/注释里的 W99 诱饵表绝不可进 nodes')
        assert.equal(parsed.nodes.length, uniqRows.length)
        assert.equal(parsed.version, `v${ver}`)

        // 自差异必全空，且永不 throw
        const selfDiff = planDiffOf(parsed, parsed)
        assert.deepEqual(selfDiff.added, [])
        assert.deepEqual(selfDiff.removed, [])
        assert.deepEqual(selfDiff.aliases, [])
        assert.deepEqual(selfDiff.dependencyChanges, [])
        assert.equal(selfDiff.kept.length, uniqRows.length)
      },
    ),
    { numRuns: 80 },
  )
})

test('PBT: 任意噪声 Markdown 输入 planIndex 与 planIssuesOf 永不 throw 且版本末位胜', () => {
  fc.assert(
    fc.property(
      fc.string({ maxLength: 240 }),
      fc.integer({ min: 1, max: 20 }),
      fc.integer({ min: 1, max: 20 }),
      (noise, v1, v2) => {
        const parsedNoise = planIndex(noise)
        const issues = planIssuesOf(parsedNoise)
        assert.ok(Array.isArray(parsedNoise.nodes))
        assert.ok(Array.isArray(issues))

        const versionDoc = `plan_version: v${v1}\nplan_version: v${v2}\n\n## Nodes\n\nplan_version: v999\n`
        const parsedVer = planIndex(versionDoc)
        assert.equal(parsedVer.version, `v${v2}`, '有 ## 分节时只认首个 ## 之前最后一条声明，正文旧版不夺权')
      },
    ),
    { numRuns: 80 },
  )
})
