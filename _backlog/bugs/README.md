# bugs/ · 活跃缺陷卡

> 一文件一张卡：`BUG-<NNN>-<slug>.md`。修完 `git mv` 到
> [`../_archived/fixed_bugs/`](../_archived/fixed_bugs/README.md)，文件名不变、内容不重写。
> **调查过、修复未确认**的缺陷 `git mv` 到
> [`../_archived/suspended_bugs/`](../_archived/suspended_bugs/README.md)（编号保留——暂停非
> 完成，重启需用户新的优先级决定）。**编号规则唯一权威 = 本页**：新号 = 活跃 ∪ 全部归档池
> （fixed + suspended）的已分配最大号 + 1（按盘上两区实算，不登记实值——登记 = 第二份手抄件必腐）。
> 规矩手册 = [`../README.md`](../README.md)；本区子树指令 = [`../AGENTS.md`](../AGENTS.md)。

## 活跃列表

| 卡 | 状态 | 严重级 | 一句话 |
|---|---|---|---|
| [BUG-177](BUG-177-ci-workflow-expression-normalization.md) | 等人拍板 | P2 | ci-workflow 表达式归一不全：`${{ always() }}` 假红、`${{ true }}` continue-on-error 假绿 |
| [BUG-178](BUG-178-readiness-markdown-containers-and-bold-paren.md) | 等人拍板 | P1 | readiness 容器/缩进代码可翻转终局；带括号的加粗标签假红 |
| [BUG-179](BUG-179-html-comments-not-masked.md) | 等人拍板 | P1 | HTML 注释不剥：notes 证据可从注释长出，readiness 可被注释翻转 |
| [BUG-181](BUG-181-artifact-freshness-deletion-blind.md) | 修复就绪 | P2 | artifact 新鲜度只看最新 mtime：删源文件后旧 tarball 仍 fresh |
| [BUG-182](BUG-182-model-workflow-duplicate-onkeys-empty-map.md) | 等人拍板 | P2 | model-workflow 又写一份 onKeysOf：`workflow_dispatch: {}` 被判无事件 |
| [BUG-183](BUG-183-note-scan-indented-status-heading.md) | 等人拍板 | P2 | note-scan 不容忍 0–3 空格缩进：合法状态行/证据标题被判缺席 |

## 最近归档

