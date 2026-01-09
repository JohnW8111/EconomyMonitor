import { subYears, format, parse } from "date-fns";

export interface PutCallDataPoint {
  date: string;
  indexRatio: number;
  equityRatio: number | null;
  totalRatio: number | null;
  indexZScore: number;
}

const WINDOW_SIZE = 252;

const CBOE_INDEX_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/indexpcarchive.csv";
const CBOE_EQUITY_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/equitypc.csv";
const CBOE_TOTAL_CSV = "https://cdn.cboe.com/resources/options/volume_and_call_put_ratios/pcratioarchive.csv";

function parseFlexibleDate(dateStr: string): string | null {
  const formats = [
    'M/d/yyyy',
    'MM/dd/yyyy',
    'yyyy-MM-dd',
    'MM-dd-yyyy',
  ];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr.trim(), fmt, new Date());
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
        return format(parsed, 'yyyy-MM-dd');
      }
    } catch {}
  }
  return null;
}

async function fetchCboeArchive(url: string): Promise<Map<string, number>> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  if (!response.ok) {
    throw new Error(`CBOE fetch error: ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.replace(/\r/g, '').trim().split('\n');
  
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    if (lower.includes('trade_date') || lower.includes('date,')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    throw new Error('Could not find header row in CSV');
  }

  const header = lines[headerIndex].toLowerCase();
  const columns = header.split(',').map(c => c.trim());
  
  const dateColIdx = columns.findIndex(c => 
    c === 'trade_date' || c === 'date' || c === 'dt' || c === 'day'
  );
  
  let ratioColIdx = columns.findIndex(c => 
    c === 'p/c ratio' || c === 'put/call ratio' || c === 'pc ratio' ||
    (c.includes('ratio') && (c.includes('put') || c.includes('p/c') || c.includes('call')))
  );

  let putColIdx = -1;
  let callColIdx = -1;
  
  if (ratioColIdx === -1) {
    putColIdx = columns.findIndex(c => c === 'put' || (c.includes('put') && !c.includes('ratio')));
    callColIdx = columns.findIndex(c => c === 'call' || (c.includes('call') && !c.includes('ratio')));
  }

  const result = new Map<string, number>();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = line.split(',').map(c => c.trim());
    
    const dateStr = cells[dateColIdx >= 0 ? dateColIdx : 0];
    const formattedDate = parseFlexibleDate(dateStr);
    
    if (!formattedDate) continue;
    
    let ratio: number | null = null;
    
    if (ratioColIdx >= 0 && cells[ratioColIdx]) {
      const val = cells[ratioColIdx].replace(/[,%\s]/g, '');
      ratio = parseFloat(val);
    } else if (putColIdx >= 0 && callColIdx >= 0 && cells[putColIdx] && cells[callColIdx]) {
      const put = parseFloat(cells[putColIdx].replace(/[,\s]/g, ''));
      const call = parseFloat(cells[callColIdx].replace(/[,\s]/g, ''));
      if (call > 0 && !isNaN(put) && !isNaN(call)) {
        ratio = put / call;
      }
    }

    if (ratio !== null && !isNaN(ratio) && ratio > 0 && ratio < 20) {
      result.set(formattedDate, Number(ratio.toFixed(4)));
    }
  }

  return result;
}

export async function fetchPutCallData(period: string = '2y'): Promise<PutCallDataPoint[]> {
  const endDate = new Date();

  console.log('[putcall-fetcher] Fetching CBOE archives...');
  
  const [indexData, equityData, totalData] = await Promise.all([
    fetchCboeArchive(CBOE_INDEX_CSV),
    fetchCboeArchive(CBOE_EQUITY_CSV).catch((e) => { console.log('[putcall-fetcher] Equity fetch error:', e.message); return new Map<string, number>(); }),
    fetchCboeArchive(CBOE_TOTAL_CSV).catch((e) => { console.log('[putcall-fetcher] Total fetch error:', e.message); return new Map<string, number>(); })
  ]);

  console.log('[putcall-fetcher] Index data size:', indexData.size);
  console.log('[putcall-fetcher] Equity data size:', equityData.size);
  console.log('[putcall-fetcher] Total data size:', totalData.size);
  
  // Debug: sample of dates
  const sampleDates = Array.from(indexData.keys()).slice(-5);
  console.log('[putcall-fetcher] Sample recent dates from index:', sampleDates);

  const allDates = new Set(Array.from(indexData.keys()));
  const sortedDates = Array.from(allDates).sort();
  console.log('[putcall-fetcher] Total unique dates:', sortedDates.length);
  console.log('[putcall-fetcher] Date range:', sortedDates[0], 'to', sortedDates[sortedDates.length - 1]);

  const rawData: Array<{ 
    date: string; 
    indexRatio: number; 
    equityRatio: number | null;
    totalRatio: number | null;
  }> = [];

  for (const date of sortedDates) {
    const indexRatio = indexData.get(date);

    if (indexRatio !== undefined) {
      rawData.push({
        date,
        indexRatio: Number(indexRatio.toFixed(2)),
        equityRatio: equityData.get(date) ? Number(equityData.get(date)!.toFixed(2)) : null,
        totalRatio: totalData.get(date) ? Number(totalData.get(date)!.toFixed(2)) : null
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
  console.log('[putcall-fetcher] Display start:', displayStartStr);
  console.log('[putcall-fetcher] rawData length:', rawData.length);

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
