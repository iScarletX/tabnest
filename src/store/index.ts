import { useEffect, useState } from 'react'
import type { TabNestState, Tab, Group, AlertMode } from './types'
import { initialState } from './defaults'
import { loadState, saveState, onStateChange } from './storage'

type Listener = () => void
type Action =
  | { type: 'addGroup'; group: Group }
  | { type: 'renameGroup'; id: string; name: string }
  | { type: 'deleteGroup'; id: string }
  | { type: 'moveTab'; tabId: string; toGroupId: string | 'inbox'; toIndex?: number }
  | { type: 'deleteTab'; tabId: string }
  | { type: 'restoreTab'; tabId: string; toGroupId: string }
  | { type: 'addTab'; tab: Tab; groupId: string | 'inbox' }
  | { type: 'upsertTabs'; tabs: Tab[]; groupId: string | 'inbox' }
  | { type: 'setMode'; mode: AlertMode }
  | { type: 'setPref'; patch: Partial<TabNestState['preferences']> }
  | { type: 'toggleBlacklist'; domain: string }
  | { type: 'aiAutoClassify' }
  | { type: 'replaceState'; state: TabNestState }

let state: TabNestState = initialState
const listeners = new Set<Listener>()

/** 启动初始化 */
let _initialized = false
export async function ensureLoaded() {
  if (_initialized) return
  _initialized = true
  state = await loadState()
  notify(false)
  // 多页面同步：其他页面改了 storage 立即应用
  onStateChange((s) => {
    state = s
    listeners.forEach((l) => l())
  })
}

function notify(persist = true) {
  if (persist) saveState(state)
  listeners.forEach((l) => l())
}

export const getState = () => state

/** React hook：订阅整个 state */
export function useStore(): TabNestState {
  const [snap, setSnap] = useState(state)
  useEffect(() => {
    const l = () => setSnap(state)
    listeners.add(l)
    ensureLoaded()
    return () => {
      listeners.delete(l)
    }
  }, [])
  return snap
}

function removeTabFromAnywhere(id: string) {
  state.groups = state.groups.map((g) => ({
    ...g,
    tabIds: g.tabIds.filter((tid) => tid !== id),
  }))
  state.inbox = state.inbox.filter((tid) => tid !== id)
  state.trash = state.trash.filter((tid) => tid !== id)
}

