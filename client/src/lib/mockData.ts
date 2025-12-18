import { addDays, format, subYears } from "date-fns";

export interface VixDataPoint {
  date: string;
  vix: number;
  vix3m: number;
  slope: number;
  slopeZScore: number;
}

// Generate realistic-looking VIX data
export function generateVixData(): VixDataPoint[] {
  const data: VixDataPoint[] = [];
  const today = new Date();
  const startDate = subYears(today, 2); // 2 years of data
  let currentDate = startDate;
  
  // Initial values
  let currentVix = 18.5;
  let currentVix3m = 21.0;
  
  // Rolling stats for Z-score
  const slopeHistory: number[] = [];
  const WINDOW_SIZE = 252; // 1 year rolling window

  while (currentDate <= today) {
    // Random walk with mean reversion
    const vixMean = 19;
    const volatility = 0.8;
    const meanReversion = 0.05;
    
    // Random shock
    const shock = (Math.random() - 0.5) * volatility;
    
    // Apply mean reversion and shock
    currentVix = currentVix + meanReversion * (vixMean - currentVix) + shock;
    
    // Ensure VIX stays positive and realistic
    currentVix = Math.max(10, currentVix);
    
    // VIX3M modeling
    // Usually higher than VIX (contango), but lags during spikes
    // Base spread is around 2-3 points
    const targetSpread = 2.5;
    
    // If VIX is high, spread compresses or inverts
    let spread = targetSpread;
    if (currentVix > 25) {
      spread = -1.0 * (currentVix - 25) * 0.5; // Invert if very high
    } else if (currentVix > 20) {
        spread = 0.5; // Compress
    }
    
    // Add some noise to the spread
    spread += (Math.random() - 0.5) * 0.5;
    
    currentVix3m = currentVix + spread;
    
    const slope = currentVix3m - currentVix;
    slopeHistory.push(slope);
    
    // Calculate Z-Score if we have enough history
    let zScore = 0;
    if (slopeHistory.length >= WINDOW_SIZE) {
      const window = slopeHistory.slice(-WINDOW_SIZE);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = (slope - mean) / stdDev;
    }

    // Only add data points (skip weekends simply for this mock)
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
        data.push({
            date: format(currentDate, "yyyy-MM-dd"),
            vix: Number(currentVix.toFixed(2)),
            vix3m: Number(currentVix3m.toFixed(2)),
            slope: Number(slope.toFixed(2)),
            slopeZScore: Number(zScore.toFixed(2)),
        });
    }

    currentDate = addDays(currentDate, 1);
  }

  return data;
}

export const MOCK_DATA = generateVixData();

export const INDICATORS = [
  { id: "vix", name: "Eq Vol Term Structure", active: true },
  { id: "move", name: "Rates Volatility (MOVE)", active: false },
  { id: "hy-oas", name: "High-Yield Credit Spread", active: false },
  { id: "hy-ig", name: "HY vs IG Credit Ratio", active: false },
  { id: "ted", name: "Funding Stress (TED)", active: false },
  { id: "etf-nav", name: "HY Bond ETF Discount", active: false },
  { id: "yield-curve", name: "Yield Curve Slope", active: false },
  { id: "erp", name: "Equity Risk Premium", active: false },
  { id: "put-call", name: "Put-Call Ratio", active: false },
  { id: "fci", name: "Financial Conditions", active: false },
];
