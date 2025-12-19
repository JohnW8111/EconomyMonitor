import { subYears, format, parseISO } from "date-fns";

export interface YieldCurveDataPoint {
  date: string;
  dgs10: number;
  dgs3mo: number;
  slope: number;
  slopeZScore: number;
}

const WINDOW_SIZE = 252;

async function fetchFredSeries(seriesId: string, startDate: string): Promise<Map<string, number>> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    throw new Error('FRED_API_KEY environment variable is not set');
  }

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FRED API error: ${response.statusText}`);
  }

  const data = await response.json();
  const result = new Map<string, number>();

  for (const obs of data.observations) {
    if (obs.value !== '.') {
      result.set(obs.date, parseFloat(obs.value));
    }
  }

  return result;
}

export async function fetchYieldCurveData(period: string = '2y'): Promise<YieldCurveDataPoint[]> {
  const endDate = new Date();
  let yearsBack: number;
  
  switch (period) {
    case '1y':
      yearsBack = 2;
      break;
    case '2y':
      yearsBack = 3;
      break;
    case '5y':
      yearsBack = 6;
      break;
    case 'max':
      yearsBack = 20;
      break;
    default:
      yearsBack = 3;
  }

  const fetchStart = subYears(endDate, yearsBack);
  const startStr = format(fetchStart, 'yyyy-MM-dd');

  const [dgs10Data, dgs3moData] = await Promise.all([
    fetchFredSeries('DGS10', startStr),
    fetchFredSeries('DGS3MO', startStr)
  ]);

  const allDates = new Set([...dgs10Data.keys(), ...dgs3moData.keys()]);
  const sortedDates = Array.from(allDates).sort();

  const rawData: Array<{ date: string; dgs10: number; dgs3mo: number; slope: number }> = [];

  for (const date of sortedDates) {
    const dgs10 = dgs10Data.get(date);
    const dgs3mo = dgs3moData.get(date);

    if (dgs10 !== undefined && dgs3mo !== undefined) {
      const slope = Number((dgs10 - dgs3mo).toFixed(2));
      rawData.push({
        date,
        dgs10: Number(dgs10.toFixed(2)),
        dgs3mo: Number(dgs3mo.toFixed(2)),
        slope
      });
    }
  }

  let displayStart: Date;
  switch (period) {
    case '1y':
      displayStart = subYears(endDate, 1);
      break;
    case '2y':
      displayStart = subYears(endDate, 2);
      break;
    case '5y':
      displayStart = subYears(endDate, 5);
      break;
    case 'max':
      displayStart = new Date('2000-01-01');
      break;
    default:
      displayStart = subYears(endDate, 2);
  }

  const displayStartStr = format(displayStart, 'yyyy-MM-dd');
  const filteredData = rawData.filter(d => d.date >= displayStartStr);

  const slopeHistory: number[] = [];
  const result: YieldCurveDataPoint[] = [];

  for (const point of rawData) {
    slopeHistory.push(point.slope);
  }

  let historyIndex = 0;
  for (const point of rawData) {
    historyIndex++;
    
    if (point.date < displayStartStr) continue;

    let zScore = 0;
    if (historyIndex >= WINDOW_SIZE) {
      const window = slopeHistory.slice(historyIndex - WINDOW_SIZE, historyIndex);
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
