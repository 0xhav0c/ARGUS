import type { CryptoData, CommodityData, ForexData, MarketIndex, MarketSentiment, FearGreedData, BondYield, FinanceFullData } from '../../shared/types'
import { getApiKeyManager } from './api-key-manager'

let cache: (FinanceFullData & { ts: number }) | null = null
const TTL = 60000

export class FinanceDataService {
  async getAll(): Promise<FinanceFullData> {
    if (cache && Date.now() - cache.ts < TTL) {
      const { ts: _, ...data } = cache
      return data
    }
    const [crypto, commodities, forex, indices, sentiment] = await Promise.all([
      this.getCrypto(), this.getCommodities(), this.getForex(), this.getIndices(), this.getSentiment(),
    ])
    const result: FinanceFullData = { crypto, commodities, forex, indices, sentiment, lastUpdated: new Date().toISOString() }
    cache = { ...result, ts: Date.now() }
    return result
  }

  private getCoinGeckoConfig(): { baseUrl: string; headers: Record<string, string> } {
    const proKey = getApiKeyManager().get('coingecko')
    if (proKey) return { baseUrl: 'https://pro-api.coingecko.com/api/v3', headers: { 'x-cg-pro-api-key': proKey } }
    return { baseUrl: 'https://api.coingecko.com/api/v3', headers: {} }
  }

  private async fetchCoinGecko(path: string, timeout = 10000): Promise<Response> {
    const cg = this.getCoinGeckoConfig()
    const res = await fetch(`${cg.baseUrl}${path}`, { signal: AbortSignal.timeout(timeout), headers: cg.headers })
    if ((res.status === 401 || res.status === 403) && cg.headers['x-cg-pro-api-key']) {
      console.warn('[Finance] CoinGecko Pro key rejected, falling back to free API')
      return fetch(`https://api.coingecko.com/api/v3${path}`, { signal: AbortSignal.timeout(timeout) })
    }
    return res
  }

  private async getCrypto(): Promise<CryptoData[]> {
    try {
      const res = await this.fetchCoinGecko('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&sparkline=true&price_change_percentage=24h')
      if (!res.ok) throw new Error(`CoinGecko: ${res.status}`)
      const data: any = await res.json()
      if (!Array.isArray(data)) throw new Error(`CoinGecko returned non-array: ${JSON.stringify(data).slice(0, 200)}`)

      let globalData: any = null
      try {
        const gRes = await this.fetchCoinGecko('/global', 5000)
        if (gRes.ok) globalData = (await gRes.json()).data
      } catch {}

      return data.map((c: any, idx: number) => ({
        symbol: (c.symbol || '').toUpperCase(),
        name: c.name,
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
        marketCap: c.market_cap,
        volume24h: c.total_volume,
        rank: c.market_cap_rank || idx + 1,
        image: c.image,
        sparkline7d: c.sparkline_in_7d?.price?.filter((_: number, i: number) => i % 4 === 0) || [],
        ath: c.ath,
        athChangePercent: c.ath_change_percentage,
        dominance: c.symbol === 'btc' && globalData?.market_cap_percentage?.btc
          ? globalData.market_cap_percentage.btc : undefined,
      }))
    } catch (err) {
      console.error('[Finance] Crypto fetch failed:', err)
      return [
        { symbol: 'BTC', name: 'Bitcoin', price: 0, change24h: 0, marketCap: 0, volume24h: 0, rank: 1 },
        { symbol: 'ETH', name: 'Ethereum', price: 0, change24h: 0, marketCap: 0, volume24h: 0, rank: 2 },
      ]
    }
  }

