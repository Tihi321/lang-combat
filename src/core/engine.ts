import { GENERIC_HINT, hintFor } from './hints'
import { FLOOR1_LEXICON } from './lexicon'
import { gameErrorText, grammarErrorText, texts } from './messages'
import type { GameErrorArgs, GameErrorKind } from './messages'
import { parse } from './parser'
import type { Command, Direction, GrammarError } from './parser'
import floor1 from '../levels/floor1.json'

export interface Entity {
  id: string
  /** Noun lemma, must exist in the lexicon. */
  noun: string
  room: string
  description: string
  takeable: boolean
  openable?: boolean
  locked?: boolean
  /** Entity id of the key. */
  opensWith?: string
  /** Container entity id; hidden until that container is open. */
  inside?: string
}

export interface Room {
  id: string
  description: string
  exits: Partial<Record<Direction, string>>
}

export interface Level {
  start: string
  goalFlag: string
  intro: string
  rooms: Room[]
  entities: Entity[]
}

export const FLOOR1: Level = floor1 as Level

export interface GameState {
  roomId: string
  /** Entity ids. */
  inventory: string[]
  /** e.g. `open:truhe`, `unlocked:tuer`. */
  flags: Record<string, boolean>
  lastError?: GrammarError
}

export type GameEvent =
  | { type: 'text'; text: string }
  | { type: 'grammarError'; error: GrammarError; text: string }
  | { type: 'gameError'; kind: GameErrorKind; text: string }
  | { type: 'hint'; text: string }
  | { type: 'win'; text: string }

export interface StepResult {
  state: GameState
  events: GameEvent[]
}

export function initialState(level: Level): GameState {
  return { roomId: level.start, inventory: [], flags: {} }
}

const isOpen = (s: GameState, id: string) => s.flags[`open:${id}`] === true

function visibleEntities(level: Level, s: GameState): Entity[] {
  return level.entities.filter((e) => {
    if (s.inventory.includes(e.id)) return true
    if (e.room !== s.roomId) return false
    return !e.inside || isOpen(s, e.inside)
  })
}

/** Visible entities lying in the room (not carried). */
const inRoom = (level: Level, s: GameState) =>
  visibleEntities(level, s).filter((e) => !s.inventory.includes(e.id))

const text = (t: string): GameEvent => ({ type: 'text', text: t })
function fail<K extends GameErrorKind>(state: GameState, kind: K, args: GameErrorArgs[K]): StepResult {
  return { state, events: [{ type: 'gameError', kind, text: gameErrorText(kind, args) }] }
}

/** Parses `input` and applies it. */
export function step(level: Level, state: GameState, input: string): StepResult {
  const parsed = parse(input, FLOOR1_LEXICON)
  if ('err' in parsed) {
    return {
      state: { ...state, lastError: parsed.err },
      events: [{ type: 'grammarError', error: parsed.err, text: grammarErrorText(parsed.err) }],
    }
  }
  const result = apply(level, state, parsed.ok)
  if (parsed.ok.kind === 'help') return result
  const { lastError: _cleared, ...next } = result.state
  return { state: next, events: result.events }
}

export function apply(level: Level, state: GameState, command: Command): StepResult {
  switch (command.kind) {
    case 'help':
      return {
        state,
        events: [{ type: 'hint', text: state.lastError ? hintFor(state.lastError) : GENERIC_HINT }],
      }
    case 'go':
      return go(level, state, command.direction)
    case 'act':
      return act(level, state, command)
  }
}

function go(level: Level, state: GameState, direction: Direction): StepResult {
  const room = level.rooms.find((r) => r.id === state.roomId)
  const target = room?.exits[direction]
  if (!target) return fail(state, 'NoExit', { direction })
  return {
    state: { ...state, roomId: target },
    events: [text(texts.moved(direction))],
  }
}

function act(level: Level, state: GameState, cmd: Extract<Command, { kind: 'act' }>): StepResult {
  if (cmd.verb === 'schauen') return look(level, state)
  if (!cmd.object) return { state, events: [] }

  const lemma = cmd.object.noun
  const target = visibleEntities(level, state).find((e) => e.noun === lemma)
  if (!target) return fail(state, 'ObjectNotHere', { lemma })

  switch (cmd.verb) {
    case 'untersuchen':
      return examine(level, state, target)
    case 'nehmen':
      return take(state, target)
    case 'öffnen':
      return open(level, state, target)
    default:
      return { state, events: [] }
  }
}

function look(level: Level, state: GameState): StepResult {
  const room = level.rooms.find((r) => r.id === state.roomId)!
  const exits = Object.keys(room.exits) as Direction[]
  const visible = inRoom(level, state).map((e) => e.noun)
  return { state, events: [text(texts.lookRoom(room.description, visible, exits))] }
}

function examine(level: Level, state: GameState, e: Entity): StepResult {
  let out = e.description
  if (e.openable && isOpen(state, e.id)) {
    const contents = level.entities.filter((c) => c.inside === e.id && !state.inventory.includes(c.id))
    out += ` ${texts.inside(contents.map((c) => c.noun))}`
  }
  return { state, events: [text(out)] }
}

function take(state: GameState, e: Entity): StepResult {
  if (state.inventory.includes(e.id)) return fail(state, 'AlreadyHave', { lemma: e.noun })
  if (!e.takeable) return fail(state, 'NotTakeable', { lemma: e.noun })
  return {
    state: { ...state, inventory: [...state.inventory, e.id] },
    events: [text(texts.taken(e.noun))],
  }
}

function open(level: Level, state: GameState, e: Entity): StepResult {
  if (!e.openable) return fail(state, 'NotOpenable', { lemma: e.noun })
  if (isOpen(state, e.id)) return fail(state, 'AlreadyOpen', { lemma: e.noun })

  const flags = { ...state.flags, [`open:${e.id}`]: true }
  let line = texts.opened(e.noun)
  if (e.locked && !state.flags[`unlocked:${e.id}`]) {
    if (!e.opensWith || !state.inventory.includes(e.opensWith)) {
      return fail(state, 'Locked', { lemma: e.noun })
    }
    flags[`unlocked:${e.id}`] = true
    const key = level.entities.find((k) => k.id === e.opensWith)!
    line = texts.unlockedAndOpened(e.noun, key.noun)
  }

  const next = { ...state, flags }
  const events: GameEvent[] = [text(line)]
  if (flags[level.goalFlag]) events.push({ type: 'win', text: texts.win })
  return { state: next, events }
}
