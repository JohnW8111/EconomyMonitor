import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchVixData, fetchLatestVix } from "./lib/vix-fetcher";
import { fetchHySpreadData } from "./lib/hy-spread-fetcher";
import { fetchHyIgRatioData } from "./lib/hy-ig-ratio-fetcher";
import { fetchSofrSpreadData } from "./lib/sofr-spread-fetcher";
import { fetchJnkPremiumData } from "./lib/jnk-premium-fetcher";
import { fetchYieldCurveData } from "./lib/yield-curve-fetcher";
import { fetchErpProxyData } from "./lib/erp-proxy-fetcher";
import { fetchSpxPutCallData, getStoredDataCount } from "./lib/spx-putcall-fetcher";
import { fetchNfciData } from "./lib/nfci-fetcher";
import NodeCache from "node-cache";

// Cache data for 12 hours (43200 seconds) - data only updates daily
const cache = new NodeCache({ stdTTL: 43200 });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Get VIX term structure data
  app.get("/api/vix/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `vix-history-${period}`;
      
      // Check cache first
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      // Fetch fresh data
      const data = await fetchVixData(period);
      
      // Cache the result
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/vix/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch VIX data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get latest VIX quote
  app.get("/api/vix/latest", async (req, res) => {
    try {
      const cacheKey = 'vix-latest';
      
      // Check cache first (1 minute TTL for latest data)
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchLatestVix();
      
      // Cache with shorter TTL
      cache.set(cacheKey, data, 60);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/vix/latest:', error);
      res.status(500).json({ 
        error: 'Failed to fetch latest VIX data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get High Yield Credit Spread data
  app.get("/api/hy-spread/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `hy-spread-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchHySpreadData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/hy-spread/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch High Yield Spread data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get HY vs IG Credit Spread Ratio data
  app.get("/api/hy-ig-ratio/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `hy-ig-ratio-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchHyIgRatioData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/hy-ig-ratio/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch HY/IG Ratio data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get SOFR-Treasury Spread (Funding Stress) data
  app.get("/api/sofr-spread/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `sofr-spread-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchSofrSpreadData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/sofr-spread/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch SOFR Spread data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get JNK ETF Premium/Discount to NAV data
  app.get("/api/jnk-premium/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `jnk-premium-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchJnkPremiumData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/jnk-premium/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch JNK Premium data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Yield Curve Slope data (10Y - 3M)
  app.get("/api/yield-curve/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `yield-curve-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchYieldCurveData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/yield-curve/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Yield Curve data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Equity Risk Premium Proxy data
  app.get("/api/erp-proxy/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `erp-proxy-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchErpProxyData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/erp-proxy/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch ERP Proxy data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get SPX Put-Call Ratio data (scraped from YCharts + stored history)
  app.get("/api/putcall/history", async (req, res) => {
    try {
      const cacheKey = 'spx-putcall-history';
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchSpxPutCallData();
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/putcall/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch SPX Put-Call Ratio data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get count of stored SPX Put-Call data points
  app.get("/api/putcall/count", async (req, res) => {
    try {
      const count = await getStoredDataCount();
      res.json({ count });
    } catch (error) {
      console.error('Error in /api/putcall/count:', error);
      res.status(500).json({ error: 'Failed to get count' });
    }
  });

  // Get NFCI (National Financial Conditions Index) data - weekly
  app.get("/api/nfci/history", async (req, res) => {
    try {
      const period = (req.query.period as string) || '2y';
      const cacheKey = `nfci-history-${period}`;
      
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        return res.json(cachedData);
      }

      const data = await fetchNfciData(period);
      cache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error('Error in /api/nfci/history:', error);
      res.status(500).json({ 
        error: 'Failed to fetch NFCI data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return httpServer;
}
