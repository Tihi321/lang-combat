import { Preferences } from '@capacitor/preferences'
import type { GameState } from '../core/engine'
import type { LogEntry } from './types'

const KEY = 'lang-combat:save:v1'
const MAX_LOG = 300

export interface Save {
  state: GameState
  log: LogEntry[]
}

export async function loadSave(): Promise<Save | null> {
  let raw: string | null = null
  try {
    raw = (await Preferences.get({ key: KEY })).value
  } catch {
    // fall through to localStorage
  }
  if (raw == null) {
    try {
      raw = localStorage.getItem(KEY)
    } catch {
      return null
    }
  }
  if (raw == null) return null
  try {
    const s = JSON.parse(raw) as Save
    const ok =
      typeof s?.state?.roomId === 'string' &&
      Array.isArray(s.state.inventory) &&
      typeof s.state.flags === 'object' &&
      s.state.flags !== null &&
      Array.isArray(s.log) &&
      s.log.every((e) => typeof e?.kind === 'string' && typeof e.text === 'string')
    return ok ? s : null
  } catch {
    return null
  }
}

export async function writeSave(save: Save): Promise<void> {
  const value = JSON.stringify({ state: save.state, log: save.log.slice(-MAX_LOG) })
  try {
    await Preferences.set({ key: KEY, value })
    return
  } catch {
    // fall back
  }
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // storage unavailable; play on without persistence
  }
}

export async function clearSave(): Promise<void> {
  try {
    await Preferences.remove({ key: KEY })
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