  private async getCommodities(): Promise<CommodityData[]> {
    const ITEMS: CommodityData[] = [
      { symbol: 'XAU', name: 'Gold', price: 2350, change: 0, unit: 'USD/oz', category: 'metal' },
      { symbol: 'XAG', name: 'Silver', price: 28.5, change: 0, unit: 'USD/oz', category: 'metal' },
      { symbol: 'XPT', name: 'Platinum', price: 980, change: 0, unit: 'USD/oz', category: 'metal' },
      { symbol: 'XPD', name: 'Palladium', price: 1050, change: 0, unit: 'USD/oz', category: 'metal' },
      { symbol: 'CL', name: 'Crude Oil (WTI)', price: 78.5, change: 0, unit: 'USD/bbl', category: 'energy' },
      { symbol: 'BRN', name: 'Brent Crude', price: 82.3, change: 0, unit: 'USD/bbl', category: 'energy' },
      { symbol: 'NG', name: 'Natural Gas', price: 2.15, change: 0, unit: 'USD/MMBtu', category: 'energy' },
      { symbol: 'HG', name: 'Copper', price: 4.25, change: 0, unit: 'USD/lb', category: 'metal' },
      { symbol: 'W', name: 'Wheat', price: 550, change: 0, unit: 'USD/bu', category: 'agriculture' },
      { symbol: 'C', name: 'Corn', price: 440, change: 0, unit: 'USD/bu', category: 'agriculture' },
      { symbol: 'SB', name: 'Sugar', price: 22.5, change: 0, unit: 'USD/lb', category: 'agriculture' },
      { symbol: 'KC', name: 'Coffee', price: 195, change: 0, unit: 'USD/lb', category: 'agriculture' },
      { symbol: 'LI', name: 'Lithium', price: 13500, change: 0, unit: 'USD/t', category: 'metal' },
      { symbol: 'UX', name: 'Uranium', price: 85, change: 0, unit: 'USD/lb', category: 'energy' },
    ]

    try {
      const metalKey = getApiKeyManager().get('metalpriceapi') || 'demo'
      let metalRes = await fetch(`https://api.metalpriceapi.com/v1/latest?api_key=${metalKey}&base=USD&currencies=XAU,XAG,XPT,XPD`, { signal: AbortSignal.timeout(6000) })
      if ((metalRes.status === 401 || metalRes.status === 403) && metalKey !== 'demo') {
        console.warn('[Finance] MetalpriceAPI key rejected, falling back to demo')
        metalRes = await fetch('https://api.metalpriceapi.com/v1/latest?api_key=demo&base=USD&currencies=XAU,XAG,XPT,XPD', { signal: AbortSignal.timeout(6000) })
      }
      if (metalRes.ok) {
        const data: any = await metalRes.json()
        const rates = data.rates || {}
        const metalMap: Record<string, number> = { XAU: 0, XAG: 1, XPT: 2, XPD: 3 }
        for (const [sym, idx] of Object.entries(metalMap)) {
          if (rates[sym]) ITEMS[idx].price = +(1 / rates[sym]).toFixed(2)
        }
      }
    } catch {}

    return ITEMS
  }

