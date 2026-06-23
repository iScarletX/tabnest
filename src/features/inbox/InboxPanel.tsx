import { useEffect, useMemo, useState } from 'react'
import { Inbox, Sparkles } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useStore, dispatch, getState, activeTabIds } from '../../store'
import { TabCard } from '../tabs/TabCard'
import { showToast } from '../../shared/Toast'
import { chromeTabToTab, domainOf, faviconOf } from '../../lib/chrome-api'
import type { Tab } from '../../store/types'

/** 把 chrome.tabs 里"未归类"的部分转成虚拟 Tab 显示在收件箱 */
function buildLiveTabs(chromeTabs: chrome.tabs.Tab[], existingUrls: Set<string>): Tab[] {
  return chromeTabs
    .filter((t) => {
      if (!t.url) return false
      if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://') || t.url.startsWith('about:')) return false
      if (existingUrls.has(t.url)) return false // 已在 TabNest 里就不重复显示
      return true
    })
    .map((t) => {
      const base = chromeTabToTab(t)
      return { ...base, id: `live-${t.id}`, source: 'manual', archivedAt: Date.now() }
    })
}

export function InboxPanel() {
  const state = useStore()
  const showLive = state.preferences.showOpenTabsInInbox

  // 已存在的 url 集合（包括分组里的 + 已经在收件箱里的）
  const existingUrls = useMemo(
    () => new Set(Object.values(state.tabs).map((t) => t.url)),
    [state.tabs],
  )

  // 实时获取浏览器里打开的标签
  const [liveTabs, setLiveTabs] = useState<Tab[]>([])

  useEffect(() => {
    if (!showLive) {
      setLiveTabs([])
      return
    }
    let cancelled = false
    const refresh = async () => {
      try {
        if (!chrome?.tabs?.query) return
        const tabs = await chrome.tabs.query({ currentWindow: true })
        if (cancelled) return
        setLiveTabs(buildLiveTabs(tabs, existingUrls))
      } catch {}
    }
    refresh()
    // 监听 chrome 标签变化
    const handler = () => refresh()
    if (chrome?.tabs?.onCreated) chrome.tabs.onCreated.addListener(handler)
    if (chrome?.tabs?.onRemoved) chrome.tabs.onRemoved.addListener(handler)
    if (chrome?.tabs?.onUpdated) chrome.tabs.onUpdated.addListener(handler)
    return () => {
      cancelled = true
      try {
        if (chrome?.tabs?.onCreated) chrome.tabs.onCreated.removeListener(handler)
        if (chrome?.tabs?.onRemoved) chrome.tabs.onRemoved.removeListener(handler)
        if (chrome?.tabs?.onUpdated) chrome.tabs.onUpdated.removeListener(handler)
      } catch {}
    }
  }, [showLive, existingUrls])

  // 已归档的 inbox 标签（关闭/手动收藏来的）
  const archivedTabs = useMemo(
    () => state.inbox.map((id) => state.tabs[id]).filter(Boolean),
    [state.inbox, state.tabs],
  )

  const totalCount = archivedTabs.length + liveTabs.length

  const { isOver, setNodeRef } = useDroppable({ id: 'inbox' })

  // 一键 AI 分类（合并版：分类已归档 + 把没归到分组的打开中标签先入库再分类）
  const handleAIClassify = () => {
    // 1. 把当前打开但未归类的标签全部入库到收件箱
    if (liveTabs.length > 0) {
      const importTabs: Tab[] = liveTabs.map((lt) => ({
        ...lt,
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      }))
      dispatch({ type: 'upsertTabs', tabs: importTabs, groupId: 'inbox' })
    }
    // 2. AI 分类
    const before = getState().inbox.length
    const beforeGroups = getState().groups.length
    dispatch({ type: 'aiAutoClassify' })
    const after = getState().inbox.length
    const created = getState().groups.length - beforeGroups
    const classified = before - after
    showToast({
      title: classified > 0 ? `✨ 分类了 ${classified} 个标签` : '🤔 没有标签被分类',
      desc: classified > 0
        ? `${created > 0 ? `新建 ${created} 个分组 · ` : ''}剩 ${after} 个待手动处理`
        : '没有匹配到任何分组，请手动拖拽',
    })
  }

  return (
    <div
      ref={setNodeRef}
      className={`card overflow-hidden transition-all duration-200 ${
        isOver ? 'ring-brand' : ''
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line/40 bg-brand-tint/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center shadow-glow">
            <Inbox size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">待整理收件箱</div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">
              {liveTabs.length > 0 && (
                <span className="text-success">● 打开中 {liveTabs.length}</span>
              )}
              {liveTabs.length > 0 && archivedTabs.length > 0 && <span> · </span>}
              {archivedTabs.length > 0 && (
                <span>已归档 {archivedTabs.length}</span>
              )}
              {totalCount === 0 && '空'}
            </div>
          </div>
          {totalCount > 0 && <span className="chip-brand ml-1">{totalCount}</span>}
        </div>
        {totalCount > 0 && (
          <button className="btn-primary text-xs py-1.5" onClick={handleAIClassify}>
            <Sparkles size={12} /> 全部 AI 分类
          </button>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto">
        {totalCount === 0 && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-sm text-ink-soft">收件箱已清空</div>
            <div className="text-xs text-ink-muted mt-1">所有标签都已归位</div>
          </div>
        )}

        <SortableContext items={[...liveTabs, ...archivedTabs].map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {/* 正在打开的标签（绿点标识） */}
          {liveTabs.map((tab) => (
            <TabRow key={tab.id} tab={tab} isLive />
          ))}
          {/* 已归档的标签 */}
          {archivedTabs.map((tab) => (
            <TabRow key={tab.id} tab={tab} isLive={false} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

function TabRow({ tab, isLive }: { tab: Tab; isLive: boolean }) {
  const groups = useStore().groups
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-1.5">
        {isLive ? (
          <span
            className="w-1.5 h-1.5 rounded-full bg-success mt-3.5 shrink-0 animate-pulse"
            title="正在浏览器中打开"
          />
        ) : (
          <span className="w-1.5 mt-3.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <TabCard tab={tab} showConfidence />
        </div>
      </div>
      <div className="flex items-center gap-1 pl-4 flex-wrap">
        <span className="text-[10px] text-ink-muted mr-1">→ 移到：</span>
        {groups.slice(0, 4).map((g) => (
          <button
            key={g.id}
            className="text-[11px] px-2 py-0.5 rounded-md bg-bg-soft border border-line/50 hover:border-brand/40 hover:bg-brand-tint transition"
            onClick={() => {
              if (isLive) {
                // 先入库再移动
                const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
                dispatch({
                  type: 'addTab',
                  tab: { ...tab, id: newId },
                  groupId: g.id,
                })
              } else {
                dispatch({ type: 'moveTab', tabId: tab.id, toGroupId: g.id })
              }
            }}
          >
            <span className="mr-0.5">{g.icon}</span>
            {g.name}
          </button>
        ))}
        {!isLive && (
          <button
            className="text-[11px] px-2 py-0.5 rounded-md text-danger hover:bg-danger/15 ml-auto"
            onClick={() => dispatch({ type: 'deleteTab', tabId: tab.id })}
          >
            丢弃
          </button>
        )}
      </div>
    </div>
  )
}
