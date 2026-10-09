# bugs/ · 活跃缺陷卡

> 一文件一张卡：`BUG-<NNN>-<slug>.md`。修完 `git mv` 到
> [`../_archived/fixed_bugs/`](../_archived/fixed_bugs/README.md)，文件名不变、内容不重写。
> **调查过、修复未确认**的缺陷 `git mv` 到
> [`../_archived/suspended_bugs/`](../_archived/suspended_bugs/README.md)（编号保留——暂停非
> 完成，重启需用户新的优先级决定）。**编号权威在归档侧**：新号 =
> [../_archived/fixed_bugs/README.md](../_archived/fixed_bugs/README.md) 的 Next BUG ID（已分配最大号 + 1，活跃 ∪
> 归档一起算）。规矩手册 = [`../README.md`](../README.md)。

## 活跃列表

（无活跃缺陷卡；最近归档 = [BUG-018](../_archived/fixed_bugs/BUG-018-snapshot-replay-advertised-coverage.md) snapshot-replay 声明覆盖大于实际覆盖〔B 层补齐比对面 + 覆盖面自守〕。）

## 卡片模板

```markdown
# BUG-<NNN>：<一句话标题>

> 严重级别：P0（阻断）/ P1（重要）/ P2（次要）｜发现：YYYY-MM-DD｜状态：活跃

## 症状
观察到什么错误行为（现场、报错、复现路径）。

## 根因（假设）
机制层原因——越到契约/结构层越好，避免只描述表象；未定位就写假设与验证途径。

## 复现
最小复现步骤 / 命令 / 输入。

## 牵出的失败类
这个 bug 是哪类失败的探针，是否值得横切排查（契约探针纪律的落点）。

## 修复关联
落地方式（修复 commit / 拆窄 follow-up / 搁置池行 / 上游 seam），修完归档时补。
```

**状态行追写法**（位置即状态）：`状态：活跃` 是卡在本目录时的状态；确认修复**追加**
不重写——`状态：活跃 — 已修复 YYYY-MM-DD：<结论，Note 指针>`；进暂停池**不加任何判断**
（没有判断落地）。

**边界**：当场修掉的缺陷不建档（轮次 Note 照旧）；建档 = 发现时决定不当场修。
把每个 bug 当**契约探针**——一个具体缺陷往往牵出一类失败，顺藤摸瓜值得横切排查。
