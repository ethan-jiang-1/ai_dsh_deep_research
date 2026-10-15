// scripts/lib/stream-diagnostics-core.mjs — model-activity selection and attempt analysis.

const MODEL_ACTIVITY = new Set([
  'assistant/attempt',
  'assistant/message',
  'llm/retry',
  'llm/retry-started',
]);

/** A session counts as model-active only when its persisted log records model activity. */
export function hasModelActivity(events) {
  return events.some((event) => MODEL_ACTIVITY.has(event?.type));
}

/**
 * Project successful and failed provider settlements in log order.
 * @param events - persisted session events.
 * @returns provider calls with status/code plus the recovered terminal state.
 */
export function analyzeModelAttempts(events) {
  const attempts = []
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.type !== 'assistant/message' && event?.type !== 'assistant/attempt') continue
    const failed = event.type === 'assistant/attempt'
    const code = failed ? JSON.stringify(event).match(/"code":"([A-Z_]+)"/)?.[1] ?? null : null
    attempts.push({
      seq: event.seq ?? null,
      time: event.time ?? null,
      turn: event?.data?.turn ?? null,
      step: event?.data?.step ?? null,
      status: failed ? 'failed' : 'success',
      code,
    })
  }
  const failures = attempts.filter((attempt) => attempt.code !== null)
  const firstFailure = failures[0] ?? null
  const lastFailure = failures.at(-1) ?? null
  const failureSpanMin = firstFailure !== null && lastFailure !== null && lastFailure.time > firstFailure.time
    ? (lastFailure.time - firstFailure.time) / 60000
    : 0
  const gaps = []
  for (let i = 1; i < attempts.length; i++) {
    if (attempts[i].time > attempts[i - 1].time) gaps.push(Math.round((attempts[i].time - attempts[i - 1].time) / 1000))
  }
  const lastAttempt = attempts.at(-1)
  const endState = lastAttempt?.status === 'success' ? failures.length > 0 ? 'recovered' : 'alive-or-idle'
    : lastAttempt?.code !== null && lastAttempt !== undefined ? 'dead' : 'unknown'
  return {
    attempts,
    fails: failures.length,
    firstFail: firstFailure,
    lastFail: lastFailure,
    spanMin: Math.round(failureSpanMin * 10) / 10,
    ratePerMin: failureSpanMin > 0.2 ? Math.round((failures.length / failureSpanMin) * 10) / 10 : null,
    gaps: gaps.slice(-8),
    endState,
  }
}

/** Select newest readable model-active logs before applying the requested result limit. */
export function selectRecentActiveSessions(entries, limit, readEvents) {
  const count = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 1;
  const newestFirst = [...entries].sort((a, b) => b.mtime - a.mtime);
  const selected = [];
  for (const entry of newestFirst) {
    let result;
    try { result = readEvents(entry.logPath); } catch { continue; }
    if (!result?.readable || !hasModelActivity(result.events ?? [])) continue;
    selected.push({ ...entry, events: result.events });
    if (selected.length >= count) break;
  }
  return selected;
}
