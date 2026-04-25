import { useCallback } from 'react'
import { Handle, Position, useReactFlow } from '@xyflow/react'
import type { WFNodeData } from '@shared/types/electron.d'
import { useWorkflowRunStore } from '../workflowRunStore'
import BaseNode from './BaseNode'

const HS = { width: 14, height: 14, border: '2.5px solid #18181b', background: '#fbbf24' }

const inputCls = 'nodrag w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/60'

export default function LLMNode({ id, data, selected }: { id: string; data: WFNodeData; selected?: boolean }) {
  const { updateNodeData } = useReactFlow()
  const running    = useWorkflowRunStore((s) => s.activeNodeId === id)
  const nodeStatus = useWorkflowRunStore((s) => s.nodeStatuses[id])

  const patch = useCallback((key: string, val: unknown) => {
    updateNodeData(id, { params: { ...data.params, [key]: val } })
  }, [id, data.params, updateNodeData])

  const systemPrompt = (data.params?.systemPrompt as string | undefined) ?? 'You are a helpful AI assistant.'
  const temperature  = (data.params?.temperature  as number | undefined) ?? 0.7
  const maxTokens    = (data.params?.maxTokens    as number | undefined) ?? 1024

  return (
    <BaseNode
      id={id}
      selected={selected}
      running={running}
      nodeStatus={nodeStatus}
      title="LLM"
      minWidth={260}
      autoHeight
      icon={
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.75" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      }
      handles={
        <>
          <Handle type="target" position={Position.Left}  id="input"  style={HS} />
          <Handle type="source" position={Position.Right} id="output" style={HS} />
        </>
      }
      subheader={
        <div className="flex items-center justify-between px-3 py-2">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">text</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">text</span>
        </div>
      }
    >
      <div className="px-3 pb-3 pt-2.5 flex flex-col gap-3">

        {/* System prompt */}
        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">Prompt système</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => patch('systemPrompt', e.target.value)}
            rows={3}
            placeholder="You are a helpful AI assistant."
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </div>

        {/* Temperature */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500 w-14 shrink-0">Température</label>
          <input
            type="range" min="0" max="2" step="0.05"
            value={temperature}
            onChange={(e) => patch('temperature', Number(e.target.value))}
            className="nodrag flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#a78bfa' }}
          />
          <span className="text-[10px] font-mono text-violet-400 w-8 text-right tabular-nums">
            {temperature.toFixed(2)}
          </span>
        </div>

        {/* Max tokens */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-500 w-14 shrink-0">Max tokens</label>
          <input
            type="number" min="64" max="8192" step="64"
            value={maxTokens}
            onChange={(e) => patch('maxTokens', Number(e.target.value))}
            className="nodrag flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/60"
          />
        </div>

      </div>
    </BaseNode>
  )
}