export function dispatch(action: Action) {
  switch (action.type) {
    case 'addGroup':
      state = { ...state, groups: [...state.groups, action.group] }
      break
    case 'renameGroup':
      state = {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, name: action.name } : g,
        ),
      }
      break
    case 'deleteGroup': {
      const g = state.groups.find((x) => x.id === action.id)
      if (!g) break
      state = {
        ...state,
        groups: state.groups.filter((x) => x.id !== action.id),
        inbox: [...state.inbox, ...g.tabIds],
      }
      break
    }
    case 'moveTab': {
      removeTabFromAnywhere(action.tabId)
      if (action.toGroupId === 'inbox') {
        state.inbox = [...state.inbox, action.tabId]
      } else {
        state.groups = state.groups.map((g) => {
          if (g.id !== action.toGroupId) return g
          const ids = [...g.tabIds]
          const idx = action.toIndex ?? ids.length
          ids.splice(idx, 0, action.tabId)
          return { ...g, tabIds: ids }
        })
      }
      state = { ...state }
      break
    }
    case 'deleteTab':
      removeTabFromAnywhere(action.tabId)
      state = { ...state, trash: [...state.trash, action.tabId] }
      break
    case 'restoreTab':
      removeTabFromAnywhere(action.tabId)
      state.groups = state.groups.map((g) =>
        g.id === action.toGroupId ? { ...g, tabIds: [...g.tabIds, action.tabId] } : g,
      )
      state = { ...state }
      break
    case 'addTab': {
      state.tabs = { ...state.tabs, [action.tab.id]: action.tab }
      if (action.groupId === 'inbox') {
        state.inbox = [...state.inbox, action.tab.id]
      } else {
        state.groups = state.groups.map((g) =>
          g.id === action.groupId ? { ...g, tabIds: [...g.tabIds, action.tab.id] } : g,
        )
      }
      state = { ...state }
      break
    }
    case 'upsertTabs': {
      const newTabs = { ...state.tabs }
      const newIds: string[] = []
      for (const t of action.tabs) {
        if (!newTabs[t.id]) newIds.push(t.id)
        newTabs[t.id] = { ...newTabs[t.id], ...t }
      }
      state.tabs = newTabs
      if (action.groupId === 'inbox') {
        state.inbox = [...state.inbox, ...newIds]
      } else {
        state.groups = state.groups.map((g) =>
          g.id === action.groupId ? { ...g, tabIds: [...g.tabIds, ...newIds] } : g,
        )
      }
      state = { ...state }
      break
    }
    case 'setMode':
      state = { ...state, preferences: { ...state.preferences, mode: action.mode } }
      break
    case 'setPref':
      state = { ...state, preferences: { ...state.preferences, ...action.patch } }
      break
    case 'toggleBlacklist': {
      const exists = state.blacklist.includes(action.domain)
      state = {
        ...state,
        blacklist: exists
          ? state.blacklist.filter((d) => d !== action.domain)
          : [...state.blacklist, action.domain],
      }
      break
    }
    case 'aiAutoClassify': {
      // 本地规则版（v1）。v2 接真 LLM 时替换这里。
      // 策略：按关键词匹配出语义标签，再模糊匹配现有分组。
      // 如果现有分组都不匹配，则自动创建一个新分组。
      const rules: { kw: RegExp; tag: string; icon: string; color: string }[] = [
        { kw: /github|stackoverflow|sdk|api|gitlab|bitbucket|vscode|npm|pnpm/i,
          tag: '开发', icon: '💻', color: '#5b8def' },
        { kw: /figma|dribbble|behance|sketch|design/i,
          tag: '设计', icon: '🎨', color: '#ab47bc' },
        { kw: /arxiv|medium|smashing|substack|blog|paper|towardsdatascience|hackernews|ycombinator/i,
          tag: '阅读', icon: '📚', color: '#66bb6a' },
        { kw: /chatgpt|claude|gemini|openai|anthropic|huggingface|perplexity/i,
          tag: 'AI 工具', icon: '🤖', color: '#8b7cff' },
        { kw: /youtube|bilibili|netflix|spotify|twitch|iqiyi|youku/i,
          tag: '娱乐', icon: '🎉', color: '#ef5350' },
        { kw: /twitter|weibo|reddit|x\.com|instagram|tiktok|douyin/i,
          tag: '社交', icon: '💬', color: '#f06292' },
        { kw: /notion|feishu|larksuite|google\.com\/docs|wenku|yuque|confluence/i,
          tag: '文档', icon: '📄', color: '#5b8def' },
        { kw: /mail|gmail|outlook|yahoo|qq\.com\/mail/i,
          tag: '邮箱', icon: '✉️', color: '#ffb74d' },
      ]

      // 模糊匹配分组（名称包含关键词即可）
      const findGroupForTag = (tag: string) => {
        const tagLower = tag.toLowerCase()
        return state.groups.find((g) => {
          const n = g.name.toLowerCase()
          // 双向包含：分组名含 tag 关键词、或 tag 包含分组关键词
          return n.includes(tagLower) || tagLower.split(/\s/).some((kw) => n.includes(kw))
        })
      }

      const newInbox: string[] = []
      const newGroupsByTag: Record<string, string> = {}
      let classified = 0
      let createdGroups = 0

      for (const tid of state.inbox) {
        const t = state.tabs[tid]
        if (!t) continue
        const hit = rules.find((r) => r.kw.test(`${t.title} ${t.url} ${t.domain}`))
        if (!hit) {
          newInbox.push(tid)
          continue
        }

        // 1. 先看现有分组
        let target = findGroupForTag(hit.tag)

        // 2. 看本次分类周期里已创建过该 tag 的新分组
        if (!target && newGroupsByTag[hit.tag]) {
          target = state.groups.find((g) => g.id === newGroupsByTag[hit.tag]) ?? undefined
        }

        // 3. 都没有 → 创建新分组
        if (!target) {
          const newGroup = {
            id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: hit.tag,
            icon: hit.icon,
            color: hit.color,
            tabIds: [],
            createdAt: Date.now(),
          }
          state.groups = [...state.groups, newGroup]
          newGroupsByTag[hit.tag] = newGroup.id
          target = newGroup
          createdGroups++
        }

        // 4. 插入目标分组
        const targetId = target.id
        state.groups = state.groups.map((g) =>
          g.id === targetId ? { ...g, tabIds: [...g.tabIds, tid] } : g,
        )
        classified++
      }
      state = { ...state, inbox: newInbox }
      console.log(`[TabNest] AI 分类完成：${classified} 个标签入盒，新建 ${createdGroups} 个分组。`)
      break
    }
    case 'replaceState':
      state = action.state
      break
  }
  notify()
}

// —— 工具函数 ——
export function activeTabIds(s: TabNestState): Set<string> {
  return new Set([...s.groups.flatMap((g) => g.tabIds), ...s.inbox])
}