（2026-11-14 第七轮/类级残差修复闭环（9 张，168–176）：
[168](../_archived/fixed_bugs/BUG-168-legacy-present-payload-substring-false-positive.md) 旧场 present 路径；
[169](../_archived/fixed_bugs/BUG-169-readiness-fenced-code-verdict.md) readiness 围栏；
[170](../_archived/fixed_bugs/BUG-170-readiness-bold-label-not-recognized.md) readiness 加粗标签；
[171](../_archived/fixed_bugs/BUG-171-protocol-version-chain-only-previous-snapshot.md) protocol 版本链；
[172](../_archived/fixed_bugs/BUG-172-smoke-registry-if-false-step-counted.md) CI step 跳过；
[173](../_archived/fixed_bugs/BUG-173-client-effect-bracket-access-escapes-return-gate.md) client effect 方括号；
[174](../_archived/fixed_bugs/BUG-174-lifecycle-stale-dist-tarball.md) tarball 新鲜度；
[175](../_archived/fixed_bugs/BUG-175-note-gates-fenced-code-and-hidden-md.md) notes 围栏/隐藏 md；
[176](../_archived/fixed_bugs/BUG-176-smoke-symlink-invisible-to-registry.md) smoke symlink。
）
（2026-11-14 第六轮批 A 修复闭环（8 张，160–167）：
[160](../_archived/fixed_bugs/BUG-160-smoke-registry-mention-not-execution.md) CI 执行面；
[161](../_archived/fixed_bugs/BUG-161-ci-jobs-job-id-regex-skips-underscore.md) CI job 清单；
[162](../_archived/fixed_bugs/BUG-162-nested-smoke-invisible-to-registry-and-lane.md) 嵌套 smoke；
[163](../_archived/fixed_bugs/BUG-163-model-workflow-pull-request-target-trigger.md) with-key 触发面；
[164](../_archived/fixed_bugs/BUG-164-snapshot-why-accepts-flag-as-carrier.md) snapshot --why；
[165](../_archived/fixed_bugs/BUG-165-note-format-quoted-status-and-negated-evidence.md) note-format；
[166](../_archived/fixed_bugs/BUG-166-note-tree-hidden-directory-bypass.md) note-tree；
[167](../_archived/fixed_bugs/BUG-167-method-heading-invisible-format-chars-duplicate.md) 方法标题 Cf。
）
（2026-11-13 交付门/证据面复查批（11 张，149–159）：
[149](../_archived/fixed_bugs/BUG-149-hitl2-pending-vocabulary-holes.md) HITL2 pending 词表；
[150](../_archived/fixed_bugs/BUG-150-readiness-keyword-window-still-hijacked.md) readiness 范围仲裁；
[151](../_archived/fixed_bugs/BUG-151-client-hitl-click-count-false-red.md) 盘侧 answer；
[152](../_archived/fixed_bugs/BUG-152-client-load-unhealthy-host-assertion-red.md) 不健康主机 NOT-RUN；
[153](../_archived/fixed_bugs/BUG-153-protocol-snapshot-presence-only-not-content.md) 协议快照内容；
[154](../_archived/fixed_bugs/BUG-154-manifest-roles-missing-new-artifacts.md) manifest 新件；
[155](../_archived/fixed_bugs/BUG-155-manual-evidence-known-titles-are-table-labels.md) 人工走查边界；
[156](../_archived/fixed_bugs/BUG-156-hitl2-gate-no-version-pairing-pending-filtered.md) HITL2 版本仲裁；
[157](../_archived/fixed_bugs/BUG-157-verdicts-missing-session-only-warning.md) verdict session 缺失；
[158](../_archived/fixed_bugs/BUG-158-verdict-audit-review-missing-only-warning.md) verdict review 缺失；
[159](../_archived/fixed_bugs/BUG-159-claims-evidence-topics-not-validated.md) claims 证据/主题对账。
）
（2026-11-13 真模型/一致性复查批（13 张，136–148）：
[136](../_archived/fixed_bugs/BUG-136-defaults-probe-port-self-lock.md) probe 端口退避；
[137](../_archived/fixed_bugs/BUG-137-defaults-probe-language-merged-into-defaults-option.md) 语言不冒充默认；
[138](../_archived/fixed_bugs/BUG-138-method-heading-unrecognized-suffix-ghost-entry.md) 幽灵条目；
[139](../_archived/fixed_bugs/BUG-139-defaults-bom-parse-failure.md) BOM；
[140](../_archived/fixed_bugs/BUG-140-hitl2-vocabulary-two-way-misclassification.md) HITL2 词表；
[141](../_archived/fixed_bugs/BUG-141-readiness-inline-context-keyword-gap.md) readiness 行内仲裁；
[142](../_archived/fixed_bugs/BUG-142-client-load-selects-method-editor-session.md) client-load 选 lead；
[143](../_archived/fixed_bugs/BUG-143-method-editor-root-has-team-lead-tools.md) method-editor 边界；
[144](../_archived/fixed_bugs/BUG-144-kickoff-provenance-rows-not-counted-as-hitl2.md) 代理记账行；
[145](../_archived/fixed_bugs/BUG-145-manual-evidence-subheading-truncation.md) 人工走查标题；
[146](../_archived/fixed_bugs/BUG-146-hitl-signatures-chinese-only-bilingual.md) HITL 双语；
[147](../_archived/fixed_bugs/BUG-147-client-hitl-zero-answers-false-green.md) 0 题假绿；
[148](../_archived/fixed_bugs/BUG-148-evidence-short-quotes-not-audited.md) 短引文审计。
）
（2026-11-13 [BUG-135](../_archived/fixed_bugs/BUG-135-slug-charset-unwritten-binding-silent.md) slug 字符集成文并放宽为 `[A-Za-z0-9][A-Za-z0-9._-]*`；绑定/门/CLI 共用。）
（2026-11-13 边界复查批（8 张，127–134）：
[127](../_archived/fixed_bugs/BUG-127-library-halfwidth-parens-provenance-default.md) 半角括号；
[128](../_archived/fixed_bugs/BUG-128-method-heading-ideographic-space-duplicate.md) U+3000；
[129](../_archived/fixed_bugs/BUG-129-final-path-drops-absolute-root-alias.md) 绝对路径根；
[130](../_archived/fixed_bugs/BUG-130-method-lock-live-pid-reuse-permanent-block.md) 锁恢复入口；
[131](../_archived/fixed_bugs/BUG-131-defaults-unknown-key-warnings-unsurfaced.md) 未知键提示；
[132](../_archived/fixed_bugs/BUG-132-defaults-expected-revision-race-lost-update.md) CAS 锁；
[133](../_archived/fixed_bugs/BUG-133-sanitize-patch-nested-unknown-keys-silent.md) 子键校验；
[134](../_archived/fixed_bugs/BUG-134-gate-witness-bound-slugs-scans-content.md) 门侧绑定路径字段。
）
（2026-11-13 复查批（14 张，113–126）：
[113](../_archived/fixed_bugs/BUG-113-port-own-listener-overmatch.md) 端口身份精确化；
[114](../_archived/fixed_bugs/BUG-114-method-lock-release-stale-owner.md) 锁释放 token；
[115](../_archived/fixed_bugs/BUG-115-name-placeholder-invalid-after-fix.md) 名称占位符合法；
[116](../_archived/fixed_bugs/BUG-116-present-version-last-unversioned.md) 末条无版本 present；
[117](../_archived/fixed_bugs/BUG-117-status-feed-trust-stale.md) status trust 复位；
[118](../_archived/fixed_bugs/BUG-118-status-leads-findings-directory.md) leads/findings hasFile；
[119](../_archived/fixed_bugs/BUG-119-config-feed-adoption-stale.md) config adoption 复位；
[120](../_archived/fixed_bugs/BUG-120-method-library-hardlink-read-escape.md) hardlink 拒绝；
[121](../_archived/fixed_bugs/BUG-121-source-phase-trailing-comment.md) phase 尾注释；
[122](../_archived/fixed_bugs/BUG-122-final-path-nested-non-bundle.md) 终稿路径前缀；
[123](../_archived/fixed_bugs/BUG-123-default-marker-in-provenance.md) 默认标记位置；
[124](../_archived/fixed_bugs/BUG-124-heading-whitespace-between-segments.md) heading 段间空白；
[125](../_archived/fixed_bugs/BUG-125-plan-no-heading-version-last.md) 无 heading 版本；
[126](../_archived/fixed_bugs/BUG-126-method-lock-stale-live-pid.md) 活 pid 锁。
）
（2026-11-13 探索协议批（32 张，081–112）：
[081](../_archived/fixed_bugs/BUG-081-method-name-parenthesis-provenance-collision.md) 名称全角括号校验；
[082](../_archived/fixed_bugs/BUG-082-default-marker-substring-false-positive.md) 默认标记精确判定；
[083](../_archived/fixed_bugs/BUG-083-tab-heading-default-inconsistency.md) tab heading 读写同口径；
[084](../_archived/fixed_bugs/BUG-084-source-phase-bullet-mismatch.md) run phase 列表形态；
[085](../_archived/fixed_bugs/BUG-085-marker-provenance-order-duplicate.md) marker/provenance 反序；
[086](../_archived/fixed_bugs/BUG-086-config-feed-session-race.md) config reload 会话 epoch；
[087](../_archived/fixed_bugs/BUG-087-status-feed-session-stale.md) status 切会话清投影；
[088](../_archived/fixed_bugs/BUG-088-config-library-1000-line-truncation.md) 库读分页；
[089](../_archived/fixed_bugs/BUG-089-list-runs-partial-unreadable.md) listRuns 缺口；
[090](../_archived/fixed_bugs/BUG-090-bundle-bind-content-false-positive.md) 绑定只认路径字段；
[091](../_archived/fixed_bugs/BUG-091-turn-completed-any-turn.md) 末回合 completed；
[092](../_archived/fixed_bugs/BUG-092-defaults-double-read-failure-auto.md) defaults 不可达；
[093](../_archived/fixed_bugs/BUG-093-library-section-bullet-variants.md) 四字段变体；
[094](../_archived/fixed_bugs/BUG-094-hitl2-anchor-final-vs-present.md) HITL2 锚点 present；
[095](../_archived/fixed_bugs/BUG-095-boot-web-timer-leak.md) boot timer 清理；
[096](../_archived/fixed_bugs/BUG-096-hitl2-counts-as-kickoff.md) HITL2 非 kickoff；
[097](../_archived/fixed_bugs/BUG-097-method-library-lost-update.md) 库写锁；
[098](../_archived/fixed_bugs/BUG-098-method-library-non-atomic-write.md) 原子写；
[099](../_archived/fixed_bugs/BUG-099-run-source-list-error-as-empty.md) run source 读失败；
[100](../_archived/fixed_bugs/BUG-100-final-md-directory-as-delivered.md) final.md 文件谓词；
[101](../_archived/fixed_bugs/BUG-101-present-version-non-bundle.md) present 版本族；
[102](../_archived/fixed_bugs/BUG-102-plan-version-body-overrides-header.md) plan 头范围；
[103](../_archived/fixed_bugs/BUG-103-present-version-max-vs-last.md) 最后 present；
[104](../_archived/fixed_bugs/BUG-104-port-reclaim-kills-any-listener.md) 端口身份；
[105](../_archived/fixed_bugs/BUG-105-rerun-kind-suffix-match.md) rerun kind 边界；
[106](../_archived/fixed_bugs/BUG-106-sentinel-any-history.md) 哨兵当前回合；
[107](../_archived/fixed_bugs/BUG-107-defaults-pending-drop.md) defaults 写队列；
[108](../_archived/fixed_bugs/BUG-108-config-feed-interaction-state-stale.md) config 交互态复位；
[109](../_archived/fixed_bugs/BUG-109-run-source-delivered-dir-eligible.md) 回执 file 谓词；
[110](../_archived/fixed_bugs/BUG-110-run-source-symlink-escape.md) run symlink 边界；
[111](../_archived/fixed_bugs/BUG-111-method-library-symlink-write-escape.md) 库 symlink 拒绝；
[112](../_archived/fixed_bugs/BUG-112-plan-recorded-slash-false-positive.md) recorded 上下文。
）
（2026-11-12 交付门/回归链修整：
[BUG-074](../_archived/fixed_bugs/BUG-074-readiness-inline-quote-hijack.md) readiness 同行多判定取真实终局；
[BUG-075](../_archived/fixed_bugs/BUG-075-hitl2-pending-row-counted-as-decision.md) HITL2 未决行不再当成拍板 + 最新 ask 见证；
[BUG-076](../_archived/fixed_bugs/BUG-076-schema-scan-whitelist-missing-protocol-artifacts.md) schema-scan 白名单补协议/复核/wave 新件；
[BUG-077](../_archived/fixed_bugs/BUG-077-protocol-audit-write-reference-error.md) protocol-audit `--write` 补 import；
[BUG-078](../_archived/fixed_bugs/BUG-078-portable-bundle-path-relative-escape.md) portableBundlePath 相对 `..` 逃逸拒绝；
[BUG-079](../_archived/fixed_bugs/BUG-079-user-env-smoke-dead-import-seed-core.md) user-env.entry 死 import 复活。
）
（2026-11-11 同批协议审计 / 收活契约 fail-loud 收口，去向 = [Note](../../notes/implemented/2026-11-11-protocol-audit-presence-and-depth-codec.md)：
[BUG-048](../_archived/fixed_bugs/BUG-048-protocol-depth-projection-first-pair-only.md) 深度集合单一编解码（deep 生成器 / 单值 / 非连续不再假红或漏检）；
[BUG-049](../_archived/fixed_bugs/BUG-049-protocol-projection-lines-absent-silent.md) §Protocol 三行缺席改 warning；
[BUG-050](../_archived/fixed_bugs/BUG-050-strategy-channel-absent-and-workflow-null-workers.md) 通道缺席 warning + workflow 无 Wave 拓扑 red；
[BUG-052](../_archived/fixed_bugs/BUG-052-protocol-epoch-day-granularity-retro-red.md) 断代认交付回执时刻，同日早场不再追溯；
[BUG-053](../_archived/fixed_bugs/BUG-053-plan-header-claims-first-match-anywhere.md) plan 头抽 `headerBlockOf`，正文提及不冒充；
[BUG-054](../_archived/fixed_bugs/BUG-054-cells-cap-count-only-canonical-bullet.md) lens 行单一解析（`-`/`*`/`+`/缩进/大小写），读不出 = red；
[BUG-056](../_archived/fixed_bugs/BUG-056-protocol-projection-unreadable-values-silent.md) §Protocol 数值/分节读不出 = red；投入数字按上限语义；
[BUG-057](../_archived/fixed_bugs/BUG-057-acceptance-check-exit-code-contradicts-verdict-contract.md) acceptance-check 退出码收回全仓 verdict 契约（FAIL/UNVERIFIED/零判据 = 1）；
[BUG-058](../_archived/fixed_bugs/BUG-058-plan-cycle-has-no-mechanical-check.md) 有环 plan → red `plan-cycle`，`planIssuesOf` 增 cycle 并抑制误导性 wave-prefix；
[BUG-060](../_archived/fixed_bugs/BUG-060-host-health-freemem-macos-underreports.md) host-health 改平台可用内存口径（macOS vm_stat / Linux MemAvailable），client-load 不再常态 NOT-RUN；
[BUG-062](../_archived/fixed_bugs/BUG-062-acceptance-manual-evidence-overwritten-by-regeneration.md) `acceptance.md` 的人工走查节在重跑验收 / `--repair` 时保留，不再静默丢失；
[BUG-063](../_archived/fixed_bugs/BUG-063-web-ui-nav-chrome-copy-english-only.md) web-ui-nav 的 sidebar/preview chrome 常量改双语，cdp-probe 展开未命中显式报错；
[BUG-055](../_archived/fixed_bugs/BUG-055-mixed-language-ui-half-i18n.md) 驾驶舱 UI 全部走 locale（521 键、组件 + 数据面 fold；en 零 CJK，源码 CJK 扫描守卫）；
[BUG-051](../_archived/fixed_bugs/BUG-051-replay-smoke-panerows-undeclared.md) 回放 C3/C5 的 `paneRows` 崩溃修复；真机 C0–C5 全 PASS（B·persona 快照红另计）；
[BUG-059](../_archived/fixed_bugs/BUG-059-replay-locator-hardcodes-zh-locale-owned-labels.md) 回放浏览器钉 zh-CN + 双语定位；lead C2/C3/C5 PASS；
[BUG-061](../_archived/fixed_bugs/BUG-061-replay-c2-guide-capsule-missing-after-locale-pin.md) 右栏展开/收起 chrome 双语 + C2 结构化诊断；
[BUG-065](../_archived/fixed_bugs/BUG-065-run-driver-cache-key-omits-dev-overlay.md) run-driver 缓存键纳入 dev 外壳指纹。）
（BUG-047 已于 2026-11-11 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-047-method-library-selection-invisible.md)——`var()` 后拼十六进制 alpha 的声明被浏览器整条丢弃 → `LibraryRow` + `color-mix` 选中态（tint/边线/accent bar/名字加重）+ 焦点环分离 + 源码扫描契约测试；真机隔离档 computed 值与截图双证）
（BUG-046 已于 2026-11-10 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-046-readiness-parenthetical-unparsed.md)——`## readiness（终局）` 短括号标签窄放宽；红先 2 例 → 18/18，全量 1107/1107 + verify 绿；未动手册/snapshot）
（2026-10-23 宪章复核发现的历史偏差按 **grandfather** 处理：只读证据、不建卡、不修、不追改；它们只用于约束新 run 的契约，记录 = [复核证据](../_archived/research/run-bundle-charter/2026-10-23-issue-review-verification.md)。）
（BUG-045 已于 2026-10-28 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-045-client-load-graph-assert-flakes-on-stream-drop.md)——图面区分「读失败」与「未绑定」+ 有界重试，冒烟改轮询并自解释；
BUG-044 已于 2026-10-27 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-044-delivery-receipts-leak-absolute-paths.md)——present 归一化 + 写前/写后校验 + `--repair`；
BUG-043 已于 2026-10-23 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-043-graph-unmapped-task-shows-unexecuted.md)——图谱映射五态 + 覆盖率，证据 = `graph-model` 单测 + client-load 覆盖率行断言。）

