/**
 * Seeded random number generator for consistent predictive analytics
 * Ensures widgets show the same data across tabs but regenerate daily
 */

// Simple hash function to convert string to number
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator (returns 0-1)
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Generate seed from widget ID and current date
export function generateWidgetSeed(widgetId: string): number {
  const today = new Date().toDateString(); // Changes daily
  const combined = `${widgetId}-${today}`;
  return hashString(combined);
}
