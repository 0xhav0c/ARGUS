import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardWidget {
  id: string
  label: string
  visible: boolean
  order: number
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'timeline', label: 'Timeline', visible: true, order: 0 },
  { id: 'stats', label: 'Situation Overview', visible: true, order: 1 },
  { id: 'time-analysis', label: 'Time Analysis', visible: true, order: 2 },
  { id: 'entity-tracker', label: 'Entity Tracker', visible: true, order: 3 },
  { id: 'briefing', label: 'Daily Briefing', visible: true, order: 4 },
  { id: 'risk-index', label: 'Risk Index', visible: true, order: 5 },
  { id: 'threat-score', label: 'Threat Score', visible: true, order: 6 },
  { id: 'correlation', label: 'Correlations', visible: true, order: 7 },
  { id: 'clusters', label: 'AI Clusters', visible: true, order: 8 },
]

interface DashboardLayoutState {
  widgets: DashboardWidget[]
  editMode: boolean
  toggleWidget: (id: string) => void
  moveWidget: (id: string, direction: 'up' | 'down') => void
  setEditMode: (mode: boolean) => void
  resetLayout: () => void
  getVisibleWidgets: () => DashboardWidget[]
}

export const useDashboardLayoutStore = create<DashboardLayoutState>()(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS.map(w => ({ ...w })),
      editMode: false,

      toggleWidget: (id) => set((s) => ({
        widgets: s.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
      })),

      moveWidget: (id, direction) => set((s) => {
        const idx = s.widgets.findIndex(w => w.id === id)
        if (idx === -1) return s
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= s.widgets.length) return s
        const newWidgets = [...s.widgets]
        const temp = newWidgets[idx].order
        newWidgets[idx] = { ...newWidgets[idx], order: newWidgets[targetIdx].order }
        newWidgets[targetIdx] = { ...newWidgets[targetIdx], order: temp }
        newWidgets.sort((a, b) => a.order - b.order)
        return { widgets: newWidgets }
      }),

      setEditMode: (mode) => set({ editMode: mode }),

      resetLayout: () => set({ widgets: DEFAULT_WIDGETS.map(w => ({ ...w })) }),

      getVisibleWidgets: () => get().widgets.filter(w => w.visible).sort((a, b) => a.order - b.order),
    }),
    {
      name: 'argus-dashboard-layout',
      version: 1,
    }
  )
)