更早归档与两池索引 = [暂停](../_archived/suspended_bugs/README.md) · [已修](../_archived/fixed_bugs/README.md)；
新卡编号 = 活跃 ∪ 全部归档池取最大号 + 1，规则唯一权威 = 本页。

## 缺陷通道（卡怎么走到已修）

1. **建卡（排查中）**：症状、复现、根因**假设**、严重级、牵出的失败类。根因是假设，直到证据确认（session bundle、git 历史、对照实验）；被证伪的假设连撤回记录一起留在卡上——撤回是证据，不是噪声。
2. **修复就绪**：根因有证据确认 + 修法选定 + `## 修复判据` 写就。该翻转是入口票（正本 = [入口](../README.md)）**也是修复授权**（用户裁定 2026-10-12）：P1/P2 修理型修复凭卡自授权落地，当轮交付记录即落地凭证；P0 缺陷，或修复触及入口链、门禁与验收合同、文档合同、pack 公共行为或已记录决定（D 号）的，不自授权——卡转 `等人拍板`，修复按用户指示或随 issue RFC 落地。`## 修复判据` 可写明验证搭车的工作（复跑、他卡落地）——搭车依赖写进该段，不用即兴散文。
3. **修复落地**：修复已进树；`## 修复判据`、验收证据与审查尚未过——这是 bug 的审查/证据位，不新增 `待审`。卡内 `## 修复落地` 必须写 `改动` / `红证` / `绿证`（红 = 旧实现/注入回归的实跑失败片段，绿 = 同一判据修后通过；红证须可重放（`node --test` / `pnpm verify` / `gates.e2e`）或 `改动` 含测试/门禁资产）；翻 `修复落地` 即由 `backlog-liveness` 检查，归档时 `改动` 与代码/测试变更同暂存集（`staged-change-pairing`；决定理由 = [红绿证据 Note](../../notes/implemented/2026-11-14-bug-fix-red-green-evidence.md)）。
4. **已修**：修复判据满足、证据已记录、审查或跳过已记——状态行追加结论，`git mv` 进 fixed 池，同次变更。修复后回归 = 引用旧卡的新卡，不重开已修卡。

