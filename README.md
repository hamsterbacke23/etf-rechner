# ETF Milestone Rechner

Interaktiver ETF-Depot-Rechner zur Projektion von Milestones über 5 Jahre (2026–2030).

## Features

- **Milestone Tracking**: 100k → 150k → 200k → 250k → 300k
- **Individuelle Jahresparameter**: Rendite (-20% bis +25%) und Sparrate (0–4.000€) pro Jahr
- **Inflationsbereinigung**: Reale vs. nominale Werte
- **Arbeitslosigkeit-Szenario**: Startmonat, Dauer und reduzierte Sparrate einstellbar
- **Responsive**: Desktop & Mobile optimiert

## Setup

```bash
npm install
npm run dev     # Dev server
npm run build   # Production build
```

## Deploy auf GitHub Pages

```bash
npm run build
cd dist
git init
git add -A
git commit -m "deploy"
git push -f git@github.com:DEIN-USER/etf-rechner.git main:gh-pages
```

Oder einfach den `dist`-Ordner als GitHub Pages Source konfigurieren.

## Tech Stack

- Vue 3 (Composition API)
- Vite
- Vanilla CSS (kein Framework)
