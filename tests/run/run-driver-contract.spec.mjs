// run 通道驱动入口契约回归（用户指令 2026-10-19："驱动插件是最常用的命令，内化固定"）。
// 断言对象 = 仓库自控文件（keyless、纯 fs、零子进程、零网络——layering 守卫范围）。
//
// 为什么要有这条：启动通道的三步序（boot → 验浏览器面 → 交 URL）此前只活在 guides/61 散文里，
// 每次启动都要现场拼命令（端口/token 从 web.log 掏、探针用哪面、什么算绿全靠记性）——"承诺了
// 动作却没有工具 = 动作不可复跑"（dev/run-kickoff.mjs 头注同款教训）。`dev/run-driver.mjs` 是
// 该序的可复跑入口；本测试钉住它的**行为形状**（verdict 契约、token 来源、URL 抽取、端口回退），
// 不重跑真浏览器（那是 entry 自身的活）。
//
// 立红记录：2026-10-19 首跑——run-driver.mjs 与 dev/README 索引行均缺席即红；实现后转绿。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// 判据住 scripts/lib/run-channel.mjs（壳 = dev/run-driver.mjs 含 spawn，测试不许进其 import
// 闭包——layering 守卫；2026-10-19 实测红后按分层修正）
import { guiUrlFromWebLog, probeFailureVerdict, runDriverVerdict } from '../../scripts/lib/run-channel.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('入口在位：dev/run-driver.mjs + dev/README 索引行（navigability 资产门同期）', () => {
  assert.ok(existsSync(join(ROOT, 'dev/run-driver.mjs')), 'dev/run-driver.mjs 缺席——启动驱动入口');
  assert.ok(read('dev/README.md').includes('run-driver.mjs'), 'dev/README 未点名 run-driver.mjs');
});

test('URL 抽取：只认最后一条横幅（web.log 每次 boot 截断写，退化形态 fail-loud）', () => {
  const real = '[llm-socket-isolation] 预载已生效 pid=56754\n'
    + 'dsh web: http://127.0.0.1:3084/?token=x3tG2xyRrPcMcE0Rgm9PTuaztBg1uAI-vGPXBirf3n8\n';
  assert.equal(guiUrlFromWebLog(real), 'http://127.0.0.1:3084/?token=x3tG2xyRrPcMcE0Rgm9PTuaztBg1uAI-vGPXBirf3n8');
  // 多横幅（人工 append 过）→ 取最后一条：旧 token 作废，用旧的必 401
  const two = real + 'dsh web: http://127.0.0.1:3099/?token=NEWER\n';
  assert.equal(guiUrlFromWebLog(two), 'http://127.0.0.1:3099/?token=NEWER');
  // 退化形态：空文件 / 无横幅 / 无 token → null（调用方据此 fail-loud，不猜端口）
  assert.equal(guiUrlFromWebLog(''), null);
  assert.equal(guiUrlFromWebLog('boot 中…\n'), null);
  assert.equal(guiUrlFromWebLog('dsh web: http://127.0.0.1:3084/\n'), null);
});

test('探针崩溃：仍落 verdict（exit 1 + probeError），不把 latest 留成旧绿', () => {
  const crashed = probeFailureVerdict({ error: 'cdp exit 1', drift: { clean: true } });
  assert.equal(crashed.exit, 1);
  assert.equal(crashed.probeError, 'cdp exit 1');
  assert.equal(crashed.level, 'RED');
  assert.ok(crashed.checks.some((c) => !c.ok), '崩溃必须带失败检查，不能是空 verdict');
});

