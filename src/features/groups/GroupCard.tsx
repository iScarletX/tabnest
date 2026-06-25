import { useEffect, useMemo, useState } from 'react'
import { MoreVertical, Trash2, Pencil, Plus, ChevronDown, ChevronRight, Palette } from 'lucide-react'

const PALETTE = [
  '#5b71e3', '#4cc38a', '#e3b341', '#ed6a5e',
  '#9b85ff', '#5b9cd6', '#d97757', '#a878e8',
  '#7c5cff', '#48bf91', '#d4924a', '#c87878',
]
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
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  // 默认折叠起来，点分组才展开所有子标签
  const [collapsed, setCollapsed] = useState(true)

  // 响应全局展开 / 全局折叠事件
  useEffect(() => {
    const expandHandler = () => setCollapsed(false)
    const collapseHandler = () => setCollapsed(true)
    window.addEventListener('tabnest:expand-all', expandHandler)
    window.addEventListener('tabnest:collapse-all', collapseHandler)
    return () => {
      window.removeEventListener('tabnest:expand-all', expandHandler)
      window.removeEventListener('tabnest:collapse-all', collapseHandler)
    }
  }, [])
  const [name, setName] = useState(group.name)

  const { isOver, setNodeRef } = useDroppable({ id: group.id })


  return (
    <div
      ref={setNodeRef}
      className={`card overflow-hidden transition-all duration-200 ${
        isOver ? 'border-brand/70 ring-4 ring-brand/15' : ''
      }`}
    >
      {/* 顶部彩色装饰条（点击可换色） */}
      <button
        className="h-1 w-full hover:h-1.5 transition-all relative group/color"
        style={{ background: `linear-gradient(90deg, ${group.color}, ${group.color}80)` }}
        onClick={() => setColorPickerOpen((v) => !v)}
        title="点击换颜色"
      >
        <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/color:opacity-100 transition-opacity">
          <Palette size={10} />
        </span>
      </button>
      {colorPickerOpen && (
        <div className="px-4 py-2 flex items-center gap-1.5 flex-wrap bg-bg-hover/50 border-b border-line/40">
          <span className="text-[10px] text-ink-muted mr-1">选颜色：</span>
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`w-5 h-5 rounded-full transition-transform hover:scale-125 ${group.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-bg-card' : ''}`}
              style={{ background: c }}
              onClick={() => {
                dispatch({ type: 'recolorGroup', id: group.id, color: c })
                setColorPickerOpen(false)
              }}
            />
          ))}
          <button
            className="text-[10px] ml-auto text-ink-muted hover:text-ink"
            onClick={() => setColorPickerOpen(false)}
          >关闭</button>
        </div>
      )}

      <div
        className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-bg-hover/30 transition-colors"
        onClick={(e) => {
          // 点击整个标题区都能展开折叠，但如果点在重命名输入框、菜单按钮里不触发
          const tag = (e.target as HTMLElement).tagName
          if (tag === 'INPUT' || tag === 'BUTTON' || (e.target as HTMLElement).closest('button')) return
          setCollapsed((v) => !v)
        }}
      >
        <button
          className="btn-icon p-1"
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v) }}
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
