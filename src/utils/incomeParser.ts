/**
 * Parse a string-based income range label into a representative numeric value.
 * Examples: 'under-15000' → 15000, '25000-35000' → 30000, '75000-plus' → 75000
 */
export function parseIncomeRange(income: string | number | null | undefined): number {
  if (income === null || income === undefined) return 0;
  if (typeof income === 'number') return income;
  
  const str = String(income).trim().toLowerCase();
  if (!str || str === 'n/a') return 0;

  // Try direct numeric parse first
  const direct = parseFloat(str);
  if (!isNaN(direct)) return direct;

  // 'under-X' or 'less-than-X'
  const underMatch = str.match(/under[- ]?(\d+)/);
  if (underMatch) return parseInt(underMatch[1], 10);

  // 'X-plus' or 'X-above' or 'over-X'
  const plusMatch = str.match(/(\d+)[- ]?(?:plus|above|over)/);
  if (plusMatch) return parseInt(plusMatch[1], 10);
  const overMatch = str.match(/over[- ]?(\d+)/);
  if (overMatch) return parseInt(overMatch[1], 10);

  // 'X-Y' range → midpoint
  const rangeMatch = str.match(/(\d+)[- ](\d+)/);
  if (rangeMatch) {
    return Math.round((parseInt(rangeMatch[1], 10) + parseInt(rangeMatch[2], 10)) / 2);
  }

  return 0;
}
