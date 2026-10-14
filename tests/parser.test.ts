import { describe, expect, it } from 'vitest'
import { articleFor, articleReadings } from '../src/core/grammar'
import { FLOOR1_LEXICON } from '../src/core/lexicon'
import { parse } from '../src/core/parser'
import type { Command, GrammarError } from '../src/core/parser'
import { spellings } from '../src/core/tokenize'

const act = (verb: string, noun: string, article: string, definite = true): Partial<Command> => ({
  kind: 'act',
  verb,
  object: { noun, article, definite },
})

const okCases: [string, Partial<Command>][] = [
  ['Nimm den Schlüssel', act('nehmen', 'Schlüssel', 'den')],
  ['Öffne die Tür', act('öffnen', 'Tür', 'die')],
  ['Untersuche das Buch', act('untersuchen', 'Buch', 'das')],
  ['Untersuch das Buch', act('untersuchen', 'Buch', 'das')],
  ['Nimm die Kerze.', act('nehmen', 'Kerze', 'die')],
  ['Nimm einen Schlüssel', act('nehmen', 'Schlüssel', 'einen', false)],
  ['Nimm eine Kerze', act('nehmen', 'Kerze', 'eine', false)],
  ['Untersuche ein Buch', act('untersuchen', 'Buch', 'ein', false)],
  ['NIMM DEN SCHLÜSSEL', act('nehmen', 'Schlüssel', 'den')],
  ['   nimm    den\t Tisch  ', act('nehmen', 'Tisch', 'den')],
  ['Oeffne die Tuer', act('öffnen', 'Tür', 'die')],
  ['Nimm den Schluessel', act('nehmen', 'Schlüssel', 'den')],
  ['Nimm das Feuer', act('nehmen', 'Feuer', 'das')],
  ['Untersuche das Feuer!', act('untersuchen', 'Feuer', 'das')],
  ['Schau', { kind: 'act', verb: 'schauen' }],
  ['schaue', { kind: 'act', verb: 'schauen' }],
  ['Hilfe', { kind: 'help' }],
  ['Geh nach Norden', { kind: 'go', direction: 'north' }],
  ['Geh nach Süden', { kind: 'go', direction: 'south' }],
  ['Gehe nach Osten', { kind: 'go', direction: 'east' }],
  ['geh nach westen', { kind: 'go', direction: 'west' }],
  ['Geh nach Sueden', { kind: 'go', direction: 'south' }],
]

const errCases: [string, GrammarError][] = [
  ['', { kind: 'UnknownVerb', word: '' }],
  ['   ', { kind: 'UnknownVerb', word: '' }],
  ['Tanze den Schlüssel', { kind: 'UnknownVerb', word: 'Tanze' }],
  ['Nimm den Besen', { kind: 'UnknownWord', word: 'Besen' }],
  ['Nimm blau Schlüssel', { kind: 'UnknownWord', word: 'blau' }],
  ['Nimm den Schlüssel Tür', { kind: 'UnknownWord', word: 'Tür' }],
  ['Schau Tür', { kind: 'UnknownWord', word: 'Tür' }],
  ['Geh nach Hause', { kind: 'UnknownWord', word: 'Hause' }],
  ['Hilfe bitte', { kind: 'UnknownWord', word: 'bitte' }],
  ['Nimm', { kind: 'MissingObject', verb: 'nehmen' }],
  ['Nimm den', { kind: 'MissingObject', verb: 'nehmen' }],
  ['Geh', { kind: 'MissingObject', verb: 'gehen' }],
  ['Geh nach', { kind: 'MissingObject', verb: 'gehen' }],
  ['Nimm Schlüssel', { kind: 'MissingArticle', noun: 'Schlüssel' }],
  ['Öffne Tür', { kind: 'MissingArticle', noun: 'Tür' }],
  [
    'Nimm der Schlüssel',
    { kind: 'WrongCase', noun: 'Schlüssel', article: 'der', expectedCase: 'acc', gotCase: 'nom' },
  ],
  [
    'Nimm dem Buch',
    { kind: 'WrongCase', noun: 'Buch', article: 'dem', expectedCase: 'acc', gotCase: 'dat' },
  ],
  [
    'Nimm ein Schlüssel',
    { kind: 'WrongCase', noun: 'Schlüssel', article: 'ein', expectedCase: 'acc', gotCase: 'nom' },
  ],
  [
    'Öffne den Tür',
    { kind: 'WrongGender', noun: 'Tür', article: 'den', expectedGender: 'f' },
  ],
  [
    'Nimm die Buch',
    { kind: 'WrongGender', noun: 'Buch', article: 'die', expectedGender: 'n' },
  ],
  [
    'Nimm das Schlüssel',
    { kind: 'WrongGender', noun: 'Schlüssel', article: 'das', expectedGender: 'm' },
  ],
  ['Den Schlüssel nimm', { kind: 'WrongWordOrder', detail: 'The verb "nimm" must come first in a command.' }],
  ['Die Tür öffne', { kind: 'WrongWordOrder', detail: 'The verb "öffne" must come first in a command.' }],
]

