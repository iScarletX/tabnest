import { useStore, activeTabIds } from '../store'
import { Settings, Search } from 'lucide-react'

interface Props {
  onOpenSettings: () => void
}

export function Header({ onOpenSettings }: Props) {
  const state = useStore()
  const tabCount = activeTabIds(state).size

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-line/50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center text-xl">
            🪺
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none tracking-tight">TabNest</h1>
            <p className="text-[11px] text-ink-muted mt-1.5">让标签有处可栖</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-3 text-xs text-ink-muted mr-2 px-3 py-1.5 rounded-xl bg-bg-soft border border-line/40">
            <span>
              <b className="text-ink">{tabCount}</b> 个标签
            </span>
            <span className="w-px h-3 bg-line" />
            <span>
              <b className="text-brand-glow">{state.groups.length}</b> 个分组
            </span>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input placeholder="搜索标签…" className="input pl-9 pr-3 py-2 w-56 focus:w-72" />
          </div>

          <button className="btn-icon" onClick={onOpenSettings} title="设置">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
