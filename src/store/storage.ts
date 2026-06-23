import type { TabNestState } from './types'
import { initialState } from './defaults'

const STORAGE_KEY = 'tabnest:v0.1'

/** 从 chrome.storage 读取整个 state */
export async function loadState(): Promise<TabNestState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const saved = result[STORAGE_KEY]
    if (saved) {
      return {
        ...initialState,
        ...saved,
        preferences: { ...initialState.preferences, ...(saved.preferences ?? {}) },
      }
    }
  } catch (e) {
    console.warn('[TabNest] loadState failed', e)
  }
  return initialState
}

/** 保存到 chrome.storage */
export async function saveState(state: TabNestState): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: state })
  } catch (e) {
    console.warn('[TabNest] saveState failed', e)
  }
}

/** 监听 storage 变化，方便多页面同步 */
export function onStateChange(cb: (state: TabNestState) => void) {
  const handler = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area !== 'local') return
    if (changes[STORAGE_KEY]?.newValue) {
      cb(changes[STORAGE_KEY].newValue as TabNestState)
    }
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}
