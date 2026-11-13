// 快照只读模式契约（W1-1）——回放与「写期望」必须在权限上分家：
//   `--read-only` / `DSH_SNAPSHOT=replay` 与 `--update-expected` 互斥；
//   `DSH_SNAPSHOT` 只认 `replay`（record/refresh 不走本脚本）；
//   `--update-expected` 仍必须带 `--why <载体>`。
//
// 判据核 = `scripts/lib/snapshot-mode.mjs`（纯函数）；本文件直测它，smoke 壳只消费。
// CLI 行为已实测：双 flag → exit 2；`DSH_SNAPSHOT=record` → exit 2；
// `DSH_SNAPSHOT=replay --update-expected` → exit 2。真跑一次不改盘留给 W1-2 的 CI job。
//
// 反证：去掉 `resolveSnapshotMode` 的 `updateExpected && readOnly` 分支 → 本文件红；还原 → 绿。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSnapshotMode } from '../../scripts/lib/snapshot-mode.mjs'

test('快照回放：默认只读语义；只读 / update-expected 互斥；DSH_SNAPSHOT 只认 replay；刷新必须带 --why', () => {
  assert.deepEqual(resolveSnapshotMode({ argv: [], env: {} }), { readOnly: false, updateExpected: false, why: null })
  assert.deepEqual(resolveSnapshotMode({ argv: ['--read-only'], env: {} }), { readOnly: true, updateExpected: false, why: null })
  assert.deepEqual(resolveSnapshotMode({ argv: ['--update-expected', '--why', 'issue/x'], env: {} }), {
    readOnly: false,
    updateExpected: true,
    why: 'issue/x',
  })
  assert.deepEqual(resolveSnapshotMode({ argv: [], env: { DSH_SNAPSHOT: 'replay' } }), { readOnly: true, updateExpected: false, why: null })

  assert.throws(
    () => resolveSnapshotMode({ argv: ['--read-only', '--update-expected', '--why', 'x'], env: {} }),
    /互斥/,
  )
  assert.throws(
    () => resolveSnapshotMode({ argv: ['--update-expected', '--why', 'x'], env: { DSH_SNAPSHOT: 'replay' } }),
    /互斥/,
  )
  assert.throws(
    () => resolveSnapshotMode({ argv: [], env: { DSH_SNAPSHOT: 'record' } }),
    /不支持/,
  )
  assert.throws(
    () => resolveSnapshotMode({ argv: ['--update-expected'], env: {} }),
    /--why/,
  )
  assert.throws(
    () => resolveSnapshotMode({ argv: ['--update-expected', '--why', '  '], env: {} }),
    /--why/,
  )
})
