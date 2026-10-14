import type { Direction } from '../core/parser'

const VERBS = ['Nimm', 'Öffne', 'Untersuche', 'Schau', 'Geh', 'nach']
const ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen']
const DIRECTION_WORDS: Record<Direction, string> = {
  north: 'Norden',
  south: 'Süden',
  east: 'Osten',
  west: 'Westen',
}

interface Props {
  nouns: string[]
  exits: Direction[]
  onPick: (word: string) => void
  disabled?: boolean
}

export default function WordChips({ nouns, exits, onPick, disabled }: Props) {
  const groups: [string, string[]][] = [
    ['verb', VERBS],
    ['dir', exits.map((d) => DIRECTION_WORDS[d])],
    ['noun', nouns],
    ['article', ARTICLES],
    ['help', ['Hilfe']],
  ]
  return (
    <div className="chips words">
      {groups.flatMap(([kind, words]) =>
        words.map((w) => (
          <button
            key={`${kind}:${w}`}
            type="button"
            className={`chip chip-${kind}`}
            disabled={disabled}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => onPick(w)}
          >
            {w}
          </button>
        )),
      )}
    </div>
  )
}
