export type AlertMode = 'A' | 'B' | 'C' | 'D'

export interface Tab {
  id: string
  url: string
  title: string
  favicon: string
  domain: string
  archivedAt: number
  source: 'manual' | 'auto' | 'ai'
  confidence?: number
  /** 浏览器原生 tab id（已应用时记录，用于 focus） */
  chromeTabId?: number
}

export interface Group {
  id: string
  name: string
  icon: string
  color: string
  tabIds: string[]
  createdAt: number
  /** 浏览器 Tab Group id（一键应用后记录） */
  chromeGroupId?: number
}

export interface WhitelistRule {
  domain: string
  targetGroupId: string
}

export interface Preferences {
  mode: AlertMode
  archiveThresholdMinutes: number
  inboxAlertThreshold: number
  aiProvider: 'openai' | 'claude' | 'gemini'
  aiApiKey: string
  aiModel: string
  autoArchiveEnabled: boolean
  showFavicon: boolean
  showOpenTabsInInbox: boolean
}

export interface TabNestState {
  groups: Group[]
  inbox: string[]
  trash: string[]
  tabs: Record<string, Tab>
  blacklist: string[]
  whitelist: WhitelistRule[]
  preferences: Preferences
}
