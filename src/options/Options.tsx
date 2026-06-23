import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus, FolderPlus, Zap } from 'lucide-react'
import { Header } from '../shared/Header'
import { ToastContainer, showToast } from '../shared/Toast'
import { ModeIndicator } from '../shared/ModeIndicator'
import { GroupCard } from '../features/groups/GroupCard'
import { InboxPanel } from '../features/inbox/InboxPanel'
import { SettingsModal } from '../features/settings/SettingsModal'
import { MemoryStats } from '../features/stats/MemoryStats'
import { dispatch, useStore, getState, ensureLoaded } from '../store'
import { applyPlanToBrowser, chromeTabToTab } from '../lib/chrome-api'

const PRESET_GROUPS = [
  { icon: '💼', name: '工作', color: '#5b71e3' },
  { icon: '📚', name: '学习', color: '#4cc38a' },
  { icon: '🎮', name: '项目', color: '#d97757' },
  { icon: '🧰', name: '工具', color: '#e3b341' },
  { icon: '🍔', name: '生活', color: '#ed6a5e' },
  { icon: '🎨', name: '灵感', color: '#a878e8' },
]

export function Options() {
  const state = useStore()
  const groups = state.groups
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    ensureLoaded()
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const tabId = active.id as string
    const overId = over.id as string

    const s = getState()
    const overGroup = s.groups.find((g) => g.id === overId)
    if (overGroup) {
      dispatch({ type: 'moveTab', tabId, toGroupId: overGroup.id })
    } else if (overId === 'inbox') {
      dispatch({ type: 'moveTab', tabId, toGroupId: 'inbox' })
    } else {
      const targetGroup = s.groups.find((g) => g.tabIds.includes(overId))
      if (targetGroup) {
        const idx = targetGroup.tabIds.indexOf(overId)
        dispatch({ type: 'moveTab', tabId, toGroupId: targetGroup.id, toIndex: idx })
      } else if (s.inbox.includes(overId)) {
        dispatch({ type: 'moveTab', tabId, toGroupId: 'inbox' })
      }
    }
  }

  const handleApplyPlan = async () => {
    try {
      const s = getState()
      const result = await applyPlanToBrowser(s.groups, s.tabs)
      showToast({
        title: `✨ 已应用 ${result.appliedGroups} 个分组`,
        desc:
          result.openedTabs > 0
            ? `打开了 ${result.openedTabs} 个新标签并折叠到 Tab Group`
            : '所有标签已折叠到 Tab Group',
      })
    } catch (e: any) {
      showToast({ title: '⚠️ 应用失败', desc: e?.message })
    }
  }

  const handleImportCurrent = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true })
    const valid = tabs
      .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
      .map((t) => chromeTabToTab(t))
    const existing = new Set(Object.values(state.tabs).map((x) => x.url))
    const fresh = valid.filter((t) => !existing.has(t.url))
    if (fresh.length === 0) {
      showToast({ title: '没有新标签', desc: '当前窗口的标签都已经在 TabNest 里了' })
      return
    }
    dispatch({ type: 'upsertTabs', tabs: fresh, groupId: 'inbox' })
    showToast({ title: `📥 导入了 ${fresh.length} 个标签`, desc: '请去收件箱查看并整理' })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="min-h-screen flex flex-col">
        <Header onOpenSettings={() => setSettingsOpen(true)} />

        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 space-y-5">
          <MemoryStats onApply={handleApplyPlan} />

          {/* 分组区 */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold tracking-tight">📂 我的分组</h2>
                <span className="text-xs text-ink-muted">{groups.length} 个</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="text-[11px] text-ink-muted mr-1">快速新建：</span>
                {PRESET_GROUPS.map((p) => (
                  <button
                    key={p.name}
                    className="text-[11px] px-2 py-1 rounded-lg bg-bg-soft border border-line/50 hover:border-brand/40 hover:bg-brand-tint transition-all"
                    onClick={() => {
                      dispatch({
                        type: 'addGroup',
                        group: {
                          id: `g-${Date.now()}`,
                          name: p.name,
                          icon: p.icon,
                          color: p.color,
                          tabIds: [],
                          createdAt: Date.now(),
                        },
                      })
                    }}
                  >
                    <Plus size={9} className="inline mr-0.5" />
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {groups.map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
              {groups.length === 0 && (
                <div className="card p-10 text-center text-sm text-ink-muted md:col-span-2">
                  还没有分组，点击上方按钮新建
                </div>
              )}
            </div>
          </section>

          <section>
            <InboxPanel />
          </section>

          <section className="grid md:grid-cols-3 gap-3 pt-2">
            <ModeIndicator onOpenSettings={() => setSettingsOpen(true)} />

            <button
              className="card p-3.5 flex items-center gap-3 hover:border-brand/40 transition-all group"
              onClick={handleImportCurrent}
            >
              <span className="w-9 h-9 rounded-xl bg-brand-tint border border-brand/30 flex items-center justify-center text-brand-glow shrink-0">
                <FolderPlus size={16} />
              </span>
              <div className="text-left flex-1">
                <div className="text-[10.5px] text-ink-muted">从浏览器</div>
                <div className="text-sm font-medium">导入当前窗口标签</div>
              </div>
              <span className="text-xs text-ink-muted opacity-0 group-hover:opacity-100">→</span>
            </button>

            <button
              className="card p-3.5 flex items-center gap-3 hover:border-warn/40 transition-all group"
              onClick={() => showToast({ title: '🚧 即将上线', desc: 'AI 真实分组功能即将上线' })}
            >
              <span className="w-9 h-9 rounded-xl bg-warn/15 border border-warn/30 flex items-center justify-center text-warn shrink-0">
                <Zap size={16} />
              </span>
              <div className="text-left flex-1">
                <div className="text-[10.5px] text-ink-muted">即将上线</div>
                <div className="text-sm font-medium">真实 AI 智能分组</div>
              </div>
              <span className="text-xs text-ink-muted opacity-0 group-hover:opacity-100">v0.2</span>
            </button>
          </section>

          <footer className="text-center text-[11px] text-ink-muted py-6">
            🪺 TabNest v0.1.0 · 让标签有处可栖 · 开源 MIT
          </footer>
        </main>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <ToastContainer />
      </div>
    </DndContext>
  )
}
