import { lazy } from 'react'
import type { Page } from '@shared/stores/navStore'

const DashboardPage  = lazy(() => import('@areas/dashboard/DashboardPage'))
const ChatPage       = lazy(() => import('@areas/chat/ChatPage'))
const GeneratePage   = lazy(() => import('@areas/generate/GeneratePage'))
const WorkflowsPage  = lazy(() => import('@areas/workflows/WorkflowsPage'))
const ModelsPage     = lazy(() => import('@areas/models/ModelsPage'))
const SettingsPage   = lazy(() => import('@areas/settings/SettingsPage'))

export interface RouteConfig {
  component:    React.ComponentType
  wrapperClass: string
}

export const ROUTES: Record<Page, RouteConfig> = {
  dashboard: { component: DashboardPage,  wrapperClass: 'flex-1 overflow-hidden'      },
  chat:      { component: ChatPage,       wrapperClass: 'flex flex-1 overflow-hidden'  },
  generate:  { component: GeneratePage,   wrapperClass: 'flex flex-1 overflow-hidden'  },
  workflows: { component: WorkflowsPage,  wrapperClass: 'flex flex-1 overflow-hidden'  },
  models:    { component: ModelsPage,     wrapperClass: 'flex-1 overflow-y-auto'       },
  settings:  { component: SettingsPage,   wrapperClass: 'flex-1 overflow-hidden'       },
}
