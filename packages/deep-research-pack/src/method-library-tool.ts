/**
 * Host 半：方法库写库工具（D25 2026-10-28 扩展）。只给方法编辑 preset 用：
 * `method_library_upsert` 把一条完整库条目写进当前会话 cwd 的 `method-library.md`（同名覆盖）。
 * 面板仍永不直写；这是业务写入的唯一路径。纯折算住 `src/lib/method-library-write.ts`（keyless 测）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { createHash } from 'node:crypto'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { methodLibraryOperationProjection, hasMethodLibraryClaim } from './lib/method-library-commands.ts'
import type {} from '@deepseek-ai/dsh-session-projection/types'
import type {} from '@deepseek-ai/dsh-api-session-controller/types'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { foldLibrary } from './lib/library-fold.ts'
import { clearDefaultMethodEntry, removeMethodEntry, setDefaultMethodEntry, upsertMethodEntry } from './lib/method-library-write.ts'

/** Read the user-owned method file; a missing file is the empty library. */
function readLibrary(path: string): string {
  try {
    return readFileSync(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return ''
  }
}

function digestText(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** Cordis 插件名。 */
export const name = 'method-library-tool'

/** Writes are authorized only after the Agent Session projection claims a Method Editor UI command. */
export const inject = ['tools', 'sessionProjections']

/**
 * 注册 `method_library_upsert`：唯一写 `method-library.md` 的工具。
 * @param ctx - host context。
 */
export function apply(ctx: Context): void {
  ctx.sessionProjections.register(methodLibraryOperationProjection)
  ctx.tools.register(defineTool({
    name: 'method_library_upsert',
    description: '把一条研究方法条目写入当前工作区的 method-library.md（同名覆盖；新建或更新）。只在方法库页的保存动作里调用。entry 必须是完整库条目 Markdown：`## 名称（日期，来源）` + 四行（- 找来源: / - 怎么核实: / - 报告怎么写: / - 不承诺:）；四行都必须有内容。',
    parameters: {
      entry: { type: 'string', required: true, description: '完整库条目 Markdown（标题 + 四行）；其中的〔默认偏好〕不会授权改变默认状态' },
      operationId: { type: 'string', required: true, description: '当前方法库 UI 命令 id' },
      operationHash: { type: 'string', required: true, description: '对应完整 entry 文本的 SHA-256 十六进制摘要' },
      defaultAction: { type: 'string', required: true, enum: ['preserve', 'set'], description: 'preserve（普通保存）保持库级默认状态；set（仅「保存并设为默认」）切换全库唯一默认' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          operationId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          action: { type: 'string', required: true, enum: ['created', 'updated'] },
          isDefault: { type: 'boolean', required: true },
          defaults: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `已写入库：${value.name}（${value.action === 'created' ? '新建' : '更新'}）`,
      }],
      presentationMeta: (_args, value) => value,
    },
    execute(args, exec) {
      const agent = exec.agent
      const session = agent?.session
      if (session === undefined || session.header.agentPreset !== 'method-editor') {
        throw new Error('method_library_upsert 只允许 Method Editor owning session')
      }
      if (digestText(args.entry) !== args.operationHash) throw new Error('方法条目内容摘要不匹配，拒绝写入')
      const operationState = ctx.sessionProjections.stateOf(session, 'method-library-operation')
      if (operationState === undefined || !hasMethodLibraryClaim(operationState, {
        operationId: args.operationId,
        action: args.defaultAction === 'set' ? 'save-and-set-default' : 'save',
        name: foldLibrary(args.entry)[0]?.name,
        payloadHash: args.operationHash,
        callId: exec.callId,
      })) {
        throw new Error('方法库写入没有匹配到当前 UI 操作，拒绝写入')
      }
      const cwd = session.header.cwd
      if (cwd === undefined) throw new Error('method_library_upsert 需要 owning agent session（没有 cwd）')
      const entries = foldLibrary(args.entry)
      const parsed = entries[0]
      if (entries.length !== 1 || parsed === undefined) throw new Error('entry 必须且只能包含一条可解析的库条目')
      const path = join(cwd, 'method-library.md')
      const text = readLibrary(path)
      const priorEntries = foldLibrary(text)
      const priorDefaults = priorEntries.filter((entry) => entry.isDefault).map((entry) => entry.name)
      const priorNames = priorEntries.map((entry) => entry.name)
      const result = upsertMethodEntry(text, parsed, { defaultAction: args.defaultAction })
      mkdirSync(cwd, { recursive: true })
      writeFileSync(path, result.text, 'utf8')
      const persisted = readLibrary(path)
      const savedEntries = foldLibrary(persisted)
      const savedMatches = savedEntries.filter((entry) => entry.name === result.name)
      const saved = savedMatches[0]
      const defaults = savedEntries.filter((entry) => entry.isDefault)
      const priorTarget = priorEntries.find((entry) => entry.name === result.name)
      const expectedDefault = args.defaultAction === 'set' || priorTarget?.isDefault === true
      const expectedDefaults = args.defaultAction === 'set' ? [result.name] : priorDefaults
      const actualNames = savedEntries.map((entry) => entry.name)
      if (savedMatches.length !== 1 || saved === undefined
        || (result.action === 'created' && priorNames.some((name) => !actualNames.includes(name)))
        || JSON.stringify(defaults.map((entry) => entry.name)) !== JSON.stringify(expectedDefaults)
        || saved.provenance !== parsed.provenance
        || saved.sections.source !== parsed.sections.source
        || saved.sections.verify !== parsed.sections.verify
        || saved.sections.report !== parsed.sections.report
        || saved.sections.limit !== parsed.sections.limit
        || saved.legacyText !== parsed.legacyText
        || saved.isDefault !== expectedDefault) {
        throw new Error(`写入后方法「${result.name}」回读核对失败`)
      }
      return Promise.resolve({ operationId: args.operationId, name: result.name, action: result.action, isDefault: saved.isDefault, defaults: defaults.map((entry) => entry.name) })
    },
    presentCall: () => ({ card: 'generic', title: '写入方法库', kind: 'other' }),
  }))
  ctx.tools.register(defineTool({
    name: 'method_library_set_default',
    description: '仅执行方法库页明确发出的默认操作。`set` 将指定条目设为全库唯一默认，`clear` 清除所有默认标记并允许零默认。调用必须匹配当前 Method Editor UI 命令。',
    parameters: {
      action: { type: 'string', required: true, enum: ['set', 'clear'], description: '由当前 UI 操作指定的显式默认变更' },
      operationId: { type: 'string', required: true, description: '当前方法库 UI 命令 id，由 Host Session 投影校验' },
      name: { type: 'string', description: 'action=set 时必填的唯一条目名称；clear 时省略' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          operationId: { type: 'string', required: true },
          action: { type: 'string', required: true, enum: ['set', 'clear'] },
          name: { type: 'string', required: true },
          changed: { type: 'boolean', required: true },
          defaults: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.action === 'set' ? `已设默认：${value.name}` : '已清除默认偏好' }],
      presentationMeta: (_args, value) => value,
    },
    execute(args, exec) {
      const session = exec.agent?.session
      if (session === undefined || session.header.agentPreset !== 'method-editor') {
        throw new Error('method_library_set_default 只允许 Method Editor owning session')
      }
      const name = args.action === 'set' ? args.name : undefined
      const state = ctx.sessionProjections.stateOf(session, 'method-library-operation')
      if (state === undefined || !hasMethodLibraryClaim(state, {
        operationId: args.operationId,
        action: args.action === 'set' ? 'set-default' : 'clear-default',
        name,
        callId: exec.callId,
      })) throw new Error('默认操作没有匹配到当前 UI 操作，拒绝修改')
      if (args.action === 'set' && (name === undefined || name.trim() === '')) throw new Error('设默认需要方法名称')
      const cwd = session.header.cwd
      if (cwd === undefined) throw new Error('默认操作需要 owning agent session（没有 cwd）')
      const path = join(cwd, 'method-library.md')
      const text = readLibrary(path)
      const result = args.action === 'set'
        ? setDefaultMethodEntry(text, name ?? '')
        : clearDefaultMethodEntry(text)
      if (result.text !== text) writeFileSync(path, result.text, 'utf8')
      const persisted = readLibrary(path)
      const defaults = foldLibrary(persisted).filter((entry) => entry.isDefault).map((entry) => entry.name)
      if (defaults.length > 1 || (args.action === 'set' && (defaults.length !== 1 || defaults[0] !== name))
        || (args.action === 'clear' && defaults.length !== 0)) {
        throw new Error('默认操作回读未通过：库默认标记不符合操作结果')
      }
      return Promise.resolve({
        operationId: args.operationId,
        action: args.action,
        name: args.action === 'set' ? name ?? '' : '',
        changed: persisted !== text,
        defaults,
      })
    },
    presentCall: (args) => ({ card: 'generic', title: args.action === 'set' ? '设定方法默认' : '清除方法默认', kind: 'other' }),
  }))
  ctx.tools.register(defineTool({
    name: 'method_library_remove',
    description: '从当前工作区的 method-library.md 删除一条同名方法条目。只在方法库页的删除动作里调用；删除后如实回复「已删除：<名称>」。',
    parameters: {
      name: { type: 'string', required: true, description: '要删除的条目名' },
      operationId: { type: 'string', required: true, description: '来自当前方法库 UI 命令的 operation id；Host 必须校验本 session 的命令投影' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          operationId: { type: 'string', required: true },
          name: { type: 'string', required: true },
          removed: { type: 'boolean', required: true },
          defaults: { type: 'array', required: true, items: { type: 'string' } },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `已删除库：${value.name}` }],
      presentationMeta: (_args, value) => value,
    },
    execute(args, exec) {
      const agent = exec.agent
      const session = agent?.session
      if (session === undefined || session.header.agentPreset !== 'method-editor') {
        throw new Error('method_library_remove 只允许 Method Editor owning session')
      }
      const operationState = ctx.sessionProjections.stateOf(session, 'method-library-operation')
      if (operationState === undefined || !hasMethodLibraryClaim(operationState, {
        operationId: args.operationId,
        action: 'remove',
        name: args.name,
        callId: exec.callId,
      })) throw new Error('方法库删除没有匹配到当前 UI 操作，拒绝删除')
      const cwd = session.header.cwd
      if (cwd === undefined) throw new Error('method_library_remove 需要 owning agent session（没有 cwd）')
      const path = join(cwd, 'method-library.md')
      const text = readLibrary(path)
      const priorDefaults = foldLibrary(text).filter((entry) => entry.isDefault && entry.name !== args.name).map((entry) => entry.name)
      const result = removeMethodEntry(text, args.name)
      if (!result.removed) throw new Error(`库里没有「${args.name}」`)
      writeFileSync(path, result.text, 'utf8')
      const persisted = readLibrary(path)
      const entries = foldLibrary(persisted)
      const remains = entries.some((entry) => entry.name === args.name)
      const defaults = entries.filter((entry) => entry.isDefault).map((entry) => entry.name)
      if (remains || JSON.stringify(defaults) !== JSON.stringify(priorDefaults)) throw new Error(`删除后方法「${args.name}」回读核对失败`)
      return Promise.resolve({ operationId: args.operationId, name: args.name, removed: true, defaults })
    },
    presentCall: () => ({ card: 'generic', title: '删除方法库条目', kind: 'other' }),
  }))
}
