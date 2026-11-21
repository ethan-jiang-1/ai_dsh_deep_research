# 预防性质量首批：启动所有权与有限准入

> 状态：implemented

## 决定

1. 开发启动只有一个 supervisor 拥有准备、启动锁与服务生命周期；前台 `boot-run.sh` 与 `run-driver` 冷启动都委托它。锁按 canonical home/state 保护资源，在准备前取得并覆盖服务组生命周期；不同 profile/state 不绕过同 home 锁。没有 stale/PID/TTL 在线接管，owner 缺失或损坏也拒绝；异常或无法证明进程组静默时保留锁，离线核实后恢复。
2. run-driver 与 supervisor 通过本代私有 IPC READY/交接确认建立后台启动成功。交接前取消或断连须停止启动并收束进程；交接后服务独立于 driver。停止以 TERM 请求 supervisor 清理，等待相关子进程静默后才释放锁。
3. `--drift-only` 不取得服务锁，可与服务并发；它不是无写操作：允许写 npm cache，并以临时文件加 rename 原子发布可丢弃的清单缓存。
4. 对有限语义变更，在既有开发环验收记录中核对旧性质、实际入口/消费者、正常与失败/取消结果及证据；交付自审对照当前 diff，不以登记表、分类或红配方的存在代替真实执行证据。探索仍用于发现，不作为同一已声明性质每轮重复首检的替代保障。
5. 真进程启动验收为影响触发的 dev-only，不进入默认回归或 nightly。保留唯一真入口 runner，日常低层性质进入 keyless 测试；不扩大全仓分类器、常驻总账或慢检查频率。

此决定部分取代 [低置信区第 8 轮](2026-11-18-low-confidence-30.md)关于 BUG-309/310 的启动互斥实现与验证口径；旧篇保留当时决定及证据，现行启动所有权见本篇。

## 输掉的方案

- 继续让两个入口各自持锁：锁的资源键、释放时机和生命周期会分叉；改为两个入口委托同一 supervisor。
- 按锁龄、PID 存活或 TTL 自动回收：不能证明原服务组已静默；残留交给离线核实，不在线接管。
- 用共享 helper 的单测证明两个真实入口都参与：helper 不证明委托、服务生命周期或取消收束；这些交由真进程 runner。
- 把 `--drift-only` 称作只读：它仍维护目录/cache/原子清单；只声明不持服务锁、不改活 profile。
- 把启动入口检查加入默认全量或 nightly：nightly 已有预算边界，改为启动 owner/锁变化时按影响触发 dev-only。
- 以 A4 两份案例的结果证明准入规则有效：案例标签泄露，且准入 guide/skill 未提供，实验无法证明规则效力；保留失败与限制，不刷样本、不改 expected。

## 实际跑过的验证

