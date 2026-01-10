import { format, subDays, isWeekend, startOfDay } from "date-fns";
import { storage } from "../storage";

export interface SpxPutCallDataPoint {
  date: string;
  ratio: number;
  callVolume: number;
  putVolume: number;
  totalVolume: number;
}

const CBOE_DAILY_URL = "https://www.cboe.com/us/options/market_statistics/daily/";

function getLastNTradingDays(n: number, fromDate: Date = new Date()): string[] {
  const dates: string[] = [];
  let currentDate = startOfDay(fromDate);
  
  while (dates.length < n) {
    if (!isWeekend(currentDate)) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
    }
    currentDate = subDays(currentDate, 1);
  }
  
  return dates;
}

async function scrapeCboeDaily(dateStr: string): Promise<SpxPutCallDataPoint | null> {
  try {
    const url = `${CBOE_DAILY_URL}?dt=${dateStr}`;
    
    console.log(`[putcall-fetcher] Scraping CBOE for date: ${dateStr}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      console.log(`[putcall-fetcher] HTTP error for ${dateStr}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    const ratioMatch = html.match(/SPX\s*\+\s*SPXW\s+PUT\/CALL\s+RATIO[^\d]*?([\d.]+)/i);
    
    if (!ratioMatch) {
      const tableMatch = html.match(/\|\s*SPX\s*\+\s*SPXW\s+PUT\/CALL\s+RATIO\s*\|\s*([\d.]+)\s*\|/i);
      if (!tableMatch) {
        console.log(`[putcall-fetcher] Could not find SPX+SPXW ratio for ${dateStr}`);
        return null;
      }
    }
    
    let ratio: number | null = null;
    
    const ratioPatterns = [
      /SPX\s*\+\s*SPXW\s+PUT\/CALL\s+RATIO[^\d]*?([\d.]+)/i,
      /\|\s*SPX\s*\+\s*SPXW\s+PUT\/CALL\s+RATIO\s*\|\s*([\d.]+)\s*\|/i,
      /"SPX\s*\+\s*SPXW\s+PUT\/CALL\s+RATIO"[^:]*:\s*([\d.]+)/i,
    ];
    
    for (const pattern of ratioPatterns) {
      const match = html.match(pattern);
      if (match) {
        ratio = parseFloat(match[1]);
        if (!isNaN(ratio) && ratio > 0 && ratio < 20) {
          break;
        }
        ratio = null;
      }
    }
    
    if (ratio === null) {
      console.log(`[putcall-fetcher] Could not parse ratio for ${dateStr}`);
      return null;
    }

    let callVolume = 0;
    let putVolume = 0;
    let totalVolume = 0;
    
    const spxSectionMatch = html.match(/SPX\s*\+\s*SPXW[\s\S]*?VOLUME\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)/i);
    
    if (spxSectionMatch) {
      callVolume = parseInt(spxSectionMatch[1].replace(/,/g, ''), 10);
      putVolume = parseInt(spxSectionMatch[2].replace(/,/g, ''), 10);
      totalVolume = parseInt(spxSectionMatch[3].replace(/,/g, ''), 10);
    } else {
      const volumePatterns = [
        /\|\s*SPX\s*\+\s*SPXW\s*\|[\s\S]*?\|\s*VOLUME\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)/i,
        /"SPX\s*\+\s*SPXW"[\s\S]*?"VOLUME"[^:]*:\s*\[([\d,]+),\s*([\d,]+),\s*([\d,]+)\]/i,
      ];
      
      for (const pattern of volumePatterns) {
        const match = html.match(pattern);
        if (match) {
          callVolume = parseInt(match[1].replace(/,/g, ''), 10);
          putVolume = parseInt(match[2].replace(/,/g, ''), 10);
          totalVolume = parseInt(match[3].replace(/,/g, ''), 10);
          break;
        }
      }
    }
    
    if (totalVolume === 0 && (callVolume > 0 || putVolume > 0)) {
      totalVolume = callVolume + putVolume;
    }

    console.log(`[putcall-fetcher] Scraped ${dateStr}: ratio=${ratio}, call=${callVolume}, put=${putVolume}, total=${totalVolume}`);
    
    return {
      date: dateStr,
      ratio,
      callVolume,
      putVolume,
      totalVolume,
    };
  } catch (error) {
    console.error(`[putcall-fetcher] Error scraping ${dateStr}:`, error);
    return null;
  }
}

export async function fetchPutCallData(): Promise<SpxPutCallDataPoint[]> {
  const tradingDays = getLastNTradingDays(7);
  console.log('[putcall-fetcher] Checking last 7 trading days:', tradingDays);
  
  const existingData = await storage.getLatestPutCallRatios(14);
  const existingDates = new Set(existingData.map(d => d.date));
  
  console.log('[putcall-fetcher] Existing dates in DB:', Array.from(existingDates));
  
  const missingDates = tradingDays.filter(d => !existingDates.has(d));
  console.log('[putcall-fetcher] Missing dates to fetch:', missingDates);
  
  for (const dateStr of missingDates) {
    const data = await scrapeCboeDaily(dateStr);
    if (data) {
      await storage.upsertPutCallRatio({
        date: data.date,
        ratio: data.ratio,
        callVolume: data.callVolume,
        putVolume: data.putVolume,
        totalVolume: data.totalVolume,
      });
      console.log(`[putcall-fetcher] Stored data for ${dateStr}`);
    }
  }
  
  const allData = await storage.getLatestPutCallRatios(7);
  
  const result: SpxPutCallDataPoint[] = allData
    .map(d => ({
      date: d.date,
      ratio: d.ratio,
      callVolume: d.callVolume,
      putVolume: d.putVolume,
      totalVolume: d.totalVolume,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  console.log('[putcall-fetcher] Returning', result.length, 'data points');
  return result;
}
