import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useNotificationStore } from '@/stores/notification-store'

vi.mock('@/stores/tts-store', () => ({
  useTTSStore: { getState: () => ({ speak: vi.fn() }) },
}))

describe('NotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      maxNotifications: 200,
      soundEnabled: false,
    })
  })

  it('addNotification creates a notification with id and timestamp', () => {
    useNotificationStore.getState().addNotification({
      type: 'incident',
      title: 'Test Alert',
      subtitle: 'CRITICAL',
    })
    const notifs = useNotificationStore.getState().notifications
    expect(notifs).toHaveLength(1)
    expect(notifs[0].title).toBe('Test Alert')
    expect(notifs[0].id).toBeDefined()
    expect(notifs[0].timestamp).toBeGreaterThan(0)
    expect(notifs[0].read).toBe(false)
  })

  it('markRead marks a notification as read', () => {
    useNotificationStore.getState().addNotification({
      type: 'tweet',
      title: 'VIP Tweet',
      subtitle: 'handle',
    })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().markRead(id)
    expect(useNotificationStore.getState().notifications[0].read).toBe(true)
  })

  it('dismissNotification removes the notification', () => {
    useNotificationStore.getState().addNotification({
      type: 'earthquake',
      title: 'Quake',
      subtitle: '5.0',
    })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().dismissNotification(id)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('dismissAll clears all notifications', () => {
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'A', subtitle: '' })
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'B', subtitle: '' })
    useNotificationStore.getState().dismissAll()
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('markAllRead marks all as read', () => {
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'A', subtitle: '' })
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'B', subtitle: '' })
    useNotificationStore.getState().markAllRead()
    expect(useNotificationStore.getState().notifications.every(n => n.read)).toBe(true)
  })

  it('respects maxNotifications limit', () => {
    useNotificationStore.setState({ maxNotifications: 3 })
    for (let i = 0; i < 5; i++) {
      useNotificationStore.getState().addNotification({ type: 'incident', title: `N${i}`, subtitle: '' })
    }
    expect(useNotificationStore.getState().notifications).toHaveLength(3)
    expect(useNotificationStore.getState().notifications[0].title).toBe('N4')
  })

  it('toggleSound switches soundEnabled', () => {
    expect(useNotificationStore.getState().soundEnabled).toBe(false)
    useNotificationStore.getState().toggleSound()
    expect(useNotificationStore.getState().soundEnabled).toBe(true)
  })

  it('getUnreadCount returns correct count', () => {
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'A', subtitle: '' })
    useNotificationStore.getState().addNotification({ type: 'incident', title: 'B', subtitle: '' })
    const idA = useNotificationStore.getState().notifications[1].id
    useNotificationStore.getState().markRead(idA)
    expect(useNotificationStore.getState().getUnreadCount()).toBe(1)
  })
})