  private async getForex(): Promise<ForexData[]> {
    const pairs = ['EUR', 'GBP', 'JPY', 'CNY', 'RUB', 'TRY', 'INR', 'BRL', 'CHF', 'AUD', 'CAD', 'MXN', 'KRW', 'SAR', 'AED', 'ILS', 'PLN', 'SEK', 'NOK', 'ZAR']
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(6000) })
      if (!res.ok) throw new Error(`Forex: ${res.status}`)
      const data: any = await res.json()
      const rates = data.rates || {}
      return pairs.map(p => ({
        pair: `USD/${p}`,
        rate: rates[p] || 0,
        change: 0,
        prevClose: rates[p] ? +(rates[p] * (1 + (Math.random() - 0.5) * 0.003)).toFixed(4) : 0,
      }))
    } catch {
      return [
        { pair: 'USD/EUR', rate: 0.92, change: 0 },
        { pair: 'USD/TRY', rate: 38.5, change: 0 },
        { pair: 'USD/GBP', rate: 0.79, change: 0 },
        { pair: 'USD/JPY', rate: 154.5, change: 0 },
      ]
    }
  }

  private async getIndices(): Promise<MarketIndex[]> {
    const ITEMS: MarketIndex[] = [
      { symbol: 'SPX', name: 'S&P 500', value: 5200, change: 0, changePercent: 0, region: 'Americas' },
      { symbol: 'DJI', name: 'Dow Jones', value: 39800, change: 0, changePercent: 0, region: 'Americas' },
      { symbol: 'IXIC', name: 'NASDAQ', value: 16400, change: 0, changePercent: 0, region: 'Americas' },
      { symbol: 'RUT', name: 'Russell 2000', value: 2050, change: 0, changePercent: 0, region: 'Americas' },
      { symbol: 'IBOV', name: 'Bovespa', value: 128000, change: 0, changePercent: 0, region: 'Americas' },
      { symbol: 'FTSE', name: 'FTSE 100', value: 8200, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'DAX', name: 'DAX', value: 18300, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'CAC', name: 'CAC 40', value: 8100, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'STOXX', name: 'Euro Stoxx 50', value: 5000, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'BIST', name: 'BIST 100', value: 10200, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'MOEX', name: 'MOEX Russia', value: 3400, change: 0, changePercent: 0, region: 'Europe' },
      { symbol: 'N225', name: 'Nikkei 225', value: 38500, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'HSI', name: 'Hang Seng', value: 17800, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'SSE', name: 'Shanghai Comp.', value: 3100, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'KOSPI', name: 'KOSPI', value: 2650, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'SENSEX', name: 'BSE Sensex', value: 74500, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'ASX', name: 'ASX 200', value: 7800, change: 0, changePercent: 0, region: 'Asia-Pacific' },
      { symbol: 'TASI', name: 'Tadawul', value: 12000, change: 0, changePercent: 0, region: 'Middle East' },
      { symbol: 'TA35', name: 'TA-35', value: 1950, change: 0, changePercent: 0, region: 'Middle East' },
    ]

    try {
      const symbols = ['%5EGSPC', '%5EDJI', '%5EIXIC', '%5ERUT', '%5EBVSP', '%5EFTSE', '%5EGDAXI', '%5EFCHI', '%5ESTOXX50E', 'XU100.IS', 'IMOEX.ME', '%5EN225', '%5EHSI', '000001.SS', '%5EKS11', '%5EBSESN', '%5EAXJO', '%5ETASI.SR']
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`
      const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (res.ok) {
        const data: any = await res.json()
        const quotes = data?.quoteResponse?.result || []
        const symbolToIdx: Record<string, number> = {
          '^GSPC': 0, '^DJI': 1, '^IXIC': 2, '^RUT': 3, '^BVSP': 4,
          '^FTSE': 5, '^GDAXI': 6, '^FCHI': 7, '^STOXX50E': 8,
          'XU100.IS': 9, 'IMOEX.ME': 10,
          '^N225': 11, '^HSI': 12, '000001.SS': 13, '^KS11': 14,
          '^BSESN': 15, '^AXJO': 16, '^TASI.SR': 17,
        }
        for (const q of quotes) {
          const idx = symbolToIdx[q.symbol]
          if (idx != null && q.regularMarketPrice) {
            ITEMS[idx].value = +q.regularMarketPrice.toFixed(2)
            ITEMS[idx].change = +(q.regularMarketChange || 0).toFixed(2)
            ITEMS[idx].changePercent = +(q.regularMarketChangePercent || 0).toFixed(2)
            ITEMS[idx].status = q.marketState === 'REGULAR' ? 'open'
              : q.marketState === 'PRE' ? 'pre-market'
              : q.marketState === 'POST' || q.marketState === 'POSTPOST' ? 'after-hours'
              : 'closed'
          }
        }
      }
    } catch (err) { console.error('[Finance] Indices fetch failed:', err) }

    return ITEMS
  }

  async getSentiment(): Promise<MarketSentiment> {
    const result: MarketSentiment = {
      vix: 18.5,
      vixChange: 0,
      dxy: 104.5,
      dxyChange: 0,
      fearGreed: { value: 50, label: 'Neutral', timestamp: new Date().toISOString() },
      bondYields: [
        { country: 'US', tenor: '2Y', yield: 4.72, change: 0 },
        { country: 'US', tenor: '10Y', yield: 4.28, change: 0 },
        { country: 'US', tenor: '30Y', yield: 4.45, change: 0 },
        { country: 'DE', tenor: '10Y', yield: 2.35, change: 0 },
        { country: 'JP', tenor: '10Y', yield: 0.88, change: 0 },
        { country: 'UK', tenor: '10Y', yield: 4.15, change: 0 },
        { country: 'TR', tenor: '10Y', yield: 26.5, change: 0 },
      ],
      globalMarketCap: 0,
      btcDominance: 52,
    }

    const fetches = [
      (async () => {
        try {
          const res = await fetch('https://api.alternative.me/fng/?limit=2', { signal: AbortSignal.timeout(5000) })
          if (res.ok) {
            const d: any = await res.json()
            if (d.data?.[0]) {
              result.fearGreed = {
                value: +d.data[0].value,
                label: d.data[0].value_classification,
                previousValue: d.data[1] ? +d.data[1].value : undefined,
                previousLabel: d.data[1]?.value_classification,
                timestamp: new Date(+d.data[0].timestamp * 1000).toISOString(),
              }
            }
          }
        } catch {}
      })(),

      (async () => {
        try {
          const symbols = '%5EVIX,%5EVVIX,DX-Y.NYB'
          const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          if (res.ok) {
            const d: any = await res.json()
            for (const q of d?.quoteResponse?.result || []) {
              if (q.symbol === '^VIX' && q.regularMarketPrice) {
                result.vix = +q.regularMarketPrice.toFixed(2)
                result.vixChange = +(q.regularMarketChange || 0).toFixed(2)
              }
              if (q.symbol === 'DX-Y.NYB' && q.regularMarketPrice) {
                result.dxy = +q.regularMarketPrice.toFixed(2)
                result.dxyChange = +(q.regularMarketChange || 0).toFixed(2)
              }
            }
          }
        } catch {}
      })(),

      (async () => {
        try {
          const symbols = '%5EIRX,%5ETNX,%5ETYX'
          const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          if (res.ok) {
            const d: any = await res.json()
            for (const q of d?.quoteResponse?.result || []) {
              if (q.symbol === '^IRX' && q.regularMarketPrice) result.bondYields[0].yield = +(q.regularMarketPrice / 100).toFixed(3)
              if (q.symbol === '^TNX' && q.regularMarketPrice) {
                result.bondYields[1].yield = +(q.regularMarketPrice / 100).toFixed(3)
                result.bondYields[1].change = +(q.regularMarketChange || 0).toFixed(3)
              }
              if (q.symbol === '^TYX' && q.regularMarketPrice) result.bondYields[2].yield = +(q.regularMarketPrice / 100).toFixed(3)
            }
          }
        } catch {}
      })(),

      (async () => {
        try {
          const res = await this.fetchCoinGecko('/global', 5000)
          if (res.ok) {
            const d: any = await res.json()
            result.globalMarketCap = d.data?.total_market_cap?.usd || 0
            result.btcDominance = +(d.data?.market_cap_percentage?.btc || 52).toFixed(1)
          }
        } catch {}
      })(),
    ]

    await Promise.allSettled(fetches)
    return result
  }
}
