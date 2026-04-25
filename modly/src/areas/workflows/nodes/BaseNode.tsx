import { useState, useRef } from 'react'
import { NodeResizer, useReactFlow } from '@xyflow/react'
import type { ReactNode } from 'react'
import { useWorkflowUIStore } from '../workflowUIStore'

const RESIZER_HANDLE_STYLE = { background: 'transparent', border: 'none', width: 12, height: 12 }

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BaseNodeProps {
  id:       string
  selected?: boolean
  running?:  boolean
  nodeStatus?: 'done' | 'error'

  // Header
  title:  string
  icon?:  ReactNode
  badge?: string

  // Optional controls
  enabled?:         boolean
  showInGenerate?:  boolean
  deletable?:       boolean
  collapsible?:     boolean
  defaultExpanded?: boolean

  // Extra slots
  subheader?: ReactNode
  handles?:   ReactNode

  // Resize
  minWidth?:  number
  minHeight?: number
  autoHeight?: boolean

  // Body
  children?: ReactNode
}

// ─── BaseNode ─────────────────────────────────────────────────────────────────

export default function BaseNode({
  id, selected, running, nodeStatus,
  title, icon, badge,
  enabled, showInGenerate,
  deletable       = true,
  collapsible     = false,
  defaultExpanded = true,
  subheader, handles,
  minWidth  = 180,
  minHeight = 60,
  autoHeight = false,
  children,
}: BaseNodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const openPaletteFromNode = useWorkflowUIStore((s) => s.openPaletteFromNode)
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [hovered, setHovered]   = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const isDisabled = enabled === false

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={autoHeight ? { width: '100%' } : { width: '100%', height: '100%' }}
      className={`relative rounded-xl border bg-zinc-900/95 backdrop-blur-sm shadow-xl transition-all flex flex-col
        ${running                ? 'border-accent shadow-[0_0_16px_rgba(99,102,241,0.35)] animate-pulse'
        : nodeStatus === 'done'  ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
        : nodeStatus === 'error' ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
        : selected               ? 'border-accent/70'
        : isDisabled             ? 'border-zinc-800 opacity-50'
        : 'border-zinc-700'}`}
    >
      <NodeResizer
        minWidth={minWidth} minHeight={autoHeight ? 0 : minHeight}
        lineStyle={{ borderColor: 'transparent' }}
        handleStyle={autoHeight ? { display: 'none' } : RESIZER_HANDLE_STYLE}
      />

      {handles}

      {/* ── "+" quick-connect button (right edge, visible on hover) ────────── */}
      <button
        className="nodrag absolute flex items-center justify-center transition-all duration-150 z-50"
        style={{
          right:     -14,
          top:       '50%',
          transform: 'translateY(-50%)',
          width:  22,
          height: 22,
          borderRadius: '50%',
          background:   hovered ? 'linear-gradient(135deg,#8b5cf6,#3b82f6)' : 'rgba(39,39,42,0.9)',
          border:       `1.5px solid ${hovered ? 'transparent' : '#52525b'}`,
          opacity:      hovered ? 1 : 0,
          boxShadow:    hovered ? '0 2px 12px rgba(139,92,246,0.5)' : 'none',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
        onClick={(e) => { e.stopPropagation(); openPaletteFromNode(id, 'output') }}
        title="Ajouter un node connecté"
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start px-3 pt-3 pb-2.5 gap-2 shrink-0">

        {running && (
          <div className="shrink-0 mt-0.5">
            <svg className="animate-spin text-accent" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          </div>
        )}
        {!running && nodeStatus === 'done' && (
          <div className="shrink-0 mt-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
        {!running && nodeStatus === 'error' && (
          <div className="shrink-0 mt-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        )}
        {!running && !nodeStatus && icon && <div className="shrink-0 mt-0.5">{icon}</div>}

        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-200 leading-tight truncate">{title}</p>
          {badge && (
            <span className="inline-block mt-0.5 text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-700/70 text-zinc-400 border border-zinc-600/50">
              {badge}
            </span>
          )}
        </div>

        {/* Eye */}
        {showInGenerate !== undefined && (
          <button
            onClick={() => updateNodeData(id, { showInGenerate: !showInGenerate })}
            title={showInGenerate ? 'Visible in Generate' : 'Hidden from Generate'}
            className="nodrag p-0.5 rounded transition-colors shrink-0 mt-0.5"
          >
            {showInGenerate ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 hover:text-zinc-400">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
        )}

        {/* Enable toggle */}
        {enabled !== undefined && (
          <button
            onClick={() => updateNodeData(id, { enabled: !enabled })}
            title={enabled ? 'Désactiver' : 'Activer'}
            className="nodrag relative shrink-0 mt-0.5"
            style={{ width: 26, height: 15 }}
          >
            <span className={`absolute inset-0 rounded-full transition-colors ${enabled ? 'bg-accent/70' : 'bg-zinc-700'}`} />
            <span className={`absolute top-[1.5px] w-3 h-3 rounded-full bg-white shadow transition-all ${enabled ? 'left-[11px]' : 'left-[1.5px]'}`} />
          </button>
        )}

        {/* Collapse */}
        {collapsible && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="nodrag p-0.5 rounded text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        )}

        {/* Delete */}
        {deletable && (
          <button
            onClick={() => deleteElements({ nodes: [{ id }] })}
            className="nodrag p-0.5 rounded text-zinc-700 hover:text-red-400 transition-colors shrink-0 mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Sub-header */}
      {subheader && (
        <div className="shrink-0 border-t border-zinc-800/60">
          {subheader}
        </div>
      )}

      {/* Body */}
      {children && (!collapsible || expanded) && (
        <div className="border-t border-zinc-800 flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      )}
    </div>
  )
}
