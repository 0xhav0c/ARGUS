import '@testing-library/jest-dom'

Object.defineProperty(window, 'argus', {
  value: {
    getIncidents: vi.fn().mockResolvedValue([]),
    getFeeds: vi.fn().mockResolvedValue([]),
    onIncidentUpdate: vi.fn().mockReturnValue(() => {}),
    onWindowStateChanged: vi.fn().mockReturnValue(() => {}),
    onPanelsDetached: vi.fn().mockReturnValue(() => {}),
    onRemoteNavigateIncident: vi.fn().mockReturnValue(() => {}),
    onVIPTweetAlert: vi.fn().mockReturnValue(() => {}),
    windowIsMaximized: vi.fn().mockResolvedValue(false),
    windowIsFullscreen: vi.fn().mockResolvedValue(false),
    windowMinimize: vi.fn().mockResolvedValue(undefined),
    windowMaximize: vi.fn().mockResolvedValue(undefined),
    windowClose: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({}),
    updateSettings: vi.fn().mockResolvedValue(undefined),

    navigateToIncident: vi.fn().mockResolvedValue(undefined),
    detachPanels: vi.fn().mockResolvedValue(undefined),
    platform: 'win32',
  },
  writable: true,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
