import { useEffect, useRef } from 'react'
import type { LogEntry } from './types'

export default function Terminal({ log }: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [log])
  return (
    <div className="log" role="log" aria-live="polite">
      {log.map((e, i) => (
        <p key={i} className={`entry entry-${e.kind}`}>
          {e.kind === 'input' ? `> ${e.text}` : e.text}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  )
}
