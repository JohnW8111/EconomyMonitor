import { storage } from "../storage";
import NodeCache from "node-cache";

const YCHARTS_URL = "https://ycharts.com/indicators/cboe_spx_put_call_ratio";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const scrapeCache = new NodeCache({ stdTTL: 12 * 60 * 60 });
const SCRAPE_CACHE_KEY = "spx-putcall-last-scrape";
const HISTORICAL_DAYS_TO_FETCH = 14;

interface ScrapedData {
  latest: { date: string; value: number } | null;
  historical: Array<{ date: string; ratio: number }>;
}

function parseMonth(monthStr: string): number {
  const months: Record<string, number> = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11,
  };
  return months[monthStr.toLowerCase()] ?? -1;
}

function formatDate(year: number, month: number, day: number): string {
  const y = year.toString();
  const m = (month + 1).toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function scrapeYCharts(): Promise<ScrapedData> {
  const response = await fetch(YCHARTS_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YCharts page: ${response.status}`);
  }

  const html = await response.text();
  
  const result: ScrapedData = {
    latest: null,
    historical: [],
  };

  const latestRegex = /(\d+(?:\.\d+)?)\s+for\s+([A-Za-z]{3})\s+(\d{2})\s+(\d{4})/;
  const latestMatch = html.match(latestRegex);
  
  if (latestMatch) {
    const value = parseFloat(latestMatch[1]);
    const month = parseMonth(latestMatch[2]);
    const day = parseInt(latestMatch[3], 10);
    const year = parseInt(latestMatch[4], 10);
    
    if (month >= 0) {
      result.latest = {
        date: formatDate(year, month, day),
        value,
      };
    }
  }

  const tableRowRegex = /<td>(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2}),\s+(\d{4})<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d+)?)/g;
  let match;
  const seen = new Set<string>();
  let count = 0;
  
  while ((match = tableRowRegex.exec(html)) !== null && count < HISTORICAL_DAYS_TO_FETCH) {
    const monthStr = match[1];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const value = parseFloat(match[4]);
    
    const month = parseMonth(monthStr);
    if (month < 0) continue;
    
    const date = formatDate(year, month, day);
    
    if (!seen.has(date)) {
      seen.add(date);
      result.historical.push({ date, ratio: value });
      count++;
    }
  }

  result.historical.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`[YCharts Scraper] Extracted ${result.historical.length} historical data points`);

  return result;
}

function calculateZScores(data: Array<{ date: string; ratio: number }>): Array<{ date: string; ratio: number; ratioZScore: number }> {
  const window = 252;
  const result: Array<{ date: string; ratio: number; ratioZScore: number }> = [];

  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (i < window) {
      result.push({ ...point, ratioZScore: 0 });
      continue;
    }

    const windowData = data.slice(i - window, i).map(d => d.ratio);
    const mean = windowData.reduce((a, b) => a + b, 0) / windowData.length;
    const variance = windowData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowData.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? (point.ratio - mean) / stdDev : 0;
    result.push({
      ...point,
      ratioZScore: Math.round(zScore * 100) / 100,
    });
  }

  return result;
}

export async function fetchSpxPutCallData(): Promise<Array<{ date: string; ratio: number; ratioZScore: number }>> {
  const lastScrape = scrapeCache.get<number>(SCRAPE_CACHE_KEY);
  const shouldScrape = !lastScrape;
  
  if (shouldScrape) {
    console.log('[YCharts] Scraping new data (cache expired or empty)');
    try {
      const scraped = await scrapeYCharts();
      
      if (scraped.historical.length > 0) {
        await storage.bulkUpsertSpxPutCall(scraped.historical);
        console.log(`[YCharts] Stored ${scraped.historical.length} historical data points`);
      }

      if (scraped.latest && scraped.historical.every(h => h.date !== scraped.latest!.date)) {
        await storage.upsertSpxPutCall({
          date: scraped.latest.date,
          ratio: scraped.latest.value,
        });
        console.log(`[YCharts] Stored latest data point: ${scraped.latest.date}`);
      }
      
      scrapeCache.set(SCRAPE_CACHE_KEY, Date.now());
    } catch (err) {
      console.error('[YCharts] Scraping failed:', err);
    }
  } else {
    console.log('[YCharts] Using cached data (last scrape within 12 hours)');
  }

  const storedData = await storage.getSpxPutCallHistory();
  
  const combined = storedData.map(d => ({
    date: d.date,
    ratio: d.ratio,
  }));

  combined.sort((a, b) => a.date.localeCompare(b.date));

  return calculateZScores(combined);
}

export async function getStoredDataCount(): Promise<number> {
  const data = await storage.getSpxPutCallHistory();
  return data.length;
}
