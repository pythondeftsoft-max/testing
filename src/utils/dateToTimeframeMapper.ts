/**
 * Maps a date range to an asset-compatible timeframe value
 * @param dateRange - The date range from property filters
 * @returns The closest matching timeframe for asset widgets
 */
export function mapDateRangeToTimeframe(
  dateRange: { from: Date | undefined; to: Date | undefined }
): '24h' | '7d' | '30d' | '90d' | 'ytd' | '1y' | 'all' {
  if (!dateRange.from || !dateRange.to) {
    return 'ytd'; // Default to year-to-date
  }

  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));

  // Map days difference to closest timeframe
  if (daysDiff <= 1) return '24h';
  if (daysDiff <= 7) return '7d';
  if (daysDiff <= 30) return '30d';
  if (daysDiff <= 90) return '90d';
  if (daysDiff <= 365) return '1y';
  
  // Check if it's YTD (from Jan 1 of current year)
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const isYTD = Math.abs(dateRange.from.getTime() - yearStart.getTime()) < (1000 * 60 * 60 * 24); // within 1 day
  
  if (isYTD) return 'ytd';
  
  return 'all';
}
