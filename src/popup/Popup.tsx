import { useEffect, useState } from 'react'
import { Settings, Sparkles, Layers, Inbox, FolderPlus, RefreshCw } from 'lucide-react'
import { useStore, dispatch, ensureLoaded, activeTabIds, getState } from '../store'
import { chromeTabToTab, applyPlanToBrowser } from '../lib/chrome-api'
import type { Tab } from '../store/types'

export function Popup() {
  const state = useStore()
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    ensureLoaded()
  }, [])

  const handleOpenFull = async () => {
    const url = chrome.runtime.getURL('src/options/index.html')
    const found = await chrome.tabs.query({ url })
    if (found.length > 0 && found[0].id != null) {
      chrome.tabs.update(found[0].id, { active: true })
      if (found[0].windowId != null) chrome.windows.update(found[0].windowId, { focused: true })
    } else {
      chrome.tabs.create({ url })
    }
    window.close()
  }

  const handleImportCurrentWindow = async () => {
    setBusy('import')
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const valid: Tab[] = tabs
        .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'))
        .map((t) => chromeTabToTab(t))
      // 去重（按 url）
      const existing = new Set(Object.values(getState().tabs).map((x) => x.url))
      const fresh = valid.filter((t) => !existing.has(t.url))
      if (fresh.length === 0) {
        alert('当前窗口的标签都已经在 TabNest 里了')
        return
      }
      dispatch({ type: 'upsertTabs', tabs: fresh, groupId: 'inbox' })
      alert(`已导入 ${fresh.length} 个新标签到收件箱`)
    } finally {
      setBusy(null)
    }
  }

  const handleAIClassify = async () => {
    setBusy('ai')
    try {
      dispatch({ type: 'aiAutoClassify' })
    } finally {
      setBusy(null)
    }
  }

  const handleApply = async () => {
    setBusy('apply')
    try {
      const s = getState()
      const result = await applyPlanToBrowser(s.groups, s.tabs)
      alert(`✨ 已应用：${result.appliedGroups} 个分组，打开了 ${result.openedTabs} 个新标签`)
    } catch (e: any) {
      alert('应用失败：' + e?.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="w-[360px] p-3 space-y-3">
      <div className="flex items-center gap-2.5 pb-1">
        <div className="w-9 h-9 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center text-lg">
          🪺
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">TabNest</div>
          <div className="text-[10.5px] text-ink-muted">让标签有处可栖</div>
        </div>
        <button
          className="btn-icon"
          onClick={() => chrome.runtime.openOptionsPage()}
          title="设置"
        >
          <Settings size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat icon={<Inbox size={14} />} label="收件箱" value={state.inbox.length} color="warn" />
        <Stat icon={<Layers size={14} />} label="分组" value={state.groups.length} color="brand" />
        <Stat icon={<Sparkles size={14} />} label="管理中" value={activeTabIds(state).size} color="success" />
      </div>

      <div className="space-y-1.5">
        <button
          className="w-full btn-primary justify-start py-2.5"
          onClick={handleOpenFull}
        >
          <Layers size={14} /> 打开整理台
        </button>

        <button
          className="w-full btn justify-start py-2"
          onClick={handleImportCurrentWindow}
          disabled={busy === 'import'}
        >
          <FolderPlus size={14} />
          {busy === 'import' ? '导入中…' : '导入当前窗口所有标签'}
        </button>

        <button
          className="w-full btn justify-start py-2"
          onClick={handleAIClassify}
          disabled={busy === 'ai' || state.inbox.length === 0}
        >
          <Sparkles size={14} />
          AI 分类收件箱
          {state.inbox.length > 0 && <span className="chip-brand ml-auto">{state.inbox.length}</span>}
        </button>

        <button
          className="w-full btn justify-start py-2"
          onClick={handleApply}
          disabled={busy === 'apply'}
        >
          <RefreshCw size={14} className={busy === 'apply' ? 'animate-spin' : ''} />
          {busy === 'apply' ? '应用中…' : '一键应用到浏览器'}
        </button>
      </div>

      <div className="text-[10px] text-ink-muted text-center pt-1">
        TabNest v0.1.0 · 数据 100% 本地存储
      </div>
    </div>
  )
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'warn' | 'brand' | 'success' }) {
  const colorMap = {
    warn: 'text-warn border-warn/30 bg-warn/10',
    brand: 'text-brand-glow border-brand/30 bg-brand/10',
    success: 'text-success border-success/30 bg-success/10',
  }
  return (
    <div className={`rounded-xl border ${colorMap[color]} p-2.5`}>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-ink-muted mt-1">{label}</div>
    </div>
  )
}
