import { create } from 'zustand'
import type { Layer, IncidentDomain } from '../../shared/types'

const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'conflict',
    name: 'Conflict',
    nameKey: 'layers.conflict',
    domain: 'CONFLICT',
    visible: true,
    color: '#ff6b35',
    icon: '⚔',
    sublayers: [
      { id: 'active-zones', name: 'Active Zones', nameKey: 'layers.activeZones', visible: true },
      { id: 'military-movements', name: 'Military Movements', nameKey: 'layers.militaryMovements', visible: true },
      { id: 'refugee-flows', name: 'Refugee Flows', nameKey: 'layers.refugeeFlows', visible: false },
      { id: 'arms-transfers', name: 'Arms Transfers', nameKey: 'layers.armsTransfers', visible: false },
    ]
  },
  {
    id: 'cyber',
    name: 'Cyber',
    nameKey: 'layers.cyber',
    domain: 'CYBER',
    visible: true,
    color: '#00ff41',
    icon: '⚡',
    sublayers: [
      { id: 'ddos-attacks', name: 'DDoS Attacks', nameKey: 'layers.ddosAttacks', visible: true },
      { id: 'apt-groups', name: 'APT Groups', nameKey: 'layers.aptGroups', visible: true },
      { id: 'zero-days', name: 'Zero-Day Exploits', nameKey: 'layers.zeroDays', visible: false },
      { id: 'infra-outages', name: 'Infra Outages', nameKey: 'layers.infraOutages', visible: false },
    ]
  },
  {
    id: 'intel',
    name: 'Intel',
    nameKey: 'layers.intel',
    domain: 'INTEL',
    visible: true,
    color: '#00b4d8',
    icon: '🛰',
    sublayers: [
      { id: 'geopolitical', name: 'Geopolitical Events', nameKey: 'layers.geopolitical', visible: true },
      { id: 'sanctions', name: 'Sanctions', nameKey: 'layers.sanctions', visible: true },
      { id: 'diplomatic', name: 'Diplomatic', nameKey: 'layers.diplomatic', visible: false },
      { id: 'nuclear', name: 'Nuclear Activity', nameKey: 'layers.nuclear', visible: false },
    ]
  },
  {
    id: 'finance',
    name: 'Finance',
    nameKey: 'layers.finance',
    domain: 'FINANCE',
    visible: true,
    color: '#f5c542',
    icon: '📊',
    sublayers: [
      { id: 'markets', name: 'Stock Markets', nameKey: 'layers.markets', visible: true },
      { id: 'commodities', name: 'Commodities', nameKey: 'layers.commodities', visible: false },
      { id: 'currencies', name: 'Currencies', nameKey: 'layers.currencies', visible: false },
      { id: 'crypto', name: 'Crypto', nameKey: 'layers.crypto', visible: false },
    ]
  }
]

interface LayerState {
  layers: Layer[]
  toggleLayer: (domain: IncidentDomain) => void
  toggleSublayer: (domain: IncidentDomain, sublayerId: string) => void
  isLayerVisible: (domain: IncidentDomain) => boolean
  isSublayerVisible: (domain: IncidentDomain, sublayerId: string) => boolean
  getVisibleDomains: () => IncidentDomain[]
  getLayerColor: (domain: IncidentDomain) => string
}

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: DEFAULT_LAYERS,

  toggleLayer: (domain) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.domain === domain ? { ...l, visible: !l.visible } : l
      )
    })),

  toggleSublayer: (domain, sublayerId) =>
    set((state) => ({
      layers: state.layers.map(l =>
        l.domain === domain
          ? {
              ...l,
              sublayers: l.sublayers.map(s =>
                s.id === sublayerId ? { ...s, visible: !s.visible } : s
              )
            }
          : l
      )
    })),

  isLayerVisible: (domain) =>
    get().layers.find(l => l.domain === domain)?.visible ?? false,

  isSublayerVisible: (domain, sublayerId) => {
    const layer = get().layers.find(l => l.domain === domain)
    if (!layer?.visible) return false
    return layer.sublayers.find(s => s.id === sublayerId)?.visible ?? false
  },

  getVisibleDomains: () =>
    get().layers.filter(l => l.visible).map(l => l.domain),

  getLayerColor: (domain) =>
    get().layers.find(l => l.domain === domain)?.color ?? '#ffffff'
}))
