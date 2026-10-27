// config-tables.ts —— 「研究配置」/「方法库」面板的**数据面**（纯常量；无 React、无 DOM）。
//
// 为什么住 lib 而不是视图（2026-10-27 卫生轮 维度2）：
// ① 这些表是**投影**（正本 = research-brief skill 的方法预设 / 共同底线 / 领域示范），与视图
//    生命周期无关。放在 700 行的 TSX 里时，改表的人只会去翻页面文件，lib 侧也拿不到它们；
// ② keyless 测试此前只能 `ts.createSourceFile` 扒 TSX 源码取常量，并被迫断言
//    「必须保持为可静态对账的数组字面量」——任何视图重构都会让与业务无关的测试红。现在测试
//    直接 import（tests/cockpit/library-fold）；
// ③ 数据/展示分层：改数据不动组件，改组件不动数据。
//
// 同钉（漂移即红）：内置偏好 ↔ skill 方法预设表、判型映射 ↔ skill 同名表、六条底线 ↔ skill
// 共同底线句、SECTIONS ↔ library-fold 的 SECTION_LABELS、两个入口指令逐字 ↔ skill 指令形态。
import type { LibrarySections } from './library-fold.ts'

/** 内置研究偏好（只读；内容正本 = research-brief skill 方法预设表——此处仅投影）。
 *  `summary` = 该表第 2 列「给用户的一句话」——**卡面显示的就是它**（2026-10-16 用户拍板：
 *  面板是用户面，就显示专门为用户写的那句话；四分区详情仍在详情弹窗，不丢信息）。
 *  三处同钉（客户端 ↔ skill 表 ↔ 测试期望），漂移即红：tests/library-fold.test.mjs。 */
export interface BuiltinPreference {
  readonly name: string
  readonly summary: string
  readonly sections: LibrarySections
}

export const BUILTIN_PREFERENCES: readonly BuiltinPreference[] = [
  {
    name: '事实核查',
    summary: '核准具体事实/数字/状态的对象、时点与口径',
    sections: {
      source: '官方/原始来源优先，第三方只作线索',
      verify: '逐字转写核对；关键来源独立重抓；单源结论显式标注',
      report: '快答首屏：答案+口径+依据+限制',
      limit: '不做领域覆盖；"快"由深度决定',
    },
  },
  {
    name: '领域地图',
    summary: '摸清谁在做什么、到哪一步',
    sections: {
      source: '广度优先铺方向，多类来源交叉定位阵营',
      verify: '覆盖对账：每个子域至少一条可核来源；盲点显式标注',
      report: '地图式：分节定位+关系+时效边界',
      limit: '不把未覆盖说成不存在',
    },
  },
  {
    name: '主张核查',
    summary: '查证一个说法是真是假',
    sections: {
      source: '对称检索：正反同权重；追原始出处',
      verify: '反例权重最高；判定四态（成立/部分/不成立/证据不足）',
      report: '判定+证据强度分级+最强反证单列',
      limit: '不预设真伪；不做只找赞同的检索',
    },
  },
  {
    name: '方案比较',
    summary: '把几个选项放在同一标准下比',
    sections: {
      source: '各选项同维度查证；厂商资料与实际使用反馈并重',
      verify: '口径对齐才可比；价值权衡与事实分开',
      report: '维度化对比+适用情境+取舍说明',
      limit: '不替用户决定偏好；无场景不推唯一答案',
    },
  },
  {
    name: '时间线与信号',
    summary: '按官方节点排时间线，用预列指标判断走到哪了',
    sections: {
      source: '官方变更点（release notes／changelog／公告／生效日）为骨，媒体报道为肉；每个节点必须落在官方出处上',
      verify: '每节点带日期与出处；「现状」标注截至时刻；先列可观察指标与阈值，再下趋势判断；趋势与事实分句',
      report: '首屏仍走既有骨架（六段或快速缩略）；正文按时间线组织（节点＋日期＋出处）→ 现状截点 → 指标读数表 → 趋势判断（显式标「判断」）→ 覆盖边界',
      limit: '不做无时间窗的预测；不把趋势判断写成事实',
    },
  },
]

/** 判型 → 打法映射（**推荐规则正本 = research-brief skill §方法预设 的同名表**；此处是它的
 *  投影——卡面「什么时候用它」与「推荐规则说明位」都由它派生；同钉 = tests/library-fold）。 */
export const PATTERN_METHOD_RULES: readonly { patterns: string; method: string }[] = [
  { patterns: 'P1 单点事实/状态核查 · P2 数据表/价目核查', method: '事实核查' },
  { patterns: 'P3 领域全景梳理', method: '领域地图' },
  { patterns: 'P4 断言验证', method: '主张核查' },
  { patterns: 'P5 多维对比/差距 · P6 尽调/评估 · P7 方法/方案指导', method: '方案比较' },
  { patterns: 'P8 事态跟踪/时间线', method: '时间线与信号' },
]

