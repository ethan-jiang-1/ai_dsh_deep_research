// Snapshot smoke 的模式判据（W1-1）——把「回放只读 / 刷新写期望」从 argv 分支抽成纯函数，
// 既让 smoke 壳变薄，也让互斥/缺 --why 的行为可被 keyless 直测。
//
// 语义：
// - 默认 = 回放（readOnly=false 但脚本本身不写；显式 readOnly 用于 CI 环境级声明）；
// - `--read-only` 或 `DSH_SNAPSHOT=replay` → readOnly=true；
// - `--update-expected` → updateExpected=true，必须带非空 `--why`；
// - `--read-only`/`DSH_SNAPSHOT=replay` 与 `--update-expected` 互斥；
// - `DSH_SNAPSHOT` 只认 `replay`（record/refresh 不走本脚本：record 归 record-role-fixture，
//   refresh = --update-expected）。
export function resolveSnapshotMode({ argv, env = {} }) {
  const updateExpected = argv.includes('--update-expected')
  const whyIndex = argv.indexOf('--why')
  // BUG-164：`--why` 的下一个 argv 必须是载体 token；缺值时后面的 flag（--port/--case…）
  // 不能被当成理由。空串/纯空白同判缺值。
  const rawWhy = whyIndex === -1 ? null : (argv[whyIndex + 1] ?? null)
  const why = rawWhy === null ? null : rawWhy.trim()
  const mode = env.DSH_SNAPSHOT ?? ''
  if (mode !== '' && mode !== 'replay') {
    throw new Error(`DSH_SNAPSHOT=${mode} 不支持——本脚本只回放；refresh 用 --update-expected，record 用 dev/record-role-fixture`)
  }
  const readOnly = argv.includes('--read-only') || mode === 'replay'
  if (updateExpected && readOnly) {
    throw new Error('--read-only 与 --update-expected 互斥——回放不许写期望；刷新时显式去掉 --read-only/DSH_SNAPSHOT=replay')
  }
  if (updateExpected && (why === null || why === '' || why.startsWith('-'))) {
    throw new Error('--update-expected 必须带 --why <载体>（issue/Note/卡的仓内路径或 none）——金标准重录是合同变更，不许无理由重写；值不能是另一个 flag')
  }
  return { readOnly, updateExpected, why }
}
