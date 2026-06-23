import { useStore } from '../store'

const modeInfo = {
  A: { icon: '🤫', label: '手动整理', color: '#5b9cd6' },
  B: { icon: '🔔', label: '轻提醒', color: '#e3b341' },
  C: { icon: '✨', label: 'AI 自动归档', color: '#9b85ff' },
  D: { icon: '🎯', label: '实时归位', color: '#4cc38a' },
}

interface Props {
  onOpenSettings: () => void
}

export function ModeIndicator({ onOpenSettings }: Props) {
  const state = useStore()
  const info = modeInfo[state.preferences.mode]

  return (
    <button
      className="card p-3.5 flex items-center gap-3 hover:border-brand/40 transition-all duration-200 group w-full"
      onClick={onOpenSettings}
    >
      <span
        className="text-xl w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${info.color}22`, border: `1px solid ${info.color}44` }}
      >
        {info.icon}
      </span>
      <div className="flex-1 text-left min-w-0">
        <div className="text-[10.5px] text-ink-muted">当前模式</div>
        <div className="text-sm font-medium" style={{ color: info.color }}>
          {info.label}
        </div>
      </div>
      <span className="text-xs text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity">
        切换 →
      </span>
    </button>
  )
}
