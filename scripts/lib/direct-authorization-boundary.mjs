export const directAuthorizationBoundaryPasses = (answer) => {
  const clauses = answer.split(/[，。；、]/).map((part) => part.trim());
  if (clauses.some((part) => /(并非|并不|不是)\s*(?:说)?\s*(?:可以|无需|不必|不需要|不要求)/.test(part))) return false;
  const authorized = clauses.some((part) => /(?:用户|本轮)?(?:已)?授权.{0,16}(?:按请求范围执行|可以开始|直接执行)/.test(part));
  const noExtraApproval = clauses.some((part) => /(?:无需|不必|不需要|不要求).{0,8}(?:重复请批|再次请批|额外授权)/.test(part));
  const rejectsUniversalRfc = clauses.some((part) => /(?:所有|每项|任何).{0,8}(?:工作|实施).{0,8}(?:必须|都要).{0,8}(?:先建|建立|创建).{0,4}RFC/.test(part));
  return authorized && noExtraApproval && !rejectsUniversalRfc;
};