describe('parse: valid commands', () => {
  it.each(okCases)('%j', (input, expected) => {
    const r = parse(input, FLOOR1_LEXICON)
    expect(r).toHaveProperty('ok')
    expect('ok' in r && r.ok).toMatchObject(expected)
  })
})

describe('parse: grammar errors', () => {
  it.each(errCases)('%j', (input, expected) => {
    expect(parse(input, FLOOR1_LEXICON)).toEqual({ err: expected })
  })
})

describe('parse: details', () => {
  it('keeps the typed text as raw', () => {
    const r = parse('  Oeffne die Tuer ', FLOOR1_LEXICON)
    expect('ok' in r && r.ok.raw).toBe('Oeffne die Tuer')
  })

  it('Feuer is never normalized to feür (typed form wins)', () => {
    expect(spellings('feuer')[0]).toBe('feuer')
    const r = parse('Nimm das Feuer', FLOOR1_LEXICON)
    expect('ok' in r && r.ok).toMatchObject({ object: { noun: 'Feuer' } })
  })

  it('umlaut fallback resolves Schluessel to schlüssel (not schlüßel)', () => {
    expect(spellings('schluessel')).toContain('schlüssel')
    const r = parse('Nimm den Schluessel', FLOOR1_LEXICON)
    expect('ok' in r && r.ok).toMatchObject({ object: { noun: 'Schlüssel' } })
  })
})

describe('articleReadings', () => {
  it('der: m/nom, f/dat, f/gen, pl/gen', () => {
    const r = articleReadings('der').filter((x) => x.definite)
    expect(r).toEqual(
      expect.arrayContaining([
        { gender: 'm', case: 'nom', definite: true },
        { gender: 'f', case: 'dat', definite: true },
        { gender: 'f', case: 'gen', definite: true },
        { gender: 'pl', case: 'gen', definite: true },
      ]),
    )
    expect(r).toHaveLength(4)
  })

  it('die is ambiguous: f/nom, f/acc, pl/nom, pl/acc', () => {
    const r = articleReadings('die')
    expect(r).toHaveLength(4)
    expect(r).toEqual(
      expect.arrayContaining([
        { gender: 'f', case: 'nom', definite: true },
        { gender: 'f', case: 'acc', definite: true },
        { gender: 'pl', case: 'nom', definite: true },
        { gender: 'pl', case: 'acc', definite: true },
      ]),
    )
  })

  it('den is m/acc and pl/dat; einen is only indefinite m/acc', () => {
    expect(articleReadings('den')).toHaveLength(2)
    expect(articleReadings('einen')).toEqual([{ gender: 'm', case: 'acc', definite: false }])
  })

  it('is case-insensitive and empty for non-articles', () => {
    expect(articleReadings('DEN')).toHaveLength(2)
    expect(articleReadings('Tür')).toEqual([])
  })

  it('articleFor builds forms from gender and case', () => {
    expect(articleFor('m', 'acc', true)).toBe('den')
    expect(articleFor('f', 'acc', false)).toBe('eine')
    expect(articleFor('pl', 'nom', false)).toBeUndefined()
  })
})
