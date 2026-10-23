// node-gate-core.mjs — compatibility facade and bundle-level gate aggregation.
// Gate implementations live in cohesive keyless modules; this file preserves the original public seam.
import { basename } from 'node:path'
import { deliveryGate } from './node-gate-delivery-gate.mjs'
import { hitlAskGate, hitl2RowGate, plainLogReader, presentGate, scanWitnessLogs } from './node-gate-session-gates.mjs'
import { headingGate, leadsGate, versionGate } from './node-gate-run-gates.mjs'
import { contractEpochOf } from './schema-scan-core.mjs'

export { AUDIT_CONTRACT_DATE, HEADING_CONTRACT_DATE, HITL_CONTRACT_DATE, LEADS_CONTRACT_DATE, VERSION_CONTRACT_DATE, decisionsLines, readinessOf } from './node-gate-contracts.mjs'
export { hitlAskGate, hitl2ReplyInLogs, plainLogReader, presentInLogs, presentedInLogs, scanWitnessLogs } from './node-gate-session-gates.mjs'
export { headingGate, leadsGate, versionGate } from './node-gate-run-gates.mjs'
export { deliveryGate } from './node-gate-delivery-gate.mjs'

/** Evaluate every gate for one bundle; preserve the existing result shape and red aggregation. */
export function gateBundle(bundleDir, sessionsRoot, opts = {}) {
  const readLog = opts.readLog ?? plainLogReader
  // 见证单遍扫描（D28）：门②/③ 共用一次会话语料扫描——跨 run 绑定、契约纪元与事件链顺序都在这一份
  // 结果上判，避免同一语料按门重复走两遍（1831 日志实测单遍 ~13s）。
  const epoch = contractEpochOf(bundleDir)
  const witness = scanWitnessLogs(sessionsRoot, basename(bundleDir), { readLog, contract: epoch === '' ? null : epoch })
  const { gate: hitl2Row, rows: hitl2Rows } = hitl2RowGate(bundleDir, sessionsRoot, readLog, witness)
  const present = presentGate(bundleDir, sessionsRoot, hitl2Rows, readLog, witness)
  const gates = {
    hitlAsk: hitlAskGate(bundleDir, sessionsRoot, opts.hitlDate, readLog),
    hitl2Row,
    present,
    leads: leadsGate(bundleDir, opts.leadsDate),
    version: versionGate(bundleDir, opts.versionDate),
    degeneration: headingGate(bundleDir, opts.headingDate),
    delivery: deliveryGate(bundleDir, opts.auditDate),
  }
  const all = [gates.hitlAsk, hitl2Row, present, gates.leads, gates.version, gates.degeneration, gates.delivery]
  const red = all.some((gate) => gate.status === 'RED')
  const unattested = all.some((gate) => gate.status === 'UNATTESTED')
  return { gates, red, unattested }
}
