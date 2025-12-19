import { subYears, format, parseISO } from "date-fns";

export interface ErpProxyDataPoint {
  date: string;
  sp500: number;
  realYield: number;
  epsTtm: number;
  earningsYield: number;
  erpProxy: number;
  erpProxyZScore: number;
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
    throw new Error(`FRED API error for ${seriesId}: ${response.statusText}`);
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

async function fetchMultplEps(): Promise<Map<string, number>> {
  const response = await fetch('https://www.multpl.com/s-p-500-earnings/table/by-month', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Multpl fetch error: ${response.statusText}`);
  }

  const html = await response.text();
  
  const tableMatch = html.match(/<table[^>]*class="[^"]*data-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    throw new Error('Could not find data table on Multpl page');
  }

  const tableHtml = tableMatch[0];
  const rowMatches = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  
  const result = new Map<string, number>();
  const monthMap: { [key: string]: string } = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  for (const rowMatch of rowMatches) {
    const row = rowMatch[0];
    const cellMatches = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    const cells = cellMatches.map(m => m[1].replace(/<[^>]*>/g, '').trim());
    
    if (cells.length >= 2) {
      const dateStr = cells[0];
      const valueStr = cells[1];
      
      const dateMatch = dateStr.match(/([A-Za-z]{3})\s+\d{1,2},?\s+(\d{4})/);
      if (dateMatch) {
        const month = monthMap[dateMatch[1]];
        const year = dateMatch[2];
        if (month && year) {
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          const formattedDate = `${year}-${month}-${String(lastDayOfMonth).padStart(2, '0')}`;
          
          const cleanValue = valueStr.replace(/[,$\s]/g, '');
          const value = parseFloat(cleanValue);
          if (!isNaN(value) && value > 0) {
            result.set(formattedDate, value);
          }
        }
      }
    }
  }

  return result;
}

function forwardFillEps(epsMonthly: Map<string, number>, dates: string[]): Map<string, number> {
  const sortedEpsDates = Array.from(epsMonthly.keys()).sort();
  const result = new Map<string, number>();
  
  for (const date of dates) {
    let epsValue: number | undefined;
    for (let i = sortedEpsDates.length - 1; i >= 0; i--) {
      if (sortedEpsDates[i] <= date) {
        epsValue = epsMonthly.get(sortedEpsDates[i]);
        break;
      }
    }
    if (epsValue !== undefined) {
      result.set(date, epsValue);
    }
  }
  
  return result;
}

export async function fetchErpProxyData(period: string = '2y'): Promise<ErpProxyDataPoint[]> {
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
    case '10y':
      yearsBack = 11;
      break;
    case 'max':
      yearsBack = 20;
      break;
    default:
      yearsBack = 3;
  }

  const fetchStart = subYears(endDate, yearsBack);
  const startStr = format(fetchStart, 'yyyy-MM-dd');

  const [sp500Data, realYieldData, epsData] = await Promise.all([
    fetchFredSeries('SP500', startStr),
    fetchFredSeries('DFII10', startStr),
    fetchMultplEps()
  ]);

  const allDates = new Set(Array.from(sp500Data.keys()).filter(d => realYieldData.has(d)));
  const sortedDates = Array.from(allDates).sort();

  const epsDaily = forwardFillEps(epsData, sortedDates);

  const rawData: Array<{ 
    date: string; 
    sp500: number; 
    realYield: number; 
    epsTtm: number;
    earningsYield: number;
    erpProxy: number;
  }> = [];

  for (const date of sortedDates) {
    const sp500 = sp500Data.get(date);
    const realYield = realYieldData.get(date);
    const epsTtm = epsDaily.get(date);

    if (sp500 !== undefined && realYield !== undefined && epsTtm !== undefined) {
      const earningsYield = 100 * (epsTtm / sp500);
      const erpProxy = earningsYield - realYield;
      
      rawData.push({
        date,
        sp500: Number(sp500.toFixed(2)),
        realYield: Number(realYield.toFixed(2)),
        epsTtm: Number(epsTtm.toFixed(2)),
        earningsYield: Number(earningsYield.toFixed(2)),
        erpProxy: Number(erpProxy.toFixed(2))
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
    case '10y':
      displayStart = subYears(endDate, 10);
      break;
    case 'max':
      displayStart = new Date('2000-01-01');
      break;
    default:
      displayStart = subYears(endDate, 2);
  }

  const displayStartStr = format(displayStart, 'yyyy-MM-dd');

  const erpHistory: number[] = [];
  const result: ErpProxyDataPoint[] = [];

  let historyIndex = 0;
  for (const point of rawData) {
    erpHistory.push(point.erpProxy);
    historyIndex++;
    
    if (point.date < displayStartStr) continue;

    let zScore = 0;
    if (historyIndex >= WINDOW_SIZE) {
      const window = erpHistory.slice(historyIndex - WINDOW_SIZE, historyIndex);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.erpProxy - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      erpProxyZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}
