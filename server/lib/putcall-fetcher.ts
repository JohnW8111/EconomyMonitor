import { format, subDays, isWeekend, startOfDay } from "date-fns";
import { chromium } from "playwright";
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
  let currentDate = subDays(startOfDay(fromDate), 1);
  
  while (dates.length < n) {
    if (!isWeekend(currentDate)) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
    }
    currentDate = subDays(currentDate, 1);
  }
  
  return dates;
}

async function scrapeCboeData(dateStr: string): Promise<SpxPutCallDataPoint | null> {
  console.log(`[putcall-fetcher] Scraping CBOE data for ${dateStr}...`);
  
  let browser;
  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
    const page = await browser.newPage();
    
    const url = `https://www.cboe.com/us/options/market_statistics/daily/?dt=${dateStr}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.waitForTimeout(3000);
    
    const pageContent = await page.content();
    
    const spxMatch = pageContent.match(/SPX\s*\+\s*SPXW.*?PUT\/CALL\s*RATIO.*?(\d+\.\d+)/is);
    if (spxMatch) {
      const ratio = parseFloat(spxMatch[1]);
      console.log(`[putcall-fetcher] Found ratio via regex: ${ratio}`);
    }
    
    const data = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      
      const lines = bodyText.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('SPX') && lines[i].includes('SPXW')) {
          for (let j = i; j < Math.min(i + 10, lines.length); j++) {
            const ratioMatch = lines[j].match(/(\d+\.\d{2})/);
            const volumeMatches = lines[j].match(/[\d,]+/g);
            if (ratioMatch && volumeMatches) {
              const volumes = volumeMatches
                .filter(v => v.includes(','))
                .map(v => parseInt(v.replace(/,/g, ''), 10));
              if (volumes.length >= 3) {
                return {
                  ratio: parseFloat(ratioMatch[1]),
                  callVolume: volumes[0],
                  putVolume: volumes[1],
                  totalVolume: volumes[2]
                };
              }
            }
          }
        }
      }
      
      const tables = document.querySelectorAll('table');
      for (let t = 0; t < tables.length; t++) {
        const tableText = tables[t].innerText;
        if (tableText.includes('SPX') && tableText.includes('SPXW')) {
          const rows = tables[t].querySelectorAll('tr');
          for (let r = 0; r < rows.length; r++) {
            const rowText = rows[r].innerText;
            if (rowText.includes('SPX') && rowText.includes('SPXW')) {
              const ratioMatch = rowText.match(/(\d+\.\d{2})/);
              const volumeMatches = rowText.match(/[\d,]+/g);
              if (ratioMatch && volumeMatches) {
                const volumes = volumeMatches
                  .filter((v: string) => v.includes(','))
                  .map((v: string) => parseInt(v.replace(/,/g, ''), 10));
                if (volumes.length >= 3) {
                  return {
                    ratio: parseFloat(ratioMatch[1]),
                    callVolume: volumes[0],
                    putVolume: volumes[1],
                    totalVolume: volumes[2]
                  };
                }
              }
            }
          }
        }
      }
      
      return null;
    });
    
    if (data) {
      console.log(`[putcall-fetcher] Found SPX+SPXW data for ${dateStr}: ratio=${data.ratio}`);
      return {
        date: dateStr,
        ...data
      };
    }
    
    console.log(`[putcall-fetcher] SPX+SPXW row not found for ${dateStr}`);
    return null;
    
  } catch (error) {
    console.error(`[putcall-fetcher] Error scraping ${dateStr}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function fetchPutCallData(): Promise<SpxPutCallDataPoint[]> {
  const tradingDays = getLastNTradingDays(7);
  console.log('[putcall-fetcher] Checking last 7 trading days:', tradingDays);
  
  const existingData = await storage.getLatestPutCallRatios(30);
  const existingDates = new Set(existingData.map(d => d.date));
  
  const missingDates = tradingDays.filter(d => !existingDates.has(d));
  
  if (missingDates.length > 0) {
    console.log('[putcall-fetcher] Missing dates to scrape:', missingDates);
    
    for (const dateStr of missingDates) {
      const data = await scrapeCboeData(dateStr);
      if (data) {
        await storage.upsertPutCallRatio({
          date: data.date,
          ratio: data.ratio,
          callVolume: data.callVolume,
          putVolume: data.putVolume,
          totalVolume: data.totalVolume
        });
        console.log(`[putcall-fetcher] Saved data for ${dateStr}`);
      }
    }
  }
  
  const allData = await storage.getLatestPutCallRatios(7);
  
  const result: SpxPutCallDataPoint[] = allData
    .filter(d => tradingDays.includes(d.date))
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
