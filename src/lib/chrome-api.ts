import type { Tab, Group } from '../store/types'

/** 从 URL 提取 domain */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/** 规范化 URL：去掉 query string 和 hash，仅保留 origin + pathname
 *  并去掉末尾斜杠以正确去重
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    return `${u.origin}${path}`
  } catch {
    return url
  }
}

/** favicon URL（Chrome 内置 favicon 服务） */
export function faviconOf(url: string): string {
  const u = `https://www.google.com/s2/favicons?domain=${domainOf(url)}&sz=64`
  return u
}

/** 把 chrome.tabs.Tab 转成 TabNest Tab */
export function chromeTabToTab(t: chrome.tabs.Tab): Tab {
  const url = t.url || t.pendingUrl || ''
  return {
    id: `tab-${t.id}`,
    url,
    title: t.title || domainOf(url) || '无标题',
    favicon: t.favIconUrl || faviconOf(url),
    domain: domainOf(url),
    archivedAt: Date.now(),
    source: 'manual',
    chromeTabId: t.id,
  }
}

/** 抓取所有标签 */
export async function getAllTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({})
}

/** 抓取当前窗口的标签 */
export async function getCurrentWindowTabs(): Promise<chrome.tabs.Tab[]> {
  return chrome.tabs.query({ currentWindow: true })
}

/** 激活某个标签（如果还存在），不存在则新开 */
export async function focusOrOpen(url: string, chromeTabId?: number): Promise<void> {
  // 先看 tabId 是否还活着
  if (chromeTabId != null) {
    try {
      const t = await chrome.tabs.get(chromeTabId)
      if (t) {
        await chrome.tabs.update(t.id!, { active: true })
        if (t.windowId != null) await chrome.windows.update(t.windowId, { focused: true })
        return
      }
    } catch {
      // tab 不存在了 → 新开
    }
  }
  // 看 URL 是否在其他标签里
  const found = await chrome.tabs.query({ url })
  if (found.length > 0 && found[0].id != null) {
    await chrome.tabs.update(found[0].id, { active: true })
    if (found[0].windowId != null) await chrome.windows.update(found[0].windowId, { focused: true })
    return
  }
  // 新开
  await chrome.tabs.create({ url, active: true })
}

/** Chrome Tab Group 支持的颜色 */
const CHROME_GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange',
]

/** 把任意 hex 颜色映射到 Chrome 支持的 9 色 */
export function mapToChromeColor(hex: string): chrome.tabGroups.ColorEnum {
  const c = hex.toLowerCase()
  if (c.match(/[5-9][0-9a-f]{0,1}[8-c]/)) return 'blue'
  if (/^#[5-7][6-9a-c]/.test(c)) return 'green'
  if (/^#ff[bc]/.test(c)) return 'orange'
  if (/^#ef|^#f0[5-7]/.test(c)) return 'red'
  if (/^#ab|^#9c|^#7c/.test(c)) return 'purple'
  if (/^#f0[6-9]/.test(c)) return 'pink'
  return CHROME_GROUP_COLORS[Math.floor(Math.random() * CHROME_GROUP_COLORS.length)]
}

/**
 * 一键应用方案：把分组里的标签拉起来 + 写入 Chrome Tab Groups + 折叠
 * 会复用现有同名 Tab Group，避免重复创建
 */
export async function applyPlanToBrowser(
  groups: Group[],
  tabsMap: Record<string, Tab>,
): Promise<{ appliedGroups: number; openedTabs: number }> {
  let appliedGroups = 0
  let openedTabs = 0

  // 先查出当前所有已存在的 Tab Groups（只在当前窗口）
  const currentWindow = await chrome.windows.getCurrent()
  const existingGroups = await chrome.tabGroups.query({ windowId: currentWindow.id })

  for (const group of groups) {
    if (group.tabIds.length === 0) continue

    const groupTitle = `${group.icon} ${group.name}`

    // 1. 为分组的每个标签确保有一个浏览器 tab
    const tabIds: number[] = []
    for (const tid of group.tabIds) {
      const meta = tabsMap[tid]
      if (!meta) continue

      // 已经在浏览器里？
      let chromeTab: chrome.tabs.Tab | null = null
      if (meta.chromeTabId != null) {
        try { chromeTab = await chrome.tabs.get(meta.chromeTabId) } catch { chromeTab = null }
      }
      if (!chromeTab) {
        const found = await chrome.tabs.query({ url: meta.url })
        chromeTab = found[0] ?? null
      }
      if (!chromeTab) {
        chromeTab = await chrome.tabs.create({ url: meta.url, active: false })
        openedTabs++
      }
      if (chromeTab.id != null) {
        tabIds.push(chromeTab.id)
        // 记录 chromeTabId，供后续「重复打开自动跳转」使用
        meta.chromeTabId = chromeTab.id
      }
    }

    if (tabIds.length === 0) continue

    // 2. 查找同名的现有 Chrome Tab Group、或者数据库中记录的 chromeGroupId
    let existingGroupId: number | null = null
    if (group.chromeGroupId != null) {
      const found = existingGroups.find((g) => g.id === group.chromeGroupId)
      if (found) existingGroupId = found.id
    }
    if (existingGroupId == null) {
      const sameTitle = existingGroups.find((g) => g.title === groupTitle)
      if (sameTitle) existingGroupId = sameTitle.id
    }

    // 3. 写入或复用 Tab Group
    let groupId: number
    if (existingGroupId != null) {
      // 复用已有 Group：把新 tab 加进去
      groupId = await chrome.tabs.group({ groupId: existingGroupId, tabIds })
    } else {
      // 新建 Group
      groupId = await chrome.tabs.group({ tabIds })
    }
    await chrome.tabGroups.update(groupId, {
      title: groupTitle,
      color: mapToChromeColor(group.color),
      collapsed: true,
    })
    appliedGroups++

    // 记录下 chromeGroupId 供下次复用
    group.chromeGroupId = groupId
  }

  return { appliedGroups, openedTabs }
}

/** 显示桌面通知 */
export async function notify(title: string, message: string) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
    })
  } catch {
    // notifications 权限没要时静默失败
  }
}
