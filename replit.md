# RiskTerminal - US Economic Risk Assessment Tool

## Overview

RiskTerminal is a real-time economic risk monitoring dashboard that tracks key financial indicators used to assess market stress and systemic risk. The application fetches data from the FRED (Federal Reserve Economic Data) API and displays interactive charts showing VIX term structure, high-yield credit spreads, and other risk metrics with rolling z-score analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Charts**: Recharts for data visualization
- **Build Tool**: Vite

The frontend follows a dashboard layout pattern with a sidebar navigation for different risk indicators. Each indicator page fetches data from the backend API and renders interactive charts with tooltips.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx
- **API Pattern**: RESTful JSON endpoints under `/api/*`
- **Caching**: node-cache with 12-hour TTL for FRED data (updates daily)

Key API endpoints:
- `GET /api/vix/history` - Historical VIX term structure data
- `GET /api/vix/latest` - Current VIX quotes
- `GET /api/hy-spread/history` - High-yield credit spread history
- `GET /api/hy-ig-ratio/history` - HY/IG spread ratio history
- `GET /api/sofr-spread/history` - SOFR-Treasury spread (funding stress)
- `GET /api/jnk-premium/history` - JNK ETF discount/premium
- `GET /api/yield-curve/history` - Yield curve slope (10Y-3M)
- `GET /api/erp-proxy/history` - Equity risk premium proxy

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Current Usage**: User authentication schema exists but primary data comes from external APIs
- **Migrations**: Managed via `drizzle-kit push`

### Data Flow
1. Backend fetches time series from FRED API using series IDs (VIXCLS, VXVCLS, BAMLH0A0HYM2)
2. Computes derived metrics (term structure slope, rolling z-scores with 252-day window)
3. Caches processed data for 12 hours
4. Frontend queries endpoints and displays with React Query caching

### Build Configuration
- Development: Vite dev server with HMR, Express API proxy
- Production: Vite builds static assets to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Path aliases: `@/*` maps to client/src, `@shared/*` maps to shared

## External Dependencies

### Required API Keys
- **FRED_API_KEY**: Federal Reserve Economic Data API (free registration at https://fred.stlouisfed.org/docs/api/api_key.html)

### Data Sources
- **FRED API**: Primary data source for all financial indicators
  - VIXCLS: CBOE Volatility Index
  - VXVCLS: CBOE 3-Month Volatility Index  
  - BAMLH0A0HYM2: ICE BofA US High Yield Option-Adjusted Spread
  - BAMLC0A0CM: ICE BofA US Corporate Investment Grade Index
  - SOFR90DAYAVG: 90-Day SOFR Average
  - DTB3: 3-Month Treasury Bill
  - DGS10: 10-Year Treasury Constant Maturity Rate
  - DGS3MO: 3-Month Treasury Constant Maturity Rate
  - SP500: S&P 500 Index
  - DFII10: 10-Year Treasury Inflation-Indexed Security
- **State Street SPDR**: JNK ETF NAV data for discount/premium calculation
- **YCharts**: SPX Put-Call Ratio (sources CBOE data) - scraped daily and stored in PostgreSQL for history accumulation

## Active Risk Indicators (8 total)
1. **(Volatility) VIX Term Structure** - VIX vs VIX3M slope with z-score
2. **(Sentiment) SPX Put-Call Ratio** - CBOE SPX options put/call volume ratio (scraped from YCharts, stored in PostgreSQL for history accumulation)
3. **(Credit) HY Credit Spread** - High-yield option-adjusted spread
4. **(Credit) HY/IG Spread Ratio** - High-yield to investment-grade spread ratio
5. **(Funding & Liquidity) Funding Stress** - SOFR-Treasury spread
6. **(Funding & Liquidity) HY ETF Discount/Premium** - JNK ETF premium to NAV
7. **(Macro/Curve) Yield Curve Slope** - 10Y-3M Treasury spread
8. **(Valuation) Equity Risk Premium** - Earnings yield minus real yields

### Key NPM Dependencies
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `recharts`: Charting library
- `date-fns`: Date manipulation
- `node-cache`: Server-side caching
- Full shadcn/ui component suite via Radix primitives