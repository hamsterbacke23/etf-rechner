import { writeFileSync } from 'fs'

const TICKER = 'SPYI.DE'
const URL = `https://query2.finance.yahoo.com/v8/finance/chart/${TICKER}?range=10y&interval=1mo`

const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
const data = await res.json()
const r = data.chart.result[0]
const timestamps = r.timestamp
const closes = r.indicators.adjclose[0].adjclose

// Group monthly closes by year, take Jan close as year-start price
const yearPrices = {}
const monthlyPrices = {}
for (let i = 0; i < timestamps.length; i++) {
  if (closes[i] == null) continue
  const d = new Date(timestamps[i] * 1000)
  const y = d.getFullYear()
  const m = d.getMonth()
  const key = `${y}-${String(m + 1).padStart(2, '0')}`
  monthlyPrices[key] = Math.round(closes[i] * 1000) / 1000
  if (m === 0 && !yearPrices[y]) yearPrices[y] = closes[i]
}

// Also capture latest price for current partial year
const lastClose = closes.findLast(c => c != null)
const lastDate = new Date(timestamps[timestamps.length - 1] * 1000)
const lastYear = lastDate.getFullYear()

// Calculate annual returns: (Jan Y+1 / Jan Y) - 1
const sortedYears = Object.keys(yearPrices).map(Number).sort()
const returns = {}
for (let i = 0; i < sortedYears.length - 1; i++) {
  const y = sortedYears[i]
  const yNext = sortedYears[i + 1]
  returns[y] = Math.round(((yearPrices[yNext] / yearPrices[y]) - 1) * 1000) / 10
}

// For the current year, use YTD return
if (lastYear === sortedYears[sortedYears.length - 1] && yearPrices[lastYear]) {
  returns[lastYear] = Math.round(((lastClose / yearPrices[lastYear]) - 1) * 1000) / 10
}

const output = {
  ticker: TICKER,
  isin: 'IE00B3YLTY66',
  name: 'SPDR MSCI ACWI IMI UCITS ETF',
  updated: new Date().toISOString().slice(0, 10),
  currentPrice: r.meta.regularMarketPrice,
  returns,
  monthlyPrices,
}

writeFileSync('public/etf-history.json', JSON.stringify(output, null, 2))
console.log('Wrote public/etf-history.json:', output)
