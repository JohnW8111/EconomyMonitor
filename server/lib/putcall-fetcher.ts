import { subYears, format, parse } from "date-fns";

export interface PutCallDataPoint {
  date: string;
  indexRatio: number;
  equityRatio: number;
  totalRatio: number;
  indexZScore: number;
}

const WINDOW_SIZE = 252;

const CBOE_INDEX_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/indexpcarchive.csv";
const CBOE_EQUITY_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/equitypc.csv";
const CBOE_TOTAL_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/pcratioarchive.csv";

async function fetchCboeArchive(url: string): Promise<Map<string, number>> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!response.ok) {
    throw new Error(`CBOE fetch error: ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('Empty or invalid CSV from CBOE');
  }

  const header = lines[0].toLowerCase();
  const columns = header.split(',').map(c => c.trim());
  
  const dateColIdx = columns.findIndex(c => c === 'date' || c === 'dt' || c === 'day');
  
  let ratioColIdx = columns.findIndex(c => 
    (c.includes('ratio') && (c.includes('put') || c.includes('p/c') || c.includes('call'))) ||
    c === 'p/c ratio' || c === 'put/call ratio'
  );

  let putColIdx = -1;
  let callColIdx = -1;
  
  if (ratioColIdx === -1) {
    putColIdx = columns.findIndex(c => c.includes('put') && c.includes('vol'));
    callColIdx = columns.findIndex(c => c.includes('call') && c.includes('vol'));
  }

  const result = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(',').map(c => c.trim());
    
    const dateStr = cells[dateColIdx >= 0 ? dateColIdx : 0];
    
    let ratio: number | null = null;
    
    if (ratioColIdx >= 0) {
      const val = cells[ratioColIdx];
      ratio = parseFloat(val.replace(/[,%\s]/g, ''));
    } else if (putColIdx >= 0 && callColIdx >= 0) {
      const put = parseFloat(cells[putColIdx].replace(/[,\s]/g, ''));
      const call = parseFloat(cells[callColIdx].replace(/[,\s]/g, ''));
      if (call > 0) {
        ratio = put / call;
      }
    }

    if (ratio === null || isNaN(ratio)) continue;

    let formattedDate: string | null = null;
    
    const formats = [
      'MM/dd/yyyy',
      'yyyy-MM-dd',
      'M/d/yyyy',
      'MM-dd-yyyy',
    ];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990) {
          formattedDate = format(parsed, 'yyyy-MM-dd');
          break;
        }
      } catch {}
    }

    if (formattedDate && ratio > 0 && ratio < 10) {
      result.set(formattedDate, Number(ratio.toFixed(4)));
    }
  }

  return result;
}

export async function fetchPutCallData(period: string = '2y'): Promise<PutCallDataPoint[]> {
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
      yearsBack = 25;
      break;
    default:
      yearsBack = 3;
  }

  const [indexData, equityData, totalData] = await Promise.all([
    fetchCboeArchive(CBOE_INDEX_CSV),
    fetchCboeArchive(CBOE_EQUITY_CSV),
    fetchCboeArchive(CBOE_TOTAL_CSV)
  ]);

  const allDates = new Set(Array.from(indexData.keys()));
  const sortedDates = Array.from(allDates).sort();

  const rawData: Array<{ 
    date: string; 
    indexRatio: number; 
    equityRatio: number;
    totalRatio: number;
  }> = [];

  for (const date of sortedDates) {
    const indexRatio = indexData.get(date);
    const equityRatio = equityData.get(date) || 0;
    const totalRatio = totalData.get(date) || 0;

    if (indexRatio !== undefined) {
      rawData.push({
        date,
        indexRatio: Number(indexRatio.toFixed(2)),
        equityRatio: Number(equityRatio.toFixed(2)),
        totalRatio: Number(totalRatio.toFixed(2))
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

  const indexHistory: number[] = [];
  const result: PutCallDataPoint[] = [];

  let historyIndex = 0;
  for (const point of rawData) {
    indexHistory.push(point.indexRatio);
    historyIndex++;
    
    if (point.date < displayStartStr) continue;

    let zScore = 0;
    if (historyIndex >= WINDOW_SIZE) {
      const window = indexHistory.slice(historyIndex - WINDOW_SIZE, historyIndex);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.indexRatio - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      indexZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}
