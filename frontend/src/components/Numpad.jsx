import { Delete } from 'lucide-react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←']

/**
 * The 3×4 amount keypad shared by the add and edit forms. `onPress` gets the
 * raw key label — the same string the physical-keyboard handler feeds in, so
 * both input paths land in one place.
 */
export default function Numpad({ onPress, className = '' }) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {KEYS.map((k) => {
        const isSym = k === '.' || k === '←'
        return (
          <button
            key={k}
            type="button"
            onClick={() => onPress(k)}
            aria-label={k === '←' ? 'Стереть' : k === '.' ? 'Точка' : k}
            className={`flex h-14 items-center justify-center rounded-2xl bg-card shadow-[0_1px_2px_rgba(14,20,48,0.05)] ring-1 ring-black/[0.03] transition-[background-color,transform] duration-100 hover:bg-muted active:scale-95 active:bg-muted ${
              isSym ? 'text-[20px] text-muted-foreground' : 'text-[22px] font-semibold text-foreground'
            }`}
          >
            {k === '←' ? <Delete className="h-5 w-5" strokeWidth={1.9} /> : k === '.' ? ',' : k}
          </button>
        )
      })}
    </div>
  )
}
