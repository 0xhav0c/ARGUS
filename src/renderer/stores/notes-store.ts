import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IncidentNote } from '../../shared/types'

interface NotesState {
  notes: IncidentNote[]
  addNote: (incidentId: string, content: string) => void
  updateNote: (noteId: string, content: string) => void
  deleteNote: (noteId: string) => void
  getNotesForIncident: (incidentId: string) => IncidentNote[]
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      addNote: (incidentId, content) => set(state => ({
        notes: [...state.notes, {
          id: crypto.randomUUID(),
          incidentId,
          content,
          author: 'Analyst',
          createdAt: new Date().toISOString(),
        }]
      })),
      updateNote: (noteId, content) => set(state => ({
        notes: state.notes.map(n => n.id === noteId ? { ...n, content, updatedAt: new Date().toISOString() } : n)
      })),
      deleteNote: (noteId) => set(state => ({
        notes: state.notes.filter(n => n.id !== noteId)
      })),
      getNotesForIncident: (incidentId) => get().notes.filter(n => n.incidentId === incidentId),
    }),
    { name: 'argus-incident-notes' }
  )
)
