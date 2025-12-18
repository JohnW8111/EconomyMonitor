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
