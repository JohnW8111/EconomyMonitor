import { format, subDays, isWeekend, startOfDay } from "date-fns";
import { storage } from "../storage";

export interface SpxPutCallDataPoint {
  date: string;
  ratio: number;
  callVolume: number;
  putVolume: number;
  totalVolume: number;
}

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

export async function fetchPutCallData(): Promise<SpxPutCallDataPoint[]> {
  const tradingDays = getLastNTradingDays(7);
  console.log('[putcall-fetcher] Checking last 7 trading days:', tradingDays);
  
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
  
  console.log('[putcall-fetcher] Returning', result.length, 'data points from database');
  return result;
}
