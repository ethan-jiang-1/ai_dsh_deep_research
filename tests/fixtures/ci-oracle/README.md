# ci-oracle/ · CI 执行面的外部 oracle

> 组宪章：`oracle.json` 由 [tools/record-ci-oracle.mjs](../../../tools/record-ci-oracle.mjs) 录制：
> 真 YAML 解析（workspace 传递依赖 `yaml@2`）+ 真 bash 执行 `run:` + **失败 stub node**。
> 消费 = [ci-workflow-oracle.test.mjs](../../checks/ci-workflow-oracle.test.mjs)。

## 真值怎么来

1. **YAML 结构**：真解析器，不是行/缩进启发式（覆盖 `on:` flow mapping、注释、引号表达式）。
2. **shell 语义**：把 `run:` 交给 bash；PATH 上的 `node` 是 stub——记录被调用的 smoke，并 `exit 1`。
   step 退出非 0 = 该 smoke 的失败会让 CI 红（证据）；step 退出 0 = 失败被 `|| true` / `&` /
   `continue-on-error` 吞掉（不算）。“失败是否传播”由 bash 回答，不是手写规则。
3. **明写政策**：只认 `all-checks-passed.needs` 的 job；`if` 只认 true/always()/success()/空；
   `continue-on-error: true` 不计。政策在录制器里，注释可审。

## 冻结

- 禁手改；重录 = `node tools/record-ci-oracle.mjs`（`--check` 只比对，non-zero = 有分歧）。
- 录制器是 dev-only（yaml 是传递依赖）；测试与 CI 只读 JSON。
- 改 oracle 应预期测试变红；先红后绿，不许放宽断言。