## 状态生命周期

frontmatter `status` 是当前阶段的唯一家；状态行 `状态：` 记号镜像它并拥有历史。沉默不翻转；每次翻转带守卫与记录；退出值（已修/待修）只在归档的同次变更里翻转；已修永不重开（回归 = 引用旧卡的新卡）。法则正本 = [入口](../README.md)。

| 从 | 守卫 | 到 | 谁 |
|---|---|---|---|
| （建卡） | 分流后——决定不当场修才建档 | 排查中 | agent |
| 排查中 | 根因有证据 + 修法选定 + `## 修复判据` 写就；P1/P2 修理型 | 修复就绪 | agent |
| 排查中 | 同上就绪，但 P0 或修复触及入口链/门禁与验收合同/文档合同/pack 公共行为/已记录决定 | 等人拍板 | agent |
| 修复就绪 | 修复进树 | 修复落地 | agent |
| 修复落地 | 修复判据满足、证据已记录、审查或跳过已记 | 已修（同次变更归档） | agent |
| 排查中/修复就绪/修复落地 | 下一步是用户选择 | 等人拍板 | agent |
| 等人拍板 | 用户的明确答复 | 等答前状态，或退出 | 仅用户 |
| 修复就绪/修复落地 | 根因或修法被证伪（验收失败/新证据）——撤回记录留卡 | 排查中（回退） | agent |
| 任意活跃值 | 用户叫停、无判断 | 待修（归档） | 仅用户 |
| 待修 | 用户明确的复活决定 | 排查中 | 仅用户 |
| 已修 | 永不重开——回归 = 引用旧卡的新卡 | — | — |