/** 六条共同底线（任何打法都改不掉）——正本 = research-brief skill 的「共同底线（…）」句；
 *  面板只做投影（同钉 = tests/library-fold；防第二份手抄清单）。 */
export const BASELINE_DISCIPLINES: readonly string[] = ['来源链', '逐字摘录', '独立信源', '日期校准', '缺口显式', 'readiness']

/** 两个定制入口的指令逐字（**正本 = research-brief skill「两个面板入口的指令形态」**；
 *  同钉 = tests/library-fold 的逐字包含断言）。 */
export const DRAFT_INSTRUCTION = '我要新建一条研究打法。请先问我三个问题——① 我这一行的一手来源具体是哪些（点名到机构／数据库／官方页）② 必须带的口径字段是什么（时间／单位／币种／版本等）③ 这份报告给谁看、要什么形态与免责——拿到回答后，按四字段（找来源／怎么核实／报告怎么写／不承诺）起草一条命名条目写入我的偏好库，并一句话回执你写了什么。'
export const DISTILL_INSTRUCTION = '把本次研究实际采用的做法存成研究偏好——从 question.md 研究方法节、evidence 的来源分级分布与 final.md 的结构归纳出四字段，写入我的偏好库；一句话回执，并说明它与最接近的内置打法的差异在哪。'

/** 领域示范（只读）：一条**厚条目**长什么样——行业差异四处（一手源是谁／口径必带什么／
 *  冲突怎么裁／工件与免责）该写到什么颗粒度。正本 = research-brief skill「领域示范」节，
 *  逐字同钉（tests/library-fold）；它不是按判型推荐的方法，故不进「内置打法」清单。
 *  内容来自外部逐条核实（`_backlog/research/2026-10-18-method-config-ux-external.md`）。 */
export const DEMO_ENTRY: { readonly name: string; readonly sections: LibrarySections } = {
  name: '投研尽调（示范）',
  sections: {
    source: '一手件按渠道点名——A 股招股书看证监会《格式准则第57号》与交易所网站；港股看港交所《Guide for New Listing Applicants》（2023-11）与披露文件；美股看 SEC EDGAR 的 10-K／10-Q／8-K；主体与股东信息看国家企业信用信息公示系统（《企业信息公示暂行条例》第六条）。注意：工商年报里资产总额、营业收入等由企业选择是否公示，不能当财务底稿。',
    verify: '交叉印证——三表勾稽；余额类做第三方函证（书面、由第三方直复）；关键结论至少两条独立来源。集中度必查：对关键客户/供应商的依赖（美股 Reg S-K Item 101(c)(1)(i)、101(h)(4)(vi)；港股《Guide》3.7 要求前五大客户/供应商的身份、占比与集中度与对手方风险）。心态 = 职业怀疑（ISA (UK) 200）；本工具纪律——先列红旗与 kill criteria 再找亮点，不得只挑有利项（Item 10(b)(2)(i)）。',
    report: '先对齐口径——会计年度（A 股＝公历 1 月 1 日至 12 月 31 日；美股改财年按 17 CFR 240.13a-10 出过渡期报告）；非 GAAP 指标须与最可比 GAAP 等量或更显著呈现并附量化调节表（Reg G §244.100(a)），不得平滑"非经常、偶发或特殊"项目（Item 10(e)(1)(ii)(B)），A 股非经常性损益看证监会〔2008〕43号；外币按《企业会计准则第19号》第十至十二条取交易发生日/资产负债表日即期汇率，用近似汇率须披露确定方法；敏感性分析参照 Item 305(a)(1)(ii)(A)。工件体例（论点／关键假设／反证／敏感性）是本工具模板，不是监管要求。',
    limit: '不构成投资建议；不给目标价与评级；不替代尽调程序（函证、访谈、现场核查）；工商公示信息不等于经审计的财务底稿。',
  },
}

/** 四分区的固定呈现序与用户语言标签（**逐字 = 库格式与指令载荷**；`library-fold.SECTION_LABELS`
 *  是正本，本常量是它的呈现副本——由 tests/library-fold 的"显示名一致性"断言对钉）。
 *  2026-10-18 修发现 13：此处曾写「找什么资料／明确不承诺」，与指令里的「找来源／不承诺」不一致。 */
export const SECTIONS: readonly { key: keyof LibrarySections; label: string }[] = [
  { key: 'source', label: '找来源' },
  { key: 'verify', label: '怎么核实' },
  { key: 'report', label: '报告怎么写' },
  { key: 'limit', label: '不承诺' },
]
