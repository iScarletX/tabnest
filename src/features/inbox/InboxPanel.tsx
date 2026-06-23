import { useMemo } from 'react'
import { Inbox, Sparkles } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useStore, dispatch, getState } from '../../store'
import { TabCard } from '../tabs/TabCard'
import { showToast } from '../../shared/Toast'

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
      className={`card overflow-hidden transition-all duration-200 ${
        isOver ? 'border-brand/70 ring-4 ring-brand/15' : ''
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line/40 bg-brand-tint/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow">
            <Inbox size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">待整理收件箱</div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">AI 没把握的标签先放这</div>
          </div>
          {inbox.length > 0 && <span className="chip-brand ml-1">{inbox.length}</span>}
        </div>
        {inbox.length > 0 && (
          <button
            className="btn-primary text-xs py-1.5"
            onClick={() => {
              const before = getState().inbox.length
              const beforeGroups = getState().groups.length
              dispatch({ type: 'aiAutoClassify' })
              const after = getState().inbox.length
              const created = getState().groups.length - beforeGroups
              const classified = before - after
              showToast({
                title: classified > 0
                  ? `✨ 分类了 ${classified} 个标签`
                  : '🤔 没有标签被分类',
                desc: classified > 0
                  ? `${created > 0 ? `新建 ${created} 个分组・` : ''}剩 ${after} 个待手动处理`
                  : '需要你手动拖到分组里',
              })
            }}
          >
            <Sparkles size={12} /> 全部 AI 分类
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[50vh] overflow-y-auto">
        {inbox.length === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-sm text-ink-soft">收件箱已清空</div>
            <div className="text-xs text-ink-muted mt-1">干得漂亮！</div>
          </div>
        )}

        <SortableContext items={inbox.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {inbox.map((tab) => (
            <div key={tab.id} className="space-y-1.5">
              <TabCard tab={tab} showConfidence />
              <div className="flex items-center gap-1 px-2 flex-wrap">
                <span className="text-[10px] text-ink-muted mr-1">→ 移到：</span>
                {groups.slice(0, 4).map((g) => (
                  <button
                    key={g.id}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-bg-soft border border-line/50 hover:border-brand/40 hover:bg-brand-tint transition"
                    onClick={() =>
                      dispatch({ type: 'moveTab', tabId: tab.id, toGroupId: g.id })
                    }
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
