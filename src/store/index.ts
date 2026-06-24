import { useEffect, useState } from 'react'
import type { TabNestState, Tab, Group } from './types'
import { initialState } from './defaults'
import { loadState, saveState, onStateChange } from './storage'
import { normalizeUrl } from '../lib/chrome-api'

/** 查找某个 URL 已在哪个位置（返回存在的 tab id 和位置） */
function findExistingByUrl(s: TabNestState, url: string): { tabId: string; where: 'group' | 'inbox' } | null {
  const target = normalizeUrl(url)
  for (const g of s.groups) {
    for (const tid of g.tabIds) {
      const t = s.tabs[tid]
      if (t && normalizeUrl(t.url) === target) return { tabId: tid, where: 'group' }
    }
  }
  for (const tid of s.inbox) {
    const t = s.tabs[tid]
    if (t && normalizeUrl(t.url) === target) return { tabId: tid, where: 'inbox' }
  }
  return null
}

type Listener = () => void
type Action =
  | { type: 'addGroup'; group: Group }
  | { type: 'renameGroup'; id: string; name: string }
  | { type: 'recolorGroup'; id: string; color: string }
  | { type: 'deleteGroup'; id: string }
  | { type: 'moveTab'; tabId: string; toGroupId: string | 'inbox'; toIndex?: number }
  | { type: 'deleteTab'; tabId: string }
  | { type: 'restoreTab'; tabId: string; toGroupId: string }
  | { type: 'addTab'; tab: Tab; groupId: string | 'inbox' }
  | { type: 'upsertTabs'; tabs: Tab[]; groupId: string | 'inbox' }
  | { type: 'setPref'; patch: Partial<TabNestState['preferences']> }
  | { type: 'aiAutoClassify' }
  | { type: 'replaceState'; state: TabNestState }
  | { type: 'dedupeAll' }

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
    case 'recolorGroup':
      state = {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, color: action.color } : g,
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
      // 先查重（按 normalize URL）：如果已在某处存在，则不重复加入
      const existing = findExistingByUrl(state, action.tab.url)
      if (existing) {
        console.log('[TabNest] addTab 跳过重复 URL:', action.tab.url)
        break
      }
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
      // 演进式去重：对每个要插入的 tab，检查会不会和现有或本批已加的重复
      const seenUrls = new Set<string>()
      for (const g of state.groups) {
        for (const tid of g.tabIds) {
          const t = state.tabs[tid]
          if (t) seenUrls.add(normalizeUrl(t.url))
        }
      }
      for (const tid of state.inbox) {
        const t = state.tabs[tid]
        if (t) seenUrls.add(normalizeUrl(t.url))
      }
      for (const t of action.tabs) {
        const norm = normalizeUrl(t.url)
        if (seenUrls.has(norm)) {
          console.log('[TabNest] upsertTabs 跳过重复 URL:', t.url)
          continue
        }
        seenUrls.add(norm)
        newTabs[t.id] = { ...newTabs[t.id], ...t }
        newIds.push(t.id)
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
    case 'setPref':
      state = { ...state, preferences: { ...state.preferences, ...action.patch } }
      break
    case 'aiAutoClassify': {
      // 本地规则版（v1）。v2 接真 LLM 时替换这里。
      // 策略：不创建新分组。只能匹配到现有分组才归类，否则留在收件箱。
      // 路径：URL/标题关键词 → 语义标签（如 开发/文档/社交） → 模糊匹配现有分组名
      const rules: { kw: RegExp; tag: string; aliases: string[] }[] = [
        // tag：AI 识别出的语义标签，aliases：常见的同义分组名
        { kw: /github|stackoverflow|sdk|gitlab|bitbucket|vscode|npm|pnpm|leetcode/i,
          tag: '开发', aliases: ['开发', 'dev', '工作', '代码', 'work', 'coding', 'programming', '技术', '项目', 'project'] },
        { kw: /figma|dribbble|behance|sketch|invision|xd\./i,
          tag: '设计', aliases: ['设计', 'design', '工作', 'work', '项目', '创作'] },
        { kw: /arxiv|medium|smashing|substack|towardsdatascience|hackernews|ycombinator|paper|wikipedia/i,
          tag: '阅读', aliases: ['阅读', 'reading', '学习', 'study', 'learn', '资料', '文章', '知识'] },
        { kw: /chatgpt|claude\.ai|gemini\.google|openai\.com|anthropic|huggingface|perplexity|kimi|yuanbao|doubao/i,
          tag: 'AI', aliases: ['ai', 'AI', '工具', 'tools', '效率', 'ai工具'] },
        { kw: /youtube|bilibili|netflix|spotify|twitch|iqiyi|youku|tencent.*video|netease.*music/i,
          tag: '娱乐', aliases: ['娱乐', 'fun', '生活', 'life', '视频', '音乐', '看片', '休闲'] },
        { kw: /twitter|weibo|reddit|x\.com|instagram|tiktok|douyin|xiaohongshu|red\./i,
          tag: '社交', aliases: ['社交', 'social', '生活', 'life', '动态', '休闲'] },
        { kw: /notion|feishu|larkoffice|larksuite|google\.com\/docs|docs\.google|yuque|confluence|onenote/i,
          tag: '文档', aliases: ['文档', 'docs', 'doc', '工作', 'work', '笔记', 'notes'] },
        { kw: /mail|gmail|outlook|yahoo\.mail|mail\.qq\.com|mail\.163/i,
          tag: '邮箱', aliases: ['邮箱', 'mail', 'email', '工作', 'work'] },
        { kw: /taobao|jd\.com|tmall|pinduoduo|amazon|aliexpress|jingdong/i,
          tag: '购物', aliases: ['购物', 'shopping', '生活', 'life'] },
        { kw: /booking|airbnb|ctrip|trip\.com|qunar|fliggy|xiecheng/i,
          tag: '出行', aliases: ['出行', 'travel', '生活', 'life', '旅行'] },
      ]

      // 模糊匹配现有分组：检查 tag + aliases
      const findGroupForRule = (rule: { tag: string; aliases: string[] }) => {
        const candidates = [rule.tag, ...rule.aliases].map((s) => s.toLowerCase())
        return state.groups.find((g) => {
          const n = g.name.toLowerCase()
          return candidates.some((c) => n.includes(c) || c.includes(n))
        })
      }

      const newInbox: string[] = []
      let classified = 0
      let unmatched = 0

      for (const tid of state.inbox) {
        const t = state.tabs[tid]
        if (!t) continue
        const hit = rules.find((r) => r.kw.test(`${t.title} ${t.url} ${t.domain}`))
        const target = hit ? findGroupForRule(hit) : null

        if (target) {
          const targetId = target.id
          state.groups = state.groups.map((g) =>
            g.id === targetId ? { ...g, tabIds: [...g.tabIds, tid] } : g,
          )
          classified++
        } else {
          // 没匹配上 → 留在收件箱等用户手动处理
          newInbox.push(tid)
          unmatched++
        }
      }
      state = { ...state, inbox: newInbox }
      console.log(`[TabNest] 分类完成：${classified} 个入分组，${unmatched} 个留在收件箱。`)
      break
    }
    case 'replaceState':
      state = action.state
      break
    case 'dedupeAll': {
      // 扫描所有分组和收件箱，按 normalize URL 去重
      // 保留最早出现的标签，后续重复的全部移除
      const seen = new Set<string>()
      let removed = 0
      const cleanedTabs = { ...state.tabs }

      state.groups = state.groups.map((g) => {
        const keptIds: string[] = []
        for (const tid of g.tabIds) {
          const t = cleanedTabs[tid]
          if (!t) continue
          const norm = normalizeUrl(t.url)
          if (seen.has(norm)) {
            removed++
            delete cleanedTabs[tid]
          } else {
            seen.add(norm)
            keptIds.push(tid)
          }
        }
        return { ...g, tabIds: keptIds }
      })

      const newInbox: string[] = []
      for (const tid of state.inbox) {
        const t = cleanedTabs[tid]
        if (!t) continue
        const norm = normalizeUrl(t.url)
        if (seen.has(norm)) {
          removed++
          delete cleanedTabs[tid]
        } else {
          seen.add(norm)
          newInbox.push(tid)
        }
      }

      state = { ...state, tabs: cleanedTabs, inbox: newInbox }
      console.log(`[TabNest] 去重完成，移除 ${removed} 个重复标签`)
      break
    }
  }
  notify()
}

// —— 工具函数 ——
export function activeTabIds(s: TabNestState): Set<string> {
  return new Set([...s.groups.flatMap((g) => g.tabIds), ...s.inbox])
}
