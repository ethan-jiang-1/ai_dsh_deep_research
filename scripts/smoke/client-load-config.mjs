// client-load-config.mjs — client-load 冒烟的「研究配置」摘要相位（smoke 层支援件）。
// 被谁消费：scripts/smoke/client-load-smoke.mjs（唯一消费方，静态 import 调用）。
// 2026-10-21 方法库管理迁到主界面 conversation.view 后，本相位只验证右栏摘要：
// 本次研究 + 「方法库」入口 + 管理/内置/示范/回执负例。主 tab 的列表/编辑/新建由主件
// pass-3c 验证；自测例库 12 形态由 tests/cockpit/library-fold 的 keyless battery 覆盖
// （空白自测会话没有 conversation view tab，浏览器相位退役）。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expandGroup, openSessionById, SIDEBAR_GROUP_CANDIDATES, tabTitleIndex } from '../lib/web-ui-nav.mjs'

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
    // 点击后复核（2026-11-03）：openSessionById 的 opened:false = 点了行但主视图没切（遮罩/抢焦点）。
    // 旧实现只读 found，会把"没打开"当"打开成功"，本相位随后的页签断言按错会话判。
    const nav = await openSessionById(page, targetId, targetTitle)
    opened = nav.found === true && nav.opened !== false
    if (!opened) {
      for (const group of SIDEBAR_GROUP_CANDIDATES) {
        await expandGroup(page, group)
        const retry = await openSessionById(page, targetId, targetTitle)
        opened = retry.found === true && retry.opened !== false
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
  const i = tabTitleIndex(text, 'config'); const seg = text.slice(i < 0 ? 0 : i)
  step(seg.includes('本次研究'), '研究配置页签体：本次研究摘要在场')
  step(seg.includes('方法库') && (seg.includes('顶部') || seg.includes('tab')),
    '研究配置页签体：方法库入口指到主界面 tab')
  const legacy = ['我的偏好库', '内置打法（只读）', '领域示范（只读）', '改动的回执会显示在这里']
  const leaked = legacy.filter((marker) => seg.includes(marker))
  step(leaked.length === 0, '研究配置页签体：管理/内置/示范/回执已移出侧栏',
    leaked.length > 0 ? `残留：${leaked.join('、')}` : '')
}


/** 轮询 workspace 里的 research-defaults.json，直到 predicate 满足；超时 null。 */
async function waitForDefaults(path, predicate, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const value = JSON.parse(readFileSync(path, 'utf8'))
      if (predicate(value)) return value
    } catch { /* 文件尚未创建/尚未写完：继续等 */ }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return null
}

/**
 * pass-3d：项目研究默认（D50）——composer 按钮 → 研究配置页签项目默认块 → host command 写盘。
 * 放在方法库相位之前：方法库新建态会隐藏外层 composer，按钮不可见；此处先验入口与写路径。
 * 只在 --seed 下改盘（dev home 是用户真值，不写）。
 * @param env - 主件相位环境（含 workspacePath / seeded）。
 */
