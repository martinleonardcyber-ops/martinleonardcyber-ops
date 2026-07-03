import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

interface WorkflowUIStore {
  // "+" button on nodes → trigger palette
  paletteSourceNodeId:   string | null
  paletteSourceHandleId: string | null

  // Copy/paste clipboard
  clipboard: { nodes: Node[]; edges: Edge[] }

  openPaletteFromNode: (nodeId: string, handleId?: string) => void
  clearPaletteSource:  () => void
  setClipboard:        (nodes: Node[], edges: Edge[]) => void
}

export const useWorkflowUIStore = create<WorkflowUIStore>((set) => ({
  paletteSourceNodeId:   null,
  paletteSourceHandleId: null,
  clipboard:             { nodes: [], edges: [] },

  openPaletteFromNode: (nodeId, handleId = 'output') =>
    set({ paletteSourceNodeId: nodeId, paletteSourceHandleId: handleId }),

  clearPaletteSource: () =>
    set({ paletteSourceNodeId: null, paletteSourceHandleId: null }),

  setClipboard: (nodes, edges) =>
    set({ clipboard: { nodes, edges } }),
}))
