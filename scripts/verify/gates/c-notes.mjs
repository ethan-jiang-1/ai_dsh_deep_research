// c-notes.mjs — 域 C · notes 与开发技能：决定记录的骨架/状态/毕业纪律与 .agents/skills 形状。
//
// 从 2026-10-27 卫生轮前的单文件 verify.mjs 原样切出（判据与文案逐字未改）；共享助手住
// ../context.mjs。改本域门禁只需读本文件——域切分 = docs/evaluation.md §L0 表的 A–F 分组。

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, fail, note, trackedFiles } from '../context.mjs';

export function runC() {
// ── note-format（notes/ 决定记录骨架与状态行——DSH SDLC reference 01
//    点状吸纳："没记击败了什么的决定会重开讼"；遗留形态走 grandfather 条款不追改）──
{
  const gate = 'note-format';
  const GRANDFATHER = /<!-- grandfather:/;
  const each = (sub, fn) => {
    const dir = join(ROOT, 'notes', sub);
    if (!existsSync(dir)) return; // 空层不检（如某时态层暂无条目）
    for (const ent of readdirSync(dir)) {
      if (ent === 'README.md' || !ent.endsWith('.md')) continue;
      fn(ent, readFileSync(join(dir, ent), 'utf8'));
    }
  };
  // proposed/：RFC 状态行（与目录互验）+ 输掉的方案在场
  each('proposed', (ent, text) => {
    if (!/^> 状态：\*{0,2}(proposed|approved|superseded)\*{0,2}\s*$/m.test(text))
      fail(gate, `notes/proposed/${ent}: 状态行须为裸值（> 状态：proposed|approved|superseded；不带日期/括号——上游 Status 行同构）`);
    if (!/输掉的方案/.test(text))
      fail(gate, `notes/proposed/${ent}: 缺"输掉的方案"——没记击败了什么的决定会重开讼`);
  });
  // implemented/：骨架在场（决定 + 输掉的方案）；grandfather 条款豁免门禁生效前的遗留形态
  // 2026-10-08 补宽：加"实际跑过的验证"节断言。动因 = 复核实测该节零校验，而 notes/README.md
  // 与 evaluation.md 都宣称它是骨架四节之一（文档声明严于门禁 = 缺口）。实测 70 篇里有 25 篇
  // 的验证内容存在但落在**自造标题**下（## 实际跑过的检查 / ## 验收怎么闭的（逐条）/
  // ## L1 挂载面（…）…）——正是"当前事实 vs 变更史"漂移的入口。词表取实测变体 + 日期后缀容忍，
  // 既咬住"根本没有验证节"，又不为格式洁癖逼人重命名历史标题。
  // 注意：**不能用 `\b` 收尾**——CJK 不是 \w，`验证\b` 在"## 验证"行尾无边界可依，恒不匹配
  // （实测教训：首版带 \b 导致 40 篇误红，其中 39 篇其实有 `## 验证`）。
  // 词表按**实测全量标题**归纳（`grep '^## ' notes/implemented/*.md`），不按想象列举：
  // 本仓证据节的真实命名族 = 验证/检查/验收/实录/记录/实证/探针/全绿/结果/复验…
  // （如 `## 验收判据` `## 阶段一实录` `## 构建打通 + 双通道全绿` `## 证据（fresh-agent 探针…）`）。
  // 判定语义 = 该节标题**声称此处有证据**，而非强求统一命名——苛求命名会制造格式洁癖式假红。
  // 证据节判定词表（2026-10-08 增设）。
  // `^##(?!#)`：**必须恰好是 h2**——`^##` 在 /m 下也会匹配 `###`/`####`（二轮自审抓获，
  // 当前潜伏：71 篇命中者全走真 `##`，唯一无 h2 的那篇带 grandfather 注释）。
  // 词表按**实测标题族**归纳，容忍历史命名变体（验证/检查/验收/实录/记录/实证/探针/
  // 全绿/复验/证据）——不逼统一命名，否则 25 篇有效历史命名被误杀。
  // 否定式标题必须排除（2026-10-08 二轮自审抓获）：`## 未验证的猜测` / `## 无验证` /
  // `## 待验证` 原先**因为"验证"二字出现而通过**——即"明说没有证据"反而满足"要有证据节"，
  // 语义倒置。紧邻否定词 + 证据词 = 该标题在声明缺席，不算证据节。
  const VERIFY_SECTION = /^##(?!#)\s*[^\n]*(验证|检查|验收|实录|记录|实证|探针|全绿|复验|证据)/m;
  const VERIFY_NEGATED = /^##(?!#)[^\n]*(未|无|待|免|非|不|尚未)(验证|检查|验收|实录|记录|实证|探针|复验|证据)/m;
  each('implemented', (ent, text) => {
    const g = GRANDFATHER.test(text);
    if (!/^> 状态：\*{0,2}implemented\*{0,2}\s*$/m.test(text))
      fail(gate, `notes/implemented/${ent}: 缺裸状态行（> 状态：implemented——目录↔状态互验）`);
    if (!/^## 决定/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 决定"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if (!/^## 输掉的方案/m.test(text) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"## 输掉的方案"节（遗留形态须标 grandfather 注释，见 notes/README.md）`);
    if ((!VERIFY_SECTION.test(text) || VERIFY_NEGATED.test(text)) && !g)
      fail(gate, `notes/implemented/${ent}: 缺"实际跑过的验证"节——无证据的"完成"不算完成（否定式标题如"## 未验证的猜测"不算证据节；词表见 note-format 实现注释；遗留形态标 grandfather）`);
    // ── 本断言的**已知边界**（如实登记，不假装它更强）──────────────────────────────
    // 这是**在场检查**，不是**内容检查**：`## 证据待补` / `## 验证计划（未执行）` 这类空洞
    // 或自认未执行的标题同样会通过（对抗测试实证）。机械面在这里能保证的只有"作者被逼到
    // 必须为此开一节"——**证据是否真实充分仍是语义判断**，归 `reviewing-a-delivery` 与
    // L4 人工判据，不归本门禁。收紧到关键词须出现"跑/测/通过"等执行动词会引入另一类假阳
    // （合法历史命名被误杀），收益不抵代价（同 §词表按实测标题族归纳 的取舍）。
    // 与上游对齐：DSH testing policy 明确不声称一切语义规则都可机械化。
  });
  // rejected/：否决状态行（提案体保留，结论在状态行）
  each('rejected', (ent, text) => {
    if (!/^> 状态：\*{0,2}rejected\*{0,2}(\s*—\s*.+)?$/m.test(text))
      fail(gate, `notes/rejected/${ent}: 缺 rejected 状态行（裸值；一行理由用 —— 附在状态行后）`);
  });
}

// ── note-status（notes/ 的时态与状态面——2026-09-25 用户诉求落地：
//    人一眼看懂、Agent 一眼分辨当前/将来/过去。三条断言：
//    ① notes/ 每个子目录有 README.md（目录自述时态与状态标记方式）；
//    ②③ research/ 断言（状态行 + README 索引对账）条件化保留——research/ 已清并
//       （2026-09-27：目录名=状态，现读作"待研究课题"会误读；五篇报告并入 implemented/），
//       目录重现则断言复活。）──
{
  const gate = 'note-status';
  const notesDir = join(ROOT, 'notes');
  for (const ent of readdirSync(notesDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (!existsSync(join(notesDir, ent.name, 'README.md'))) {
      fail(gate, `notes/${ent.name}/: 缺 README.md（子目录须自述时态与状态标记方式）`);
    }
  }
  const research = join(notesDir, 'research');
  if (existsSync(research)) {
    const files = readdirSync(research).filter((f) => f.endsWith('.md') && f !== 'README.md');
    const index = existsSync(join(research, 'README.md')) ? readFileSync(join(research, 'README.md'), 'utf8') : '';
    for (const f of files) {
      const text = readFileSync(join(research, f), 'utf8');
      if (!/^> 状态：\*{0,2}(已完成|进行中)/m.test(text)) {
        fail(gate, `notes/research/${f}: 缺状态行（> 状态：已完成 | 进行中 · 日期）`);
      }
      if (!index.includes(f)) fail(gate, `notes/research/README.md: 未登记 ${f}（索引新鲜度）`);
    }
  }
}

// ── note-graduation-rewrite（implemented 活跃 Note 零计划体残留——"毕业 = 正文改写"
//    的机器面，2026-09-27 立项。此前只有 skill 散文约束无机械守卫；roadmap-graduation-drift
//    事故（postmortem 在案）是毕业时序纪律失守的近亲。判据窄带（2026-09-27 探针：候选词表对
//    活跃区 31 篇全量零命中零误报——宁窄勿宽，语义边界由 delivered Note 与自审确认）：
//    ① RFC 专有**裸**节名 `## 验收`（implemented 骨架 = 决定/输掉的方案/实际跑过的验证/环境
//       状态；带后缀的历史变体 `## 验收判据`/`## 验收怎么闭的` 是既有事实体形态，不追改）；
//    ② 行内计划体标记：TODO/TBD/待办/待实施/下一步将/接下来将/将迁移/将新增。
//    **引文边界**（实测自指教训：记录本门禁红证的 Note 必然内嵌标记原文——不豁免则门禁咬
//    自己的毕业 Note）：fenced 代码块与反引号内联代码 = 引文非正文语态，剥离后再匹配；
//    裸文本中的标记才红。grandfather 注释件豁免（遗留形态允许骨架不齐）；archived/ 冻结层
//    不扫（快照不追改）；README.md 非毕业件不扫；扫描范围空集即红（防空语料）。──
{
  const gate = 'note-graduation-rewrite';
  const dir = join(ROOT, 'notes', 'implemented');
  if (!existsSync(dir)) {
    fail(gate, 'notes/implemented/ 目录缺席——扫描范围失效（防空语料）');
  } else {
    const files = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    if (files.length === 0) {
      fail(gate, 'notes/implemented/ 扫描范围为空——门禁失去保护面（防空语料），检查目录是否被误清');
    }
    const markers = [
      ['RFC 裸节名 ## 验收', /^##\s*验收\s*$/],
      ['计划体标记 TODO', /TODO/],
      ['计划体标记 TBD', /TBD/],
      ['计划体标记 待办', /待办/],
      ['计划体标记 待实施', /待实施/],
      ['计划体标记 下一步将', /下一步将/],
      ['计划体标记 接下来将', /接下来将/],
      ['计划体标记 将迁移', /将迁移/],
      ['计划体标记 将新增', /将新增/],
    ];
    for (const f of files) {
      const text = readFileSync(join(dir, f), 'utf8');
      if (/<!--\s*grandfather:/.test(text)) continue;
      const lines = text.split('\n');
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        if (raw.trimStart().startsWith('```')) { inFence = !inFence; continue }
        if (inFence) continue;
        // 剥离反引号内联代码（引文非正文）后再匹配；行号 = 原文真实行号。
        const bare = raw.replace(/`[^`]*`/g, '');
        for (const [label, re] of markers) {
          if (re.test(bare)) {
            fail(gate, `notes/implemented/${f}:${i + 1} 命中${label}——计划体残留。毕业 = 正文改写（计划体 → 已交付事实体，删未来时态/待办清单；见 notes/AGENTS.md），只改路径不改正文 = 未来计划伪装成当前事实`);
          }
        }
      }
    }
  }
}

// ── dev-skill-format（.agents/skills/ 开发技能的形状——vendor .agents/skills/
//    吸纳：repository development Skills 的 frontmatter 用 name/description，
//    description 以 "Use " 开头携带触发条件（匹配即加载；摘要不携带指令）；
//    形状坏了 = 技能静默不触发，比写错正文更难发现。）──
{
  const gate = 'dev-skill-format';
  const dir = join(ROOT, '.agents', 'skills');
  if (!existsSync(dir)) fail(gate, '.agents/skills/ 缺席——开发技能层是入口链的一部分');
  else {
    const skills = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
    if (skills.length === 0) fail(gate, '.agents/skills/ 下没有任何技能');
    for (const s of skills) {
      const file = join(dir, s.name, 'SKILL.md');
      if (!existsSync(file)) { fail(gate, `.agents/skills/${s.name}: 缺 SKILL.md`); continue; }
      const text = readFileSync(file, 'utf8');
      const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
      if (fm === null) { fail(gate, `.agents/skills/${s.name}: 缺 frontmatter`); continue; }
      const name = /^name:\s*(\S+)\s*$/m.exec(fm[1])?.[1];
      const desc = /^description:\s*(.+)$/m.exec(fm[1])?.[1];
      if (name !== s.name) fail(gate, `.agents/skills/${s.name}: frontmatter name=${String(name)} ≠ 目录名`);
      if (desc === undefined || !desc.startsWith('Use ')) {
        fail(gate, `.agents/skills/${s.name}: description 须以 "Use " 开头（携带触发分支；摘要不携带指令）`);
      }
    }
  }
}

// ── proposed-pointer-live（live 文件里指向 notes/proposed/<x>.md 的具体指针必须存在）──
// 为什么：md-links/md-anchors 只扫 tracked .md 的 Markdown 链接语法，**非 .md 文件里的指针逃检**
// ——2026-09-26 清扫实测 13 处已 404 的 notes/proposed/ 指针（presets 头注 ×4、dev ×3、scripts ×3、
// tests ×1、alignment-ledger ×1）全部从这条缝漏过；preset 头注还随包分发。
// 范围：tracked 且**排除 notes/ 历史层**（历史层保留过去时指针是合法的，如"原 RFC：…（已离场）"）
// 与 vendor/。扫描集合空即红；当前没有 proposed 指针是合法的，若有指针则每个必须解析。
// 反证形态：把任一头注里的 notes/implemented/ 改回 notes/proposed/ → 本门禁红 → 还原绿。
{
  const gate = 'proposed-pointer-live';
  // 枚举四件套收口（形态正本 = trackedFiles 助手头注）；范围与防空语料措辞是本门禁自己的。
  const files = trackedFiles({
    gate,
    exclude: (f) => f.startsWith('vendor/') || f.startsWith('notes/') || f === 'pnpm-lock.yaml',
    emptyMsg: '防空语料：未扫到任何 live 文件——范围被收窄或 git ls-files 失效',
  });
  if (files) {
    let checked = 0;
    for (const { rel, text } of files) {
      for (const m of text.matchAll(/notes\/proposed\/[A-Za-z0-9._-]+\.md/g)) {
        checked++;
        if (!existsSync(join(ROOT, m[0]))) {
          const line = text.slice(0, m.index).split('\n').length;
          fail(gate, `${rel}:${line} 指向 ${m[0]}——该文件不在 notes/proposed/（已毕业？毕业须同 diff 改指 notes/implemented/）`);
        }
      }
    }
    if (checked === 0) note(gate, '零个 live proposed 指针（合法：RFC 仅在持久决定需要显式评审时使用）');
    else note(gate, `${checked} 个 live 指针全部可解析`);
  }
}

// ══ 域 D · vendor 对齐（钉身份/对齐台账/仓规约定/vendored 解析） ══
}
