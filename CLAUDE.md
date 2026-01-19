# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RiskTerminal is a real-time economic risk monitoring dashboard that tracks financial indicators (VIX, credit spreads, yield curves, etc.) for market stress assessment. It fetches data from the FRED API and displays interactive charts with z-score analysis.

## Commands

```bash
npm run dev              # Start Express backend server (development)
npm run dev:client       # Start Vite frontend only (port 5000)
npm run build            # Production build (Vite + esbuild)
npm start                # Run production server from dist/index.cjs
npm run check            # TypeScript type checking
npm run db:push          # Apply Drizzle migrations to database
```

No test or lint frameworks are configured.

## Architecture

### Stack
- **Frontend**: React 19, Wouter (routing), TanStack React Query, shadcn/ui, Recharts, Tailwind CSS v4
- **Backend**: Express.js, TypeScript (tsx), node-cache (12-hour TTL)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect) with email allowlist access control

### Path Aliases
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

### Key Directories
```
client/src/pages/      # 9 dashboard pages for each risk indicator
client/src/components/ # UI components & dashboard layout
server/lib/            # Data fetcher modules (vix, hy-spread, sofr-spread, etc.)
server/routes.ts       # API endpoint definitions
shared/schema.ts       # Drizzle ORM database schema
```

### Data Flow
1. Backend fetches time series from FRED API (series IDs like VIXCLS, BAMLH0A0HYM2)
2. Computes derived metrics (slopes, z-scores with 252-day rolling window)
3. Caches processed data for 12 hours
4. Frontend queries via React Query (also 12-hour stale time)

### API Endpoints
All data endpoints support `?period=1y|2y|5y` query param:
- `/api/vix/history`, `/api/vix/latest`
- `/api/hy-spread/history`, `/api/hy-ig-ratio/history`
- `/api/sofr-spread/history`, `/api/jnk-premium/history`
- `/api/yield-curve/history`, `/api/erp-proxy/history`
- `/api/putcall/history`, `/api/nfci/history`

Admin endpoints (restricted to `john.w.whittington@gmail.com`):
- `/api/admin/allowed-emails` (GET/POST/DELETE)

### Database Tables
- `spx_put_call_history` - Scraped SPX put-call ratios (accumulated daily)
- `allowed_emails` - Email allowlist for access control

## Environment Variables

```bash
DATABASE_URL     # PostgreSQL connection URL (required)
FRED_API_KEY     # FRED API key (required) - get from https://fred.stlouisfed.org/docs/api/api_key.html
```

## Data Sources

- **FRED API**: VIX, credit spreads, Treasury yields, NFCI
- **State Street SPDR**: JNK ETF NAV data
- **YCharts**: SPX Put-Call Ratio (scraped daily, stored in PostgreSQL)
