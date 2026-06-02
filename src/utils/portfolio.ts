/**
 * Normalize portfolio ID to handle case-insensitive "everything"/"all" values
 * @param id - Raw portfolio ID from UI
 * @returns undefined for aggregate views, original ID for specific portfolios
 */
export const normalizePortfolioId = (id?: string): string | undefined => {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  return (normalized === 'everything' || normalized === 'all') ? undefined : id;
};