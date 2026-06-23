/// <reference types="chrome" />
/**
 * TabNest Service Worker
 * - 监听标签生命周期
 * - 实现"2 分钟存在阈值 + 黑名单"判定
 * - 关闭符合条件的标签 → 自动归档到收件箱
 * - 右键菜单"加到 TabNest"
 */

import { ensureLoaded, getState, dispatch } from '../store'
import { domainOf, faviconOf, chromeTabToTab } from '../lib/chrome-api'
import type { Tab } from '../store/types'

// 内存中的标签元数据（标签 id → 出生时间 & url & title）
interface TabMeta {
  tabId: number
  url: string
  title: string
  favicon: string
  bornAt: number
}
const liveTabs = new Map<number, TabMeta>()

// ============================================================
//  生命周期事件
// ============================================================

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[TabNest] 🪺 installed')
  await ensureLoaded()
  await setupContextMenus()
  // 初始化已经打开的标签
  const tabs = await chrome.tabs.query({})
  const now = Date.now()
  for (const t of tabs) {
    if (t.id == null) continue
    liveTabs.set(t.id, {
      tabId: t.id,
      url: t.url || '',
      title: t.title || '',
      favicon: t.favIconUrl || faviconOf(t.url || ''),
      bornAt: now,
    })
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await ensureLoaded()
  await setupContextMenus()
})

// ============================================================
//  右键菜单
// ============================================================
async function setupContextMenus() {
  try {
    await chrome.contextMenus.removeAll()
    chrome.contextMenus.create({
      id: 'tabnest-save',
      title: '🪺 加到 TabNest 收件箱',
      contexts: ['page', 'link'],
    })
    chrome.contextMenus.create({
      id: 'tabnest-open',
      title: '打开 TabNest',
      contexts: ['action'],
    })
  } catch (e) {
    console.warn('[TabNest] context menu setup failed', e)
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'tabnest-save') {
    const url = info.linkUrl || info.pageUrl || tab?.url || ''
    const title = tab?.title || domainOf(url)
    await ensureLoaded()
    dispatch({
      type: 'addTab',
      tab: {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url,
        title,
        favicon: faviconOf(url),
        domain: domainOf(url),
        archivedAt: Date.now(),
        source: 'manual',
      },
      groupId: 'inbox',
    })
    showBadge(getState().inbox.length)
  } else if (info.menuItemId === 'tabnest-open') {
    await openOptionsPage()
  }
})

// ============================================================
//  标签生命周期监听
// ============================================================

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id == null) return
  liveTabs.set(tab.id, {
    tabId: tab.id,
    url: tab.url || tab.pendingUrl || '',
    title: tab.title || '',
    favicon: tab.favIconUrl || faviconOf(tab.url || ''),
    bornAt: Date.now(),
  })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const meta = liveTabs.get(tabId)
  if (!meta) {
    liveTabs.set(tabId, {
      tabId,
      url: tab.url || '',
      title: tab.title || '',
      favicon: tab.favIconUrl || faviconOf(tab.url || ''),
      bornAt: Date.now(),
    })
    return
  }
  if (changeInfo.url) {
    const oldDomain = domainOf(meta.url)
    const newDomain = domainOf(changeInfo.url)
    meta.url = changeInfo.url
    // 只在跨域名跳转时重置计时（同站内切页不重置）
    if (oldDomain && newDomain && oldDomain !== newDomain) {
      meta.bornAt = Date.now()
    }
  }
  if (changeInfo.title) meta.title = changeInfo.title
  if (changeInfo.favIconUrl) meta.favicon = changeInfo.favIconUrl
})

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const meta = liveTabs.get(tabId)
  liveTabs.delete(tabId)
  if (!meta) return

  await ensureLoaded()
  const state = getState()

  if (!shouldArchive(meta, state.blacklist, state.preferences.archiveThresholdMinutes)) {
    return
  }
  if (!state.preferences.autoArchiveEnabled) return

  // 收纳到收件箱
  const newTab: Tab = {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    url: meta.url,
    title: meta.title || domainOf(meta.url),
    favicon: meta.favicon || faviconOf(meta.url),
    domain: domainOf(meta.url),
    archivedAt: Date.now(),
    source: 'auto',
  }
  dispatch({ type: 'addTab', tab: newTab, groupId: 'inbox' })
  showBadge(getState().inbox.length)
}
)

// ============================================================
//  归档判定逻辑
// ============================================================

function shouldArchive(meta: TabMeta, blacklist: string[], minMinutes: number): boolean {
  if (!meta.url) return false
  if (meta.url.startsWith('chrome://') || meta.url.startsWith('chrome-extension://')) return false
  if (meta.url.startsWith('about:')) return false

  const ageMin = (Date.now() - meta.bornAt) / 60000
  if (ageMin < minMinutes) return false

  // 黑名单匹配
  for (const pattern of blacklist) {
    if (matchPattern(meta.url, pattern) || meta.url.includes(pattern)) return false
  }

  return true
}

function matchPattern(url: string, pattern: string): boolean {
  // 简单 contains，足够覆盖 v1 需求
  return url.includes(pattern)
}

// ============================================================
//  Badge 更新
// ============================================================
function showBadge(n: number) {
  if (n <= 0) {
    chrome.action.setBadgeText({ text: '' })
    return
  }
  chrome.action.setBadgeText({ text: String(n) })
  chrome.action.setBadgeBackgroundColor({ color: '#8b7cff' })
}

// 监听 storage 变化保持 badge 同步
chrome.storage.onChanged.addListener((changes) => {
  const v = changes['tabnest:v0.1']?.newValue
  if (v?.inbox) showBadge(v.inbox.length)
})

// ============================================================
//  打开 Options Page
// ============================================================
async function openOptionsPage() {
  const url = chrome.runtime.getURL('src/options/index.html')
  const found = await chrome.tabs.query({ url })
  if (found.length > 0 && found[0].id != null) {
    chrome.tabs.update(found[0].id, { active: true })
    if (found[0].windowId != null) chrome.windows.update(found[0].windowId, { focused: true })
  } else {
    chrome.tabs.create({ url })
  }
}

// ============================================================
//  消息桥（让 popup / options 能通过消息触发后台操作）
// ============================================================
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  ;(async () => {
    await ensureLoaded()
    if (msg?.type === 'openOptions') {
      await openOptionsPage()
      sendResponse({ ok: true })
    } else if (msg?.type === 'scanCurrentWindow') {
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const out = tabs
        .filter((t) => t.url && !t.url.startsWith('chrome://'))
        .map((t) => chromeTabToTab(t))
      sendResponse({ tabs: out })
    } else {
      sendResponse({ ok: false, error: 'unknown message' })
    }
  })()
  return true // async sendResponse
})

console.log('[TabNest] background ready 🪺')
