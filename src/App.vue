<script setup>
import { ref, computed, watch } from 'vue'

const MILESTONES = [100000, 150000, 200000, 250000, 300000]
const MO = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
const DEFAULT_START = 20000

const savedStart = localStorage.getItem('etf-start-budget')
const startBudget = ref(savedStart !== null ? Number(savedStart) : DEFAULT_START)
watch(startBudget, (v) => localStorage.setItem('etf-start-budget', String(v)))

function fmt(v) {
  return Math.round(v).toLocaleString('de-DE') + ' €'
}
function fmtK(v) {
  return v >= 1000 ? Math.round(v / 1000) + 'k' : String(v)
}

const years = ref([
  { y: 2026, r: 7, s: 2000 },
  { y: 2027, r: 7, s: 2000 },
  { y: 2028, r: 7, s: 2000 },
  { y: 2029, r: 7, s: 2000 },
  { y: 2030, r: 7, s: 2000 },
])
const infl = ref(2.0)
const ue = ref({ on: false, y: 2027, m: 0, d: 6, rs: 1000 })
const showReal = ref(false)

const result = computed(() => {
  const pts = []
  let dep = startBudget.value, totIn = 0, totG = 0
  const hits = {}
  const mi = Math.pow(1 + infl.value / 100, 1/12) - 1

  for (const yr of years.value) {
    const mr = Math.pow(1 + yr.r / 100, 1/12) - 1
    for (let m = 0; m < 12; m++) {
      const ix = pts.length
      let sp = yr.s
      if (ue.value.on) {
        const us = (ue.value.y - 2026) * 12 + ue.value.m
        if (ix >= us && ix < us + ue.value.d) sp = ue.value.rs
      }
      const g = dep * mr
      dep += g + sp
      totIn += sp
      totG += g
      const rl = dep / Math.pow(1 + mi, ix + 1)
      pts.push({ ix, v: Math.round(dep), rl: Math.round(rl), mo: m, y: yr.y })
      for (const ms of MILESTONES) {
        if (!hits[ms] && dep >= ms) {
          hits[ms] = { ix, label: MO[m] + ' ' + String(yr.y).slice(2) }
        }
      }
    }
  }
  return {
    pts, hits, totIn, totG,
    end: Math.round(dep),
    endR: pts.length ? pts[pts.length-1].rl : Math.round(dep),
  }
})

// Chart computed
const chartData = computed(() => {
  const pts = result.value.pts
  if (pts.length < 2) return { bars: [], maxV: 1 }
  const maxData = Math.max(...pts.map(p => p.v))
  const maxV = Math.max(maxData, MILESTONES[MILESTONES.length-1]) * 1.05
  const bars = []
  for (let i = 0; i < pts.length; i += 3) {
    const p = pts[i]
    bars.push({
      h: (p.v / maxV) * 140,
      v: p.v,
      label: i % 12 === 0 ? MO[p.mo] + ' ' + String(p.y).slice(2) : '',
    })
  }
  const msLines = MILESTONES.filter(ms => (ms / maxV) * 100 <= 100).map(ms => ({
    ms,
    bottom: (ms / maxV) * 140 + 20,
    hit: !!result.value.hits[ms],
    label: Math.round(ms / 1000) + 'k',
  }))
  return { bars, maxV, msLines }
})

function fmtRet(v) {
  return (v > 0 ? '+' : '') + v + '%'
}
</script>

