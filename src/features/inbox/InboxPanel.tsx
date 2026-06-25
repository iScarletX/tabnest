/**
 * 待整理收件箱 = "AI 不确定"的兜底区
 * 只显示已经在 state.inbox 里的标签（不再混合"打开中的标签"）
 */
import { useMemo } from 'react'
import { HelpCircle, Trash2 } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useStore, dispatch } from '../../store'
import { TabCard } from '../tabs/TabCard'
import { normalizeUrl } from '../../lib/chrome-api'

export function InboxPanel() {
  const state = useStore()
  const groups = state.groups

  // 防御性过滤：任何 URL 已在分组里的标签，不在待手动整理里重复显示
  const groupedUrls = useMemo(() => {
    const set = new Set<string>()
    for (const g of state.groups) {
      for (const tid of g.tabIds) {
        const t = state.tabs[tid]
        if (t) set.add(normalizeUrl(t.url))
      }
    }
    return set
  }, [state.groups, state.tabs])

  const inbox = useMemo(
    () => state.inbox
      .map((id) => state.tabs[id])
      .filter((t): t is NonNullable<typeof t> => Boolean(t))
      .filter((t) => !groupedUrls.has(normalizeUrl(t.url))),
    [state.inbox, state.tabs, groupedUrls],
  )

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
        {inbox.length > 0 && (
          <button
            className="btn text-xs py-1 text-danger hover:bg-danger/15 hover:border-danger/40"
            onClick={async () => {
              if (confirm(`确定清空所有 ${inbox.length} 个待手动整理的标签？这将同时关闭它们在浏览器中打开的页面。`)) {
                // 1. 从 TabNest 数据库移除
                inbox.forEach((t) => dispatch({ type: 'deleteTab', tabId: t.id }))
                
                // 2. 双向联动：如果在浏览器里开着，也一起关掉
                try {
                  const allTabs = await chrome.tabs.query({})
                  const normSet = new Set(inbox.map(t => normalizeUrl(t.url)))
                  const toClose = allTabs.filter(t => t.url && normSet.has(normalizeUrl(t.url)))
                  for (const t of toClose) {
                    if (t.id != null) chrome.tabs.remove(t.id).catch(() => {})
                  }
                } catch (err) {
                  console.warn('[TabNest] 联动批量关闭浏览器标签失败', err)
                }
              }
            }}
          >
            <Trash2 size={11} /> 全部清空
          </button>
        )}
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
              </div>
            </div>
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
