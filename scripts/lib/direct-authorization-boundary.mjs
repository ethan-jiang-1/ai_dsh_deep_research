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
  if (/(?:必须|(?<!不)需要).{0,8}(?:重复|再次)请批/.test(text)) return false;
  const authorizedScope = /授权/.test(text) && /(?:请求|范围)/.test(text) && /(?:执行|交付)/.test(text);
  const noExtraApproval = /(?:不需|无需|不必|不需要|不要求).{0,8}(?:重复请批|再次请批|请批)/.test(text)
    || /已有授权.{0,12}不重复请批/.test(text);
  return authorizedScope && noExtraApproval;
};
