import { subYears, format } from "date-fns";

export interface SofrSpreadDataPoint {
  date: string;
  sofr90: number;
  tbill3m: number;
  spread: number;
  spreadZScore: number;
}

const WINDOW_SIZE = 252;
const SOFR_SERIES_ID = 'SOFR90DAYAVG';
const TBILL_SERIES_ID = 'DTB3';

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
    if (obs.value !== '.' && obs.value) {
      const value = parseFloat(obs.value);
      if (!isNaN(value)) {
        result.set(obs.date, value);
      }
    }
  }

  return result;
}

export async function fetchSofrSpreadData(period: string = '2y'): Promise<SofrSpreadDataPoint[]> {
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
    case 'max':
      startDate = new Date('2020-01-01');
      break;
    default:
      startDate = subYears(endDate, 2);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const [sofrMap, tbillMap] = await Promise.all([
    fetchFredSeries(SOFR_SERIES_ID, startStr, endStr),
    fetchFredSeries(TBILL_SERIES_ID, startStr, endStr)
  ]);

  const allDates = new Set([...sofrMap.keys(), ...tbillMap.keys()]);
  const sortedDates = Array.from(allDates).sort();
  
  const rawData: Array<{ date: string; sofr90: number; tbill3m: number; spread: number }> = [];
  
  for (const dateStr of sortedDates) {
    const sofr90 = sofrMap.get(dateStr);
    const tbill3m = tbillMap.get(dateStr);
    
    if (sofr90 !== undefined && tbill3m !== undefined) {
      const spread = sofr90 - tbill3m;
      rawData.push({
        date: dateStr,
        sofr90: Number(sofr90.toFixed(2)),
        tbill3m: Number(tbill3m.toFixed(2)),
        spread: Number((spread * 100).toFixed(0))
      });
    }
  }

  const spreadHistory: number[] = [];
  const result: SofrSpreadDataPoint[] = [];

  for (const point of rawData) {
    spreadHistory.push(point.spread);
    
    let zScore = 0;
    if (spreadHistory.length >= WINDOW_SIZE) {
      const window = spreadHistory.slice(-WINDOW_SIZE);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.spread - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      spreadZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}
