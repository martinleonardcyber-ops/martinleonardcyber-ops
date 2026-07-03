import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAppStore } from '@shared/stores/appStore'

export interface HardwareInfo {
  cuda_available:         boolean
  gpu_name:               string | null
  vram_total_gb:          number
  vram_free_gb:           number
  cpu_name:               string
  ram_gb:                 number
  platform:               string
  recommended_tier:       'none' | 'low' | 'mid' | 'high'
  recommended_tier_label: string
  recommended_ids:        string[]
}

export function useHardware(pollMs = 0) {
  const apiUrl = useAppStore((s) => s.apiUrl)
  const [info,    setInfo]    = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const active = useRef(true)

  useEffect(() => {
    active.current = true

    async function fetch() {
      if (!apiUrl) return
      try {
        const r = await axios.get<HardwareInfo>(`${apiUrl}/hardware/info`, { timeout: 3000 })
        if (active.current) { setInfo(r.data); setLoading(false); setError(null) }
      } catch (e) {
        if (active.current) { setError(String(e)); setLoading(false) }
      }
    }

    fetch()

    if (pollMs > 0) {
      const id = setInterval(fetch, pollMs)
      return () => { active.current = false; clearInterval(id) }
    }
    return () => { active.current = false }
  }, [pollMs, apiUrl])

  function compatibility(vram_gb: number): 'recommended' | 'ok' | 'warning' | 'incompatible' | 'unknown' {
    if (!info) return 'unknown'
    if (!info.cuda_available) return vram_gb === 0 ? 'ok' : 'incompatible'
    const avail = info.vram_total_gb
    if (vram_gb === 0)            return 'recommended'
    if (avail >= vram_gb)         return 'recommended'
    if (avail >= vram_gb * 0.8)   return 'warning'
    return 'incompatible'
  }

  return { info, loading, error, compatibility }
}
