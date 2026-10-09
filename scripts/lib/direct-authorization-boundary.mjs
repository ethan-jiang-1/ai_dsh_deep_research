export const directAuthorizationBoundaryPasses = (answer) => {
  const clauses = answer.split(/[，。；、]/).map((part) => part.trim());
  if (clauses.some((part) => /(并非|并不|不是)\s*(?:说)?\s*(?:不必|无需|不需要|不要求)/.test(part))) return false;
  const noQueue = clauses.some((part) => /(?:无需|不必|不需要|不要求).{0,8}(?:先)?(?:排队|入队)/.test(part));
  const noRfc = clauses.some((part) => /(?:无需|不必|不需要|不要求).{0,8}(?:先)?(?:建|创建|提交)?\s*RFC/.test(part));
  return noQueue && noRfc;
};
