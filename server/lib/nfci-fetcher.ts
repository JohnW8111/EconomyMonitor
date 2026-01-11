import { subYears, format } from "date-fns";

export interface NfciDataPoint {
  date: string;
  nfci: number;
  nfciZScore: number;
}

const NFCI_SERIES_ID = 'NFCI';
const WINDOW_SIZE = 52; // 1 year of weekly data for z-score

interface FredObservation {
  date: string;
  value: string;
}

async function fetchFredSeries(seriesId: string, startDate: string, endDate: string): Promise<Array<{ date: string; value: number }>> {
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

  const result: Array<{ date: string; value: number }> = [];
  
  for (const obs of data.observations as FredObservation[]) {
    if (obs.value !== '.' && obs.value) {
      const value = parseFloat(obs.value);
      if (!isNaN(value)) {
        result.push({ date: obs.date, value });
      }
    }
  }

  return result;
}

function calculateZScores(data: Array<{ date: string; nfci: number }>): NfciDataPoint[] {
  const result: NfciDataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (i < WINDOW_SIZE) {
      result.push({ ...point, nfciZScore: 0 });
      continue;
    }

    const windowData = data.slice(i - WINDOW_SIZE, i).map(d => d.nfci);
    const mean = windowData.reduce((a, b) => a + b, 0) / windowData.length;
    const variance = windowData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowData.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? (point.nfci - mean) / stdDev : 0;
    result.push({
      ...point,
      nfciZScore: Math.round(zScore * 100) / 100,
    });
  }

  return result;
}

export async function fetchNfciData(period: string = '2y'): Promise<NfciDataPoint[]> {
  const endDate = new Date();
  let startDate: Date;
  
  switch (period) {
    case '1y':
      startDate = subYears(endDate, 2); // Extra year for z-score warmup
      break;
    case '2y':
      startDate = subYears(endDate, 3);
      break;
    case '5y':
      startDate = subYears(endDate, 6);
      break;
    case '10y':
      startDate = subYears(endDate, 11);
      break;
    case 'max':
      startDate = new Date('1971-01-01');
      break;
    default:
      startDate = subYears(endDate, 3);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const observations = await fetchFredSeries(NFCI_SERIES_ID, startStr, endStr);

  const nfciData = observations.map(obs => ({
    date: obs.date,
    nfci: Number(obs.value.toFixed(4)),
  }));

  nfciData.sort((a, b) => a.date.localeCompare(b.date));

  const withZScores = calculateZScores(nfciData);

  // Filter to requested period after z-score calculation
  let filterDate: Date;
  switch (period) {
    case '1y':
      filterDate = subYears(endDate, 1);
      break;
    case '2y':
      filterDate = subYears(endDate, 2);
      break;
    case '5y':
      filterDate = subYears(endDate, 5);
      break;
    case '10y':
      filterDate = subYears(endDate, 10);
      break;
    case 'max':
      filterDate = new Date('1971-01-01');
      break;
    default:
      filterDate = subYears(endDate, 2);
  }

  const filterStr = format(filterDate, 'yyyy-MM-dd');
  return withZScores.filter(d => d.date >= filterStr);
}
