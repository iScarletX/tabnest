import { useMemo, useState } from 'react'
import { MoreVertical, Trash2, Pencil, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { dispatch, useStore } from '../../store'
import type { Group } from '../../store/types'
import { TabCard } from '../tabs/TabCard'

interface Props {
  group: Group
}

export function GroupCard({ group }: Props) {
  const state = useStore()
  const tabs = useMemo(
    () => group.tabIds.map((id) => state.tabs[id]).filter(Boolean),
    [group.tabIds, state.tabs],
  )
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [name, setName] = useState(group.name)

  const { isOver, setNodeRef } = useDroppable({ id: group.id })


  return (
    <div
      ref={setNodeRef}
      className={`card overflow-hidden transition-all duration-200 ${
        isOver ? 'border-brand/70 ring-4 ring-brand/15' : ''
      }`}
    >
      {/* 顶部彩色装饰条 */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${group.color}, ${group.color}80)` }} />

      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          className="btn-icon p-1"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? '展开' : '折叠'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>

        <span
          className="text-xl leading-none w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${group.color}20`, border: `1px solid ${group.color}40` }}
        >
          {group.icon}
        </span>

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              dispatch({ type: 'renameGroup', id: group.id, name: name.trim() || group.name })
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setName(group.name)
                setEditing(false)
              }
            }}
            className="flex-1 bg-transparent border-b border-brand/60 text-sm font-medium focus:outline-none"
          />
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate tracking-tight">{group.name}</span>
            <span className="chip">{tabs.length}</span>
          </div>
        )}

        <div className="relative">
          <button className="btn-icon" onClick={() => setMenuOpen((v) => !v)}>
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-36 card py-1.5 text-sm shadow-toast">
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-bg-hover flex items-center gap-2"
                  onClick={() => {
                    setEditing(true)
                    setMenuOpen(false)
                  }}
                >
                  <Pencil size={12} /> 重命名
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left hover:bg-danger/15 flex items-center gap-2 text-danger"
                  onClick={() => {
                    if (confirm(`确定删除分组「${group.name}」？里面的标签会转到收件箱。`)) {
                      dispatch({ type: 'deleteGroup', id: group.id })
                    }
                    setMenuOpen(false)
                  }}
                >
                  <Trash2 size={12} /> 删除分组
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 space-y-1 min-h-[60px]">
          <SortableContext items={group.tabIds} strategy={verticalListSortingStrategy}>
            {tabs.map((t) => (
              <TabCard key={t.id} tab={t} />
            ))}
          </SortableContext>

          {tabs.length === 0 && (
            <div className="text-center text-xs text-ink-muted py-6 border-2 border-dashed border-line/40 rounded-xl">
              拖入标签到这里
            </div>
          )}

          <button
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-ink-muted hover:text-ink rounded-xl hover:bg-bg-soft/50 transition-colors"
            onClick={() => {
              const url = prompt('粘贴网页 URL：')
              if (!url) return
              try {
                const u = new URL(url)
                const id = `t-${Date.now()}`
                dispatch({
                  type: 'addTab',
                  tab: {
                    id,
                    url,
                    title: u.hostname,
                    favicon: `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`,
                    domain: u.hostname,
                    archivedAt: Date.now(),
                    source: 'manual',
                  },
                  groupId: group.id,
                })
              } catch {
                alert('URL 不合法')
              }
            }}
          >
            <Plus size={12} /> 添加链接
          </button>
        </div>
      )}
    </div>
  )
}