<template>
  <div class="app">
    <div class="wrap">
      <!-- Header -->
      <div class="sub">Depot Projektion 2026–2030</div>
      <h1>ETF Milestone Rechner</h1>

      <!-- Milestones -->
      <div class="ms-grid">
        <div
          v-for="ms in MILESTONES" :key="ms"
          class="ms-card"
          :class="{ hit: result.hits[ms] }"
        >
          <div class="ms-val">{{ fmt(ms) }}</div>
          <div v-if="result.hits[ms]" class="ms-hit">✓ {{ result.hits[ms].label }}</div>
          <template v-else>
            <div class="ms-bar">
              <div class="ms-bar-fill" :style="{ width: Math.min(100, result.end / ms * 100) + '%' }" />
            </div>
            <div class="ms-rem">noch {{ fmt(ms - result.end) }}</div>
          </template>
        </div>
      </div>

      <!-- Chart -->
      <div class="panel">
        <div class="chart-head">
          <div>
            <span class="chart-val">{{ fmt(result.end) }}</span>
            <span v-if="showReal" class="chart-real">real: {{ fmt(result.endR) }}</span>
          </div>
          <button class="btn-sm" @click="showReal = !showReal">
            {{ showReal ? 'nominal' : 'real' }}
          </button>
        </div>
        <div class="chart-area">
          <div
            v-for="(line, i) in chartData.msLines" :key="'ml'+i"
            class="chart-msline"
            :class="{ hit: line.hit }"
            :style="{ bottom: line.bottom + 'px' }"
          >
            <span>{{ line.label }}</span>
          </div>
          <div v-for="(bar, i) in chartData.bars" :key="'b'+i" class="chart-bar-wrap">
            <div class="chart-bar" :style="{ height: bar.h + 'px' }" />
            <div class="chart-lbl">{{ bar.label }}</div>
          </div>
        </div>
        <div class="chart-foot">
          Eingezahlt: {{ fmt(result.totIn + startBudget) }} · Rendite: {{ fmt(result.totG) }}
        </div>
      </div>

      <!-- Start budget -->
      <div class="panel">
        <div class="panel-title">Startkapital</div>
        <div class="sl">
          <div class="sl-head">
            <span class="sl-lbl">Depotwert</span>
            <span class="sl-val">{{ fmt(startBudget) }}</span>
          </div>
          <input type="range" min="0" max="200000" step="1000" v-model.number="startBudget">
        </div>
      </div>

      <!-- Year params -->
      <div class="panel">
        <div class="panel-title">Parameter pro Jahr</div>
        <div v-for="(yr, idx) in years" :key="yr.y" class="yr-row">
          <div class="yr-label">{{ yr.y }}</div>
          <div class="yr-sliders">
            <div class="sl">
              <div class="sl-head">
                <span class="sl-lbl">Rendite</span>
                <span class="sl-val">{{ fmtRet(yr.r) }}</span>
              </div>
              <input type="range" min="-20" max="25" step="0.5" v-model.number="yr.r">
            </div>
            <div class="sl">
              <div class="sl-head">
                <span class="sl-lbl">Sparrate</span>
                <span class="sl-val">{{ fmt(yr.s) }}</span>
              </div>
              <input type="range" min="0" max="4000" step="100" v-model.number="yr.s">
            </div>
          </div>
        </div>
        <div class="sl" style="margin-top: 8px">
          <div class="sl-head">
            <span class="sl-lbl">Inflation p.a.</span>
            <span class="sl-val">{{ infl.toFixed(1) }}%</span>
          </div>
          <input type="range" min="0" max="6" step="0.1" v-model.number="infl">
        </div>
      </div>

      <!-- Unemployment -->
      <div class="panel" :class="{ 'panel-ue': ue.on }">
        <div class="ue-head">
          <span class="panel-title" :class="{ 'ue-on': ue.on }" style="margin-bottom:0">
            ⚡ Arbeitslosigkeit
          </span>
          <button class="ue-btn" :class="ue.on ? 'on' : 'off'" @click="ue.on = !ue.on">
            {{ ue.on ? 'AKTIV' : 'AUS' }}
          </button>
        </div>
        <div v-if="ue.on" class="ue-body">
          <div class="ue-grid">
            <div>
              <label>Startjahr</label>
              <select v-model.number="ue.y">
                <option v-for="yr in years" :key="yr.y" :value="yr.y">{{ yr.y }}</option>
              </select>
            </div>
            <div>
              <label>Monat</label>
              <select v-model.number="ue.m">
                <option v-for="(m, i) in MO" :key="i" :value="i">{{ m }}</option>
              </select>
            </div>
          </div>
          <div class="sl amber">
            <div class="sl-head">
              <span class="sl-lbl">Dauer</span>
              <span class="sl-val amber">{{ ue.d }} Mo.</span>
            </div>
            <input type="range" min="1" max="18" step="1" v-model.number="ue.d">
          </div>
          <div class="sl amber">
            <div class="sl-head">
              <span class="sl-lbl">Red. Sparrate</span>
              <span class="sl-val amber">{{ fmt(ue.rs) }}</span>
            </div>
            <input type="range" min="0" max="2000" step="100" v-model.number="ue.rs">
          </div>
        </div>
      </div>

      <!-- Timeline -->
      <div class="panel">
        <div class="panel-title">Milestone Timeline</div>
        <div
          v-for="(ms, i) in MILESTONES" :key="'tl'+ms"
          class="tl-row"
          :class="{ hit: result.hits[ms], last: i === MILESTONES.length - 1 }"
        >
          <div class="tl-dot" :class="{ hit: result.hits[ms] }" />
          <div class="tl-val">{{ fmt(ms) }}</div>
          <div class="tl-when">{{ result.hits[ms] ? result.hits[ms].label : '—' }}</div>
          <div v-if="result.hits[ms]" class="tl-mo">Mo. {{ result.hits[ms].ix + 1 }}</div>
        </div>
      </div>

      <div class="disclaimer">Keine Anlageberatung · Vergangene Renditen sind keine Garantie</div>
    </div>
  </div>
</template>

