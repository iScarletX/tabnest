/**
 * 待分类面板 = "当前浏览器打开 + 还没归到分组"的标签
 * 实时反映浏览器中的标签状态，是用户主动整理的入口
 */
import { useEffect, useMemo, useState } from 'react'
import { X, Inbox, Sparkles } from 'lucide-react'
import { useStore, dispatch, getState } from '../../store'
import { chromeTabToTab } from '../../lib/chrome-api'
import type { Tab } from '../../store/types'
import { showToast } from '../../shared/Toast'

function buildLiveTabs(
  chromeTabs: chrome.tabs.Tab[],
  managedUrls: Set<string>,
): Tab[] {
  // 过滤掉【已在分组 或 已在待手动整理】的 URL，避免同一个标签同时出现在两个面板
  return chromeTabs
    .filter((t) => {
      if (!t.url) return false
      if (t.url.startsWith('chrome://') || t.url.startsWith('chrome-extension://') || t.url.startsWith('about:')) return false
      if (managedUrls.has(t.url)) return false
      return true
    })
    .map((t) => {
      const base = chromeTabToTab(t)
      return { ...base, id: `live-${t.id}`, archivedAt: Date.now() }
    })
}

export function PendingPanel() {
  const state = useStore()
  const groups = state.groups

  // 【分组内 + 待手动整理】的 URL 都不重复出现在待分类
  // 在待手动整理里刮掉某个标签 → 重新打开该网页 → 会重新出现在待分类
  const managedUrls = useMemo(() => {
    const set = new Set<string>()
    for (const g of state.groups) {
      for (const tid of g.tabIds) {
        const t = state.tabs[tid]
        if (t) set.add(t.url)
      }
    }
    for (const tid of state.inbox) {
      const t = state.tabs[tid]
      if (t) set.add(t.url)
    }
    return set
  }, [state.groups, state.inbox, state.tabs])

  const [liveTabs, setLiveTabs] = useState<Tab[]>([])

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      try {
        if (!chrome?.tabs?.query) return
        const tabs = await chrome.tabs.query({ currentWindow: true })
        if (cancelled) return
        setLiveTabs(buildLiveTabs(tabs, managedUrls))
      } catch {}
    }
    refresh()
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
  }, [managedUrls])

  // 一键 AI 分类：入库 超 调用 AI 分类，不确定的留在【待手动整理】
  const handleClassifyAll = () => {
    if (liveTabs.length === 0) return
    const realTabs: Tab[] = liveTabs.map((lt) => ({
      ...lt,
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }))
    dispatch({ type: 'upsertTabs', tabs: realTabs, groupId: 'inbox' })

    const beforeInbox = getState().inbox.length
    dispatch({ type: 'aiAutoClassify' })
    const afterInbox = getState().inbox.length
    const classified = beforeInbox - afterInbox

    showToast({
      title: classified > 0 ? `✨ 分类了 ${classified} 个标签` : '🤔 没有标签被识别',
      desc:
        afterInbox > 0
          ? `${afterInbox} 个 AI 不确定，已放到下方 "待手动整理"`
          : '全部归位。点顺顶部 "一键应用方案" 写入浏览器',
    })
  }

  const moveSingle = (tab: Tab, groupId: string) => {
    // 把这个 live tab 入库并直接放到对应分组
    const realTab: Tab = {
      ...tab,
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }
    dispatch({ type: 'addTab', tab: realTab, groupId })
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-line/40 bg-success/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-success/15 border border-success/30 flex items-center justify-center">
            <Inbox size={14} className="text-success" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">待分类</div>
            <div className="text-[10.5px] text-ink-muted mt-0.5">
              浏览器中打开但还没归类的标签 · 点 AI 一键分类可批量整理
            </div>
          </div>
          {liveTabs.length > 0 && <span className="chip-brand ml-1">{liveTabs.length}</span>}
        </div>
        {liveTabs.length > 0 && (
          <button className="btn-primary text-xs py-1.5" onClick={handleClassifyAll}>
            <Sparkles size={12} /> AI 一键分类
          </button>
        )}
      </div>

      <div className="p-3 space-y-1.5 max-h-[40vh] overflow-y-auto">
        {liveTabs.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-1.5">🎉</div>
            <div className="text-sm text-ink-soft">没有待分类的标签</div>
            <div className="text-[11px] text-ink-muted mt-1">
              浏览器里的标签都已归类完毕
            </div>
          </div>
        )}

        {liveTabs.map((tab) => (
          <LiveRow key={tab.id} tab={tab} groups={groups} onMove={moveSingle} />
        ))}
      </div>
    </div>
  )
}

function LiveRow({
  tab,
  groups,
  onMove,
}: {
  tab: Tab
  groups: { id: string; name: string; icon: string }[]
  onMove: (tab: Tab, groupId: string) => void
}) {
  const show = useStore().preferences.showFavicon

  return (
    <div className="group flex items-center gap-2.5 pl-2 pr-2.5 py-2 rounded-lg bg-bg-soft/40 hover:bg-bg-hover transition-colors">
      <span
        className="w-1.5 h-1.5 rounded-full bg-success shrink-0 animate-pulse"
        title="正在浏览器中打开"
      />
      {show ? (
        <img
          src={tab.favicon}
          alt=""
          className="w-4 h-4 rounded shrink-0"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.visibility = 'hidden'
          }}
        />
      ) : (
        <span className="w-4 h-4 rounded-sm bg-bg-soft border border-line/40 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-ink truncate leading-tight">{tab.title}</div>
        <div className="text-[10.5px] text-ink-muted truncate mt-0.5">{tab.domain}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap justify-end">
        {groups.slice(0, 4).map((g) => (
          <button
            key={g.id}
            className="text-[10px] px-1.5 py-0.5 rounded-md bg-bg-soft border border-line/50 hover:border-brand/40 hover:bg-brand-tint transition"
            onClick={() => onMove(tab, g.id)}
            title={`移到 ${g.name}`}
          >
            {g.icon}
          </button>
        ))}
        <button
          className="p-0.5 rounded text-ink-muted hover:bg-danger/20 hover:text-danger"
          onClick={() => {
            if (tab.chromeTabId) chrome.tabs.remove(tab.chromeTabId)
          }}
          title="关闭浏览器标签"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}