export async function pass3dDefaultsPhase(env) {
  const { page, step, wait, sessionTitleArg, boundSession, unboundSession,
    awaitAppReady, clickRowByText, workspacePath, seeded } = env
  await awaitAppReady(page, 5_000)
  const targetTitle = sessionTitleArg ?? boundSession?.title ?? unboundSession?.title
  const targetId = boundSession?.sessionId ?? null
  let opened = false
  if (targetId !== null) {
    const nav = await openSessionById(page, targetId, targetTitle)
    opened = nav.found === true && nav.opened !== false
    if (!opened) {
      for (const group of SIDEBAR_GROUP_CANDIDATES) {
        await expandGroup(page, group)
        const retry = await openSessionById(page, targetId, targetTitle)
        opened = retry.found === true && retry.opened !== false
        if (opened) break
      }
    }
  }
  if (!opened && targetTitle !== null) opened = await clickRowByText(page, targetTitle)
  step(opened, '项目默认：目标会话可开', opened ? targetTitle : '目标会话不可开')
  if (!opened) return
  await wait(1_500)

  const button = page.getByTestId('deep-research-defaults').first()
  const count = await button.count().catch(() => 0)
  step(count >= 1, '项目默认按钮在场（composer 左侧；有 session 才渲染）', count >= 1 ? '' : '未渲染')
  if (count < 1) return
  const label = (await button.innerText().catch(() => '')) || ''
  step(/研究默认|Research defaults/.test(label), '项目默认按钮：文案是状态，不是「设置」', label)

  await button.click({ timeout: 5_000 }).catch(() => {})
  await wait(900)
  const panel = page.getByTestId('defaults-panel').first()
  const visible = await panel.isVisible().catch(() => false)
  step(visible, '项目默认按钮 → 「研究配置」页签的项目默认块')
  if (!visible) return
  const panelText = (await panel.innerText().catch(() => '')) || ''
  step(/项目默认|Project defaults/.test(panelText), '项目默认块：标题在场')
  step(/自动|Auto/.test(panelText), '项目默认块：自动态文案在场')

  if (!seeded) return
  const file = join(workspacePath, 'research-defaults.json')
  step(!existsSync(file), '项目默认：种子初始无文件（全自动，不物化默认）')
  const depth = page.getByTestId('defaults-depth').first()
  await depth.selectOption('deep').catch(() => {})
  const saved = await waitForDefaults(file, (value) => value.effort === 'deep' && value.revision === 1)
  const afterText = (await panel.innerText().catch(() => '')) || ''
  step(saved !== null, '项目默认：改深度 → 文件 effort=deep / revision=1', saved === null ? `未落盘；面板=${afterText.slice(-220).replace(/\s+/g, ' ')}` : `revision=${saved.revision}`)
  if (saved === null) return
  const labelAfter = (await button.innerText().catch(() => '')) || ''
  step(/已设 1 项|1 set/.test(labelAfter), '项目默认：按钮文案随写入变化', labelAfter)

  await depth.selectOption('auto').catch(() => {})
  const cleared = await waitForDefaults(file, (value) => value.effort === undefined && value.revision === 2)
  step(cleared !== null, '项目默认：unset 恢复自动（无残留 effort）', cleared === null ? '未清除' : `revision=${cleared.revision}`)
  if (cleared !== null) {
    step(!JSON.stringify(cleared).includes('"auto"'), '项目默认：文件无 auto sentinel')
  }

  // 输出：形态 + 读者；来源：family chip。三条真实 UI 变换各写一次盘。
  const shape = page.getByTestId('defaults-output-shape').first()
  await shape.selectOption('full_report').catch(() => {})
  const shaped = await waitForDefaults(file, (value) => value.output?.shape === 'full_report' && value.revision === 3)
  step(shaped !== null, '项目默认：改输出形态 → output.shape=full_report / revision=3', shaped === null ? '未落盘' : `revision=${shaped.revision}`)

  const audience = page.getByTestId('defaults-audience').first()
  await audience.fill('决策层').catch(() => {})
  await audience.press('Enter').catch(() => {})
  const described = await waitForDefaults(file, (value) => value.output?.shape === 'full_report' && value.output?.audience === '决策层' && value.revision === 4)
  step(described !== null, '项目默认：改读者 → output.audience=决策层（shape 保留）/ revision=4', described === null ? '未落盘' : `revision=${described.revision}`)

  const official = page.getByTestId('defaults-source-official').first()
  await official.click().catch(() => {})
  const sourced = await waitForDefaults(file, (value) => value.source?.families?.includes('official') === true && value.revision === 5)
  step(sourced !== null, '项目默认：点来源家族 → source.families 含 official / revision=5', sourced === null ? '未落盘' : `revision=${sourced.revision}`)
  // store refresh 是异步的：文件先落盘、按钮后更新；给标签一个有界等待，别把时序当红。
  const waitButton = async (pattern, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs
    let text = ''
    while (Date.now() < deadline) {
      text = (await button.innerText().catch(() => '')) || ''
      if (pattern.test(text)) return text
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    return text
  }
  const labelSourced = await waitButton(/已设 2 项|2 set/)
  step(/已设 2 项|2 set/.test(labelSourced), '项目默认：按钮文案随输出+来源变化（已设 2 项）', labelSourced)
}
