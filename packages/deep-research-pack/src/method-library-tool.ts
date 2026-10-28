/**
 * Host 半：方法库写库工具（D25 2026-10-28 扩展）。只给方法编辑 preset 用：
 * `method_library_upsert` 把一条完整库条目写进当前会话 cwd 的 `method-library.md`（同名覆盖）。
 * 面板仍永不直写；这是业务写入的唯一路径。纯折算住 `src/lib/method-library-write.ts`（keyless 测）。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { foldLibrary } from './lib/library-fold.ts'
import { removeMethodEntry, upsertMethodEntry } from './lib/method-library-write.ts'

/** Cordis 插件名。 */
export const name = 'method-library-tool'

/** 只依赖工具注册表。 */
export const inject = ['tools']

/**
 * 注册 `method_library_upsert`：唯一写 `method-library.md` 的工具。
 * @param ctx - host context。
 */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'method_library_upsert',
    description: '把一条研究方法条目写入当前工作区的 method-library.md（同名覆盖；新建或更新）。只在方法库页的保存动作里调用。entry 必须是完整库条目 Markdown：`## 名称（日期，来源）` + 四行（- 找来源: / - 怎么核实: / - 报告怎么写: / - 不承诺:）；四行都必须有内容。',
    parameters: {
      entry: { type: 'string', required: true, description: '完整库条目 Markdown（标题 + 四行）' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          action: { type: 'string', required: true, enum: ['created', 'updated'] },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `已写入库：${value.name}（${value.action === 'created' ? '新建' : '更新'}）`,
      }],
    },
    execute(args, exec) {
      const cwd = exec.agent?.session.header.cwd
      if (cwd === undefined) throw new Error('method_library_upsert 需要 owning agent session（没有 cwd）')
      const parsed = foldLibrary(args.entry)[0]
      if (parsed === undefined) throw new Error('entry 不是一条可解析的库条目')
      const path = join(cwd, 'method-library.md')
      let text = ''
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      const result = upsertMethodEntry(text, parsed)
      mkdirSync(cwd, { recursive: true })
      writeFileSync(path, result.text, 'utf8')
      return Promise.resolve({ name: result.name, action: result.action })
    },
    presentCall: () => ({ card: 'generic', title: '写入方法库', kind: 'other' }),
  }))
  ctx.tools.register(defineTool({
    name: 'method_library_remove',
    description: '从当前工作区的 method-library.md 删除一条同名方法条目。只在方法库页的删除动作里调用；删除后如实回复「已删除：<名称>」。',
    parameters: {
      name: { type: 'string', required: true, description: '要删除的条目名' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string', required: true },
          removed: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `已删除库：${value.name}` }],
    },
    execute(args, exec) {
      const cwd = exec.agent?.session.header.cwd
      if (cwd === undefined) throw new Error('method_library_remove 需要 owning agent session（没有 cwd）')
      const path = join(cwd, 'method-library.md')
      let text = ''
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      const result = removeMethodEntry(text, args.name)
      if (!result.removed) throw new Error(`库里没有「${args.name}」`)
      writeFileSync(path, result.text, 'utf8')
      return Promise.resolve({ name: args.name, removed: true })
    },
    presentCall: () => ({ card: 'generic', title: '删除方法库条目', kind: 'other' }),
  }))
}
