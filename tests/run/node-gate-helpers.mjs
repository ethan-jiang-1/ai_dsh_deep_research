// node-gate-helpers.mjs — node-gate 测试共享的夹具定位与临时 bundle 助手。
// 非测试文件（默认 glob 只选 *.test.mjs）；三件测试共用同一套路径/断代/审计摘要。
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FX = join(HERE, '..', 'fixtures', 'node-gate')
export const bundle = (name) => join(FX, 'bundles', name)
export const sessions = (name) => join(FX, 'sessions', name)

// 断代与宿主 mtime 解耦：显式注入各门契约日之前一天（2026-10-25 clean-worktree 实证）。
export const PRE_CONTRACT_DATES = {
  hitlDate: '2026-10-04',
  leadsDate: '2026-10-02',
  versionDate: '2026-10-02',
  headingDate: '2026-10-05',
  auditDate: '2026-10-07',
  readerDate: '2026-10-22',
}

export const structuredAudit = (slug, criticalCount = 0, criticalBody = '（无）') => `# Evidence Audit — ${slug}（2026-10-08T00:00:00.000Z）

## 概要

| 检查 | 结果 |
|---|---|
| 发现 | CRITICAL ${criticalCount} · MAJOR 0 · INFO 0 |

## CRITICAL（伪造链接 / 溯源断链）

${criticalBody}

## MAJOR（契约不符 / 转写不符）

（无）
`

export const withCompleteBundle = (run) => {
  const tempBase = realpathSync(tmpdir())
  const tempRoot = mkdtempSync(join(tempBase, 'node-gate-test-'))
  const tempBundle = join(tempRoot, 'fixture-complete')
  cpSync(bundle('fixture-complete'), tempBundle, { recursive: true })
  try { return run(tempBundle) } finally {
    if (dirname(tempRoot) !== tempBase || !basename(tempRoot).startsWith('node-gate-test-')) {
      throw new Error(`refusing cleanup outside node-gate temp: ${tempRoot}`)
    }
    rmSync(tempRoot, { recursive: true, force: true })
  }
}
