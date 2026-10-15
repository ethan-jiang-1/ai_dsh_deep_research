// node-gate-core.mjs — compatibility facade and bundle-level gate aggregation.
// Gate implementations live in cohesive keyless modules; this file preserves the original public seam.
import { deliveryGate } from './node-gate-delivery-gate.mjs'
import { hitlAskGate, hitl2RowGate, plainLogReader, presentGate } from './node-gate-session-gates.mjs'
import { headingGate, leadsGate, versionGate } from './node-gate-run-gates.mjs'

export { AUDIT_CONTRACT_DATE, HEADING_CONTRACT_DATE, HITL_CONTRACT_DATE, LEADS_CONTRACT_DATE, VERSION_CONTRACT_DATE, decisionsLines, readinessOf } from './node-gate-contracts.mjs'
export { hitlAskGate, plainLogReader, presentInLogs } from './node-gate-session-gates.mjs'
export { headingGate, leadsGate, versionGate } from './node-gate-run-gates.mjs'
export { deliveryGate } from './node-gate-delivery-gate.mjs'

/** Evaluate every gate for one bundle; preserve the existing result shape and red aggregation. */
export function gateBundle(bundleDir, sessionsRoot, opts = {}) {
  const readLog = opts.readLog ?? plainLogReader
  const { gate: hitl2Row, rows: hitl2Rows } = hitl2RowGate(bundleDir)
  const present = presentGate(bundleDir, sessionsRoot, hitl2Rows, readLog)
  const gates = {
    hitlAsk: hitlAskGate(bundleDir, sessionsRoot, opts.hitlDate, readLog),
    hitl2Row,
    present,
    leads: leadsGate(bundleDir, opts.leadsDate),
    version: versionGate(bundleDir, opts.versionDate),
    degeneration: headingGate(bundleDir, opts.headingDate),
    delivery: deliveryGate(bundleDir, opts.auditDate),
  }
  const red = [gates.hitlAsk, hitl2Row, present, gates.leads, gates.version, gates.degeneration, gates.delivery]
    .some((gate) => gate.status === 'RED')
  return { gates, red }
}