## frontmatter

文件以 `---` 开头，字段按下面顺序，`status` 在首位：

```yaml
---
status: 排查中
severity: P1
opened: YYYY-MM-DD
---
```

| 字段 | 值 |
|---|---|
| `status` | `排查中`（根因待证）· `修复就绪`（入口票 + P1/P2 授权）· `修复落地`（修复进树，判据/证据/审查未过）· `等人拍板`（下一步是用户选择） |
| `severity` | `P0`（阻断）/ `P1`（重要）/ `P2`（次要）——分诊标签**也是通道边界**：P0 永不自授权 |
| `opened` | 发现日 `YYYY-MM-DD`，与正文一致 |

离开本目录只改 `status`：修好 → `已修`（fixed 池）；查清未修 → `待修`（suspended 池）。`severity` 与 `opened` 不动；正文长说明不复制进 frontmatter。`修复就绪/修复落地` 的 `## 修复判据` 必须非空（`pnpm verify` 检查）；初始 frontmatter 模板 = 本页 `## 卡片模板`。

## 卡片模板

```markdown
---
status: 排查中
severity: P1
opened: YYYY-MM-DD
---

# BUG-<NNN>：<一句话标题>

> 严重级别：<P0｜P1｜P2>｜发现：YYYY-MM-DD｜状态：排查中

## 症状
观察到什么错误行为（现场、报错、复现路径）。

## 复现
最小复现步骤 / 命令 / 输入。

## 根因（假设）
机制层原因——越到契约/结构层越好，避免只描述表象；证据确认前是假设，证伪的假设连撤回记录留在卡上。

## 牵出的失败类
这个 bug 是哪类失败的探针，是否值得横切排查（契约探针纪律的落点）。
**必答**：本卡是同机制第几次修复？第 2 次起写「类修（链接类卡）」或「实例修 + 为什么」；只写「值得横切排查」不算。

## 修复判据
做成什么样算修好（可写明验证搭车的工作）；翻到修复就绪前写就且非空（门禁检查）。产品可接受性与业务验收归用户；严重级分诊、根因与修复证据归 agent（P0/触面例外由用户拍板）。

## 修复关联
落地方式（修复 commit / 拆窄 follow-up / 搁置池行 / 上游 seam），修完归档时补。若修复承载持久决定理由，按 [结论去向](../methods/issue-to-note.md) 记 `去向`；机械或局部修复记 `none`。

## 修复落地

- **改动**：`<仓内路径>`（至少一个；优先列代码 + 对应测试/门禁资产，如 `tests/…` 或 `scripts/lib/gates-cases.mjs`）
- **红证**：`<命令>`（旧实现/注入回归的实跑失败片段，如 `not ok` / `exit 2` / `FAIL`）
- **绿证**：`<命令>`（同一判据修后通过，如 `ok` / `exit 0` / `PASS`）
- **反证/边界**：注入形态、未跑项与原因（可空，不空更佳）
```

**状态行追写法**（状态行镜像 frontmatter；位置只表达粗段：活跃区/归档池）：卡在本目录时 `状态：` 记号镜像 frontmatter（`pnpm verify` 互查），随翻转更新；判断、去向与审查**追加**在记号之后，既有记录不删除——翻到 `已修` 时形如 `状态：已修 — <结论，去向：implemented — Note / none — 机械修复，审查：agent/跳过 — 理由>（YYYY-MM-DD）`；进暂停池**不加任何判断**（没有判断落地）。

**边界**：当场修掉的缺陷不建档（轮次 Note 照旧）；建档 = 发现时决定不当场修。把每个 bug 当**契约探针**——一个具体缺陷往往牵出一类失败，顺藤摸瓜值得横切排查。
（BUG-073 已于 2026-11-12 修复归档到 [fixed 池](../_archived/fixed_bugs/BUG-073-run-lock-creation-window-race.md)——原子建锁 + 创建窗口宽限 + 写后复核 + 释放守卫；client-load 迁移共享锁；`run-lock.test` 4 例。）
