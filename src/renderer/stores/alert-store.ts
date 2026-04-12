import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AlertRule, Incident } from '../../shared/types'

interface AlertNotification {
  id: string
  ruleId: string
  ruleName: string
  incident: Incident
  timestamp: string
  read: boolean
}

interface AlertState {
  rules: AlertRule[]
  notifications: AlertNotification[]
  unreadCount: number

  addRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'triggerCount'>) => void
  removeRule: (id: string) => void
  toggleRule: (id: string) => void
  checkIncident: (incident: Incident) => AlertNotification[]
  markRead: (id: string) => void
  markAllRead: () => void
  clearNotifications: () => void
}

/* ─── Dedup: track incident+rule pairs to prevent duplicate alerts ─── */
const ALERT_DEDUP_WINDOW_MS = 600_000 // 10 min
const ALERT_DEDUP_MAX = 1000
const _alertSeen: { key: string; ts: number }[] = []

function isAlertDuplicate(incidentId: string, ruleId: string): boolean {
  const now = Date.now()
  while (_alertSeen.length > 0 && now - _alertSeen[0].ts > ALERT_DEDUP_WINDOW_MS) {
    _alertSeen.shift()
  }
  const key = `${incidentId}::${ruleId}`
  if (_alertSeen.some(r => r.key === key)) return true
  _alertSeen.push({ key, ts: now })
  if (_alertSeen.length > ALERT_DEDUP_MAX) _alertSeen.shift()
  return false
}

export const useAlertStore = create<AlertState>()(persist((set, get) => ({
  rules: [
    {
      id: 'default-critical',
      name: 'Critical Events',
      conditions: { severities: ['CRITICAL'] },
      enabled: true,
      sound: true,
      desktop: true,
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    },
  ],
  notifications: [],
  unreadCount: 0,

  addRule: (rule) =>
    set((state) => ({
      rules: [
        ...state.rules,
        {
          ...rule,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          triggerCount: 0,
        },
      ],
    })),

  removeRule: (id) =>
    set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),

  toggleRule: (id) =>
    set((state) => ({
      rules: state.rules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    })),

  checkIncident: (incident) => {
    const state = get()
    const newNotifs: AlertNotification[] = []

    for (const rule of state.rules) {
      if (!rule.enabled) continue

      // Dedup: skip if same incident+rule already triggered recently
      if (isAlertDuplicate(incident.id, rule.id)) continue

      let matches = true

      if (rule.conditions.domains?.length) {
        if (!rule.conditions.domains.includes(incident.domain)) matches = false
      }
      if (rule.conditions.severities?.length) {
        if (!rule.conditions.severities.includes(incident.severity))
          matches = false
      }
      if (rule.conditions.keywords?.length) {
        const text = `${incident.title} ${incident.description}`.toLowerCase()
        if (!rule.conditions.keywords.some((k) => text.includes(k.toLowerCase())))
          matches = false
      }
      if (rule.conditions.region) {
        const country = (incident.country || '').toLowerCase()
        if (!country.includes(rule.conditions.region.toLowerCase())) matches = false
      }

      if (matches) {
        const notif: AlertNotification = {
          id: crypto.randomUUID(),
          ruleId: rule.id,
          ruleName: rule.name,
          incident,
          timestamp: new Date().toISOString(),
          read: false,
        }
        newNotifs.push(notif)
      }
    }

    if (newNotifs.length > 0) {
      set((state) => {
        const allNotifs = [...newNotifs, ...state.notifications].slice(0, 100)
        return {
          notifications: allNotifs,
          unreadCount: allNotifs.filter(n => !n.read).length,
          rules: state.rules.map((r) => {
            const triggered = newNotifs.some((n) => n.ruleId === r.id)
            return triggered
              ? { ...r, triggerCount: r.triggerCount + 1, lastTriggered: new Date().toISOString() }
              : r
          }),
        }
      })
    }

    return newNotifs
  },

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}), { name: 'argus-alert-rules', partialize: (s) => ({ rules: s.rules }) }))
