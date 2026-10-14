import { articleReadings } from './grammar'
import type { ArticleReading } from './grammar'
import type { Case, Gender, Lexicon, Noun, Verb } from './lexicon'
import { matchToken, tokenize } from './tokenize'
import type { Token } from './tokenize'

export type Direction = 'north' | 'south' | 'east' | 'west'

export type Command =
  | {
      kind: 'act'
      verb: string
      object?: { noun: string; article: string; definite: boolean }
      raw: string
    }
  | { kind: 'go'; direction: Direction; raw: string }
  | { kind: 'help'; raw: string }

export type GrammarError =
  | { kind: 'UnknownWord'; word: string }
  | { kind: 'UnknownVerb'; word: string }
  | { kind: 'MissingObject'; verb: string }
  | { kind: 'MissingArticle'; noun: string }
  | { kind: 'WrongCase'; noun: string; article: string; expectedCase: Case; gotCase: Case }
  | { kind: 'WrongGender'; noun: string; article: string; expectedGender: Gender }
  | { kind: 'WrongWordOrder'; detail: string }

export type ParseResult = { ok: Command } | { err: GrammarError }

const DIRECTIONS: Record<string, Direction> = {
  norden: 'north',
  süden: 'south',
  osten: 'east',
  westen: 'west',
}

const fail = (e: GrammarError): ParseResult => ({ err: e })

/**
 * Precedence: empty input -> UnknownVerb(''); first token not a verb ->
 * WrongWordOrder if a verb appears later, else UnknownVerb; then per verb:
 * missing/unknown pieces, then article/noun agreement; extra trailing tokens
 * -> UnknownWord on the first extra one.
 */
export function parse(input: string, lexicon: Lexicon): ParseResult {
  const tokens = tokenize(input)
  if (tokens.length === 0) return fail({ kind: 'UnknownVerb', word: '' })

  const raw = input.trim()
  const [first, ...rest] = tokens
  const findVerb = (t: Token): Verb | 'hilfe' | undefined =>
    matchToken(t, (w) =>
      w === 'hilfe' ? 'hilfe' : lexicon.verbs.find((v) => v.imperativeDu.includes(w)),
    )

  const verb = findVerb(first)
  if (!verb) {
    const later = rest.find((t) => findVerb(t))
    if (later) {
      return fail({
        kind: 'WrongWordOrder',
        detail: `The verb "${later.raw}" must come first in a command.`,
      })
    }
    return fail({ kind: 'UnknownVerb', word: first.raw })
  }

  if (verb === 'hilfe') {
    if (rest.length > 0) return fail({ kind: 'UnknownWord', word: rest[0].raw })
    return { ok: { kind: 'help', raw } }
  }

  if (verb.infinitive === 'gehen') return parseGo(verb, rest, raw)

  if (verb.frame.length === 0) {
    if (rest.length > 0) return fail({ kind: 'UnknownWord', word: rest[0].raw })
    return { ok: { kind: 'act', verb: verb.infinitive, raw } }
  }

  return parseObject(verb, rest, raw, lexicon)
}

function parseGo(verb: Verb, rest: Token[], raw: string): ParseResult {
  if (rest.length === 0) return fail({ kind: 'MissingObject', verb: verb.infinitive })
  if (rest[0].text !== 'nach') return fail({ kind: 'UnknownWord', word: rest[0].raw })
  if (rest.length === 1) return fail({ kind: 'MissingObject', verb: verb.infinitive })
  const direction = matchToken(rest[1], (w) => DIRECTIONS[w])
  if (!direction) return fail({ kind: 'UnknownWord', word: rest[1].raw })
  if (rest.length > 2) return fail({ kind: 'UnknownWord', word: rest[2].raw })
  return { ok: { kind: 'go', direction, raw } }
}

function parseObject(verb: Verb, rest: Token[], raw: string, lexicon: Lexicon): ParseResult {
  const findNoun = (t: Token): Noun | undefined =>
    matchToken(t, (w) => lexicon.nouns.find((n) => n.lemma.toLowerCase() === w))
  const findArticle = (t: Token): ArticleReading[] | undefined => {
    const r = articleReadings(t.text)
    return r.length > 0 ? r : undefined
  }

  if (rest.length === 0) return fail({ kind: 'MissingObject', verb: verb.infinitive })

  const [artTok, nounTok] = rest
  const readings = findArticle(artTok)
  if (!readings) {
    const bare = findNoun(artTok)
    if (bare) return fail({ kind: 'MissingArticle', noun: bare.lemma })
    return fail({ kind: 'UnknownWord', word: artTok.raw })
  }
  if (!nounTok) return fail({ kind: 'MissingObject', verb: verb.infinitive })
  const noun = findNoun(nounTok)
  if (!noun) return fail({ kind: 'UnknownWord', word: nounTok.raw })
  if (rest.length > 2) return fail({ kind: 'UnknownWord', word: rest[2].raw })

  const expectedCase = verb.frame[0]
  const article = artTok.text
  const sameGender = readings.filter((r) => r.gender === noun.gender)
  const fit = sameGender.find((r) => r.case === expectedCase)
  if (!fit) {
    // Wrong case vs wrong gender: if the article can agree with the noun's
    // gender in some other case it is WrongCase (report nom if that is a
    // possible reading, else the first one); if it fits no case for that
    // gender it is WrongGender.
    if (sameGender.length > 0) {
      const got = sameGender.find((r) => r.case === 'nom') ?? sameGender[0]
      return fail({ kind: 'WrongCase', noun: noun.lemma, article, expectedCase, gotCase: got.case })
    }
    return fail({ kind: 'WrongGender', noun: noun.lemma, article, expectedGender: noun.gender })
  }
  return {
    ok: {
      kind: 'act',
      verb: verb.infinitive,
      object: { noun: noun.lemma, article, definite: fit.definite },
      raw,
    },
  }
}
