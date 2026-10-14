export interface Token {
  /** Original text as typed (trailing . / ! stripped). */
  raw: string
  /** Lowercased, used for matching. */
  text: string
}

export function tokenize(input: string): Token[] {
  return input
    .split(/\s+/)
    .map((w) => w.replace(/[.!]+$/, ''))
    .filter((w) => w.length > 0)
    .map((raw) => ({ raw, text: raw.toLowerCase() }))
}

const FALLBACKS: [string, string][] = [
  ['ae', 'ä'],
  ['oe', 'ö'],
  ['ue', 'ü'],
  ['ss', 'ß'],
]

/**
 * Spellings to try for a token, as typed first. The rest are the umlaut
 * fallbacks: every non-empty subset of {ae->ä, oe->ö, ue->ü, ss->ß} applied
 * globally. Subsets (not all-at-once) so "Schluessel" -> "schlüssel" and not
 * "schlüßel". Callers only use these when the typed form matches nothing, so
 * "Feuer" is never turned into "feür".
 */
export function spellings(text: string): string[] {
  const out = [text]
  for (let mask = 1; mask < 1 << FALLBACKS.length; mask++) {
    let s = text
    FALLBACKS.forEach(([from, to], i) => {
      if (mask & (1 << i)) s = s.split(from).join(to)
    })
    if (!out.includes(s)) out.push(s)
  }
  return out
}

/** First non-undefined result of `find` over the token's spellings (as typed first). */
export function matchToken<T>(token: Token, find: (word: string) => T | undefined): T | undefined {
  for (const s of spellings(token.text)) {
    const r = find(s)
    if (r !== undefined) return r
  }
  return undefined
}
