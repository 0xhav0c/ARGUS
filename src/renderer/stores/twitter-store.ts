import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export interface TwitterAccount {
  id: string
  handle: string
  name: string
  title: string
  country: string
  category: string
  isCustom: boolean
}

const DEFAULT_TWITTER_CATEGORIES = [
  'World Leaders',
  'Defense & Security',
  'Economy & Finance',
  'International Organizations',
  'Tech & Innovation',
  'Custom',
] as const

const DEFAULT_TWITTER_ACCOUNTS: TwitterAccount[] = [
  { id: 'acc-POTUS', handle: 'POTUS', name: 'President of the United States', title: 'US President', country: 'US', category: 'World Leaders', isCustom: false },
  { id: 'acc-VP', handle: 'VP', name: 'Vice President', title: 'US Vice President', country: 'US', category: 'World Leaders', isCustom: false },
  { id: 'acc-realDonaldTrump', handle: 'realDonaldTrump', name: 'Donald J. Trump', title: '47th US President', country: 'US', category: 'World Leaders', isCustom: false },
  { id: 'acc-EmmanuelMacron', handle: 'EmmanuelMacron', name: 'Emmanuel Macron', title: 'French President', country: 'FR', category: 'World Leaders', isCustom: false },
  { id: 'acc-RTErdogan', handle: 'RTErdogan', name: 'Recep Tayyip Erdoğan', title: 'Turkish President', country: 'TR', category: 'World Leaders', isCustom: false },
  { id: 'acc-ZelenskyyUa', handle: 'ZelenskyyUa', name: 'Volodymyr Zelenskyy', title: 'Ukrainian President', country: 'UA', category: 'World Leaders', isCustom: false },
  { id: 'acc-netanyahu', handle: 'netanyahu', name: 'Benjamin Netanyahu', title: 'Israeli PM', country: 'IL', category: 'World Leaders', isCustom: false },
  { id: 'acc-naaborinhambir', handle: 'naaborinhambir', name: 'Narendra Modi', title: 'Indian PM', country: 'IN', category: 'World Leaders', isCustom: false },
  { id: 'acc-DeptofDefense', handle: 'DeptofDefense', name: 'US DoD', title: 'Department of Defense', country: 'US', category: 'Defense & Security', isCustom: false },
  { id: 'acc-SecDef', handle: 'SecDef', name: 'Secretary of Defense', title: 'US SecDef', country: 'US', category: 'Defense & Security', isCustom: false },
  { id: 'acc-NATO', handle: 'NATO', name: 'NATO', title: 'North Atlantic Treaty Organization', country: 'INT', category: 'Defense & Security', isCustom: false },
  { id: 'acc-KremlinRussia_E', handle: 'KremlinRussia_E', name: 'The Kremlin', title: 'Russian Presidency', country: 'RU', category: 'Defense & Security', isCustom: false },
  { id: 'acc-MFA_China', handle: 'MFA_China', name: 'China MFA', title: 'Chinese Foreign Ministry', country: 'CN', category: 'Defense & Security', isCustom: false },
  { id: 'acc-FederalReserve', handle: 'FederalReserve', name: 'Federal Reserve', title: 'US Central Bank', country: 'US', category: 'Economy & Finance', isCustom: false },
  { id: 'acc-ECB', handle: 'ECB', name: 'European Central Bank', title: 'ECB', country: 'EU', category: 'Economy & Finance', isCustom: false },
  { id: 'acc-IMFNews', handle: 'IMFNews', name: 'IMF', title: 'International Monetary Fund', country: 'INT', category: 'Economy & Finance', isCustom: false },
  { id: 'acc-UN', handle: 'UN', name: 'United Nations', title: 'United Nations', country: 'INT', category: 'International Organizations', isCustom: false },
  { id: 'acc-WHO', handle: 'WHO', name: 'WHO', title: 'World Health Organization', country: 'INT', category: 'International Organizations', isCustom: false },
  { id: 'acc-StateDept', handle: 'StateDept', name: 'State Department', title: 'US State Department', country: 'US', category: 'International Organizations', isCustom: false },
  { id: 'acc-elonmusk', handle: 'elonmusk', name: 'Elon Musk', title: 'CEO Tesla/SpaceX/X', country: 'US', category: 'Tech & Innovation', isCustom: false },
]

function twitterFallbackCategory(excluded: string): string {
  const first = DEFAULT_TWITTER_CATEGORIES.find((c) => c !== excluded)
  return first ?? 'Custom'
}

function cloneTwitterDefaults(): { accounts: TwitterAccount[]; categories: string[] } {
  return {
    accounts: DEFAULT_TWITTER_ACCOUNTS.map((a) => ({ ...a })),
    categories: [...DEFAULT_TWITTER_CATEGORIES],
  }
}

interface TwitterStoreState {
  accounts: TwitterAccount[]
  categories: string[]
  addAccount: (account: Omit<TwitterAccount, 'id'>) => void
  removeAccount: (id: string) => void
  updateAccount: (id: string, updates: Partial<TwitterAccount>) => void
  addCategory: (name: string) => void
  removeCategory: (name: string) => void
  resetToDefaults: () => void
}

export const useTwitterStore = create<TwitterStoreState>()(
  persist(
    (set) => ({
      ...cloneTwitterDefaults(),

      addAccount: (account) =>
        set((s) => ({
          accounts: [...s.accounts, { ...account, id: uuidv4() }],
        })),

      removeAccount: (id) =>
        set((s) => ({
          accounts: s.accounts.filter((a) => a.id !== id),
        })),

      updateAccount: (id, updates) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      addCategory: (name) =>
        set((s) => {
          const t = name.trim()
          if (!t || s.categories.includes(t)) return {}
          return { categories: [...s.categories, t] }
        }),

      removeCategory: (name) =>
        set((s) => {
          const fallback = name === 'Custom' ? twitterFallbackCategory('Custom') : 'Custom'
          return {
            accounts: s.accounts.map((a) =>
              a.category === name ? { ...a, category: fallback } : a
            ),
            categories: s.categories.filter((c) => c !== name),
          }
        }),

      resetToDefaults: () => set(cloneTwitterDefaults()),
    }),
    {
      name: 'argus-twitter-accounts',
      partialize: (s) => ({ accounts: s.accounts, categories: s.categories }),
    }
  )
)
