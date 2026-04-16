import { useState, useEffect, useCallback, useMemo, useRef, useContext, createContext, type CSSProperties } from 'react'
import type { CryptoData, CommodityData, ForexData, MarketIndex, FinanceFullData, MarketSentiment, BondYield } from '../../../shared/types'
import { InfoTip } from '../ui/InfoTip'
import { ExpandableList } from '../ui/ExpandableList'

const P = {
  bg: '#0a0e17', card: '#0d1220', cardAlt: '#0f1525', border: '#141c2e',
  accent: '#00d4ff', dim: '#4a5568', text: '#c8d6e5',
  green: '#00e676', red: '#ff3b5c', yellow: '#f5c542', orange: '#ff6b35',
  font: "'JetBrains Mono', 'Fira Code', monospace",
}

type FinTab = 'overview' | 'crypto' | 'commodities' | 'forex' | 'indices' | 'watchlist' | 'news'

const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'TRY', symbol: '₺', label: 'Turkish Lira' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'RUB', symbol: '₽', label: 'Russian Ruble' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', label: 'South Korean Won' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc' },
  { code: 'SAR', symbol: 'SR', label: 'Saudi Riyal' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham' },
]

type FmtFn = (n: number) => string
type FmtPFn = (n: number, d?: number) => string
const CurrencyCtx = createContext<{ fmt: FmtFn; fmtP: FmtPFn; sym: string }>({
  fmt: makeFmt('$', 1), fmtP: makeFmtP(1), sym: '$',
})
function useCurrency() { return useContext(CurrencyCtx) }

const changeColor = (v: number) => v > 0 ? P.green : v < 0 ? P.red : P.dim
const changePfx = (v: number) => v > 0 ? '+' : ''

