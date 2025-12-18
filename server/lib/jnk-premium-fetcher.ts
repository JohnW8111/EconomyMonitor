import * as XLSX from "xlsx";
import { subYears, format, parseISO, isValid } from "date-fns";

export interface JnkPremiumDataPoint {
  date: string;
  nav: number;
  premium: number;
  premiumZScore: number;
}

const WINDOW_SIZE = 252;
const PDHIST_URL = 'https://www.ssga.com/library-content/products/fund-data/etfs/us/pdhist-us-en-jnk.xlsx';
const NAVHIST_URL = 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-jnk.xlsx';

async function fetchExcelData(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
  }
  
  return response.arrayBuffer();
}

function parseExcelDate(value: any): string | null {
  if (!value) return null;
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
    const parts = value.split(/[\/\-]/);
    if (parts.length === 3) {
      const [m, d, y] = parts;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  
  return null;
}

export async function fetchJnkPremiumData(period: string = '2y'): Promise<JnkPremiumDataPoint[]> {
  const [pdBuffer, navBuffer] = await Promise.all([
    fetchExcelData(PDHIST_URL),
    fetchExcelData(NAVHIST_URL)
  ]);

  const pdWorkbook = XLSX.read(pdBuffer, { type: 'array' });
  const pdSheet = pdWorkbook.Sheets[pdWorkbook.SheetNames[0]];
  const pdData: any[] = XLSX.utils.sheet_to_json(pdSheet, { header: 1 });

  const navWorkbook = XLSX.read(navBuffer, { type: 'array' });
  const navSheet = navWorkbook.Sheets[navWorkbook.SheetNames[0]];
  const navData: any[] = XLSX.utils.sheet_to_json(navSheet, { header: 1 });

  const navMap = new Map<string, number>();
  for (let i = 1; i < navData.length; i++) {
    const row = navData[i];
    if (!row || row.length < 2) continue;
    
    const dateStr = parseExcelDate(row[0]);
    const nav = parseFloat(row[1]);
    
    if (dateStr && !isNaN(nav)) {
      navMap.set(dateStr, nav);
    }
  }

  const rawData: Array<{ date: string; nav: number; premium: number }> = [];

  for (let i = 1; i < pdData.length; i++) {
    const row = pdData[i];
    if (!row || row.length < 2) continue;
    
    const dateStr = parseExcelDate(row[0]);
    let premium = parseFloat(row[1]);
    
    if (dateStr && !isNaN(premium)) {
      const nav = navMap.get(dateStr) || 0;
      premium = Number((premium * 100).toFixed(2));
      
      rawData.push({
        date: dateStr,
        nav: Number(nav.toFixed(2)),
        premium
      });
    }
  }

  rawData.sort((a, b) => a.date.localeCompare(b.date));

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
      startDate = new Date('2010-01-01');
      break;
    default:
      startDate = subYears(endDate, 2);
  }

  const startStr = format(startDate, 'yyyy-MM-dd');
  const filteredData = rawData.filter(d => d.date >= startStr);

  const premiumHistory: number[] = [];
  const result: JnkPremiumDataPoint[] = [];

  for (const point of filteredData) {
    premiumHistory.push(point.premium);
    
    let zScore = 0;
    if (premiumHistory.length >= WINDOW_SIZE) {
      const window = premiumHistory.slice(-WINDOW_SIZE);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.premium - mean) / stdDev : 0;
    }

    result.push({
      ...point,
      premiumZScore: Number(zScore.toFixed(2))
    });
  }

  return result;
}
