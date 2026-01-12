import * as XLSX from "xlsx";
import { subYears, format, parse, isValid } from "date-fns";

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
    const jsDate = XLSX.SSF.parse_date_code(value);
    if (jsDate) {
      const year = jsDate.y;
      const month = String(jsDate.m).padStart(2, '0');
      const day = String(jsDate.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  if (typeof value === 'string') {
    const formats = [
      'dd-MMM-yy',
      'dd-MMM-yyyy',
      'MMM dd, yyyy',
      'MM/dd/yyyy',
      'M/d/yyyy',
      'yyyy-MM-dd'
    ];
    
    for (const fmt of formats) {
      try {
        const parsed = parse(value, fmt, new Date());
        if (isValid(parsed)) {
          return format(parsed, 'yyyy-MM-dd');
        }
      } catch {}
    }
    
    const dateMatch = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      const [_, m, d, y] = dateMatch;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  
  return null;
}

export async function fetchJnkPremiumData(period: string = '2y'): Promise<JnkPremiumDataPoint[]> {
  const [pdBuffer, navBuffer] = await Promise.all([
    fetchExcelData(PDHIST_URL),
    fetchExcelData(NAVHIST_URL)
  ]);

  const pdWorkbook = XLSX.read(pdBuffer, { type: 'array', cellDates: true });
  const pdSheet = pdWorkbook.Sheets[pdWorkbook.SheetNames[0]];
  const pdData: any[] = XLSX.utils.sheet_to_json(pdSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

  const navWorkbook = XLSX.read(navBuffer, { type: 'array', cellDates: true });
  const navSheet = navWorkbook.Sheets[navWorkbook.SheetNames[0]];
  const navData: any[] = XLSX.utils.sheet_to_json(navSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

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

  // Calculate Z-scores on ALL data first (before filtering)
  const allDataWithZScores: JnkPremiumDataPoint[] = [];

  for (let i = 0; i < rawData.length; i++) {
    const point = rawData[i];
    let zScore = 0;
    
    if (i >= WINDOW_SIZE) {
      const window = rawData.slice(i - WINDOW_SIZE, i).map(d => d.premium);
      const mean = window.reduce((a, b) => a + b, 0) / WINDOW_SIZE;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / WINDOW_SIZE;
      const stdDev = Math.sqrt(variance);
      zScore = stdDev > 0 ? (point.premium - mean) / stdDev : 0;
    }

    allDataWithZScores.push({
      ...point,
      premiumZScore: Number(zScore.toFixed(2))
    });
  }

  // Now filter to the requested period
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
  return allDataWithZScores.filter(d => d.date >= startStr);
}
