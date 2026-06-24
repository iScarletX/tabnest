import { X } from 'lucide-react'
import { dispatch, useStore } from '../../store'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const state = useStore()
  const prefs = state.preferences

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-glass w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line/40 sticky top-0 bg-bg-card/95 backdrop-blur-xl z-10">
          <h2 className="text-lg font-semibold tracking-tight">设置</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* 界面偏好 */}
          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">界面偏好</h3>
            <div className="space-y-3">
              <Toggle
                label="显示网站图标 (favicon)"
                hint="关闭后所有标签统一显示为灯色图标"
                checked={prefs.showFavicon}
                onChange={(v) => dispatch({ type: 'setPref', patch: { showFavicon: v } })}
              />
              <Toggle
                label="显示打开中的标签"
                hint="浏览器里未归类的标签会出现在'待分类'面板"
                checked={prefs.showOpenTabsInInbox}
                onChange={(v) => dispatch({ type: 'setPref', patch: { showOpenTabsInInbox: v } })}
              />
              <Toggle
                label="重复打开时自动跳转"
                hint="打开已归类的同一个 URL 时，自动展开那个 Tab Group 并跳到原标签、关掉重复的"
                checked={prefs.autoJumpToExisting}
                onChange={(v) => dispatch({ type: 'setPref', patch: { autoJumpToExisting: v } })}
              />
            </div>
          </section>

          {/* AI 服务 */}
          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">
              AI 服务
              <span className="ml-2 chip-brand">BYOK</span>
            </h3>
            <p className="text-xs text-ink-muted mb-3">
              你的 API Key 仅保存在浏览器本地，永不上传 · v0.2 起将启用真实 LLM 分类
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['openai', 'claude', 'gemini'] as const).map((p) => (
                  <button
                    key={p}
                    className={clsx(
                      'px-3 py-2 rounded-xl text-sm border transition-all',
                      prefs.aiProvider === p
                        ? 'border-brand bg-brand-tintHi'
                        : 'border-line/60 bg-bg-soft hover:border-line-strong',
                    )}
                    onClick={() => dispatch({ type: 'setPref', patch: { aiProvider: p } })}
                  >
                    {p === 'openai' ? 'OpenAI' : p === 'claude' ? 'Anthropic' : 'Google'}
                  </button>
                ))}
              </div>
              <input
                type="password"
                placeholder="API Key（仅保存在你的浏览器里）"
                value={prefs.aiApiKey}
                onChange={(e) => dispatch({ type: 'setPref', patch: { aiApiKey: e.target.value } })}
                className="input w-full"
              />
              <input
                placeholder="模型名 例如 gpt-4o-mini / claude-3-5-haiku-20241022"
                value={prefs.aiModel}
                onChange={(e) => dispatch({ type: 'setPref', patch: { aiModel: e.target.value } })}
                className="input w-full"
              />
            </div>
          </section>

          <section className="text-center text-[11px] text-ink-muted pt-4 border-t border-line/40">
            TabNest 🪺 v0.1.4 · MIT License · 数据 100% 本地存储
          </section>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-ink-muted mt-0.5">{hint}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-brand-gradient' : 'bg-bg-soft border border-line/60',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
    </div>
  )
}
