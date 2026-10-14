const UMLAUTS = ['ä', 'ö', 'ü', 'ß']

/** Buttons keep input focus (pointerdown default prevented) so the phone keyboard stays open. */
export default function UmlautRow({ onInsert, disabled }: { onInsert: (ch: string) => void; disabled?: boolean }) {
  return (
    <div className="chips umlauts">
      {UMLAUTS.map((ch) => (
        <button
          key={ch}
          type="button"
          className="chip"
          disabled={disabled}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onInsert(ch)}
        >
          {ch}
        </button>
      ))}
    </div>
  )
}
