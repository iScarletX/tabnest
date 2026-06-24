import { X, ExternalLink, GripVertical, Globe } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { dispatch, useStore } from '../../store'
import { focusOrOpen, normalizeUrl } from '../../lib/chrome-api'
import type { Tab } from '../../store/types'
import clsx from 'clsx'
import { useRef } from 'react'

interface Props {
  tab: Tab
  showConfidence?: boolean
}

export function TabCard({ tab, showConfidence }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.id })

  const justDraggedRef = useRef(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const confColor =
    tab.confidence == null
      ? ''
      : tab.confidence > 0.7
      ? 'text-success border-success/30 bg-success/10'
      : tab.confidence > 0.4
      ? 'text-warn border-warn/30 bg-warn/10'
      : 'text-danger border-danger/30 bg-danger/10'

  const handleClick = (e: React.MouseEvent) => {
    // 拖动中 / 刚拖动完不触发点击
    if (isDragging || justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    e.stopPropagation()
    focusOrOpen(tab.url, tab.chromeTabId)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onPointerUp={() => {
        if (isDragging) justDraggedRef.current = true
      }}
      {...attributes}
      {...listeners}
      className={clsx(
        'group relative flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-xl',
        'bg-bg-soft/40 border border-transparent',
        'hover:bg-bg-hover hover:border-line/60',
        'cursor-grab active:cursor-grabbing',
        'transition-all duration-150 touch-none select-none',
      )}
    >
      <div
        className="text-ink-muted/40 group-hover:text-ink-soft transition-colors shrink-0"
        aria-hidden
      >
        <GripVertical size={14} />
      </div>

      <Favicon tab={tab} />

      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink truncate leading-tight">{tab.title}</div>
        <div className="text-[10.5px] text-ink-muted truncate mt-0.5">{tab.domain}</div>
      </div>

      {showConfidence && tab.confidence != null && (
        <span
          className={clsx(
            'shrink-0 px-1.5 py-0.5 rounded-md border text-[10px] font-medium tabular-nums',
            confColor,
          )}
          title={`AI 置信度 ${(tab.confidence * 100).toFixed(0)}%`}
        >
          {(tab.confidence * 100).toFixed(0)}%
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="btn-icon p-1"
          onClick={(e) => {
            e.stopPropagation()
            focusOrOpen(tab.url, tab.chromeTabId)
          }}
          title="打开/激活"
        >
          <ExternalLink size={12} />
        </button>
        <button
          className="p-1 rounded-lg text-ink-muted hover:bg-danger/20 hover:text-danger transition-colors"
          onClick={async (e) => {
            e.stopPropagation()
            // 1. 从 TabNest 数据库移除
            dispatch({ type: 'deleteTab', tabId: tab.id })
            
            // 2. ✨ 双向联动：如果在浏览器里开着，也一起关掉！
            try {
              const allTabs = await chrome.tabs.query({})
              const norm = normalizeUrl(tab.url)
              const toClose = allTabs.filter((t) => t.url && normalizeUrl(t.url) === norm)
              if (toClose.length > 0) {
                for (const t of toClose) {
                  if (t.id != null) chrome.tabs.remove(t.id).catch(() => {})
                }
              }
            } catch (err) {
              console.warn('[TabNest] 联动关闭浏览器标签失败', err)
            }
          }}
          title="从 TabNest 移除并关闭浏览器标签"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

function Favicon({ tab }: { tab: Tab }) {
  const show = useStore().preferences.showFavicon
  if (!show) {
    return (
      <span className="w-4 h-4 rounded-sm bg-bg-soft border border-line/40 flex items-center justify-center shrink-0 text-ink-muted">
        <Globe size={9} />
      </span>
    )
  }
  return (
    <img
      src={tab.favicon}
      alt=""
      className="w-4 h-4 rounded shrink-0"
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden'
      }}
    />
  )
}
