export type MethodLibraryReadResult =
  | { readonly kind: 'ok'; readonly text: string }
  | { readonly kind: 'absent' }
  | { readonly kind: 'error'; readonly detail: string }

/** Join ordered Workspace Files pages only after an EOF response confirms completeness. */
export function joinMethodLibraryPages(pages: readonly { readonly text: string; readonly lines: number; readonly eof: boolean }[]): string | null {
  const chunks: string[] = []
  for (const page of pages) {
    if (!Number.isSafeInteger(page.lines) || page.lines < 0 || (page.lines === 0 && !page.eof)) return null
    chunks.push(page.text)
    if (page.eof) return chunks.join('\n')
  }
  return null
}
