import { describe, expect, it } from 'vitest'
import { FLOOR1, initialState, step, visibleNouns } from '../src/core/engine'
import type { GameEvent, GameState } from '../src/core/engine'
import { hintFor } from '../src/core/hints'
import { FLOOR1_LEXICON } from '../src/core/lexicon'

function run(inputs: string[], from: GameState = initialState(FLOOR1)) {
  let state = from
  let events: GameEvent[] = []
  for (const i of inputs) {
    const r = step(FLOOR1, state, i)
    state = r.state
    events = r.events
  }
  return { state, events }
}

const textOf = (e: GameEvent) => (e as { text: string }).text
const toFlur = ['Geh nach Norden']
const toSalon = [...toFlur, 'Geh nach Osten']

describe('walkthrough', () => {
  it('plays from start to win', () => {
    const { state, events } = run([
      'Schau',
      'Geh nach Norden',
      'Untersuche das Buch',
      'Geh nach Osten',
      'Öffne die Truhe',
      'Nimm den Schlüssel',
      'Geh nach Westen',
      'Öffne die Tür',
    ])
    expect(events.map((e) => e.type)).toEqual(['text', 'win'])
    expect(state.flags[FLOOR1.goalFlag]).toBe(true)
    expect(state.inventory).toEqual(['schluessel'])
  })

  it('entering a room describes it', () => {
    const { events } = run(toFlur)
    expect(events.map(textOf)).toEqual([
      'Du gehst nach Norden.',
      expect.stringContaining('Flur'),
    ])
  })

  it('opening a container shows what is inside', () => {
    const { events } = run([...toSalon, 'Öffne die Truhe'])
    expect(events.map(textOf)).toEqual(['Du öffnest die Truhe.', 'Darin siehst du den Schlüssel.'])
  })

  it('Schau lists room, visible entities and exits', () => {
    const { events } = run(['Schau'])
    const t = textOf(events[0])
    expect(t).toContain('Küche')
    expect(t).toContain('den Tisch, die Kerze, den Kamin und das Feuer')
    expect(t).toContain('Ausgänge: Norden')
  })

  it('works with umlaut fallback spelling', () => {
    const { events } = run([...toSalon, 'Oeffne die Truhe', 'Nimm den Schluessel'])
    expect(textOf(events[0])).toBe('Du nimmst den Schlüssel.')
  })

  it('an open container lists its contents when examined', () => {
    const { events } = run([...toSalon, 'Öffne die Truhe', 'Untersuche die Truhe'])
    expect(textOf(events[0])).toContain('Darin siehst du den Schlüssel.')
  })

  it('taken items leave the room listing', () => {
    const { events } = run(['Nimm die Kerze', 'Schau'])
    expect(textOf(events[0])).not.toContain('Kerze')
  })
})

describe('game errors', () => {
  const kindOf = (r: { events: GameEvent[] }) =>
    r.events[0].type === 'gameError' ? r.events[0].kind : r.events[0].type

  it('ObjectNotHere: key while the chest is closed', () => {
    expect(kindOf(run([...toSalon, 'Nimm den Schlüssel']))).toBe('ObjectNotHere')
  })
  it('ObjectNotHere: entity in another room', () => {
    expect(kindOf(run(['Nimm das Buch']))).toBe('ObjectNotHere')
  })
  it('NotTakeable', () => {
    const r = run(['Nimm den Tisch'])
    expect(kindOf(r)).toBe('NotTakeable')
    expect(r.state.inventory).toEqual([])
  })
  it('Locked without key, door stays closed', () => {
    const r = run([...toFlur, 'Öffne die Tür'])
    expect(kindOf(r)).toBe('Locked')
    expect(r.state.flags[FLOOR1.goalFlag]).toBeUndefined()
  })
  it('NoExit', () => {
    expect(kindOf(run(['Geh nach Süden']))).toBe('NoExit')
  })
  it('AlreadyOpen, NotOpenable, AlreadyHave', () => {
    expect(kindOf(run([...toSalon, 'Öffne die Truhe', 'Öffne die Truhe']))).toBe('AlreadyOpen')
    expect(kindOf(run(['Öffne den Tisch']))).toBe('NotOpenable')
    expect(kindOf(run(['Nimm die Kerze', 'Nimm die Kerze']))).toBe('AlreadyHave')
  })
  it('does not change state on failure', () => {
    expect(run(['Nimm den Tisch']).state).toEqual(initialState(FLOOR1))
  })
})

