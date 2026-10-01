const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←']

/**
 * The 3×4 amount keypad shared by the add and edit screens. `onPress` gets the
 * raw key label — the same string the physical-keyboard handler feeds in, so
 * both input paths land in one place.
 *
 * `size` is the key diameter: 64px on the phone, larger where there's room.
 */
export default function Numpad({ onPress, size = 64, gap = 'gap-3', className = '' }) {
  return (
    <div className={`grid grid-cols-3 ${gap} justify-items-center ${className}`}>
      {KEYS.map((k, i) => {
        const isSym = k === '.' || k === '←'
        return (
          <button
            key={i}
            onClick={() => onPress(k)}
            className="flex items-center justify-center transition-colors duration-150 active:scale-90 bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]"
            style={{
              width: size,
              height: size,
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-full)',
              color: isSym ? 'var(--text-tertiary)' : 'var(--text-primary)',
              fontSize: isSym ? Math.round(size * 0.25) + 'px' : Math.round(size * 0.3125) + 'px',
              fontWeight: isSym ? 400 : 500,
              fontFamily: isSym ? 'var(--font-ui)' : 'var(--font-mono)',
              boxShadow: 'var(--shadow-key)',
            }}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}
