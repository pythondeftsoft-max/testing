export const PROPERTIES_KEYS = {
  all: ['properties'] as const,
  lists: () => [...PROPERTIES_KEYS.all, 'list'] as const,
  list: (filters: string) => [...PROPERTIES_KEYS.lists(), { filters }] as const,
  details: () => [...PROPERTIES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROPERTIES_KEYS.details(), id] as const,
  withUnits: () => [...PROPERTIES_KEYS.all, 'with-units'] as const,
  allWithUnits: (userId: string, portfolioId: string | null) => [
    ...PROPERTIES_KEYS.withUnits(), 
    'all', 
    userId, 
    portfolioId || 'all'
  ] as const,
};

export const PORTFOLIOS_KEYS = {
  all: ['portfolios'] as const,
  lists: () => [...PORTFOLIOS_KEYS.all, 'list'] as const,
  list: (filters: string) => [...PORTFOLIOS_KEYS.lists(), { filters }] as const,
  details: () => [...PORTFOLIOS_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PORTFOLIOS_KEYS.details(), id] as const,
};

export const PROFILE_KEYS = {
  all: ['profile'] as const,
  details: () => [...PROFILE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PROFILE_KEYS.details(), id] as const,
};

export const PROPERTY_IMPORT_KEYS = {
  all: ['property-import'] as const,
  sessions: ['property-import', 'sessions'] as const,
  session: (id: string) => ['property-import', 'session', id] as const,
  results: (sessionId: string) => ['property-import', 'results', sessionId] as const,
  templates: ['property-import', 'templates'] as const
};

export const ASSET_KEYS = {
  all: ['assets'] as const,
  relationships: () => [...ASSET_KEYS.all, 'relationships'] as const,
  relationship: (assetId: string) => [...ASSET_KEYS.relationships(), assetId] as const,
  valuations: () => [...ASSET_KEYS.all, 'valuations'] as const,
  valuation: (assetId: string) => [...ASSET_KEYS.valuations(), assetId] as const,
  hierarchy: (portfolioId: string) => [...ASSET_KEYS.all, 'hierarchy', portfolioId] as const,
  documents: () => [...ASSET_KEYS.all, 'documents'] as const,
  assetDocuments: (assetId: string) => [...ASSET_KEYS.documents(), 'asset', assetId] as const,
  userAssets: (userId: string) => [...ASSET_KEYS.all, 'user-assets', userId] as const,
};

export const MARKET_DATA_KEYS = {
  all: ['market-data'] as const,
  asset: (symbol: string) => [...MARKET_DATA_KEYS.all, 'asset', symbol] as const,
  portfolio: (portfolioId: string) => [...MARKET_DATA_KEYS.all, 'portfolio', portfolioId] as const,
  realtime: (portfolioId: string) => [...MARKET_DATA_KEYS.portfolio(portfolioId), 'realtime'] as const,
  cache: (cacheKey: string) => [...MARKET_DATA_KEYS.all, 'cache', cacheKey] as const,
  sources: () => [...MARKET_DATA_KEYS.all, 'sources'] as const,
};

export const INTELLIGENCE_KEYS = {
  all: ['market-intelligence'] as const,
  portfolio: (portfolioId: string) => [...INTELLIGENCE_KEYS.all, 'portfolio', portfolioId] as const,
  analysis: (portfolioId: string) => [...INTELLIGENCE_KEYS.portfolio(portfolioId), 'analysis'] as const,
  trends: (portfolioId: string) => [...INTELLIGENCE_KEYS.portfolio(portfolioId), 'trends'] as const,
};

export const ALERT_KEYS = {
  all: ['market-alerts'] as const,
  userAlerts: (userId: string) => [...ALERT_KEYS.all, 'user', userId] as const,
};

export const MARKETPLACE_KEYS = {
  all: ['marketplace-events'] as const,
  funnel: (startDate: string, endDate: string) => [...MARKETPLACE_KEYS.all, 'funnel', { startDate, endDate }] as const,
  analytics: () => [...MARKETPLACE_KEYS.all, 'analytics'] as const,
};

export const ADMIN_KEYS = {
  all: ['admin'] as const,
  usersList: (searchQuery?: string, filter?: string) => [...ADMIN_KEYS.all, 'users-list', searchQuery || '', filter || 'all'] as const,
};

export const TRIAL_BALANCE_KEYS = {
  all: ['trial-balance'] as const,
  balance: (params: any) => [...TRIAL_BALANCE_KEYS.all, params] as const,
};

export const MATCHMAKER_KEYS = {
  all: ['matchmaker'] as const,
  pipeline: () => [...MATCHMAKER_KEYS.all, 'pipeline'] as const,
  systemPipeline: (entityType: 'tenant' | 'property') => [
    ...MATCHMAKER_KEYS.pipeline(), 
    'system', 
    entityType
  ] as const,
  workerPipeline: (entityType: 'tenant' | 'property', workerId: string) => [
    ...MATCHMAKER_KEYS.pipeline(), 
    'worker', 
    entityType, 
    workerId
  ] as const,
  commandCenter: () => [...MATCHMAKER_KEYS.all, 'command-center'] as const,
  computedMatches: () => [...MATCHMAKER_KEYS.commandCenter(), 'cached'] as const,
};

export const IMPLEMENTATION_KEYS = {
  all: ['implementation-tasks'] as const,
  lists: () => [...IMPLEMENTATION_KEYS.all, 'list'] as const,
  list: (filters?: string) => [...IMPLEMENTATION_KEYS.lists(), { filters: filters || 'all' }] as const,
  details: () => [...IMPLEMENTATION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...IMPLEMENTATION_KEYS.details(), id] as const,
};

export const RENT_TRACKING_KEYS = {
  all: ['admin-rent-tracking'] as const,
  payments: (filters: any) => [...RENT_TRACKING_KEYS.all, 'payments', filters] as const,
  hapPayments: (filters: any) => [...RENT_TRACKING_KEYS.all, 'hap', filters] as const,
  stats: () => [...RENT_TRACKING_KEYS.all, 'stats'] as const,
  revenue: () => [...RENT_TRACKING_KEYS.all, 'revenue'] as const,
};

export const TERRITORY_KEYS = {
  all: ['territories'] as const,
  lists: () => [...TERRITORY_KEYS.all, 'list'] as const,
  list: (filters?: string) => [...TERRITORY_KEYS.lists(), { filters: filters || 'all' }] as const,
  details: () => [...TERRITORY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TERRITORY_KEYS.details(), id] as const,
  workers: (territoryId: string) => [...TERRITORY_KEYS.all, 'workers', territoryId] as const,
};