describe('grammar errors and Hilfe', () => {
  it('sets lastError and answers in-world', () => {
    const r = run(['Nimm der Schlüssel'])
    expect(r.state.lastError).toMatchObject({ kind: 'WrongCase', noun: 'Schlüssel' })
    expect(r.events[0]).toMatchObject({
      type: 'grammarError',
      text: 'Der Schlüssel? Er ist doch da. Was willst du mit ihm machen?',
    })
  })
  it('Hilfe gives the English hint and keeps lastError', () => {
    const r = run(['Nimm der Schlüssel', 'Hilfe'])
    const expected = hintFor({
      kind: 'WrongCase',
      noun: 'Schlüssel',
      article: 'der',
      expectedCase: 'acc',
      gotCase: 'nom',
    })
    expect(r.events).toEqual([{ type: 'hint', text: expected }])
    expect(expected).toContain('der → den')
    expect(r.state.lastError).toBeDefined()
  })
  it('Hilfe without an error gives a generic tip', () => {
    expect(run(['Hilfe']).events[0].type).toBe('hint')
  })
  it('a successful command clears lastError', () => {
    const r = run(['Nimm der Kerze', 'Schau'])
    expect('lastError' in r.state).toBe(false)
  })
  it('WrongGender hints at the right article in-world', () => {
    expect(textOf(run(['Öffne den Tür']).events[0])).toBe(
      'Den Tür? So etwas kenne ich nicht. Ich kenne nur „die Tür“.',
    )
  })
})

describe('purity', () => {
  it('never mutates the input state', () => {
    const script = [
      ...toSalon,
      'Öffne die Truhe',
      'Nimm den Schlüssel',
      'Nimm der Tisch',
      'Hilfe',
      'Nimm den Tisch',
      'Geh nach Westen',
      'Öffne die Tür',
    ]
    let s = initialState(FLOOR1)
    for (const i of script) {
      const before = structuredClone(s)
      const next = step(FLOOR1, s, i).state
      expect(s).toEqual(before)
      s = next
    }
  })
  it('works on a deeply frozen state', () => {
    const frozen = Object.freeze({
      roomId: FLOOR1.start,
      inventory: Object.freeze([]) as unknown as string[],
      flags: Object.freeze({}) as Record<string, boolean>,
    })
    expect(() => step(FLOOR1, frozen, 'Nimm die Kerze')).not.toThrow()
    expect(() => step(FLOOR1, frozen, 'Geh nach Norden')).not.toThrow()
  })
})

describe('level data', () => {
  it('every entity noun is in the lexicon', () => {
    for (const e of FLOOR1.entities) {
      expect(
        FLOOR1_LEXICON.nouns.some((n) => n.lemma === e.noun),
        e.id,
      ).toBe(true)
    }
  })
  it('every exit leads to an existing room and the start exists', () => {
    const ids = FLOOR1.rooms.map((r) => r.id)
    expect(ids).toContain(FLOOR1.start)
    for (const r of FLOOR1.rooms) for (const t of Object.values(r.exits)) expect(ids).toContain(t)
  })
  it('entity references are consistent', () => {
    const ids = FLOOR1.entities.map((e) => e.id)
    const rooms = FLOOR1.rooms.map((r) => r.id)
    for (const e of FLOOR1.entities) {
      expect(rooms).toContain(e.room)
      if (e.opensWith) expect(ids).toContain(e.opensWith)
      if (e.inside) expect(ids).toContain(e.inside)
    }
  })
})

describe('visibleNouns', () => {
  it('lists room nouns, hides container contents, includes inventory', () => {
    const start = initialState(FLOOR1)
    expect(visibleNouns(FLOOR1, start)).toContain('Tisch')
    expect(visibleNouns(FLOOR1, start)).not.toContain('Buch')
    const inSalon = run([...toSalon])
    expect(visibleNouns(FLOOR1, inSalon.state)).toContain('Truhe')
    expect(visibleNouns(FLOOR1, inSalon.state)).not.toContain('Schlüssel')
    const opened = run(['Öffne die Truhe', 'Nimm den Schlüssel'], inSalon.state)
    const away = run(['Geh nach Westen'], opened.state)
    expect(visibleNouns(FLOOR1, away.state)).toContain('Schlüssel')
    expect(visibleNouns(FLOOR1, away.state)).not.toContain('Truhe')
  })
})
