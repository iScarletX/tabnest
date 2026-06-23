/**
 * 待整理收件箱 = "AI 不确定"的兜底区
 * 只显示已经在 state.inbox 里的标签（不再混合"打开中的标签"）
 */
import { useMemo } from 'react'
import { HelpCircle } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useStore, dispatch } from '../../store'
import { TabCard } from '../tabs/TabCard'

export function InboxPanel() {
  const state = useStore()
  const inbox = useMemo(
    () => state.inbox.map((id) => state.tabs[id]).filter(Boolean),
    [state.inbox, state.tabs],
  )
  const groups = state.groups

  const { isOver, setNodeRef } = useDroppable({ id: 'inbox' })

  return (
    <div
      ref={setNodeRef}
      className={`card overflow-hidden transition-all duration-200 ${isOver ? 'ring-brand' : ''}`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line/40 bg-warn/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-warn/15 border border-warn/30 flex items-center justify-center">
            <HelpCircle size={14} className="text-warn" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">待手动整理</div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">
              AI 不确定怎么归类的标签会自动放到这里，由你决定
            </div>
          </div>
          {inbox.length > 0 && <span className="chip ml-1">{inbox.length}</span>}
        </div>
      </div>

      <div className="p-3 space-y-2 max-h-[40vh] overflow-y-auto">
        {inbox.length === 0 && (
          <div className="text-center py-8">
            <div className="text-2xl mb-1.5">✨</div>
            <div className="text-sm text-ink-soft">暂无待手动整理的标签</div>
            <div className="text-[11px] text-ink-muted mt-1">
              点上方"AI 一键分类"后，识别不出的标签会出现在这里
            </div>
          </div>
        )}

        <SortableContext items={inbox.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {inbox.map((tab) => (
            <div key={tab.id} className="space-y-1.5">
              <TabCard tab={tab} showConfidence />
              <div className="flex items-center gap-1 px-1 flex-wrap">
                <span className="text-[10px] text-ink-muted mr-1">→ 移到：</span>
                {groups.slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-bg-soft border border-line/50 hover:border-brand/40 hover:bg-brand-tint transition"
                    onClick={() => dispatch({ type: 'moveTab', tabId: tab.id, toGroupId: g.id })}
                  >
                    <span className="mr-0.5">{g.icon}</span>
                    {g.name}
                  </button>
                ))}
                <button
                  className="text-[11px] px-2 py-0.5 rounded-md text-danger hover:bg-danger/15 ml-auto"
                  onClick={() => dispatch({ type: 'deleteTab', tabId: tab.id })}
                >
                  丢弃
                </button>
              </div>
            </div>
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
