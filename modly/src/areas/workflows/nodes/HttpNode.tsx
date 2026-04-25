import { useCallback } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import type { WFNodeData } from '@shared/types/electron.d'
import { useWorkflowRunStore } from '../workflowRunStore'
import BaseNode from './BaseNode'

const HS_IN  = { width: 14, height: 14, border: '2.5px solid #18181b', background: '#fbbf24' }
const HS_OUT = { width: 14, height: 14, border: '2.5px solid #18181b', background: '#2dd4bf' }

const inputCls = 'nodrag w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-teal-500/60'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export default function HttpNode({ id, data, selected }: { id: string; data: WFNodeData; selected?: boolean }) {
  const { updateNodeData } = useReactFlow()
  const running    = useWorkflowRunStore((s) => s.activeNodeId === id)
  const nodeStatus = useWorkflowRunStore((s) => s.nodeStatuses[id])

  const patch = useCallback((key: string, val: unknown) => {
    updateNodeData(id, { params: { ...data.params, [key]: val } })
  }, [id, data.params, updateNodeData])

  const url          = (data.params?.url          as string | undefined) ?? ''
  const method       = (data.params?.method       as string | undefined) ?? 'GET'
  const bodyTemplate = (data.params?.bodyTemplate as string | undefined) ?? '{{input}}'
  const headers      = (data.params?.headers      as string | undefined) ?? ''

  const showBody = method !== 'GET' && method !== 'DELETE'

  return (
    <BaseNode
      id={id}
      selected={selected}
      running={running}
      nodeStatus={nodeStatus}
      title="HTTP Request"
      minWidth={280}
      autoHeight
      icon={
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="1.75" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      }
      handles={
        <>
          <Handle type="target" position={Position.Left}  id="input"  style={HS_IN} />
          <Handle type="source" position={Position.Right} id="output" style={HS_OUT} />
        </>
      }
      subheader={
        <div className="flex items-center justify-between px-3 py-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">text</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border border-teal-500/30 bg-teal-500/10 text-teal-400">text</span>
        </div>
      }
    >
      <div className="px-3 pb-3 pt-2.5 flex flex-col gap-2.5">

        {/* Method + URL */}
        <div className="flex items-center gap-1.5">
          <select
            value={method}
            onChange={(e) => patch('method', e.target.value)}
            className="nodrag bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-teal-400 font-mono font-semibold focus:outline-none shrink-0 cursor-pointer"
          >
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => patch('url', e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className={inputCls}
          />
        </div>

        {/* Headers (optional) */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">Headers JSON <span className="text-zinc-700">(optionnel)</span></label>
          <input
            type="text"
            value={headers}
            onChange={(e) => patch('headers', e.target.value)}
            placeholder='{"Authorization": "Bearer token"}'
            className={inputCls}
          />
        </div>

        {/* Body template */}
        {showBody && (
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">
              Body <span className="text-zinc-600 font-mono">{'{{input}}'}</span> = texte entrant
            </label>
            <textarea
              value={bodyTemplate}
              onChange={(e) => patch('bodyTemplate', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>
        )}

      </div>
    </BaseNode>
  )
}
