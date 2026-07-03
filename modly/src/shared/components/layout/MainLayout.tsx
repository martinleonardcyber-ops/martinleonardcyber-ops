import TopBar from './TopBar'
import Sidebar from './Sidebar'
import Router from '@shared/router/Router'

export default function MainLayout(): JSX.Element {
  return (
    <div className="flex flex-col h-full relative overflow-hidden" style={{ background: '#09090b' }}>

      {/* Ambient gradient orbs — the "light source" behind all glass panels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
      </div>

      {/* App chrome */}
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 overflow-hidden relative">
          <Router />
        </main>
      </div>
    </div>
  )
}
