import type { TabNestState } from './types'

export const DEFAULT_BLACKLIST = [
  'google.com/search',
  'baidu.com/s',
  'bing.com/search',
  'translate.google.com',
  'maps.google.com',
  'weather.com',
  'about:blank',
  'chrome://newtab',
  'edge://newtab',
]

// 高级感调色板（降饱和度、以深色为主）
export const DEFAULT_PRESET_GROUPS = [
  { id: 'g-work', name: '工作', icon: '💼', color: '#5b71e3', tabIds: [], createdAt: Date.now() },
  { id: 'g-study', name: '学习', icon: '📚', color: '#4cc38a', tabIds: [], createdAt: Date.now() },
  { id: 'g-tools', name: '工具', icon: '🧰', color: '#e3b341', tabIds: [], createdAt: Date.now() },
  { id: 'g-life', name: '生活', icon: '🍔', color: '#ed6a5e', tabIds: [], createdAt: Date.now() },
]

export const initialState: TabNestState = {
  groups: DEFAULT_PRESET_GROUPS,
  inbox: [],
  trash: [],
  tabs: {},
  blacklist: DEFAULT_BLACKLIST,
  whitelist: [],
  preferences: {
    mode: 'B',
    archiveThresholdMinutes: 3,
    inboxAlertThreshold: 20,
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    autoArchiveEnabled: true,
    showFavicon: true,
    showOpenTabsInInbox: true,
  },
}
