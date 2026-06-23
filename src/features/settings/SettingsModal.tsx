import { X } from 'lucide-react'
import { dispatch, useStore } from '../../store'
import type { AlertMode } from '../../store/types'
import clsx from 'clsx'

const modes: { id: AlertMode; title: string; desc: string; icon: string; color: string }[] = [
  { id: 'A', icon: '🤫', title: '完全手动', desc: '扩展静默，主动点开整理', color: '#60a5fa' },
  { id: 'B', icon: '🔔', title: '轻提醒', desc: '攒到阈值时温柔提醒一次', color: '#fbbf24' },
  { id: 'C', icon: '✨', title: 'AI 自动归档', desc: '关闭标签时自动归类，1.5s 内可撤销', color: '#a78bfa' },
  { id: 'D', icon: '🎯', title: '实时归位', desc: '每开一个新标签都建议归类', color: '#34d399' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const state = useStore()
  const prefs = state.preferences
  const blacklist = state.blacklist

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
          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">打扰模式</h3>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  className={clsx(
                    'text-left p-3.5 rounded-xl border transition-all',
                    prefs.mode === m.id
                      ? 'border-brand bg-brand-tintHi shadow-glow'
                      : 'border-line/60 bg-bg-soft hover:border-line-strong hover:bg-bg-hover',
                  )}
                  onClick={() => dispatch({ type: 'setMode', mode: m.id })}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: `${m.color}20`, border: `1px solid ${m.color}40` }}
                    >
                      {m.icon}
                    </span>
                    <span className="font-medium text-sm">{m.title}</span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">归档判定</h3>
            <div className="space-y-3">
              <Row label="存在时长阈值" hint="超过此时长才进入归档队列">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={prefs.archiveThresholdMinutes}
                  onChange={(e) =>
                    dispatch({
                      type: 'setPref',
                      patch: { archiveThresholdMinutes: Math.max(1, +e.target.value) },
                    })
                  }
                  className="input w-16 text-center"
                />
                <span className="text-sm text-ink-muted">分钟</span>
              </Row>
              <Row label="收件箱提醒阈值" hint="攒满后提醒整理（模式 B）">
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={prefs.inboxAlertThreshold}
                  onChange={(e) =>
                    dispatch({
                      type: 'setPref',
                      patch: { inboxAlertThreshold: Math.max(5, +e.target.value) },
                    })
                  }
                  className="input w-16 text-center"
                />
              </Row>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">
              AI 服务
              <span className="ml-2 chip-brand">BYOK</span>
            </h3>
            <p className="text-xs text-ink-muted mb-3">仅本地保存，永不上传</p>
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

          <section>
            <h3 className="text-sm font-semibold mb-3 tracking-tight">黑名单</h3>
            <p className="text-xs text-ink-muted mb-3">
              这些域名永远不会被归档（搜索结果页、地图、天气等）
            </p>
            <div className="flex flex-wrap gap-1.5">
              {blacklist.map((d) => (
                <button
                  key={d}
                  className="chip hover:bg-danger/15 hover:border-danger/40 hover:text-danger group transition-all"
                  onClick={() => dispatch({ type: 'toggleBlacklist', domain: d })}
                >
                  {d}
                  <X size={10} className="opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              <button
                className="chip border-dashed hover:bg-bg-hover hover:border-brand/40"
                onClick={() => {
                  const d = prompt('添加黑名单域名（不含 http:// 前缀）：')
                  if (d) dispatch({ type: 'toggleBlacklist', domain: d.trim() })
                }}
              >
                + 添加
              </button>
            </div>
          </section>

          <section className="text-center text-[11px] text-ink-muted pt-4 border-t border-line/40">
            TabNest 🪺 v0.1.0 · MIT License · 数据 100% 本地存储
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] text-ink-muted mt-0.5">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
