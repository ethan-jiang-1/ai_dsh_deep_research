const normalize = (text) => text.replace(/[，。；、———()（）\s]/g, '');

export const rfcBoundaryPasses = (answer) => {
  const text = normalize(answer);
  const hasException = /持久决定.{0,24}显式评审/.test(text) && /(?:只有|仅当|才.{0,16}建立)/.test(text);
  const rejectsUniversal = /(?:不是|并非|不作为|非).{0,16}(?:普遍前置|一般实施工作|实施前置门)/.test(text);
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