<style scoped>
.app { min-height: 100vh; padding: 16px; }
.wrap { max-width: 700px; margin: 0 auto; }
.sub { font-size: 10px; letter-spacing: 3px; color: #ca8a04; text-transform: uppercase; }
h1 { font-size: 22px; font-weight: 700; color: white; margin: 2px 0 16px; }

/* Milestones */
.ms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 16px; }
@media (min-width: 600px) { .ms-grid { grid-template-columns: repeat(5, 1fr); } }
.ms-card { background: #171717; border: 1px solid #262626; border-radius: 8px; padding: 10px 12px; }
.ms-card.hit { background: #052e16; border-color: #14532d; }
.ms-val { font-family: 'SF Mono', Menlo, monospace; font-weight: 700; font-size: 14px; color: #525252; }
.ms-card.hit .ms-val { color: #4ade80; }
.ms-hit { font-size: 11px; color: #4ade80; margin-top: 4px; }
.ms-bar { height: 3px; background: #262626; border-radius: 2px; margin-top: 6px; overflow: hidden; }
.ms-bar-fill { height: 100%; background: #ca8a04; border-radius: 2px; transition: width 0.3s; }
.ms-rem { font-size: 10px; color: #525252; margin-top: 3px; }

/* Panels */
.panel { background: #171717; border-radius: 10px; padding: 14px; margin-bottom: 12px; border: 1px solid #262626; }
.panel-ue { background: #1c1108; border-color: #422006; }
.panel-title { font-size: 11px; color: #737373; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.panel-title.ue-on { color: #f59e0b; }

/* Chart */
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.chart-val { font-size: 20px; font-weight: 700; font-family: 'SF Mono', Menlo, monospace; color: #ca8a04; }
.chart-real { font-size: 11px; color: #737373; margin-left: 8px; }
.btn-sm { font-size: 10px; color: #737373; background: #262626; border: 1px solid #404040; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
.btn-sm:hover { background: #333; }
.chart-area { display: flex; align-items: flex-end; gap: 1px; height: 170px; position: relative; padding-bottom: 20px; }
.chart-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; }
.chart-bar { width: 100%; max-width: 18px; border-radius: 2px 2px 0 0; min-height: 2px; background: linear-gradient(to top, #92400e, #ca8a04); transition: height 0.3s; }
.chart-lbl { font-size: 8px; color: #555; margin-top: 2px; white-space: nowrap; min-height: 10px; }
.chart-msline { position: absolute; left: 0; right: 0; border-top: 1px dashed #444; opacity: 0.3; }
.chart-msline.hit { border-color: #22c55e; opacity: 0.5; }
.chart-msline span { position: absolute; right: 0; top: -11px; font-size: 8px; font-family: monospace; color: #555; }
.chart-msline.hit span { color: #22c55e; }
.chart-foot { display: flex; justify-content: center; gap: 10px; font-size: 10px; color: #525252; margin-top: 6px; }

/* Year rows */
.yr-row { margin-bottom: 12px; }
.yr-label { font-family: 'SF Mono', Menlo, monospace; font-weight: 700; color: #ca8a04; font-size: 14px; margin-bottom: 4px; }
.yr-sliders { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Sliders */
.sl { margin-bottom: 6px; }
.sl-head { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
.sl-lbl { color: #999; }
.sl-val { color: #ca8a04; font-family: 'SF Mono', Menlo, monospace; font-weight: 700; }
.sl-val.amber { color: #f59e0b; }
input[type=range] { width: 100%; height: 6px; -webkit-appearance: none; appearance: none; background: #333; border-radius: 3px; outline: none; cursor: pointer; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #ca8a04; border: 2px solid #0a0a0a; cursor: pointer; }
input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #ca8a04; border: 2px solid #0a0a0a; cursor: pointer; }
.sl.amber input[type=range]::-webkit-slider-thumb { background: #f59e0b; }
.sl.amber input[type=range]::-moz-range-thumb { background: #f59e0b; }

/* Unemployment */
.ue-head { display: flex; justify-content: space-between; align-items: center; }
.ue-body { margin-top: 12px; }
.ue-btn { font-size: 10px; font-weight: 700; border-radius: 12px; padding: 4px 12px; border: none; cursor: pointer; }
.ue-btn.off { background: #262626; color: #737373; }
.ue-btn.on { background: #ca8a04; color: #000; }
.ue-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.ue-grid label { font-size: 10px; color: #999; display: block; margin-bottom: 3px; }
.ue-grid select { width: 100%; background: #262626; border: 1px solid #404040; color: #e5e5e5; padding: 6px; border-radius: 4px; font-size: 12px; }

/* Timeline */
.tl-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #262626; }
.tl-row.last { border-bottom: none; }
.tl-dot { width: 8px; height: 8px; border-radius: 50%; background: #404040; flex-shrink: 0; }
.tl-dot.hit { background: #4ade80; box-shadow: 0 0 6px #4ade8044; }
.tl-val { font-family: 'SF Mono', Menlo, monospace; font-weight: 700; font-size: 13px; color: #525252; min-width: 80px; }
.tl-row.hit .tl-val { color: #e5e5e5; }
.tl-when { font-size: 11px; color: #404040; }
.tl-row.hit .tl-when { color: #4ade80; }
.tl-mo { margin-left: auto; font-size: 11px; color: #555; font-family: monospace; }

.disclaimer { text-align: center; font-size: 9px; color: #262626; margin-top: 16px; padding-bottom: 20px; }
</style>
