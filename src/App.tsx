import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FLOOR1, initialState, step, visibleNouns } from './core/engine'
import type { GameState } from './core/engine'
import type { Direction } from './core/parser'
import Terminal from './ui/Terminal'
import UmlautRow from './ui/UmlautRow'
import WordChips from './ui/WordChips'
import { clearSave, loadSave, writeSave } from './ui/storage'
import type { LogEntry } from './ui/types'

const freshLog = (): LogEntry[] => [{ kind: 'text', text: FLOOR1.intro }]

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [state, setState] = useState<GameState>(() => initialState(FLOOR1))
  const [log, setLog] = useState<LogEntry[]>(freshLog)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSave().then((save) => {
      if (cancelled) return
      if (save) {
        setState(save.state)
        setLog(save.log)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Restore the caret after a programmatic edit of the input.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (caret.current != null && el) {
      el.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [value])

  const won = !!state.flags[FLOOR1.goalFlag]

  // The input is disabled after a win, so refocus it once a new game re-enables it.
  useEffect(() => {
    if (loaded && !won) inputRef.current?.focus()
  }, [loaded, won])

  function submit() {
    const text = value.trim()
    if (!text || won) return
    const result = step(FLOOR1, state, text)
    const nextLog: LogEntry[] = [
      ...log,
      { kind: 'input', text },
      ...result.events.map((ev) => ({ kind: ev.type, text: ev.text })),
    ]
    setState(result.state)
    setLog(nextLog)
    setValue('')
    void writeSave({ state: result.state, log: nextLog })
    inputRef.current?.focus()
  }

  function insertAtCursor(ch: string) {
    const el = inputRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    caret.current = start + ch.length
    setValue(value.slice(0, start) + ch + value.slice(end))
    el?.focus()
  }

  function appendWord(word: string) {
    const sep = value === '' || value.endsWith(' ') ? '' : ' '
    const next = value + sep + word + ' '
    caret.current = next.length
    setValue(next)
    inputRef.current?.focus()
  }

  function newGame() {
    setState(initialState(FLOOR1))
    setLog(freshLog())
    setValue('')
    void clearSave()
    inputRef.current?.focus()
  }

  if (!loaded) return <div className="app loading">…</div>

  const room = FLOOR1.rooms.find((r) => r.id === state.roomId)
  const exits = Object.keys(room?.exits ?? {}) as Direction[]

  return (
    <div className="app">
      <header className="bar">
        <span className="title">Lang Combat · Stockwerk 1</span>
        <button type="button" className="newgame" onClick={newGame}>
          Neues Spiel
        </button>
      </header>
      <Terminal log={log} />
      <footer className="controls">
        <WordChips nouns={visibleNouns(FLOOR1, state)} exits={exits} onPick={appendWord} disabled={won} />
        <UmlautRow onInsert={insertAtCursor} disabled={won} />
        <form
          className="inputrow"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={won}
            placeholder={won ? 'Gewonnen! Neues Spiel?' : 'Schreibe auf Deutsch…'}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="send"
          />
          <button type="submit" className="send" disabled={won} onPointerDown={(e) => e.preventDefault()} aria-label="Senden">
            ↵
          </button>
        </form>
      </footer>
    </div>
  )
}
