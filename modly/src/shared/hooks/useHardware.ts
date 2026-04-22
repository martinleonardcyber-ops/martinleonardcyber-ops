import { useEffect, useState } from 'react'
import axios from 'axios'

export interface HardwareInfo {
  cuda_available:       boolean
  gpu_name:             string | null
  vram_total_gb:        number
  vram_free_gb:         number
  cpu_name:             string
  ram_gb:               number
  platform:             string
  recommended_tier:     'none' | 'low' | 'mid' | 'high'
  recommended_tier_label: string
  recommended_ids:      string[]
}

const API_BASE = 'http://127.0.0.1:8000'

export function useHardware() {
  const [info,    setInfo]    = useState<HardwareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    axios.get<HardwareInfo>(`${API_BASE}/hardware/info`)
      .then((r) => { setInfo(r.data); setLoading(false) })
      .catch((e) => { setError(String(e)); setLoading(false) })
  }, [])

  /** Returns how compatible a model is with the detected hardware. */
  function compatibility(vram_gb: number): 'recommended' | 'ok' | 'warning' | 'incompatible' | 'unknown' {
    if (!info) return 'unknown'
    if (!info.cuda_available) {
      return vram_gb === 0 ? 'ok' : 'incompatible'
    }
    const avail = info.vram_total_gb
    if (vram_gb === 0)         return 'recommended'
    if (avail >= vram_gb)      return 'recommended'
    if (avail >= vram_gb * 0.8) return 'warning'
    return 'incompatible'
  }

  return { info, loading, error, compatibility }
}
