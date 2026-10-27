// frontmatter 拆分契约（keyless 纯函数）——`scripts/lib/frontmatter.mjs` 的直测。
//
// 为什么补（2026-10-27 卫生轮 维度5）：本件是 run-dashboard-core 与 evidence-audit-core 的共同
// 依赖（两个 core 各持逐字副本的历史已在 2026-10-16 收敛），但 52 个 scripts/lib 模块里它属于
// 唯一被两个消费者间接覆盖、自己**零直测**的纯件——头注的四条契约（首个 `---` 块 / 单行标量 /
// 重复键后者覆盖 / 无 frontmatter 返回 null）此前没有一条断言。纯件的契约不钉在纯件上，
// 下一次"帮它加点宽容"就会从两个消费者的失败里才被发现。
// 与消费方语义的边界：本件只拆不判（缺失返回 `fm: null`，"契约不符"怎么处理归调用方），
// 故这里的断言也只覆盖拆分形态，不覆盖"该不该判红"。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitFrontmatter } from '../../scripts/lib/frontmatter.mjs'

test('基本形态：首个 --- 块拆成扁平映射，body 保留其后全文', () => {
  const { fm, body } = splitFrontmatter('---\nslug: drt_demo\nstatus: 交付\n---\n\n# 标题\n正文\n')
  assert.deepEqual(fm, { slug: 'drt_demo', status: '交付' })
  assert.equal(body, '\n# 标题\n正文\n', 'body = 收尾 --- 之后的全部内容（含其后的空行）')
})

test('无 frontmatter：fm=null 且 body 原样返回（调用方按 null 走自己的契约分支）', () => {
  const text = '# 只有正文\n---\n不是头部的分隔线\n'
  const { fm, body } = splitFrontmatter(text)
  assert.equal(fm, null, '首行不是 --- 就不算 frontmatter（不许中途截取）')
  assert.equal(body, text, '未拆分时 body 必须逐字等于输入')
})

test('重复键后者覆盖（键值表不是多值容器）', () => {
  const { fm } = splitFrontmatter('---\nk: first\nk: second\n---\nx\n')
  assert.deepEqual(fm, { k: 'second' })
})

test('只认单行标量：列表项/缩进子行/注释行被忽略，但"裸键"按空串值收下', () => {
  const { fm } = splitFrontmatter('---\nvalid: v\n- 列表项\nnested:\n  child: c\n  \n# 注释\n---\nbody\n')
  // 实测形态（本测试即为契约记录）：缩进子行与 # 注释不匹配（正则锚 ^ 且不跳空白），
  // 但 `nested:` 本身是合法的 key: value 行 → 以空串值收下。调用方若要区分"有值/无值"，
  // 用值是否为空判断，不要用键是否在场。
  assert.deepEqual(fm, { valid: 'v', nested: '' })
})

test('CRLF 行尾同样可拆（Windows 保存的 run 文件）', () => {
  const { fm, body } = splitFrontmatter('---\r\nslug: drt_win\r\n---\r\nbody\r\n')
  assert.deepEqual(fm, { slug: 'drt_win' })
  assert.equal(body, 'body\r\n')
})

test('只有开界没有闭界：不拆（避免把整篇正文吃成头部）', () => {
  const text = '---\nslug: drt_x\n没有收尾分隔线\n'
  const { fm, body } = splitFrontmatter(text)
  assert.equal(fm, null)
  assert.equal(body, text)
})

test('空头块：当前按"无 frontmatter"处理（fm=null、body 原样）——已记录的边界', () => {
  // 判据 = 拆分正则要求闭界前至少一个换行（`([\\s\\S]*?)\\r?\\n---`），`---\n---\n` 不满足，
  // 于是整篇按无头块处理。消费方看到 null = "没有 frontmatter"，与"空对象"不可分辨。
  // 本轮不改行为（改它会同时改变两个 core 的契约分支），把它写成契约记录，防止下次误读。
  const text = '---\n---\nbody\n'
  const { fm, body } = splitFrontmatter(text)
  assert.equal(fm, null)
  assert.equal(body, text)
})
