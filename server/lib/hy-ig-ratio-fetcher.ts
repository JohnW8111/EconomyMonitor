import { subYears, format } from "date-fns";

export interface HyIgRatioDataPoint {
  date: string;
  hySpread: number;
  igSpread: number;
  ratio: number;
  ratioZScore: number;
}

const WINDOW_SIZE = 252;

const HY_SERIES_ID = 'BAMLH0A0HYM2';
const IG_SERIES_ID = 'BAMLC0A0CM';

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

export async function fetchHyIgRatioData(period: string = '2y'): Promise<HyIgRatioDataPoint[]> {
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
    case '10y':
      startDate = subYears(endDate, 10);
      break;
    default:
      startDate = subYears(endDate, 2);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const [hyMap, igMap] = await Promise.all([
    fetchFredSeries(HY_SERIES_ID, startStr, endStr),
    fetchFredSeries(IG_SERIES_ID, startStr, endStr)
  ]);

  const allDates = new Set([...hyMap.keys(), ...igMap.keys()]);
  const sortedDates = Array.from(allDates).sort();
  
  const rawData: Array<{ date: string; hySpread: number; igSpread: number; ratio: number }> = [];
  
  for (const dateStr of sortedDates) {
    const hySpread = hyMap.get(dateStr);
    const igSpread = igMap.get(dateStr);
    
    if (hySpread !== undefined && igSpread !== undefined && igSpread > 0) {
      const ratio = hySpread / igSpread;
      rawData.push({
        date: dateStr,
        hySpread: Number((hySpread * 100).toFixed(0)),
        igSpread: Number((igSpread * 100).toFixed(0)),
        ratio: Number(ratio.toFixed(2))
      });
    }
  }

  const ratioHistory: number[] = [];
  const result: HyIgRatioDataPoint[] = [];

  for (const point of rawData) {
    ratioHistory.push(point.ratio);
    
    let zScore = 0;
    if (ratioHistory.length >= WINDOW_SIZE) {
      const window = ratioHistory.slice(-WINDOW_SIZE);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.ratio - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      ratioZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}
