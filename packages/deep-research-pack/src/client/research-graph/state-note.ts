// state-note.ts — 「研究图谱」的**降级说明**（图面上方那条提示的文案与判据）。
//
// 从 ResearchGraphTab.tsx 原样切出（2026-10-28 Phase C）：它是一条纯映射（输入 = 计划态/绑定态/
// 图形态，输出 = { title, body } 或 null），此前以 IIFE 埋在 400+ 行组件里，既难单测也难对照。
// 语义关键：**"读不到" ≠ "没有"**（BUG-045）——绑定读取失败必须与"尚未绑定"分开报。
export interface GraphStateNoteInput {
  readonly planState: 'loading' | 'missing' | 'unbound' | 'ready' | 'truncated'
  readonly boundSlug: string | null
  readonly followError: string | null
  readonly hasPlan: boolean
  readonly hasEdges: boolean
  readonly hasTopLevel: boolean
}

export interface GraphStateNote {
  readonly title: string
  readonly body: string
}

/** 返回 null = 不显示说明（有图可画且无需提醒）。 */
export function graphStateNote(input: GraphStateNoteInput): GraphStateNote | null {
  const { planState, boundSlug, followError, hasPlan, hasEdges, hasTopLevel } = input

    if (planState === 'loading') return null
    if (planState === 'truncated') {
      return {
        title: 'plan.md 过长，已截断',
        body: '只读了前 800 行；图谱可能不完整。修正 = 拆分 plan 或提高读策略（run-context 的 plan 上限）。',
      }
    }
    if (boundSlug === null && followError !== null) {
      // 读失败 ≠ 没有 run（BUG-045）：把流故障与"未绑定"分开，否则用户/agent 会把
      // 瞬时的 journal 断连读成"这个会话还没开始研究"。
      return {
        title: '绑定状态读取失败',
        body: `journal 流断开（${followError}）——"读不到"不等于"本会话没有 run"；已自动重试，连接恢复后这里会自动补上。`,
      }
    }
    if (boundSlug === null) {
      return {
        title: '本会话尚未绑定 run',
        body: 'journal 里还没有可信的 `drt_<slug>/` 写入（立项/预检读旧 bundle 不算）。Team 任务仍显示；Lead 写 plan.md 后这里会自动出现 DAG。',
      }
    }
    if (hasPlan && !hasTopLevel) {
      return {
        title: 'plan 只有子节点，顶层图为空',
        body: '子节点必须挂在真实父节点上；看下方「plan 结构提示」修正 parent，或补回顶层节点。',
      }
    }
    if (hasPlan && hasEdges) return null
    if (hasPlan && !hasEdges) return { title: 'plan 有节点，但 Team 板没有 blocked_by', body: '图按 plan deps 画；执行镜像没有记录依赖边。' }
    if (!hasPlan && hasEdges) return { title: 'plan.md 缺席；图来自 Team blocked_by', body: '旧 run 常见。图是任务板的依赖，不是 plan.md 的执行图。' }
    return {
      title: '没有可画的 DAG',
      body: planState === 'missing'
        ? '此 run 没有 plan.md（旧 run / 未落盘），Team 板也没有 blocked_by。下面是任务快照，不是 DAG；rerun 会按 plan.md 生成执行图。'
        : 'plan.md 没有可读节点表，Team 板也没有 blocked_by。下面是任务快照，不是 DAG。',
    }


}