- 旧低层实现红：`live-owner.red.out` 的旧 TTL 性质测试 exit 1（活 owner 超龄仍被接管）；`release-world.red.out` 的旧 release 世界状态测试 exit 1（删除后来 owner 的锁目录）。旧 release 的历史观察只作为真实文件系统状态判断，不以返回值代替。
- 新低层性质：`start-lock.green.out`，`tests/checks/channel/start-lock.test.mjs`，5 项通过、fail 0。覆盖互斥与正常释放、活 owner 超龄不失权、重复旧 release 不伤新 owner、缺失/损坏/死亡 owner 拒绝在线接管、owner 写入失败和未知目录内容不被递归清理。
- 旧集成对照：`focused-integration.out` 来自变更前调用面，profile-guard 与 run-driver 契约各有静态形状断言失配（共 3 项 fail）；这是 wrapper 重构后的旧静态测试不匹配，不是产品行为红证，也不代表本次实现后的测试结果。
- 真入口变异负控：早期 `bypass-wrapper.out` 与 `DJhmFY` 在 `--mutate=bypass-wrapper` 下 exit 1；另 `CNezLA` 在 `--mutate=drop-home-lock` 下 exit 1（同 home/不同 state 未拒绝，实际 23、期望 2）。wrapper 负控，预期是由断言发现错误拒绝码（实际 1，预期 busy=2）；这是有效的负控红，证明变异被目标断言抓住。修正后的正向 runner `runtime/smoke-workspace/channel-start-e2e-h6jRC5/result.json` exit 0，12 项通过：direct→driver、drift/reuse、前台 TERM、driver→direct handoff、共享 home、独立资源、后台停止诊断、启动失败、driver TERM 取消、body 提前退出/继承 pipe 收束、caller-relative paths、handoff ACK 后 driver TERM（driver exit 143）。该 fixture adapter 证据不证明 DSH/GUI/model 行为。最终版负控尝试 `bypass-wrapper.final.out` 因 `ps` 观察被沙箱 EPERM 阻断，0 checks、exit 2（NOT-RUN）；旧 exit 1 红证仍有效，不把未运行写成通过。
- A4：封存案例哈希与两份输出、逐项判读见[评测结果](../../_backlog/_archived/research/preventive-quality/2026-11-20-admission-results.md)。A 按原封存 expected 失败；B 的静态等价/免专项资产判据符合对照，但标签泄露。受测者未获准读准入 guide/skill，实验不证明规则有效，也不证明规则无效；未补样本、未改 expected。
- 最终机械检查：`runtime/smoke-workspace/preventive-quality/final-test.out` 中 `pnpm test:spec && pnpm test:checks` exit 0（1423 spec + 265 checks，0 fail、0 skip）；`final-verify.out` 中 `pnpm verify` 全绿 exit 0。父级记录 dev-parity 9 项注入 exit 0，增量 review `547fac7b` 修复原 3 个 blocker 后无剩余 blocker。
- source-only 工作树未包含发布制品，L2 未跑；最终 `bypass-wrapper.final.out` 因 `ps` 被沙箱 EPERM 阻断，exit 2 / 0 checks（NOT-RUN）。早期有效负控红仍保留，但最终版本未复跑。A4 未通过，首批 A+B 不称整体完成，亦无用户业务验收。

## 判据形状

- 启动锁权威状态是实际 lock 目录及本次唯一 owner 文件；活 owner 不因经过时间失权，未知或无效 owner 不授权接管；release 只移除本次 owner，且不递归删除其他状态。反证包括旧实现活 owner 超龄回收、旧 release 删除新 owner 的磁盘状态。
- 真实入口性质由隔离资源根下的真进程竞争、检查/复用、失败/取消及外部进程静默判定；任何一个公开入口绕过 supervisor 都须被拒。当前触发频率与 runner 身份见下节，不以低层 helper 通过推定真入口通过。
- A4 的权威输入为封存案例和预先固定 expected；标签泄露、未提供规则或限制越过案例范围时，不能外推规则效果。此轮 A4 结果维持失败，不以改 expected 或增加样本消除失败。

## 环境状态与残余风险

- 一次性工时来自本 session 多轮实施与错误诊断，无法精确计量，不编造时数。启动锁默认回归用例由 1→5；启动协议由两套收敛为一个 supervisor；真进程 runner 为一个 12-case 的 dev-only 检查。
- 删除 driver 与 shell 重复锁、pgrep 检查和旧日志轮询；新增代码净行较大，不能声称净 LOC 减少。收益口径是移除重复调用/释放义务及集中生命周期所有权，不按 BUG 数量或代码行声称业务收益。
- A4 失败意味着有限准入的实际识别效果尚未证明；当前结果不得用于用户业务验收。外部 DSH/GUI/模型未因该 runner 执行。
- 12 项父级真进程正向回归、最终 verify/test、9 项 dev-parity 注入与增量 review 均已有结果，见验证节。最终版 bypass-wrapper 负控未跑；A4 仍失败，整体与用户业务验收未完成。
