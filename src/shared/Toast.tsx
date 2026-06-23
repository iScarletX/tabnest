import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'

export interface ToastData {
  id: string
  title: string
  desc?: string
  onUndo?: () => void
  onMute?: () => void
}

let toastListeners: ((t: ToastData) => void)[] = []

export function showToast(t: Omit<ToastData, 'id'>) {
  const data: ToastData = { ...t, id: Date.now().toString() }
  toastListeners.forEach((l) => l(data))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    const handler = (t: ToastData) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id))
      }, 4500)
    }
    toastListeners.push(handler)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== handler)
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card-glass px-4 py-3 shadow-toast flex items-center gap-3 min-w-[320px] pointer-events-auto animate-toast-in"
        >
          <div className="w-9 h-9 rounded-xl bg-brand-gradient shadow-glow flex items-center justify-center shrink-0">
            <Inbox size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{t.title}</div>
            {t.desc && <div className="text-xs text-ink-muted truncate mt-0.5">{t.desc}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {t.onUndo && (
              <button
                className="btn-ghost px-2.5 py-1"
                onClick={() => {
                  t.onUndo?.()
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }}
              >
                ↩ 撤销
              </button>
            )}
            {t.onMute && (
              <button
                className="btn-ghost px-2.5 py-1 text-danger hover:text-danger"
                onClick={() => {
                  t.onMute?.()
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }}
                title="此网站以后不再自动归档"
              >
                🚫
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
