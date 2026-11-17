// cli-exit.mjs — CLI 退出码契约的唯一实现（正本 = checks/AGENTS.md「verdict 契约」）。
//
// 0 = 全绿；1 = 断言红（真失败）；2 = 未跑（前置缺席 / 用法错误）。
// 为什么：2026-11-17 探索实测两个被搬入口的 usage 分支各自手写 exit(1)，与同族 exit(2) 不可区分，
// 调用方把「没跑」记成「失败」（BUG-213）；run-lane 一条都没跑（全 SKIP）仍 exit 0，证据命令被
// 误读为通过（BUG-218）。契约在文档里已有，缺的是**唯一出口**：判定留在各入口，常量与汇总在这里。
//
// 只放三件：常量、usage 出口、车道三态汇总。入口专属的文案/参数解析留在各自壳（本模块不读
// process.argv、不碰 fs）。
export const EXIT = Object.freeze({ PASS: 0, FAIL: 1, NOT_RUN: 2 })

/** 用法 / 前置错误：打印到 stderr 并以 2 退出（未跑 ≠ 失败）。永不返回。 */
export function usageError(message) {
  console.error(message)
  return process.exit(EXIT.NOT_RUN)
}

/** 车道三态汇总 → 退出码：有 FAIL = 1；一条都没跑（全 SKIP）= 2；其余 0。 */
export function verdictOf({ pass, fail, skip }) {
  if (fail > 0) return EXIT.FAIL
  if (pass === 0 && skip > 0) return EXIT.NOT_RUN
  return EXIT.PASS
}
