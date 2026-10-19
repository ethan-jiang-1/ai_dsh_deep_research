// direct-authorization-boundary — entry-chain-probe 的词面判据：按授权范围直接执行、无需
// 重复请批的边界判定。消费 = scripts/probe/entry-chain-probe.mjs 与 tests/entry-chain-probe.test；
// 词面口径与放宽实录 = notes/implemented/2026-10-10-entry-chain-probe-lexical-recall.md。
const normalize = (text) => text.replace(/[，。；、———()（）\s]/g, '');

export const rfcBoundaryPasses = (answer) => {
  const text = normalize(answer);
  // 词面层 = 留档语义复核的召回预过滤（职责是召回语义正确的形态，不是规定措辞）。
  // 2026-10-10 真模型双跑实录与放宽依据 = notes/implemented/2026-10-10-entry-chain-probe-lexical-recall.md。
  // ①限定语接受 只有/仅当/仅在/只在/才——「仅在/只在…时…建立」含长括注展开是模型自然措辞；
  //   显式评审的紧邻否定（无需/无须/不用/不必/不需/不需要/不要求）用负向环视设防（2026-10-10
  //   对抗自审实测假阳性）；**残余边界**：后置否定（「显式评审并非必需」）与自相矛盾混合回答
  //   词面层不设防，归留档人工复核——词面预过滤 + 语义留档的分工边界。
  // ②普遍前置的拒绝接受显式短语（不是…普遍前置）或对问句的直接否定起句（「不是——」）。
  const hasException = /持久决定.{0,24}(?<!无需|无须|不用|不必|不需|不需要|不要求)显式评审/.test(text) && /(?:只有|仅当|仅在|只在|才).{0,60}建立/.test(text);
  const rejectsUniversal = /(?:不是|并非|不作为|非).{0,16}(?:普遍前置|一般实施工作|实施前置门)/.test(text)
    || /^(?:不是|并非)/.test(text);
  return hasException && rejectsUniversal;
};

export const directAuthorizationBoundaryPasses = (answer) => {
  const text = normalize(answer);
  // 动作面的同类表述：请批 / 请求批准 / 请示 / 申请批准 都是同一件事的模型自然措辞。
  // 2026-10-19 真模型两次实录：①「不用逐次重复请批」②「不需要重复请求批准」——两次都判红，
  // 因为首版只认「请批」这一个词形。词面层的职责是**召回语义正确的形态，不是规定措辞**
  // （见本文件顶部）；漏词 = 假红，会让人误以为模型不懂授权边界。
  const APPROVAL = '请批|请求批准|申请批准|请示|（?:请求|申请|报请|提交|等候）批准';
  if (new RegExp(`(?:必须|(?<!不)需要).{0,8}(?:重复|再次)(?:${APPROVAL})`).test(text)) return false;
  // 授权来源不止「授权」一词：仓内合同把**用户直派**本身就当授权（D11「用户直派就是当轮授权」），
  // 而模型自然会说「用户本轮请求划定的范围」——不含「授权」二字。首版只认 /授权/，把这条最核心
  // 的形态判成红（2026-10-19 真模型实录第三次复现）。故认「授权」或「用户请求/直派」任一。
  const SCOPE_SOURCE = '授权|用户(?:本轮|明确)?(?:的)?(?:请求|直派|指示)|本轮请求|既定范围|划定.{0,4}范围';
  const authorizedScope = new RegExp(`(?:${SCOPE_SOURCE})`).test(text)
    && /(?:请求|范围)/.test(text) && /(?:执行|交付)/.test(text);
  // 否定词清单含「不用」：2026-10-19 真模型实测模型答「不用逐次重复请批」，语义完全正确，但
  // 清单当时只列 不需/无需/不必/不需要/不要求，独漏「不用」。补词，不改结构。
  const noExtraApproval = new RegExp(`(?:不需|无需|不必|不用|不需要|不要求).{0,8}(?:重复|再次)?(?:${APPROVAL})`).test(text)
    || new RegExp(`已有授权.{0,12}(?:不|无需|不用)(?:重复|再次)?(?:${APPROVAL})`).test(text);
  return authorizedScope && noExtraApproval;
};
