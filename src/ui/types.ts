import type { GameEvent } from '../core/engine'

export interface LogEntry {
  kind: 'input' | GameEvent['type']
  text: string
}