function makeFmt(sym: string, rate: number) {
  return (n: number) => {
    const v = n * rate
    if (v >= 1e12) return `${sym}${(v / 1e12).toFixed(2)}T`
    if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6) return `${sym}${(v / 1e6).toFixed(1)}M`
    return `${sym}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
}

function makeFmtP(rate: number) {
  return (n: number, d = 2) => {
    const v = n * rate
    return v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d })
  }
}

/* ══════════════════════════════════════════════
   MINI SPARKLINE CHART (canvas)
   ══════════════════════════════════════════════ */
function Sparkline({ data, width = 80, height = 28, color = P.accent }: { data: number[]; width?: number; height?: number; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !Array.isArray(data) || data.length < 2) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)

    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'round'
    data.forEach((v, i) => {
      const x = i * step
      const y = height - 2 - ((v - min) / range) * (height - 4)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, color + '18')
    grad.addColorStop(1, 'transparent')
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  }, [data, width, height, color])

  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} />
}

/* ══════════════════════════════════════════════
   FEAR & GREED GAUGE
   ══════════════════════════════════════════════ */
function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const gaugeColor = value <= 25 ? '#ff3b5c' : value <= 45 ? '#ff6b35' : value <= 55 ? '#f5c542' : value <= 75 ? '#7bed9f' : '#00e676'
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ position: 'relative', width: '100px', height: '55px', margin: '0 auto' }}>
        <svg viewBox="0 0 100 55" width="100" height="55">
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke={P.border} strokeWidth="6" strokeLinecap="round" />
          <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke={gaugeColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 126} 126`} />
        </svg>
        <div style={{ position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)', fontSize: '18px', fontWeight: 800, color: gaugeColor }}>{value}</div>
      </div>
      <div style={{ fontSize: '9px', color: gaugeColor, fontWeight: 700, letterSpacing: '0.08em', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>{label.toUpperCase()} <InfoTip text="CNN Fear & Greed Index (0-100). Extreme Fear (0-25) often signals buying opportunities. Extreme Greed (75-100) may indicate overvaluation. Based on market momentum, volatility, safe haven demand, and junk bond spread." size={10} color={gaugeColor} /></div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   METRIC CARD
   ══════════════════════════════════════════════ */
function MetricCard({ label, value, change, color, suffix, tip }: { label: string; value: string; change?: number; color?: string; suffix?: string; tip?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
      <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>{label} {tip && <InfoTip text={tip} size={10} />}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: color || P.text }}>{value}{suffix}</span>
        {change != null && (
          <span style={{ fontSize: '10px', color: changeColor(change) }}>{changePfx(change)}{change.toFixed(2)}</span>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: OVERVIEW
   ══════════════════════════════════════════════ */
const EMPTY_SENTIMENT: MarketSentiment = {
  vix: 0, vixChange: 0, dxy: 0, dxyChange: 0,
  fearGreed: { value: 0, label: 'N/A', timestamp: new Date().toISOString() },
  bondYields: [], globalMarketCap: 0, btcDominance: 0,
}

function OverviewTab({ data }: { data: FinanceFullData }) {
  const { fmt, fmtP } = useCurrency()
  const sentiment = data.sentiment || EMPTY_SENTIMENT
  const crypto = Array.isArray(data.crypto) ? data.crypto : []
  const indices = Array.isArray(data.indices) ? data.indices : []
  const topGainers = [...crypto].sort((a, b) => (b.change24h || 0) - (a.change24h || 0)).slice(0, 5)
  const topLosers = [...crypto].sort((a, b) => (a.change24h || 0) - (b.change24h || 0)).slice(0, 5)

  const regionPerf = useMemo(() => {
    const regions: Record<string, { sum: number; count: number }> = {}
    for (const idx of indices) {
      const r = idx.region || 'Other'
      if (!regions[r]) regions[r] = { sum: 0, count: 0 }
      regions[r].sum += idx.changePercent || 0
      regions[r].count++
    }
    return Object.entries(regions).map(([name, d]) => ({ name, avg: d.count > 0 ? d.sum / d.count : 0 }))
  }, [indices])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Sentiment Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
        <div style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
          {(sentiment.fearGreed?.value ?? 0) > 0
            ? <FearGreedGauge value={sentiment.fearGreed.value} label={sentiment.fearGreed.label} />
            : <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.08em', marginBottom: '4px' }}>FEAR & GREED</div>
                <div style={{ fontSize: '16px', color: P.dim }}>--</div>
                <div style={{ fontSize: '9px', color: P.dim }}>Data unavailable</div>
              </div>
          }
        </div>
        <MetricCard label="VIX (VOLATILITY)" value={sentiment.vix ? fmtP(sentiment.vix) : '--'} change={sentiment.vix ? sentiment.vixChange : undefined} color={sentiment.vix ? ((sentiment.vix) > 25 ? P.red : (sentiment.vix) > 18 ? P.yellow : P.green) : P.dim} tip="CBOE Volatility Index — measures expected S&P 500 volatility. Below 15 = calm markets, 15-25 = normal, above 25 = high fear/uncertainty, above 35 = extreme stress." />
        <MetricCard label="DXY (DOLLAR INDEX)" value={sentiment.dxy ? fmtP(sentiment.dxy) : '--'} change={sentiment.dxy ? sentiment.dxyChange : undefined} tip="US Dollar Index — measures USD against a basket of 6 major currencies (EUR, JPY, GBP, CAD, SEK, CHF). Rising DXY = stronger dollar, often negative for commodities and emerging markets." />
        <MetricCard label="BTC DOMINANCE" value={sentiment.btcDominance ? fmtP(sentiment.btcDominance, 1) : '--'} color={P.accent} suffix={sentiment.btcDominance ? '%' : ''} tip="Bitcoin's share of total cryptocurrency market cap. High dominance (>60%) = risk-off in crypto. Low dominance (<40%) = altcoin season, more speculative activity." />
        <MetricCard label="GLOBAL MARKET CAP" value={sentiment.globalMarketCap > 0 ? fmt(sentiment.globalMarketCap) : '--'} tip="Total market capitalization of all publicly traded stocks worldwide. A broad indicator of global equity market size and investor confidence." />
      </div>

      {/* Bond Yields */}
      <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
        <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>TREASURY & SOVEREIGN YIELDS <InfoTip text="Government bond yields across major economies. Rising yields often indicate tightening monetary policy or inflation expectations. Key benchmark: US 10Y Treasury." size={11} /></div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(sentiment.bondYields || []).map((b: BondYield) => (
            <div key={`${b.country}-${b.tenor}`} style={{ padding: '6px 10px', background: P.bg, borderRadius: '4px', minWidth: '90px' }}>
              <div style={{ fontSize: '9px', color: P.dim }}>{b.country} {b.tenor}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: P.text }}>{b.yield > 0 ? `${(b.yield * 100).toFixed(2)}%` : '--'}</div>
              {b.change !== 0 && <div style={{ fontSize: '9px', color: changeColor(b.change) }}>{changePfx(b.change)}{b.change.toFixed(3)}</div>}
            </div>
          ))}
          {sentiment.bondYields.length === 0 && <div style={{ padding: '12px', color: '#4a5568', fontSize: '10px', textAlign: 'center' }}>No live bond yield data available</div>}
        </div>
      </div>

      {/* Heatmap Row: Regional Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '12px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
          <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.12em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>REGIONAL PERFORMANCE <InfoTip text="Performance of major stock indices grouped by region. Green = positive, Red = negative. Shows percentage change from previous close." size={11} /></div>
          {regionPerf.map(r => (
            <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: P.text, width: '90px' }}>{r.name}</span>
              <div style={{ flex: 1, height: '8px', background: P.bg, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '4px',
                  width: `${Math.min(100, Math.abs(r.avg) * 15)}%`,
                  background: r.avg >= 0 ? P.green : P.red,
                  marginLeft: r.avg < 0 ? 'auto' : 0,
                }} />
              </div>
              <span style={{ fontSize: '10px', color: changeColor(r.avg), width: '50px', textAlign: 'right' }}>{changePfx(r.avg)}{r.avg.toFixed(2)}%</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '8px' }}>
          <div style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: P.green, letterSpacing: '0.1em', marginBottom: '6px' }}>TOP GAINERS (24H)</div>
            {topGainers.length === 0 && <div style={{ padding: '8px', color: P.dim, fontSize: '10px', textAlign: 'center' }}>No data</div>}
            {topGainers.map(c => (
              <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                <span style={{ color: P.text }}>{c.symbol}</span>
                <span style={{ color: P.green }}>{changePfx(c.change24h)}{c.change24h.toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px' }}>
            <div style={{ fontSize: '9px', color: P.red, letterSpacing: '0.1em', marginBottom: '6px' }}>TOP LOSERS (24H)</div>
            {topLosers.length === 0 && <div style={{ padding: '8px', color: P.dim, fontSize: '10px', textAlign: 'center' }}>No data</div>}
            {topLosers.map(c => (
              <div key={c.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '10px' }}>
                <span style={{ color: P.text }}>{c.symbol}</span>
                <span style={{ color: P.red }}>{changePfx(c.change24h)}{c.change24h.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Ticker */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '8px 0' }}>
        {indices.slice(0, 9).map(idx => (
          <div key={idx.symbol} style={{ padding: '6px 10px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '4px', fontSize: '9px', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: P.dim }}>{idx.symbol}</span>
            <span style={{ color: P.text, fontWeight: 600 }}>{idx.value.toLocaleString()}</span>
            <span style={{ color: changeColor(idx.changePercent) }}>{changePfx(idx.changePercent)}{idx.changePercent.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: CRYPTO
   ══════════════════════════════════════════════ */
function CryptoTab({ data, onWatch }: { data: CryptoData[]; onWatch: (sym: string, name: string) => void }) {
  const { fmt, fmtP } = useCurrency()
  const [sort, setSort] = useState<'rank' | 'price' | 'change' | 'mcap' | 'vol'>('rank')
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    if (!Array.isArray(data)) return []
    const cp = [...data]
    const s = (a: CryptoData, b: CryptoData) => {
      if (sort === 'rank') return (a.rank || 0) - (b.rank || 0)
      if (sort === 'price') return b.price - a.price
      if (sort === 'change') return b.change24h - a.change24h
      if (sort === 'mcap') return b.marketCap - a.marketCap
      return b.volume24h - a.volume24h
    }
    cp.sort(asc ? (a, b) => -s(a, b) : s)
    return cp
  }, [data, sort, asc])

  const toggleSort = (s: typeof sort) => { if (sort === s) setAsc(!asc); else { setSort(s); setAsc(false) } }
  const hdr = (label: string, key: typeof sort, align: CSSProperties['textAlign'] = 'right'): CSSProperties => ({
    fontSize: '9px', color: sort === key ? P.accent : P.dim, letterSpacing: '0.08em', cursor: 'pointer', textAlign: align, padding: '6px 8px', userSelect: 'none',
  })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '32px 60px 1fr 90px 80px 90px 90px 80px 40px', borderBottom: `1px solid ${P.border}` }}>
        <div style={hdr('#', 'rank', 'center')} onClick={() => toggleSort('rank')}>#</div>
        <div style={{ ...hdr('', 'rank'), visibility: 'hidden' }}>IMG</div>
        <div style={hdr('NAME', 'rank', 'left')} onClick={() => toggleSort('rank')}>NAME</div>
        <div style={hdr('PRICE', 'price')} onClick={() => toggleSort('price')}>PRICE</div>
        <div style={hdr('24H %', 'change')} onClick={() => toggleSort('change')}>24H %</div>
        <div style={hdr('MCAP', 'mcap')} onClick={() => toggleSort('mcap')}>MCAP</div>
        <div style={hdr('VOLUME', 'vol')} onClick={() => toggleSort('vol')}>VOLUME</div>
        <div style={{ ...hdr('7D', 'rank'), textAlign: 'center' }}>7D CHART</div>
        <div style={{ fontSize: '9px', color: P.dim, padding: '6px 0', textAlign: 'center' }}>★</div>
      </div>
      {sorted.map(c => (
        <div key={c.symbol} style={{ display: 'grid', gridTemplateColumns: '32px 60px 1fr 90px 80px 90px 90px 80px 40px', alignItems: 'center', borderBottom: `1px solid ${P.border}15`, padding: '2px 0', transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = `${P.accent}06`)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontSize: '9px', color: P.dim, textAlign: 'center' }}>{c.rank}</div>
          <div style={{ padding: '0 8px' }}>
            {c.image && <img src={c.image} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />}
          </div>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: P.text }}>{c.symbol}</span>
            <span style={{ fontSize: '9px', color: P.dim, marginLeft: '6px' }}>{c.name}</span>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: P.text, textAlign: 'right', padding: '0 8px', fontVariantNumeric: 'tabular-nums' }}>
            {fmtP(c.price, c.price < 1 ? 6 : c.price < 100 ? 4 : 2)}
          </div>
          <div style={{ fontSize: '10px', textAlign: 'right', padding: '0 8px', color: changeColor(c.change24h), fontWeight: 600 }}>
            {changePfx(c.change24h)}{c.change24h.toFixed(2)}%
          </div>
          <div style={{ fontSize: '10px', textAlign: 'right', padding: '0 8px', color: P.dim }}>{fmt(c.marketCap)}</div>
          <div style={{ fontSize: '10px', textAlign: 'right', padding: '0 8px', color: P.dim }}>{fmt(c.volume24h)}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {Array.isArray(c.sparkline7d) && c.sparkline7d.length > 2 && <Sparkline data={c.sparkline7d} width={70} height={24} color={c.change24h >= 0 ? P.green : P.red} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={() => onWatch(c.symbol, c.name)} style={{ background: 'none', border: 'none', color: P.yellow, cursor: 'pointer', fontSize: '12px', padding: '2px' }}>☆</button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: COMMODITIES
   ══════════════════════════════════════════════ */
function CommoditiesTab({ data }: { data: CommodityData[] }) {
  const { fmtP, sym } = useCurrency()
  const [catFilter, setCatFilter] = useState<'all' | 'metal' | 'energy' | 'agriculture'>('all')
  const safeData = Array.isArray(data) ? data : []
  const filtered = catFilter === 'all' ? safeData : safeData.filter(c => c.category === catFilter)

  const catColors: Record<string, string> = { metal: '#f5c542', energy: '#ff6b35', agriculture: '#00e676' }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {(['all', 'metal', 'energy', 'agriculture'] as const).map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)} style={{
            padding: '5px 12px', fontSize: '9px', fontWeight: 600,
            background: catFilter === cat ? `${catColors[cat] || P.accent}15` : 'transparent',
            border: `1px solid ${catFilter === cat ? (catColors[cat] || P.accent) + '40' : P.border}`,
            borderRadius: '4px', color: catFilter === cat ? (catColors[cat] || P.accent) : P.dim,
            cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{cat === 'all' ? 'ALL' : cat}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
        {filtered.map(c => {
          const catColor = catColors[c.category || ''] || P.dim
          return (
            <div key={c.symbol} style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: catColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: catColor, letterSpacing: '0.08em' }}>{c.symbol}</span>
                <span style={{ fontSize: '9px', color: P.dim, padding: '1px 6px', background: `${catColor}10`, borderRadius: '3px' }}>{c.category?.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '10px', color: P.dim, marginBottom: '4px' }}>{c.name}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: P.text }}>{sym}{fmtP(c.price, c.price < 10 ? 4 : 2)}</div>
              <div style={{ fontSize: '9px', color: P.dim, marginTop: '4px' }}>{c.unit}</div>
              {(c.high24h || c.low24h) && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '9px' }}>
                  {c.high24h && <span style={{ color: P.green }}>H: {fmtP(c.high24h, 2)}</span>}
                  {c.low24h && <span style={{ color: P.red }}>L: {fmtP(c.low24h, 2)}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: FOREX
   ══════════════════════════════════════════════ */
function ForexTab({ data }: { data: ForexData[] }) {
  const [searchQ, setSearchQ] = useState('')
  const safeData = Array.isArray(data) ? data : []
  const filtered = searchQ ? safeData.filter(f => f.pair.toLowerCase().includes(searchQ.toLowerCase())) : safeData

  const majors = filtered.filter(f => ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD'].some(m => f.pair.includes(m)))
  const emerging = filtered.filter(f => !majors.includes(f))

  const renderRow = (f: ForexData) => {
    const [base, quote] = f.pair.split('/')
    const hasPrev = f.prevClose != null && f.prevClose > 0
    const diff = hasPrev ? f.rate - f.prevClose! : 0
    const diffPct = hasPrev ? (diff / f.prevClose!) * 100 : 0
    return (
      <div key={f.pair} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 80px 70px', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${P.border}15` }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: P.accent }}>{base}</span>
          <span style={{ fontSize: '11px', color: P.dim }}>/</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: P.text }}>{quote}</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: P.text, fontVariantNumeric: 'tabular-nums' }}>
          {f.rate < 10 ? f.rate.toFixed(4) : f.rate.toFixed(2)}
        </div>
        <div style={{ fontSize: '10px', color: hasPrev ? changeColor(diff) : P.dim, textAlign: 'right' }}>
          {hasPrev ? `${changePfx(diff)}${Math.abs(diff).toFixed(4)}` : '--'}
        </div>
        <div style={{ fontSize: '10px', color: hasPrev ? changeColor(diffPct) : P.dim, textAlign: 'right', fontWeight: 600 }}>
          {hasPrev ? `${changePfx(diffPct)}${Math.abs(diffPct).toFixed(2)}%` : '--'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search pairs (e.g. TRY, EUR)..."
          style={{ width: '260px', padding: '7px 12px', background: P.bg, border: `1px solid ${P.border}`, borderRadius: '6px', color: P.text, fontFamily: P.font, fontSize: '11px', outline: 'none' }} />
      </div>

      {majors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', color: P.accent, letterSpacing: '0.1em', padding: '6px 12px', marginBottom: '4px' }}>MAJOR PAIRS</div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            {majors.map(renderRow)}
          </div>
        </div>
      )}

      {emerging.length > 0 && (
        <div>
          <div style={{ fontSize: '9px', color: P.orange, letterSpacing: '0.1em', padding: '6px 12px', marginBottom: '4px' }}>EMERGING & EXOTIC</div>
          <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', overflow: 'hidden' }}>
            {emerging.map(renderRow)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: INDICES
   ══════════════════════════════════════════════ */
function IndicesTab({ data }: { data: MarketIndex[] }) {
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const safeData = Array.isArray(data) ? data : []
  const regions = useMemo(() => ['all', ...new Set(safeData.map(i => i.region || 'Other'))], [safeData])
  const filtered = regionFilter === 'all' ? safeData : safeData.filter(i => (i.region || 'Other') === regionFilter)

  const statusDot = (s?: string) => {
    const c = s === 'open' ? P.green : s === 'pre-market' ? P.yellow : s === 'after-hours' ? P.orange : '#555'
    return <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: c, marginRight: '4px' }} />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {regions.map(r => (
          <button key={r} onClick={() => setRegionFilter(r)} style={{
            padding: '5px 12px', fontSize: '9px', fontWeight: 600,
            background: regionFilter === r ? `${P.accent}15` : 'transparent',
            border: `1px solid ${regionFilter === r ? P.accent + '40' : P.border}`,
            borderRadius: '4px', color: regionFilter === r ? P.accent : P.dim,
            cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{r === 'all' ? 'ALL REGIONS' : r}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>No index data available — market API may be unreachable</div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
        {filtered.map(idx => (
          <div key={idx.symbol} style={{ padding: '14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{idx.symbol}</span>
                {idx.status && <span style={{ marginLeft: '6px' }}>{statusDot(idx.status)}</span>}
              </div>
              <span style={{ fontSize: '9px', color: P.dim, padding: '1px 6px', background: `${P.accent}08`, borderRadius: '3px' }}>{idx.region}</span>
            </div>
            <div style={{ fontSize: '10px', color: P.dim, marginBottom: '6px' }}>{idx.name}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: P.text, fontVariantNumeric: 'tabular-nums' }}>{idx.value.toLocaleString()}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '10px', color: changeColor(idx.change) }}>{changePfx(idx.change)}{Math.abs(idx.change).toFixed(2)}</span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: changeColor(idx.changePercent) }}>({changePfx(idx.changePercent)}{Math.abs(idx.changePercent).toFixed(2)}%)</span>
            </div>
            {idx.status && <div style={{ fontSize: '9px', color: P.dim, marginTop: '6px', textTransform: 'uppercase' }}>{idx.status.replace('-', ' ')}</div>}
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: WATCHLIST
   ══════════════════════════════════════════════ */
interface WlItem { symbol: string; name: string; type: 'crypto' | 'commodity' | 'forex' | 'index'; price: number; change: number }

function WatchlistTab({ items, onRemove }: { items: WlItem[]; onRemove: (sym: string) => void }) {
  const { fmtP, sym } = useCurrency()
  if (items.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '12px' }}>★</div>
        <div style={{ fontSize: '12px', color: P.dim }}>Watchlist is empty</div>
        <div style={{ fontSize: '10px', color: P.dim, marginTop: '6px' }}>Click the ☆ button on crypto, commodity, or index cards to add items.</div>
      </div>
    )
  }

  const typeColors: Record<string, string> = { crypto: P.accent, commodity: P.yellow, forex: P.green, index: P.orange }

  return (
    <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: '8px', overflow: 'hidden' }}>
      {items.map(item => (
        <div key={item.symbol} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px 70px 32px', alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${P.border}15` }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: P.text }}>{item.symbol}</span>
            <div style={{ fontSize: '9px', color: typeColors[item.type] || P.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.type}</div>
          </div>
          <div style={{ fontSize: '10px', color: P.dim }}>{item.name}</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: P.text, textAlign: 'right' }}>{sym}{fmtP(item.price, item.price < 1 ? 6 : 2)}</div>
          <div style={{ fontSize: '10px', color: changeColor(item.change), textAlign: 'right', fontWeight: 600 }}>{changePfx(item.change)}{Math.abs(item.change).toFixed(2)}%</div>
          <button onClick={() => onRemove(item.symbol)} style={{ background: 'none', border: 'none', color: P.red, cursor: 'pointer', fontSize: '11px' }}>✕</button>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════
   SECTION: FINANCE NEWS
   ══════════════════════════════════════════════ */
function NewsTab({ onLocateIncident }: { onLocateIncident?: (i: any) => void }) {
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.argus.getIncidents?.({ domain: 'FINANCE' }).then((list: any) => {
      const arr = Array.isArray(list) ? list : []
      setIncidents(arr.filter((i: any) => i.domain === 'FINANCE').sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: P.dim, fontSize: '11px' }}>Loading finance news...</div>

  const sevColors: Record<string, string> = { CRITICAL: P.red, HIGH: P.orange, MEDIUM: P.yellow, LOW: P.accent, INFO: P.dim }

  return (
    <div>
      <div style={{ fontSize: '9px', color: P.dim, letterSpacing: '0.1em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>FINANCE INCIDENT FEED ({incidents.length} events) <InfoTip text="Finance-domain incidents from intelligence feeds. These are geopolitical or economic events that may impact markets — sanctions, trade disputes, central bank decisions, etc." size={11} /></div>
      <ExpandableList
        items={incidents}
        title="Finance News"
        icon="◆"
        color={P.accent}
        emptyMessage="No finance incidents available"
        searchable
        searchFn={(inc: any, q: string) => `${inc.title} ${inc.description || ''} ${inc.source} ${inc.country || ''}`.toLowerCase().includes(q)}
        filters={[
          { id: 'severity', label: 'Severity', options: [...new Set(incidents.map((i: any) => i.severity))] as string[] },
          { id: 'source', label: 'Source', options: [...new Set(incidents.map((i: any) => i.source).filter(Boolean))] as string[] },
        ]}
        filterFn={(inc: any, f: Record<string, string>) => {
          if (f.severity && inc.severity !== f.severity) return false
          if (f.source && inc.source !== f.source) return false
          return true
        }}
        renderItem={(inc: any) => {
          const clickable = !!onLocateIncident && inc.latitude != null && inc.longitude != null
          return (
            <div key={inc.id}
              onClick={clickable ? () => onLocateIncident(inc) : undefined}
              style={{ padding: '10px 14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: '6px', display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s', marginBottom: '4px' }}
              onMouseEnter={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,212,255,0.06)' } : undefined}
              onMouseLeave={clickable ? (e) => { (e.currentTarget as HTMLDivElement).style.background = P.card } : undefined}
            >
              <div style={{ width: '3px', borderRadius: '2px', background: sevColors[inc.severity] || P.dim, minHeight: '30px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: P.text, fontWeight: 500, marginBottom: '3px', lineHeight: 1.4 }}>
                  {inc.title}
                  {clickable && <span style={{ color: '#00d4ff', marginLeft: 6, fontSize: '9px' }}>◎</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: P.dim }}>
                  <span>{inc.source}</span>
                  <span>{inc.country}</span>
                  <span>{new Date(inc.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <span style={{ fontSize: '9px', color: sevColors[inc.severity] || P.dim, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0 }}>{inc.severity}</span>
            </div>
          )
        }}
      />
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN EXPORT: FINANCE DEEP PANEL
   ══════════════════════════════════════════════ */
export function FinanceDeepPanel({ onLocateIncident }: { onLocateIncident?: (i: any) => void }) {
  const [tab, setTab] = useState<FinTab>('overview')
  const [data, setData] = useState<FinanceFullData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [baseCurrency, setBaseCurrency] = useState<string>(() => localStorage.getItem('argus-base-currency') || 'USD')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1 })
  const [ratesFallback, setRatesFallback] = useState(false)
  const [watchlist, setWatchlist] = useState<WlItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('argus-watchlist') || '[]') } catch { return [] }
  })

  const curRate = exchangeRates[baseCurrency] || 1
  const curSym = CURRENCIES.find(c => c.code === baseCurrency)?.symbol || '$'
  const fmt = useMemo(() => makeFmt(curSym, curRate), [curSym, curRate])
  const fmtP = useMemo(() => makeFmtP(curRate), [curRate])
  const currencyCtxValue = useMemo(() => ({ fmt, fmtP, sym: curSym }), [fmt, fmtP, curSym])

  useEffect(() => { localStorage.setItem('argus-base-currency', baseCurrency) }, [baseCurrency])

  useEffect(() => {
    if (baseCurrency === 'USD') { setExchangeRates({ USD: 1 }); setRatesFallback(false); return }
    setRatesFallback(false)
    fetch(`https://open.er-api.com/v6/latest/USD`)
      .then(r => r.json())
      .then(d => { if (d.rates) setExchangeRates(d.rates) })
      .catch(() => {
        const fallback: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, TRY: 38.5, JPY: 149.5, CNY: 7.24, RUB: 96, INR: 83.5, BRL: 5.0, KRW: 1340, AUD: 1.53, CAD: 1.36, CHF: 0.88, SAR: 3.75, AED: 3.67 }
        setExchangeRates(fallback)
        setRatesFallback(true)
      })
  }, [baseCurrency])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const result = await window.argus.getFinanceData()
      setData(result)
    } catch (err: any) { setError(err?.message || 'Failed to load finance data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh(); const t = setInterval(refresh, 60000); return () => clearInterval(t) }, [refresh])

  useEffect(() => { localStorage.setItem('argus-watchlist', JSON.stringify(watchlist)) }, [watchlist])

  // Update watchlist prices from live data on each refresh
  useEffect(() => {
    if (!data) return
    setWatchlist(prev => {
      let changed = false
      const updated = prev.map(item => {
        let price = item.price, change = item.change
        if (item.type === 'crypto') {
          const c = (data.crypto || []).find(x => x.symbol === item.symbol)
          if (c && c.price > 0) { price = c.price; change = c.change24h; changed = true }
        } else if (item.type === 'commodity') {
          const c = (data.commodities || []).find(x => x.symbol === item.symbol)
          if (c && c.price > 0) { price = c.price; change = c.change; changed = true }
        } else if (item.type === 'index') {
          const c = (data.indices || []).find(x => x.symbol === item.symbol)
          if (c && c.value > 0) { price = c.value; change = c.changePercent; changed = true }
        }
        return { ...item, price, change }
      })
      return changed ? updated : prev
    })
  }, [data])

  const addToWatchlist = useCallback((symbol: string, name: string, type: WlItem['type'] = 'crypto') => {
    setWatchlist(prev => {
      if (prev.find(w => w.symbol === symbol)) return prev
      let price = 0, change = 0
      if (data) {
        if (type === 'crypto') { const c = (data.crypto || []).find(x => x.symbol === symbol); if (c) { price = c.price; change = c.change24h } }
        else if (type === 'commodity') { const c = (data.commodities || []).find(x => x.symbol === symbol); if (c) { price = c.price; change = c.change } }
        else if (type === 'index') { const c = (data.indices || []).find(x => x.symbol === symbol); if (c) { price = c.value; change = c.changePercent } }
      }
      return [...prev, { symbol, name, type, price, change }]
    })
  }, [data])

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol))
  }, [])

  const tabs: { id: FinTab; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'OVERVIEW', icon: '◉' },
    { id: 'crypto', label: 'CRYPTO', icon: '₿' },
    { id: 'commodities', label: 'COMMODITIES', icon: '⛏' },
    { id: 'forex', label: 'FOREX', icon: '💱' },
    { id: 'indices', label: 'INDICES', icon: '📊' },
    { id: 'watchlist', label: 'WATCHLIST', icon: '★', badge: watchlist.length },
    { id: 'news', label: 'NEWS', icon: '📰' },
  ]

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: P.dim, fontFamily: P.font, fontSize: '11px' }}>
      <div style={{ fontSize: '20px', marginBottom: '12px', opacity: 0.3 }}>◈</div>
      Loading financial data...
    </div>
  )
  if (error) return (
    <div style={{ padding: '60px', textAlign: 'center', fontFamily: P.font }}>
      <div style={{ color: P.red, fontSize: '11px', marginBottom: '12px' }}>⚠ {error}</div>
      <button onClick={refresh} style={{ padding: '8px 20px', background: `${P.accent}15`, border: `1px solid ${P.accent}40`, borderRadius: '6px', color: P.accent, fontSize: '10px', cursor: 'pointer', fontFamily: P.font, fontWeight: 600 }}>RETRY</button>
    </div>
  )
  if (!data) return null

  return (
    <CurrencyCtx.Provider value={currencyCtxValue}>
    <div style={{ fontFamily: P.font, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: P.yellow }}>◈</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: P.text, letterSpacing: '0.12em' }}>FINANCE TERMINAL</span>
          <InfoTip text="Financial market dashboard. Data refreshes every 60 seconds from multiple free APIs. Prices may be delayed 1-5 minutes depending on the data source." />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {data.sentiment && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '9px' }}>
              <span style={{ color: P.dim }}>VIX <span style={{ color: (data.sentiment.vix || 0) > 25 ? P.red : P.green, fontWeight: 700 }}>{data.sentiment.vix ?? '--'}</span></span>
              <span style={{ color: P.dim }}>DXY <span style={{ color: P.text, fontWeight: 700 }}>{data.sentiment.dxy ?? '--'}</span></span>
              <span style={{ color: P.dim }}>F&G <span style={{ color: (() => { const v = data.sentiment?.fearGreed?.value; if (!v) return P.dim; return v <= 25 ? P.red : v >= 75 ? P.green : P.yellow })(), fontWeight: 700 }}>{data.sentiment.fearGreed?.value ?? '--'}</span></span>
            </div>
          )}
          <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value)} style={{
            padding: '3px 6px', fontSize: '9px', fontFamily: P.font, fontWeight: 700,
            background: P.card, border: `1px solid ${P.accent}40`, borderRadius: '4px',
            color: P.accent, cursor: 'pointer', outline: 'none',
          }}>
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
          <button onClick={refresh} style={{ padding: '4px 10px', fontSize: '9px', background: `${P.accent}10`, border: `1px solid ${P.accent}30`, borderRadius: '4px', color: P.accent, cursor: 'pointer', fontFamily: P.font }}>↻ REFRESH</button>
          <span style={{ fontSize: '9px', color: P.dim }}>{new Date(data.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', padding: '8px 20px', borderBottom: `1px solid ${P.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px',
            background: tab === t.id ? `${P.accent}12` : 'transparent',
            border: 'none', borderBottom: `2px solid ${tab === t.id ? P.accent : 'transparent'}`,
            color: tab === t.id ? P.accent : P.dim,
            fontSize: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: P.font, letterSpacing: '0.06em',
            transition: 'all 0.15s',
          }}>
            <span>{t.icon}</span> {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ padding: '1px 5px', background: P.yellow, borderRadius: '8px', fontSize: '9px', color: '#000', fontWeight: 800 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Fallback warning */}
      {ratesFallback && baseCurrency !== 'USD' && (
        <div style={{ margin: '0 20px', padding: '6px 12px', background: '#f5c54215', border: `1px solid #f5c54240`, borderRadius: '6px', fontSize: '9px', color: '#f5c542' }}>
          Exchange rate API unreachable — using approximate fallback rates for {baseCurrency}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'crypto' && <CryptoTab data={data.crypto || []} onWatch={(s, n) => addToWatchlist(s, n, 'crypto')} />}
        {tab === 'commodities' && <CommoditiesTab data={data.commodities || []} />}
        {tab === 'forex' && <ForexTab data={data.forex || []} />}
        {tab === 'indices' && <IndicesTab data={data.indices || []} />}
        {tab === 'watchlist' && <WatchlistTab items={watchlist} onRemove={removeFromWatchlist} />}
        {tab === 'news' && <NewsTab onLocateIncident={onLocateIncident} />}
      </div>
    </div>
    </CurrencyCtx.Provider>
  )
}
