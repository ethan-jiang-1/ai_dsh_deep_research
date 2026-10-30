/** Return the lowercase SHA-256 digest used to bind a save command to its entry text. */
export async function methodLibraryEntryHash(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
