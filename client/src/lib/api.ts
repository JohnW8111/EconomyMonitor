import type { VixDataPoint } from "@/lib/mockData";

export interface HySpreadDataPoint {
  date: string;
  spread: number;
  spreadZScore: number;
}

export async function fetchVixHistory(period: string = '2y'): Promise<VixDataPoint[]> {
  const response = await fetch(`/api/vix/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch VIX history');
  }
  return response.json();
}

export async function fetchLatestVix(): Promise<{ vix: number; vix3m: number }> {
  const response = await fetch('/api/vix/latest');
  if (!response.ok) {
    throw new Error('Failed to fetch latest VIX');
  }
  return response.json();
}

export async function fetchHySpreadHistory(period: string = '2y'): Promise<HySpreadDataPoint[]> {
  const response = await fetch(`/api/hy-spread/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch High Yield Spread history');
  }
  return response.json();
}

export interface HyIgRatioDataPoint {
  date: string;
  hySpread: number;
  igSpread: number;
  ratio: number;
  ratioZScore: number;
}

export async function fetchHyIgRatioHistory(period: string = '2y'): Promise<HyIgRatioDataPoint[]> {
  const response = await fetch(`/api/hy-ig-ratio/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch HY/IG Ratio history');
  }
  return response.json();
}

export interface SofrSpreadDataPoint {
  date: string;
  sofr90: number;
  tbill3m: number;
  spread: number;
  spreadZScore: number;
}

export async function fetchSofrSpreadHistory(period: string = '2y'): Promise<SofrSpreadDataPoint[]> {
  const response = await fetch(`/api/sofr-spread/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch SOFR Spread history');
  }
  return response.json();
}

export interface JnkPremiumDataPoint {
  date: string;
  nav: number;
  premium: number;
  premiumZScore: number;
}

export async function fetchJnkPremiumHistory(period: string = '2y'): Promise<JnkPremiumDataPoint[]> {
  const response = await fetch(`/api/jnk-premium/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch JNK Premium history');
  }
  return response.json();
}

export interface YieldCurveDataPoint {
  date: string;
  dgs10: number;
  dgs3mo: number;
  slope: number;
  slopeZScore: number;
}

export async function fetchYieldCurveHistory(period: string = '2y'): Promise<YieldCurveDataPoint[]> {
  const response = await fetch(`/api/yield-curve/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch Yield Curve history');
  }
  return response.json();
}

export interface ErpProxyDataPoint {
  date: string;
  sp500: number;
  realYield: number;
  epsTtm: number;
  earningsYield: number;
  erpProxy: number;
  erpProxyZScore: number;
}

export async function fetchErpProxyHistory(period: string = '2y'): Promise<ErpProxyDataPoint[]> {
  const response = await fetch(`/api/erp-proxy/history?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch ERP Proxy history');
  }
  return response.json();
}

