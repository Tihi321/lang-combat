export type Gender = 'm' | 'f' | 'n'
export type Case = 'nom' | 'acc' | 'dat' | 'gen'

export interface Noun {
  lemma: string
  gender: Gender
  plural?: string
}

export interface Verb {
  infinitive: string
  /** Accepted du-imperative spellings, lowercase. */
  imperativeDu: string[]
  separablePrefix?: string
  /** Cases of the objects the verb takes, in order. Empty = no object. */
  frame: Case[]
}

export interface Lexicon {
  verbs: Verb[]
  nouns: Noun[]
}

export const FLOOR1_LEXICON: Lexicon = {
  verbs: [
    { infinitive: 'nehmen', imperativeDu: ['nimm'], frame: ['acc'] },
    { infinitive: 'öffnen', imperativeDu: ['öffne'], frame: ['acc'] },
    { infinitive: 'untersuchen', imperativeDu: ['untersuche', 'untersuch'], frame: ['acc'] },
    { infinitive: 'schauen', imperativeDu: ['schau', 'schaue'], frame: [] },
    // Only used with the fixed phrase "nach <Richtung>".
    { infinitive: 'gehen', imperativeDu: ['geh', 'gehe'], frame: [] },
  ],
  nouns: [
    { lemma: 'Schlüssel', gender: 'm' },
    { lemma: 'Tür', gender: 'f' },
    { lemma: 'Buch', gender: 'n' },
    { lemma: 'Kerze', gender: 'f' },
    { lemma: 'Tisch', gender: 'm' },
    { lemma: 'Truhe', gender: 'f' },
    { lemma: 'Feuer', gender: 'n' },
  ],
}
