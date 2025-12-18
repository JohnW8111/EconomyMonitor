import { addDays, subYears, format } from "date-fns";

export interface VixDataPoint {
  date: string;
  vix: number;
  vix3m: number;
  slope: number;
  slopeZScore: number;
}

const WINDOW_SIZE = 252; // 1 year rolling window for z-score

// Generate realistic-looking VIX data (same as frontend mock)
// Note: Yahoo Finance blocks server-side requests. In production, you would need:
// - A paid data provider API (Bloomberg, Quandl, Alpha Vantage)
// - Or CBOE's official VIX API
// For now, we simulate the data to demonstrate the application
export async function fetchVixData(period: string = '2y'): Promise<VixDataPoint[]> {
  const data: VixDataPoint[] = [];
  const today = new Date();
  let years = 2;
  
  switch (period) {
    case '1y':
      years = 1;
      break;
    case '2y':
      years = 2;
      break;
    case '5y':
      years = 5;
      break;
  }
  
  const startDate = subYears(today, years);
  let currentDate = startDate;
  
  // Initial values
  let currentVix = 18.5;
  let currentVix3m = 21.0;
  
  // Rolling stats for Z-score
  const slopeHistory: number[] = [];

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

export async function fetchLatestVix(): Promise<{ vix: number; vix3m: number }> {
  const data = await fetchVixData('1y');
  const latest = data[data.length - 1];
  
  return {
    vix: latest.vix,
    vix3m: latest.vix3m
  };
}
