import type { VixDataPoint } from "@/lib/mockData";

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
