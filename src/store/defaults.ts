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

export const DEFAULT_PRESET_GROUPS = [
  { id: 'g-work', name: '工作', icon: '💼', color: '#5b8def', tabIds: [], createdAt: Date.now() },
  { id: 'g-study', name: '学习', icon: '📚', color: '#66bb6a', tabIds: [], createdAt: Date.now() },
  { id: 'g-tools', name: '工具', icon: '🧰', color: '#ffb74d', tabIds: [], createdAt: Date.now() },
  { id: 'g-life', name: '生活', icon: '🍔', color: '#ef5350', tabIds: [], createdAt: Date.now() },
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
    archiveThresholdMinutes: 2,
    inboxAlertThreshold: 20,
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    autoArchiveEnabled: true,
  },
}
