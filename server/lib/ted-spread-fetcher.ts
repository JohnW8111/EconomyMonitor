import { subYears, format } from "date-fns";

export interface TedSpreadDataPoint {
  date: string;
  spread: number;
  spreadZScore: number;
}

const WINDOW_SIZE = 252;
const TED_SERIES_ID = 'TEDRATE';

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

export async function fetchTedSpreadData(period: string = '10y'): Promise<TedSpreadDataPoint[]> {
  const endDate = new Date('2022-01-31');
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
    case '10y':
      startDate = subYears(endDate, 10);
      break;
    case 'max':
      startDate = new Date('1986-01-01');
      break;
    default:
      startDate = subYears(endDate, 10);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const spreadMap = await fetchFredSeries(TED_SERIES_ID, startStr, endStr);

  const sortedDates = Array.from(spreadMap.keys()).sort();
  
  const rawData: Array<{ date: string; spread: number }> = [];
  
  for (const dateStr of sortedDates) {
    const spread = spreadMap.get(dateStr);
    if (spread !== undefined) {
      rawData.push({
        date: dateStr,
        spread: Number((spread * 100).toFixed(0))
      });
    }
  }

  const spreadHistory: number[] = [];
  const result: TedSpreadDataPoint[] = [];

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
