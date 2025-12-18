import { parseISO, subYears, format, isAfter } from "date-fns";

export interface VixDataPoint {
  date: string;
  vix: number;
  vix3m: number;
  slope: number;
  slopeZScore: number;
}

const WINDOW_SIZE = 252; // 1 year rolling window for z-score

// FRED API series IDs
const VIX_SERIES_ID = 'VIXCLS';    // CBOE Volatility Index
const VIX3M_SERIES_ID = 'VXVCLS';  // CBOE S&P 500 3-Month Volatility Index

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredSeries(seriesId: string, startDate: string, endDate: string): Promise<Map<string, number>> {
  const apiKey = process.env.FRED_API_KEY;
  
  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable is not set. Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html');
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`FRED API error for ${seriesId}:`, errorText);
    throw new Error(`Failed to fetch ${seriesId} from FRED: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.observations) {
    throw new Error(`No observations returned for ${seriesId}`);
  }

  const result = new Map<string, number>();
  
  for (const obs of data.observations as FredObservation[]) {
    // FRED uses '.' for missing values
    if (obs.value !== '.' && obs.value) {
      const value = parseFloat(obs.value);
      if (!isNaN(value)) {
        result.set(obs.date, value);
      }
    }
  }

  return result;
}

export async function fetchVixData(period: string = '2y'): Promise<VixDataPoint[]> {
  const endDate = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1y':
      startDate = subYears(endDate, 1);
      break;
    case '2y':
      startDate = subYears(endDate, 2);
      break;
    case '5y':
      startDate = subYears(endDate, 5);
      break;
    default:
      startDate = subYears(endDate, 2);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  // Fetch VIX and VIX3M data in parallel from FRED
  const [vixMap, vix3mMap] = await Promise.all([
    fetchFredSeries(VIX_SERIES_ID, startStr, endStr),
    fetchFredSeries(VIX3M_SERIES_ID, startStr, endStr)
  ]);

  // Combine data where both VIX and VIX3M values exist
  const combinedData: Array<{ date: string; vix: number; vix3m: number; slope: number }> = [];
  
  // Get all dates and sort them
  const allDates = Array.from(new Set([...vixMap.keys(), ...vix3mMap.keys()])).sort();
  
  for (const dateStr of allDates) {
    const vix = vixMap.get(dateStr);
    const vix3m = vix3mMap.get(dateStr);
    
    if (vix !== undefined && vix3m !== undefined) {
      const slope = vix3m - vix;
      combinedData.push({
        date: dateStr,
        vix: Number(vix.toFixed(2)),
        vix3m: Number(vix3m.toFixed(2)),
        slope: Number(slope.toFixed(2))
      });
    }
  }

  // Calculate rolling z-scores
  const slopeHistory: number[] = [];
  const result: VixDataPoint[] = [];

  for (const point of combinedData) {
    slopeHistory.push(point.slope);
    
    let zScore = 0;
    if (slopeHistory.length >= WINDOW_SIZE) {
      const window = slopeHistory.slice(-WINDOW_SIZE);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.slope - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      slopeZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}

export async function fetchLatestVix(): Promise<{ vix: number; vix3m: number; date: string }> {
  const data = await fetchVixData('1y');
  
  if (data.length === 0) {
    throw new Error('No VIX data available');
  }
  
  const latest = data[data.length - 1];
  
  return {
    vix: latest.vix,
    vix3m: latest.vix3m,
    date: latest.date
  };
}
