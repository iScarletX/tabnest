import { useEffect, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { Header } from '../shared/Header'
import { ToastContainer, showToast } from '../shared/Toast'
import { GroupCard } from '../features/groups/GroupCard'
import { PendingPanel } from '../features/inbox/PendingPanel'
import { InboxPanel } from '../features/inbox/InboxPanel'
import { SettingsModal } from '../features/settings/SettingsModal'
import { MemoryStats } from '../features/stats/MemoryStats'
import { dispatch, useStore, getState, ensureLoaded } from '../store'
import { applyPlanToBrowser, chromeTabToTab } from '../lib/chrome-api'
import type { Tab } from '../store/types'

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

  // 一键智能整理：AI 分类 超 + 写入浏览器 Tab Groups
  const handleSmartOrganize = async () => {
    try {
      // 1. 把浏览器里所有未归组的标签入库到待手动整理
      const chromeTabs = await chrome.tabs.query({ currentWindow: true })
      const groupedUrls = new Set(
        getState().groups.flatMap((g) =>
          g.tabIds.map((id) => getState().tabs[id]?.url).filter(Boolean) as string[],
        ),
      )
      const fresh: Tab[] = chromeTabs
        .filter((t) => {
          if (!t.url) return false
          if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://') || t.url.startsWith('about:')) return false
          return !groupedUrls.has(t.url)
        })
        .map((t) => {
          const base = chromeTabToTab(t)
          return { ...base, id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
        })
      if (fresh.length > 0) {
        // 去重：待手动整理里已有的 URL 不重复入库
        const inboxUrls = new Set(
          getState().inbox.map((id) => getState().tabs[id]?.url).filter(Boolean) as string[],
        )
        const toImport = fresh.filter((t) => !inboxUrls.has(t.url))
        if (toImport.length > 0) {
          dispatch({ type: 'upsertTabs', tabs: toImport, groupId: 'inbox' })
        }
      }

      // 2. AI 分类待手动整理里的标签
      const beforeInbox = getState().inbox.length
      dispatch({ type: 'aiAutoClassify' })
      const afterInbox = getState().inbox.length
      const classified = beforeInbox - afterInbox

      // 3. 写入浏览器 Tab Groups
      const s = getState()
      const result = await applyPlanToBrowser(s.groups, s.tabs)

      // 4. 反馈
      const parts: string[] = []
      if (classified > 0) parts.push(`分类 ${classified} 个标签`)
      if (result.appliedGroups > 0) parts.push(`应用 ${result.appliedGroups} 个分组到浏览器`)
      if (afterInbox > 0) parts.push(`${afterInbox} 个待手动处理`)

      showToast({
        title: parts.length > 0 ? `✨ ${parts[0]}` : '✨ 整理完成',
        desc: parts.slice(1).join(' ・ ') || '所有标签已到位',
      })
    } catch (e: any) {
      showToast({ title: '⚠️ 整理失败', desc: e?.message })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="min-h-screen flex flex-col">
        <Header onOpenSettings={() => setSettingsOpen(true)} />

        <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 space-y-5">
          {/* ① 内存总览 + 一键应用 */}
          <MemoryStats onApply={handleSmartOrganize} />

          {/* ② 待分类（最上方，浏览器里打开但还没归类的）*/}
          <PendingPanel />

          {/* ③ 我的分组（核心区域）*/}
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

          {/* ④ 待手动整理（AI 兜底，永远显示）*/}
          <InboxPanel />

          <footer className="text-center text-[11px] text-ink-muted py-6">
            🪺 TabNest v0.1.4 · 让标签有处可栖 · 开源 MIT
          </footer>
        </main>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <ToastContainer />
      </div>
    </DndContext>
  )
}