test('verdict 契约：exit 0=全绿 / 1=断言红 / 2=未跑；消息面出现即不绿', () => {
  const green = runDriverVerdict({
    probe: { booted: true, frameMounted: true, overlayCleared: true, statusPaneOpen: true, expectFaceHeld: true, consoleProblems: [], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(green.exit, 0);
  assert.equal(green.checks.length, 6);
  assert.equal(green.checks[0].id, 'channel-mirror', '镜像一致性是第一条硬检查（旧页面不能当当前代码的绿）');
  assert.equal(green.dataFace, 'unknown', '没取到 statusPaneText = 数据面未取证，不许当已绑定');
  const noExpect = runDriverVerdict({
    probe: { booted: true, frameMounted: true, overlayCleared: true, statusPaneOpen: true, consoleProblems: [], exceptions: [] },
    drift: { clean: true },
  });
  assert.equal(noExpect.exit, 0);
  assert.ok(!noExpect.checks.some((c) => c.id === 'expect-face'), '未传 --expect-face 时不做重言式断言（检查项不出现，而不是默认绿）');

  // 数据面单列：新会话未绑定是正常态（默认仍绿），但 verdict 必须写明；--require-data 才升硬检查。
  const base = { booted: true, frameMounted: true, overlayCleared: true, statusPaneOpen: true, expectFaceHeld: true, consoleProblems: [], exceptions: [] };
  const unbound = runDriverVerdict({ probe: { ...base, statusPaneText: '本会话尚未绑定 run bundle' }, expectFace: '研究状态', drift: { clean: true } });
  assert.equal(unbound.exit, 0, '未绑定不拦新会话的 up');
  assert.equal(unbound.dataFace, 'unbound');
  assert.ok(unbound.reason.includes('未绑定'), '呈交原因要显式写数据面');
  const bound = runDriverVerdict({ probe: { ...base, statusPaneText: '流程轨道七步 证据 10 已交付' }, expectFace: '研究状态', drift: { clean: true } });
  assert.equal(bound.dataFace, 'bound');
  const requiredUnbound = runDriverVerdict({ probe: { ...base, statusPaneText: '本会话尚未绑定 run bundle' }, expectFace: '研究状态', drift: { clean: true }, requireData: true });
  assert.equal(requiredUnbound.exit, 1, '--require-data 时未绑定必须红');
  assert.ok(requiredUnbound.reason.includes('data-face'), '红因要点名 data-face');
  assert.equal(requiredUnbound.checks.length, 7);
  const requiredBound = runDriverVerdict({ probe: { ...base, statusPaneText: '流程轨道七步 证据 10' }, expectFace: '研究状态', drift: { clean: true }, requireData: true });
  assert.equal(requiredBound.exit, 0);
  assert.equal(requiredBound.dataFace, 'bound');
  const markerBound = runDriverVerdict({ probe: { ...base, statusPaneText: '', dataFaceMarker: 'bound' }, expectFace: '研究状态', drift: { clean: true }, requireData: true });
  assert.equal(markerBound.dataFace, 'bound');
  const markerError = runDriverVerdict({ probe: { ...base, statusPaneText: '证据 10 份', dataFaceMarker: 'error' }, expectFace: '研究状态', drift: { clean: true }, requireData: true });
  assert.equal(markerError.dataFace, 'unknown', '错误标记压过文本，不能靠“证据 10 份”假绿');
  assert.equal(markerError.exit, 1);
  const kickoffText = runDriverVerdict({ probe: { ...base, statusPaneText: '这场研究还没开始——立项对齐中，读到的是上一场 run 的上下文' }, expectFace: '研究状态', drift: { clean: true }, requireData: true });
  assert.equal(kickoffText.dataFace, 'unknown', 'kickoff 文案不含“未绑定”，旧负判会假绿');
  assert.equal(kickoffText.exit, 1);

  // 首屏遮罩没清场 → 红。"DOM 在位"不等于"人看得见"：探针的 JS 派发绕过 hit-testing，
  // 2026-10-27 实测 GREEN 同刻截图仍被 Preview Notice 盖住（见 cdp-probe 同名注释）。
  const overlayStuck = runDriverVerdict({
    probe: { booted: true, frameMounted: true, overlayPresent: true, overlayCleared: false, statusPaneOpen: true, expectFaceHeld: true, consoleProblems: [], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(overlayStuck.exit, 1);
  assert.ok(overlayStuck.reason.includes('overlay-clear'), '红因要点名 overlay-clear');

  // 老 probe 不报 overlayCleared（null）→ 不许当绿：未跑 ≠ 通过
  const overlayUnknown = runDriverVerdict({
    probe: { booted: true, frameMounted: true, statusPaneOpen: true, expectFaceHeld: true, consoleProblems: [], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(overlayUnknown.exit, 1);

  // expect-face 未命中 → 红（观察面页签缺席 = 插件没挂上）
  const noFace = runDriverVerdict({
    probe: { booted: true, frameMounted: true, statusPaneOpen: true, expectFaceHeld: false, consoleProblems: [], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(noFace.exit, 1);

  // 页签打不开 → 红（statusPaneOpen=false 时 expectFaceHeld 可能为 null——不许当绿）
  const noPane = runDriverVerdict({
    probe: { booted: true, frameMounted: true, statusPaneOpen: false, expectFaceHeld: null, consoleProblems: [], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(noPane.exit, 1);

  // console 错误 → 红（"boot 横幅只证宿主侧，观察面可能坏着"）
  const noisy = runDriverVerdict({
    probe: { booted: true, frameMounted: true, statusPaneOpen: true, expectFaceHeld: true, consoleProblems: ['x'], exceptions: [] },
    expectFace: '研究状态', drift: { clean: true },
  });
  assert.equal(noisy.exit, 1);

  // 镜像漂移 / 未取证 → 未跑，不是红也不是绿（2026-10-28 实测：通道 18:47 起、pack
  // client.js 02:50 重建，旧实现仍把旧页面判 GREEN——这是本条断言的具体事故形状）
  const drifted = runDriverVerdict({ probe: {}, expectFace: '研究状态', drift: { clean: false, detail: '漂移——lib/client.js 与镜像不一致' } });
  assert.equal(drifted.exit, 2);
  assert.equal(drifted.level, 'NOT-RUN');
  assert.ok(drifted.reason.includes('镜像'), '未跑原因要点名镜像');
  const unproven = runDriverVerdict({ probe: {}, expectFace: '研究状态' });
  assert.equal(unproven.exit, 2, '没取证镜像就不许给绿');
});

test('复用通道也过镜像门：run-driver 调 boot-run --drift-only，未取证不许绿', () => {
  const src = read('dev/run-driver.mjs');
  assert.ok(src.includes("'--drift-only'"), 'run-driver 复用通道时未调 boot-run --drift-only——旧页面会被判成当前绿');
  assert.ok(src.includes('mirrorDrift()'), 'run-driver 缺镜像取证函数');
  const boot = read('dev/boot-run.sh');
  assert.ok(boot.includes('--drift-only'), 'boot-run 缺只读镜像检查模式（--drift-only）');
  // 旧实现的两个空转点：composing 永远是 false；复用分支没有任何新鲜度取证
  assert.ok(!src.includes('composing'), 'verdict 仍有无人计算的 composing 参数（幻影检查）');
});

test('驱动入口不绕过漂移门：boot 必须经 dev/boot-run.sh，禁止直起 dsh --profile research', () => {
  const src = read('dev/run-driver.mjs');
  assert.ok(src.includes('boot-run.sh'), 'run-driver 未走 boot-run（绕过漂移检测、静默用旧镜像）');
  // 裸起 profile 只在 boot-run 内部合法；驱动入口自己的代码里不许出现
  assert.ok(!/--profile\s+['"]?research/.test(src.replace(/^.*boot-run\.sh.*$/gm, '')),
    'run-driver 直起 research profile——绕过漂移门（guides/61 §0.1）');
});

// 2026-10-20 审计 P0-1：README / 00-index / project-map / guides/61 各写第一条启动动作，
// 其中三处仍指 boot-run（前台起、不验浏览器面、不打印呈交块），与 00-index 的 run-driver
// 首动作分裂。这里钉"首动作一致"：不是禁止 boot-run（它是底层），而是禁止它出现在
// "用户问怎么启动"的第一条动作位上。
test('启动首动作一致：安装行 = 手册（CLI 建 profile + tarball 装包）；开发行 = run-driver', () => {
  const lineOf = (rel, needle) => {
    const line = read(rel).split('\n').find((l) => l.includes(needle));
    assert.ok(line !== undefined, `${rel} 找不到含「${needle}」的行——首动作位缺席`);
    return line;
  };
  // 安装用户：命令唯一 owner = 手册；README/00-index/project-map 只指手册 + 默认入口。开发通道：run-driver。
  assert.ok(lineOf('scripts/dist/product-manual.md', '--from-default-profile web').includes('dsh --profile deep-research'), '手册安装首动作不是 DSH profile 初始化');
  assert.ok(lineOf('README.md', '_dist/安装手册.md').includes('_dist/安装手册.md'), 'README 没有把安装步骤指向手册');
  // 开发入口（run-driver）住在 CONTRIBUTING；README 只留一行路由。
  assert.ok(lineOf('CONTRIBUTING.md', 'dev/run-driver.mjs up').includes('run-driver.mjs up'), 'CONTRIBUTING 开发入口缺席');
  const installRow = lineOf('docs/00-index.md', '（安装用户）');
  assert.ok(installRow.includes('安装手册'), '00-index 安装行没有把手册写成命令 owner');
  assert.ok(installRow.includes('file:'), '00-index 安装行没有把 tarball 写成当前装包入口');
  assert.ok(lineOf('docs/00-index.md', '启动一下').includes('run-driver.mjs up'), '00-index 开发行首动作不是 run-driver');
  const installMap = lineOf('docs/project-map.md', '| **启动安装形态（安装用户）** |');
  assert.ok(installMap.includes('安装手册'), 'project-map 安装行没有把手册写成命令 owner');
  assert.ok(installMap.includes('file:'), 'project-map 安装行没有把 tarball 写成当前装包入口');
  assert.ok(lineOf('docs/project-map.md', '| 启动一次研究（开发通道） |').includes('run-driver.mjs up'), 'project-map 开发行首动作不是 run-driver');
  assert.ok(lineOf('docs/guides/61-run-playbook.md', '- 启动：').includes('run-driver.mjs up'), 'guides/61 开发首动作不是 run-driver');
  // guides/61 §0 的"启动"行不得再以 boot-run 打头（否则同一页先说 boot-run、后说 run-driver）
  const guide = read('docs/guides/61-run-playbook.md');
  const runStart = guide.indexOf('## 0. 开跑');
  const section = guide.slice(runStart, guide.indexOf('\n## 1.', runStart));
  assert.ok(!/\n- 启动：`bash dev\/boot-run\.sh`/.test(section),
    'guides/61 §0 仍把 boot-run 写成启动首动作——应先 run-driver，boot-run 只作底层说明');
});
