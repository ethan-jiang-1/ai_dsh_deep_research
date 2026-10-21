// client-load-config.mjs — client-load 冒烟的「研究配置」摘要相位（smoke 层支援件）。
// 被谁消费：scripts/smoke/client-load-smoke.mjs（唯一消费方，静态 import 调用）。
// 2026-10-21 方法库管理迁到主界面 conversation.view 后，本相位只验证右栏摘要：
// 本次研究 + 「方法库」入口 + 管理/内置/示范/回执负例。主 tab 的列表/编辑/新建由主件
// pass-3c 验证；自测例库 12 形态由 tests/cockpit/library-fold 的 keyless battery 覆盖
// （空白自测会话没有 conversation view tab，浏览器相位退役）。
import { expandGroup, openSessionById, SIDEBAR_GROUP_CANDIDATES } from '../lib/web-ui-nav.mjs'

/**
 * pass-4：「研究配置」页签（D25 期 1 管理中继面）——guide 胶囊在场 + 页签体渲染
 * （内置偏好只读表 + 偏好库空态/条目）。防"拼错不报错、永不渲染"（company 坑 1 的
 * 渲染级对账；keyed 字面量另由 client-keys 门禁静态对账）。
 * @param env - 主件注入的相位环境（契约见文件头注）；boundSession/unboundSession 为
 *   调用时刻的快照（主件 pass-1/pass-2 可能已改写它们）。
 */
export async function pass4ConfigTabPhase(env) {
  const { page, step, wait, sessionTitleArg, boundSession, unboundSession,
    awaitAppReady, openGuideCapsule, clickRowByText, paneTextOf } = env
  await awaitAppReady(page, 5_000)
  const targetTitle = sessionTitleArg ?? boundSession?.title ?? unboundSession?.title
  const targetId = boundSession?.sessionId ?? null
  let opened = false
  if (targetId !== null) {
    opened = (await openSessionById(page, targetId, targetTitle)).found
    if (!opened) {
      for (const group of SIDEBAR_GROUP_CANDIDATES) {
        await expandGroup(page, group)
        opened = (await openSessionById(page, targetId, targetTitle)).found
        if (opened) break
      }
    }
  }
  if (!opened && targetTitle !== null) opened = await clickRowByText(page, targetTitle)
  step(opened, '研究配置页签：目标会话可开', opened ? targetTitle : '目标会话不可开')
  if (!opened) return
  await wait(3_000)
  const capOk = await openGuideCapsule(page, 4_000, 10_000, 3_000)
  step(capOk, '「研究配置」guide 胶囊在场（tab 类型注册成功 + guide 页可达）')
  if (!capOk) return
  const text = await paneTextOf(page)
  const seg = text.slice(text.indexOf('研究配置'))
  step(seg.includes('本次研究'), '研究配置页签体：本次研究摘要在场')
  step(seg.includes('方法库') && (seg.includes('顶部') || seg.includes('tab')),
    '研究配置页签体：方法库入口指到主界面 tab')
  const legacy = ['我的偏好库', '内置打法（只读）', '领域示范（只读）', '改动的回执会显示在这里']
  const leaked = legacy.filter((marker) => seg.includes(marker))
  step(leaked.length === 0, '研究配置页签体：管理/内置/示范/回执已移出侧栏',
    leaked.length > 0 ? `残留：${leaked.join('、')}` : '')
}
