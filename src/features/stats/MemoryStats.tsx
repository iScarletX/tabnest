import { Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useStore, activeTabIds } from '../../store'

interface Props {
  onApply: () => Promise<void> | void
}

/** 经验估算：浏览器每个活跃 tab 平均 ~180 MB */
const AVG_MEM_PER_TAB_MB = 180

export function MemoryStats({ onApply }: Props) {
  const state = useStore()
  const [applying, setApplying] = useState(false)
  const totalTabs = activeTabIds(state).size
  const inboxCount = state.inbox.length
  const groupedCount = totalTabs - inboxCount

  const totalMem = totalTabs * AVG_MEM_PER_TAB_MB
  const groupedMem = groupedCount * AVG_MEM_PER_TAB_MB
  const inboxMem = inboxCount * AVG_MEM_PER_TAB_MB
  // 折叠的 Tab Group 源仅能渐进释放约 30~60%（依赖 Chrome 的 Tab Discard 机制）
  const releasable = Math.round(groupedMem * 0.5)

  const groupedPct = totalMem > 0 ? (groupedMem / totalMem) * 100 : 0
  const inboxPct = totalMem > 0 ? (inboxMem / totalMem) * 100 : 0

  const handleApply = async () => {
    if (applying) return
    setApplying(true)
    try {
      await onApply()
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="card p-5">
      <div className="grid md:grid-cols-3 gap-5 items-center">
        <div>
          <div className="text-xs text-ink-muted mb-1">📊 管理中</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight">{totalTabs}</span>
            <span className="text-sm text-ink-soft">个标签</span>
          </div>
          <div className="text-xs text-ink-muted mt-1.5 tabular-nums">
            占用约 <span className="text-ink">{(totalMem / 1024).toFixed(2)} GB</span> 内存
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-bg-soft overflow-hidden flex">
            <div className="bg-success transition-all duration-500" style={{ width: `${groupedPct}%` }} />
            <div className="bg-warn transition-all duration-500" style={{ width: `${inboxPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] mt-1.5 text-ink-muted">
            <span>🟢 已分组 {groupedCount}</span>
            <span>🟡 待整理 {inboxCount}</span>
          </div>
        </div>

        <div className="md:border-x md:border-line/40 md:px-5 text-center">
          <div className="text-xs text-ink-muted mb-1">✨ 一键应用预计释放</div>
          <div className="text-3xl font-bold text-brand-glow tabular-nums tracking-tight">
            ~{(releasable / 1024).toFixed(2)}
            <span className="text-base ml-0.5">GB</span>
          </div>
          <div className="text-[11px] text-ink-muted mt-1.5">
            折叠后 Chrome 会逐渐卸载后台标签
          </div>
        </div>

        <div className="text-right">
          <button className="btn-primary w-full py-2.5 text-sm" onClick={handleApply} disabled={applying}>
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {applying ? '正在应用…' : '一键应用方案'}
          </button>
          <div className="text-[10.5px] text-ink-muted mt-2 leading-relaxed">
            把当前分组写入浏览器 Tab Group，<br />Chrome 会自动卸载闲置标签释放内存
          </div>
        </div>
      </div>
    </div>
  )
}
