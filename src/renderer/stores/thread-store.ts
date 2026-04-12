import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IncidentThread } from '../../shared/types'

interface ThreadState {
  threads: IncidentThread[]
  createThread: (title: string, incidentIds: string[]) => void
  addToThread: (threadId: string, incidentId: string) => void
  removeFromThread: (threadId: string, incidentId: string) => void
  deleteThread: (id: string) => void
  getThreadsForIncident: (incidentId: string) => IncidentThread[]
}

export const useThreadStore = create<ThreadState>()(
  persist(
    (set, get) => ({
      threads: [],
      createThread: (title, incidentIds) => {
        const thread: IncidentThread = {
          id: crypto.randomUUID(),
          title,
          incidentIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ threads: [...s.threads, thread] }))
      },
      addToThread: (threadId, incidentId) => set(s => ({
        threads: s.threads.map(t => t.id === threadId && !t.incidentIds.includes(incidentId)
          ? { ...t, incidentIds: [...t.incidentIds, incidentId], updatedAt: new Date().toISOString() }
          : t),
      })),
      removeFromThread: (threadId, incidentId) => set(s => ({
        threads: s.threads.map(t => t.id === threadId
          ? { ...t, incidentIds: t.incidentIds.filter(id => id !== incidentId), updatedAt: new Date().toISOString() }
          : t),
      })),
      deleteThread: (id) => set(s => ({ threads: s.threads.filter(t => t.id !== id) })),
      getThreadsForIncident: (incidentId) => get().threads.filter(t => t.incidentIds.includes(incidentId)),
    }),
    { name: 'argus-threads' }
  )
)
