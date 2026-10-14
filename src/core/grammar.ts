import type { Case, Gender } from './lexicon'

export type ArticleGender = Gender | 'pl'

export interface ArticleReading {
  gender: ArticleGender
  case: Case
  definite: boolean
}

type Table = Record<ArticleGender, Record<Case, string> | undefined>

const DEFINITE: Table = {
  m: { nom: 'der', acc: 'den', dat: 'dem', gen: 'des' },
  f: { nom: 'die', acc: 'die', dat: 'der', gen: 'der' },
  n: { nom: 'das', acc: 'das', dat: 'dem', gen: 'des' },
  pl: { nom: 'die', acc: 'die', dat: 'den', gen: 'der' },
}

const INDEFINITE: Table = {
  m: { nom: 'ein', acc: 'einen', dat: 'einem', gen: 'eines' },
  f: { nom: 'eine', acc: 'eine', dat: 'einer', gen: 'einer' },
  n: { nom: 'ein', acc: 'ein', dat: 'einem', gen: 'eines' },
  pl: undefined, // no plural indefinite article
}

const CASES: Case[] = ['nom', 'acc', 'dat', 'gen']
const GENDERS: ArticleGender[] = ['m', 'f', 'n', 'pl']

/** Article form for a gender and case, or undefined (e.g. indefinite plural). */
export function articleFor(gender: ArticleGender, c: Case, definite: boolean): string | undefined {
  return (definite ? DEFINITE : INDEFINITE)[gender]?.[c]
}

/** Every (gender|'pl', case, definiteness) an article form can mean. Empty if not an article. */
export function articleReadings(form: string): ArticleReading[] {
  const f = form.toLowerCase()
  const out: ArticleReading[] = []
  for (const definite of [true, false]) {
    for (const gender of GENDERS) {
      for (const c of CASES) {
        if (articleFor(gender, c, definite) === f) out.push({ gender, case: c, definite })
      }
    }
  }
  return out
}
