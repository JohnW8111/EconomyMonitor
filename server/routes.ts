import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchVixData, fetchLatestVix } from "./lib/vix-fetcher";
import { fetchHySpreadData } from "./lib/hy-spread-fetcher";
import { fetchHyIgRatioData } from "./lib/hy-ig-ratio-fetcher";
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

  return httpServer;
}
