import { articleFor } from './grammar'
import type { Case, Gender } from './lexicon'
import { FLOOR1_LEXICON } from './lexicon'
import type { GrammarError } from './parser'

export const GENERIC_HINT =
  'Try "Schau", "Nimm den Schlüssel" or "Geh nach Norden". After a mistake, type Hilfe to see the rule.'

const CASE_NAME: Record<Case, string> = {
  nom: 'nominative',
  acc: 'accusative',
  dat: 'dative',
  gen: 'genitive',
}
const GENDER_NAME: Record<Gender, string> = { m: 'masculine', f: 'feminine', n: 'neuter' }

/** One-line English explanation of the rule behind a grammar error. */
export function hintFor(e: GrammarError): string {
  switch (e.kind) {
    case 'UnknownWord':
      return `"${e.word}" is not a word I know on this floor. Use the verbs and nouns from the word chips.`
    case 'UnknownVerb':
      return e.word === ''
        ? 'Type a command that starts with a verb, e.g. "Schau".'
        : `Start with a du-imperative verb: Nimm, Öffne, Untersuche, Schau or Geh. "${e.word}" is not one.`
    case 'MissingObject':
      return e.verb === 'gehen'
        ? 'gehen needs a direction: "Geh nach Norden/Süden/Osten/Westen".'
        : `${e.verb} needs an object: verb + article + noun, e.g. "Nimm den Schlüssel".`
    case 'MissingArticle':
      return `German nouns need an article: write e.g. "${articleFor(genderOf(e.noun), 'acc', true)} ${e.noun}", not just "${e.noun}".`
    case 'WrongCase': {
      const g = genderOf(e.noun)
      const right = articleFor(g, e.expectedCase, true)
      const wrong = articleFor(g, e.gotCase, true)
      return `The object of this verb takes the ${CASE_NAME[e.expectedCase]}, not the ${CASE_NAME[e.gotCase]}: ${wrong} → ${right} for ${GENDER_NAME[g]} nouns.`
    }
    case 'WrongGender': {
      const g = e.expectedGender
      return `${e.noun} is ${GENDER_NAME[g]}: its article is ${articleFor(g, 'nom', true)} (accusative: ${articleFor(g, 'acc', true)}), not "${e.article}".`
    }
    case 'WrongWordOrder':
      return `${e.detail} Imperatives put the verb first.`
  }
}

function genderOf(lemma: string): Gender {
  const n = FLOOR1_LEXICON.nouns.find((x) => x.lemma === lemma)
  if (!n) throw new Error(`Unknown noun: ${lemma}`)
  return n.gender
}
