# RiskTerminal

A real-time economic risk monitoring dashboard that tracks key financial indicators used to assess market stress and systemic risk. Built with React and Node.js, it fetches data from the FRED (Federal Reserve Economic Data) API and displays interactive charts with rolling z-score analysis.

## Risk Indicators

RiskTerminal monitors 9 financial indicators across different risk categories:

| Category | Indicator | Description |
|----------|-----------|-------------|
| Volatility | VIX Term Structure | VIX vs VIX3M slope with z-score |
| Sentiment | SPX Put-Call Ratio | CBOE SPX options put/call volume ratio |
| Credit | HY Credit Spread | High-yield option-adjusted spread |
| Credit | HY/IG Spread Ratio | High-yield to investment-grade spread ratio |
| Funding & Liquidity | Funding Stress | SOFR-Treasury spread |
| Funding & Liquidity | HY ETF Discount/Premium | JNK ETF premium to NAV |
| Macro/Curve | Yield Curve Slope | 10Y-3M Treasury spread |
| Valuation | Equity Risk Premium | Earnings yield minus real yields |
| Composite | Financial Conditions Index | Chicago Fed NFCI |

## Tech Stack

**Frontend:** React 19, TypeScript, Wouter, TanStack React Query, shadcn/ui, Recharts, Tailwind CSS v4

**Backend:** Node.js, Express.js, TypeScript

**Database:** PostgreSQL with Drizzle ORM

**Authentication:** Replit Auth (OpenID Connect)

## Prerequisites

- Node.js 20+
- PostgreSQL database
- FRED API key (free at https://fred.stlouisfed.org/docs/api/api_key.html)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/JohnW8111/EconomyMonitor.git
cd risk-terminal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/riskterminal
FRED_API_KEY=your_fred_api_key
```

4. Push the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Apply database migrations |

## Data Sources

- **FRED API** - VIX, credit spreads, Treasury yields, NFCI, and other economic indicators
- **State Street SPDR** - JNK ETF NAV data for discount/premium calculation
- **YCharts** - SPX Put-Call Ratio (scraped daily and stored for historical accumulation)

### FRED Series Used

| Series ID | Description |
|-----------|-------------|
| VIXCLS | CBOE Volatility Index |
| VXVCLS | CBOE 3-Month Volatility Index |
| BAMLH0A0HYM2 | ICE BofA US High Yield Option-Adjusted Spread |
| BAMLC0A0CM | ICE BofA US Corporate Investment Grade Index |
| SOFR90DAYAVG | 90-Day SOFR Average |
| DTB3 | 3-Month Treasury Bill |
| DGS10 | 10-Year Treasury Constant Maturity Rate |
| DGS3MO | 3-Month Treasury Constant Maturity Rate |
| SP500 | S&P 500 Index |
| DFII10 | 10-Year Treasury Inflation-Indexed Security |
| NFCI | Chicago Fed National Financial Conditions Index |

## API Endpoints

All data endpoints support `?period=1y|2y|5y` query parameter.

```
GET /api/vix/history         - VIX term structure data
GET /api/vix/latest          - Current VIX quotes
GET /api/hy-spread/history   - High-yield credit spread
GET /api/hy-ig-ratio/history - HY/IG spread ratio
GET /api/sofr-spread/history - SOFR-Treasury spread
GET /api/jnk-premium/history - JNK ETF premium to NAV
GET /api/yield-curve/history - Yield curve slope
GET /api/erp-proxy/history   - Equity risk premium proxy
GET /api/putcall/history     - SPX Put-Call Ratio
GET /api/nfci/history        - Financial Conditions Index
```

## Architecture

```
client/                 # React frontend
├── src/
│   ├── pages/         # Dashboard pages for each indicator
│   ├── components/    # UI components & layout
│   ├── hooks/         # Custom React hooks
│   └── lib/           # Utilities & API client

server/                 # Express.js backend
├── lib/               # Data fetcher modules
├── routes.ts          # API endpoint definitions
├── db.ts              # Database connection
└── storage.ts         # Database storage interface

shared/                 # Shared code
└── schema.ts          # Drizzle ORM database schema
```

### Data Flow

1. Backend fetches time series from FRED API using series IDs
2. Computes derived metrics (term structure slopes, rolling z-scores with 252-day window)
3. Caches processed data for 12 hours (FRED data updates daily)
4. Frontend queries endpoints via React Query with matching cache TTL

## License

MIT
