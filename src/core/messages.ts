import { articleFor } from './grammar'
import { FLOOR1_LEXICON } from './lexicon'
import type { Gender } from './lexicon'
import type { Direction, GrammarError } from './parser'

// All in-world German text lives here. The voice is the Hausgeist: grumpy,
// slightly deaf, and always a bit offended.

export interface NounRef {
  lemma: string
  gender: Gender
}

export function nounRef(lemma: string): NounRef {
  const n = FLOOR1_LEXICON.nouns.find((x) => x.lemma === lemma)
  if (!n) throw new Error(`Unknown noun: ${lemma}`)
  return { lemma: n.lemma, gender: n.gender }
}

const PRONOUN: Record<Gender, { nom: string; acc: string; dat: string }> = {
  m: { nom: 'er', acc: 'ihn', dat: 'ihm' },
  f: { nom: 'sie', acc: 'sie', dat: 'ihr' },
  n: { nom: 'es', acc: 'es', dat: 'ihm' },
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const defNom = (r: NounRef) => `${articleFor(r.gender, 'nom', true)} ${r.lemma}`
const defAcc = (r: NounRef) => `${articleFor(r.gender, 'acc', true)} ${r.lemma}`
const DIRECTION_NAME: Record<Direction, string> = {
  north: 'Norden',
  south: 'Süden',
  east: 'Osten',
  west: 'Westen',
}

type ErrorOf<K extends GrammarError['kind']> = Extract<GrammarError, { kind: K }>

const grammarMessages: { [K in GrammarError['kind']]: (e: ErrorOf<K>) => string } = {
  UnknownWord: (e) => `„${e.word}“? Was soll das sein? So ein Wort kenne ich nicht.`,
  UnknownVerb: (e) =>
    e.word === ''
      ? 'Hm? Du musst schon etwas sagen. Ich bin alt, aber Gedanken lesen kann ich nicht!'
      : `„${e.word}“? Was soll das heißen? Das verstehe ich nicht.`,
  MissingObject: (e) =>
    e.verb === 'gehen'
      ? 'Wohin denn? Sag zum Beispiel: „Geh nach Norden“.'
      : `${cap(e.verb)}? Aber was denn? Sag es mir ganz genau!`,
  MissingArticle: (e) =>
    `„${e.noun}“? ${e.noun}, ${e.noun} ... Wer? Wie? Was? Sprich in ganzen Sätzen, mit Artikel!`,
  WrongCase: (e) => {
    const g = nounRef(e.noun).gender
    return `${cap(e.article)} ${e.noun}? ${cap(PRONOUN[g].nom)} ist doch da. Was willst du mit ${PRONOUN[g].dat} machen?`
  },
  WrongGender: (e) =>
    `${cap(e.article)} ${e.noun}? So etwas kenne ich nicht. Ich kenne nur „${articleFor(e.expectedGender, 'nom', true)} ${e.noun}“.`,
  WrongWordOrder: () => 'Hä? Du fängst mit dem falschen Wort an! Das Verb kommt zuerst, hörst du?',
}

export function grammarErrorText(e: GrammarError): string {
  return (grammarMessages[e.kind] as (e: GrammarError) => string)(e)
}

export type GameErrorKind =
  | 'ObjectNotHere'
  | 'NotTakeable'
  | 'Locked'
  | 'NoExit'
  | 'AlreadyOpen'
  | 'NotOpenable'
  | 'AlreadyHave'

export interface GameErrorArgs {
  ObjectNotHere: { lemma: string }
  NotTakeable: { lemma: string }
  Locked: { lemma: string }
  NoExit: { direction: Direction }
  AlreadyOpen: { lemma: string }
  NotOpenable: { lemma: string }
  AlreadyHave: { lemma: string }
}

const gameMessages: { [K in GameErrorKind]: (a: GameErrorArgs[K]) => string } = {
  ObjectNotHere: (a) => {
    const r = nounRef(a.lemma)
    return `Hier gibt es k${articleFor(r.gender, 'acc', false)} ${r.lemma}. Du siehst wohl Gespenster!`
  },
  NotTakeable: (a) => {
    const r = nounRef(a.lemma)
    const p = PRONOUN[r.gender].nom
    return `${cap(defAcc(r))} nehmen? Das geht nicht. ${cap(p)} bleibt, wo ${p} ist.`
  },
  Locked: (a) => {
    const r = nounRef(a.lemma)
    return `${cap(defNom(r))} ist verschlossen. ${cap(PRONOUN[r.gender].nom)} geht nicht auf, dir fehlt der passende Schlüssel.`
  },
  NoExit: (a) => `Nach ${DIRECTION_NAME[a.direction]}? Da ist nur eine Wand. Gleich läufst du noch dagegen!`,
  AlreadyOpen: (a) => `${cap(defNom(nounRef(a.lemma)))} ist doch schon offen. Du bist ganz schön vergesslich.`,
  NotOpenable: (a) => `${cap(defAcc(nounRef(a.lemma)))} öffnen? Das geht nicht. Was denkst du dir nur?`,
  AlreadyHave: (a) => `${cap(defAcc(nounRef(a.lemma)))} hast du doch schon!`,
}

export function gameErrorText<K extends GameErrorKind>(kind: K, args: GameErrorArgs[K]): string {
  return gameMessages[kind](args)
}

// Non-error lines.

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`
}

export const texts = {
  lookRoom: (description: string, visible: string[], exits: Direction[]) => {
    const lines = [description]
    if (visible.length > 0) lines.push(`Du siehst ${joinList(visible.map((l) => defAcc(nounRef(l))))}.`)
    lines.push(
      exits.length > 0
        ? `Ausgänge: ${exits.map((d) => DIRECTION_NAME[d]).join(', ')}.`
        : 'Es gibt keinen Ausgang.',
    )
    return lines.join(' ')
  },
  inside: (items: string[]) =>
    items.length > 0 ? `Darin siehst du ${joinList(items.map((l) => defAcc(nounRef(l))))}.` : 'Darin ist nichts.',
  taken: (lemma: string) => `Du nimmst ${defAcc(nounRef(lemma))}.`,
  opened: (lemma: string) => `Du öffnest ${defAcc(nounRef(lemma))}.`,
  unlockedAndOpened: (lemma: string, keyLemma: string) =>
    `Du schließt ${defAcc(nounRef(lemma))} mit ${articleFor(nounRef(keyLemma).gender, 'dat', true)} ${keyLemma} auf und öffnest ${PRONOUN[nounRef(lemma).gender].acc}.`,
  moved: (direction: Direction) => `Du gehst nach ${DIRECTION_NAME[direction]}.`,
  win: 'Die Tür schwingt auf. Der Hausgeist seufzt: „Na endlich! Geh nur, du Quälgeist. Dein Deutsch war gar nicht so schlecht.“',
}
