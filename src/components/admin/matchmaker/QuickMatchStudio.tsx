import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Users, Home, ArrowRight, X, MessageSquare, ArrowLeft, Search, TrendingUp, MapPin, Calendar, Eye, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2, UserCircle } from 'lucide-react';
import { useQuickMatch, MatchMode, Match, calculateDaysOnMarket } from '@/hooks/useQuickMatch';
import { useMatchmakerPoints } from '@/hooks/useMatchmakerPoints';
import { useApplicationWorkflow } from '@/hooks/useApplicationWorkflow';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PropertyDetailsModalEnhanced from '@/components/PropertyDetailsModalEnhanced';
import TenantProfileModal from '@/components/TenantProfileModal';
import { supabase } from '@/integrations/supabase/client';
import { transformPropertiesToListings } from '@/utils/marketplaceListings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SimplePropertyMap from '@/components/SimplePropertyMap';

type Stage = 'mode-selection' | 'entity-selection' | 'matching';

export const QuickMatchStudio = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>('mode-selection');
  const [mode, setMode] = useState<MatchMode>('tenant');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState<Match | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [fullPropertyForDetails, setFullPropertyForDetails] = useState<any | null>(null);
  const [isLoadingPropertyDetails, setIsLoadingPropertyDetails] = useState(false);
  // Tenant profile modal state
  const [selectedTenantForProfile, setSelectedTenantForProfile] = useState<string | null>(null);
  // Property filters
  const [bedroomFilter, setBedroomFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  // Tenant filters (for property mode - filtering "Other Potential Tenants" table)
  const [tenantStateFilter, setTenantStateFilter] = useState<string>('all');
  const [tenantCityFilter, setTenantCityFilter] = useState<string>('all');
  const [tenantBedroomFilter, setTenantBedroomFilter] = useState<string>('all');
  // Photo navigation state
  const [propertyPhotoIndex, setPropertyPhotoIndex] = useState(0);
  // Location preview state
  const [showLocationPreview, setShowLocationPreview] = useState(true);

  const { user } = useAuth();
  const { data: isAdmin } = useAdminCheck();
  const { awardPoints } = useMatchmakerPoints();
  const { createApplication } = useApplicationWorkflow();
  
  const {
    tenants,
    properties,
    selectedTenant,
    selectedProperty,
    matches,
    currentMatch,
    currentIndex,
    totalMatches,
    remainingMatches,
    hasNext,
    hasPrevious,
    next,
    previous,
    reset,
    jumpTo,
    isLoadingApiScores,
  } = useQuickMatch(mode, selectedId);

  // Handle URL parameter for pre-selected tenant
  useEffect(() => {
    const preselectedTenantId = searchParams.get('tenantId');
    if (preselectedTenantId) {
      setMode('tenant');
      setSelectedId(preselectedTenantId);
      setStage('matching');
      // Clean up URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Handle URL parameter for pre-selected property
  useEffect(() => {
    const preselectedPropertyId = searchParams.get('propertyId');
    if (preselectedPropertyId) {
      setMode('property');
      setSelectedId(preselectedPropertyId);
      setStage('matching');
      // Clean up URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Reset photo index when match changes
  useEffect(() => {
    setPropertyPhotoIndex(0);
  }, [currentMatch?.property?.id]);

  // Photo navigation handlers
  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const photos = currentMatch?.property?.unit_photos?.length > 0 
      ? currentMatch.property.unit_photos 
      : currentMatch?.property?.photos || [];
    setPropertyPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    const photos = currentMatch?.property?.unit_photos?.length > 0 
      ? currentMatch.property.unit_photos 
      : currentMatch?.property?.photos || [];
    setPropertyPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleModeSelect = (selectedMode: MatchMode) => {
    setMode(selectedMode);
    setStage('entity-selection');
    setSelectedId(null);
    setSearchQuery('');
  };

  const handleEntitySelect = (id: string) => {
    setSelectedId(id);
    setStage('matching');
    reset();
  };

  const handleSkip = () => {
    if (currentMatch) {
      toast.info('Match skipped');
      next();
    }
  };

  const handleContactBoth = () => {
    if (currentMatch && user) {
      toast.success('Message dialog would open here');
      awardPoints.mutate({
        actionType: 'match_created',
      });
    }
  };

  const handleCreateApplication = async () => {
    if (!currentMatch || !user) return;

    try {
      await createApplication.mutateAsync({
        tenant_id: currentMatch.tenant.id,
        property_id: currentMatch.property.id,
        status: 'pending',
        assigned_worker_id: user.id,
        ai_match_score: currentMatch.score,
      });

      awardPoints.mutate({
        actionType: 'match_created',
      });

      toast.success(
        isAdmin ? '✅ Application created successfully' : '🎉 Application created! +50 points',
        {
          description: `Match score: ${currentMatch.score}%`,
        }
      );

      next();
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  const handleChangeSelection = () => {
    setStage('entity-selection');
    setSelectedId(null);
    reset();
  };

  const handleSwitchMode = () => {
    setStage('mode-selection');
    setMode('tenant');
    setSelectedId(null);
    setSearchQuery('');
    setShowAllMatches(false);
    reset();
  };

  const fetchFullProperty = async (propertyId: string) => {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        property_units (
          id,
          unit_number,
          unit_name,
          bedrooms,
          bathrooms,
          monthly_rent,
          status,
          square_feet,
          description,
          unit_amenities,
          unit_photos,
          on_market
        )
      `)
      .eq('id', propertyId)
      .single();
      
    if (error) throw error;
    
    console.log('🔍 Fetched full property:', {
      propertyId: data.id,
      address: data.address,
      photos: data.photos,
      property_amenities: data.amenities,
      units: data.property_units?.map(u => ({
        id: u.id,
        unit_number: u.unit_number,
        unit_name: u.unit_name,
        on_market: u.on_market,
        unit_amenities: u.unit_amenities,
        unit_photos: u.unit_photos
      }))
    });
    
    return data;
  };


  const handleViewPropertyDetails = async (match: Match, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingPropertyDetails(true);
    try {
      const fullProperty = await fetchFullProperty(match.property.id);
      
      // Use the SAME transformation as the marketplace
      const transformedListings = transformPropertiesToListings([fullProperty]);
      
      // Get the first (and likely only) listing
      // For multi-unit, this will be the first on-market unit
      const listing = transformedListings[0];
      
      if (!listing) {
        throw new Error('No listing generated from property');
      }
      
      console.log('✅ Using marketplace-transformed listing:', listing);
      
      setFullPropertyForDetails(listing);
      setSelectedPropertyForDetails(match);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to load property details');
    } finally {
      setIsLoadingPropertyDetails(false);
    }
  };

  const handleClosePropertyDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedPropertyForDetails(null);
    setFullPropertyForDetails(null);
  };

  const handleCreateApplicationFromDetails = async () => {
    if (!selectedPropertyForDetails || !user) return;
    
    try {
      await createApplication.mutateAsync({
        tenant_id: selectedPropertyForDetails.tenant.id,
        property_id: selectedPropertyForDetails.property.id,
        status: 'pending',
        assigned_worker_id: user.id,
        ai_match_score: selectedPropertyForDetails.score,
      });

      awardPoints.mutate({
        actionType: 'match_created',
      });

      toast.success(
        isAdmin ? '✅ Application created successfully' : '🎉 Application created! +50 points',
        {
          description: `Match score: ${selectedPropertyForDetails.score}%`,
        }
      );

      handleClosePropertyDetails();
      next();
    } catch (error) {
      console.error('Error creating application:', error);
    }
  };

  // Use tier-based colors when available, otherwise fall back to score-based
  const getScoreColor = (score: number, tier?: string | null) => {
    if (tier === 'hot_match') return 'text-success';
    if (tier === 'decent_match') return 'text-warning';
    if (tier === 'no_match') return 'text-orange-500';
    // Fallback to score-based
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    if (score >= 40) return 'text-orange-500';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number, tier?: string | null) => {
    if (tier === 'hot_match') return '🔥 Hot Match';
    if (tier === 'decent_match') return '👍 Decent Match';
    if (tier === 'no_match') return '❌ No Match';
    // Fallback to score-based
    if (score >= 80) return '🔥 Hot Match';
    if (score >= 60) return '👍 Decent Match';
    if (score >= 40) return 'Fair Match';
    return 'Poor Match';
  };

  const getTierBadgeVariant = (tier?: string | null): "default" | "success" | "warning" | "destructive" | "secondary" | "outline" => {
    if (tier === 'hot_match') return 'success';
    if (tier === 'decent_match') return 'warning';
    if (tier === 'no_match') return 'destructive';
    return 'secondary';
  };

  const formatMoveInDate = (tenant: any): string => {
    if (tenant.move_in_window) {
      const map: Record<string, string> = {
        'immediately': 'ASAP',
        '30_days': '30 Days',
        '60_days': '60 Days',
        '90_days': '90+ Days'
      };
      return map[tenant.move_in_window] || tenant.move_in_window;
    }
    if (tenant.desired_move_in_date) {
      return new Date(tenant.desired_move_in_date).toLocaleDateString();
    }
    return 'Flexible';
  };

  const filteredTenants = tenants.filter(t => 
    t.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique filter options from properties
  const uniqueStates = useMemo(() => {
    const states = properties.filter(p => p.state).map(p => p.state as string);
    return [...new Set(states)].sort();
  }, [properties]);

  const uniqueCities = useMemo(() => {
    const cities = properties.filter(p => p.city).map(p => p.city as string);
    return [...new Set(cities)].sort();
  }, [properties]);

  const uniqueBedrooms = useMemo(() => {
    const beds = properties.filter(p => p.bedrooms).map(p => String(p.bedrooms));
    return [...new Set(beds)].sort((a, b) => Number(a) - Number(b));
  }, [properties]);

  // Filter properties with all filters
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBedrooms = bedroomFilter === 'all' || String(p.bedrooms) === bedroomFilter;
    const matchesState = stateFilter === 'all' || p.state === stateFilter;
    const matchesCity = cityFilter === 'all' || p.city === cityFilter;
    return matchesSearch && matchesBedrooms && matchesState && matchesCity;
  });

  // Get unique tenant filter options from matches (property mode)
  const uniqueTenantStates = useMemo(() => {
    const states = matches
      .filter(m => m.tenant.state)
      .map(m => m.tenant.state as string);
    return [...new Set(states)].sort();
  }, [matches]);

  const uniqueTenantCities = useMemo(() => {
    const cities = matches
      .filter(m => m.tenant.city)
      .map(m => m.tenant.city as string);
    return [...new Set(cities)].sort();
  }, [matches]);

  const uniqueTenantBedrooms = useMemo(() => {
    const bedrooms: string[] = [];
    matches.forEach(m => {
      if (m.tenant.bedrooms_approved?.length) {
        m.tenant.bedrooms_approved.forEach(bed => {
          if (bed) {
            // Normalize bedroom values to clean format
            let normalized = String(bed).trim();
            
            // Handle Studio/1BR specially
            if (normalized.toLowerCase().includes('studio')) {
              normalized = 'Studio/1BR';
            } else {
              // Extract the number and format as "XBR"
              const numMatch = normalized.match(/(\d+)/);
              if (numMatch) {
                const num = numMatch[1];
                // Handle 5+ bedrooms
                if (Number(num) >= 5) {
                  normalized = '5BR+';
                } else {
                  normalized = `${num}BR`;
                }
              }
            }
            
            bedrooms.push(normalized);
          }
        });
      }
    });
    // Sort numerically (Studio first, then 2BR, 3BR, etc.)
    return [...new Set(bedrooms)].sort((a, b) => {
      if (a.includes('Studio')) return -1;
      if (b.includes('Studio')) return 1;
      const aNum = parseInt(a) || 0;
      const bNum = parseInt(b) || 0;
      return aNum - bNum;
    });
  }, [matches]);

  // Filter matches for "Other Potential Tenants" table (property mode)
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const matchesState = tenantStateFilter === 'all' || match.tenant.state === tenantStateFilter;
      const matchesCity = tenantCityFilter === 'all' || match.tenant.city === tenantCityFilter;
      const matchesBedroom = tenantBedroomFilter === 'all' || 
        match.tenant.bedrooms_approved?.some(bed => {
          let normalized = String(bed).trim();
          if (normalized.toLowerCase().includes('studio')) {
            normalized = 'Studio/1BR';
          } else {
            const numMatch = normalized.match(/(\d+)/);
            if (numMatch) {
              const num = numMatch[1];
              normalized = Number(num) >= 5 ? '5BR+' : `${num}BR`;
            }
          }
          return normalized === tenantBedroomFilter;
        });
      return matchesState && matchesCity && matchesBedroom;
    });
  }, [matches, tenantStateFilter, tenantCityFilter, tenantBedroomFilter]);

  // Mode Selection Stage
  if (stage === 'mode-selection') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Match Studio - Start Matching
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2" onClick={() => handleModeSelect('tenant')}>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Match from Tenant</h3>
                  <p className="text-muted-foreground">
                    Select a tenant and find the perfect properties for them
                  </p>
                  <Button className="w-full" size="lg">
                    Select Tenant
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2" onClick={() => handleModeSelect('property')}>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                    <Home className="w-10 h-10 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold">Match from Property</h3>
                  <p className="text-muted-foreground">
                    Select a property and find the perfect tenants for it
                  </p>
                  <Button className="w-full" variant="secondary" size="lg">
                    Select Property
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Entity Selection Stage
  if (stage === 'entity-selection') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {mode === 'tenant' ? <Users className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                Select {mode === 'tenant' ? 'Tenant' : 'Property'}
              </CardTitle>
              <Button variant="ghost" onClick={handleSwitchMode}>
                Switch Mode
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${mode === 'tenant' ? 'tenants' : 'properties'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Property Filters - Only show when in property mode */}
            {mode === 'property' && (
              <div className="flex flex-wrap gap-2">
                <Select value={bedroomFilter} onValueChange={setBedroomFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Bedrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Beds</SelectItem>
                    {uniqueBedrooms.map(bed => (
                      <SelectItem key={bed} value={bed}>{bed} BR</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {uniqueCities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(bedroomFilter !== 'all' || stateFilter !== 'all' || cityFilter !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setBedroomFilter('all');
                      setStateFilter('all');
                      setCityFilter('all');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-4 max-h-[600px] overflow-y-auto">
              {mode === 'tenant' ? (
                filteredTenants.map((tenant) => {
                  const daysSeeking = tenant.created_at ? calculateDaysOnMarket(tenant.created_at) : 0;
                  const daysColor = daysSeeking <= 14 ? 'text-green-600' : daysSeeking <= 30 ? 'text-yellow-600' : 'text-red-600';
                  const formatBedrooms = (bedrooms: any[] | null): string => {
                    if (!bedrooms || bedrooms.length === 0) return '';
                    const parsed = bedrooms
                      .map(br => typeof br === 'string' ? parseInt(br.replace('BR', ''), 10) : br)
                      .filter(n => !isNaN(n))
                      .sort((a, b) => a - b);
                    if (parsed.length === 0) return '';
                    if (parsed.length === 1) return `${parsed[0]}BR`;
                    return `${Math.min(...parsed)}-${Math.max(...parsed)}BR`;
                  };
                  const moveInWindowMap: Record<string, string> = {
                    'asap': 'ASAP',
                    '30-days': 'Within 30 Days',
                    '1-2-months': '1-2 Months'
                  };
                  
                  return (
                    <Card key={tenant.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEntitySelect(tenant.id)}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <h4 className="font-semibold">{tenant.full_name || 'Unnamed'}</h4>
                            <p className="text-sm text-muted-foreground">{tenant.email}</p>
                            {/* Location */}
                            <p className="text-sm text-muted-foreground">
                              {tenant.city && tenant.state 
                                ? `${tenant.city}, ${tenant.state}`
                                : tenant.city || tenant.state || 'Location N/A'}
                            </p>
                            {/* Row 1: Bedrooms, Budget, Voucher */}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {formatBedrooms(tenant.bedrooms_approved) || `${tenant.desired_bedrooms || 'N/A'} BR`}
                              </Badge>
                              <Badge variant="outline">
                                {tenant.rent_range_min && tenant.rent_range_max
                                  ? `$${tenant.rent_range_min.toLocaleString()}-$${tenant.rent_range_max.toLocaleString()}`
                                  : tenant.max_rent
                                    ? `Up to $${tenant.max_rent.toLocaleString()}`
                                    : tenant.max_budget
                                      ? `Budget: $${tenant.max_budget.toLocaleString()}`
                                      : 'Budget N/A'}
                              </Badge>
                              {tenant.voucher_holder && (
                                <Badge variant="default" className="bg-green-600">
                                  ✓ Voucher{tenant.voucher_amount ? ` $${tenant.voucher_amount.toLocaleString()}` : ''}
                                </Badge>
                              )}
                            </div>
                            {/* Row 2: Assigned Worker & Housing Authority */}
                            <div className="flex flex-wrap gap-2">
                              {tenant.assigned_worker_name && (
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  👤 Assigned: {tenant.assigned_worker_name}
                                </Badge>
                              )}
                              {tenant.housing_authority && (
                                <Badge variant="outline" className="text-xs bg-purple-50">
                                  🏛️ {tenant.housing_authority}
                                </Badge>
                              )}
                            </div>
                            {/* Row 3: Move-in, Days Seeking, Pipeline Stage */}
                            <div className="flex flex-wrap gap-2">
                              {tenant.move_in_window && (
                                <Badge variant="outline" className="text-xs">
                                  Move-in: {moveInWindowMap[tenant.move_in_window] || tenant.move_in_window}
                                </Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${daysColor}`}>
                                {daysSeeking} days seeking
                              </Badge>
                              {tenant.pipeline_stage && (
                                <Badge variant="secondary" className="text-xs">
                                  {tenant.pipeline_stage}
                                </Badge>
                              )}
                            </div>
                            {/* View Full Profile Button */}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTenantForProfile(tenant.id);
                              }}
                            >
                              <UserCircle className="w-4 h-4 mr-1" /> View Full Profile
                            </Button>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground ml-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
              filteredProperties.map((property) => (
                  <Card key={property.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEntitySelect(property.id)}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{property.address}</h4>
                          {property.unit_number && (
                            <p className="text-sm font-medium text-primary">
                              {property.unit_number.toLowerCase().startsWith('unit') 
                                ? property.unit_number 
                                : `Unit ${property.unit_number}`}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {property.city}, {property.state} {property.zipcode}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              ${property.monthly_rent?.toLocaleString() || 'Not Set'}/mo
                            </Badge>
                            <Badge variant="outline">
                              {property.bedrooms || 'N/A'} BR / {property.bathrooms || 'N/A'} BA
                            </Badge>
                            <Badge variant="secondary">{property.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={property.listed_by === 'admin' ? 'default' : 'outline'}>
                              {property.listed_by === 'admin' ? '🔧 Admin Listed' : '🏠 Landlord Listed'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {calculateDaysOnMarket(property.created_at)} days on market
                            </Badge>
                            <Badge variant="default" className="text-xs bg-green-600">
                              ✓ On Market
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tenant Profile Modal */}
        {selectedTenantForProfile && (
          <TenantProfileModal
            isOpen={!!selectedTenantForProfile}
            onClose={() => setSelectedTenantForProfile(null)}
            tenantId={selectedTenantForProfile}
            propertyId=""
          />
        )}
      </div>
    );
  }

  // Matching Stage
  if (stage === 'matching' && currentMatch) {
    const progressPercent = totalMatches > 0 ? ((currentIndex + 1) / totalMatches) * 100 : 0;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Quick Match Studio
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  {remainingMatches} matches remaining
                </Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleChangeSelection}>
                    Change Selection
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSwitchMode}>
                    Switch Mode
                  </Button>
                </div>
              </div>
            </div>
            <Progress value={progressPercent} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Match Display */}
            <div className="grid md:grid-cols-[1fr,auto,1fr] gap-6 items-center">
              {mode === 'tenant' ? (
                <>
                  {/* Tenant Card - LEFT */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <Users className="w-12 h-12 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{currentMatch.tenant.full_name || 'Unnamed'}</h3>
                        {/* Enhanced Tenant Needs Section */}
                        <div className="space-y-2 text-sm text-left px-4">
                          <div className="flex items-center gap-2">
                            <span>💰</span>
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="font-medium">
                              {currentMatch.tenant.max_budget 
                                ? `$${currentMatch.tenant.max_budget.toLocaleString()}`
                                : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🛏️</span>
                            <span className="text-muted-foreground">Needs:</span>
                            <span className="font-medium">
                              {currentMatch.tenant.desired_bedrooms 
                                ? `${currentMatch.tenant.desired_bedrooms} BR`
                                : 'Any'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span className="text-muted-foreground">Move-in:</span>
                            <span className="font-medium">
                              {formatMoveInDate(currentMatch.tenant) !== 'N/A' 
                                ? formatMoveInDate(currentMatch.tenant) 
                                : 'Flexible'}
                            </span>
                          </div>
                        </div>
                        
                        {/* View Full Profile Button */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary"
                          onClick={() => setSelectedTenantForProfile(currentMatch.tenant.id)}
                        >
                          <UserCircle className="h-3 w-3 mr-1" />
                          View Full Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Match Score with Navigation */}
                  <div className="text-center space-y-2">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={previous}
                        disabled={!hasPrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground min-w-[60px]">
                        {currentIndex + 1} of {totalMatches}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={next}
                        disabled={!hasNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className={`text-5xl font-bold ${getScoreColor(currentMatch.score, currentMatch.tier)}`}>
                      {currentMatch.score}%
                    </div>
                    <div className="text-sm text-muted-foreground">Match Score</div>
                    <Badge variant={getTierBadgeVariant(currentMatch.tier)} className={getScoreColor(currentMatch.score, currentMatch.tier)}>
                      {getScoreBadge(currentMatch.score, currentMatch.tier)}
                    </Badge>
                    
                    {/* Drive Time Display */}
                    {currentMatch.driveTime !== null && currentMatch.driveTime !== undefined && (
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-2">
                        <MapPin className="h-3 w-3" />
                        <span>{currentMatch.driveTime} min drive</span>
                      </div>
                    )}
                    
                    {/* Loading indicator for API scores */}
                    {isLoadingApiScores && (
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Loading precise scores...</span>
                      </div>
                    )}
                  </div>

                  {/* Property Card - RIGHT */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        {/* Property Photo with Navigation */}
                        {(() => {
                          const photos = currentMatch.property.unit_photos?.length > 0 
                            ? currentMatch.property.unit_photos 
                            : currentMatch.property.photos;
                          return photos && photos.length > 0 ? (
                            <div className="relative w-full h-32 rounded-lg overflow-hidden mx-auto group">
                              <img 
                                src={photos[propertyPhotoIndex] || photos[0]} 
                                alt={currentMatch.property.address}
                                className="w-full h-full object-cover transition-transform duration-300"
                              />
                              {photos.length > 1 && (
                                <>
                                  {/* Navigation Arrows */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handlePrevPhoto}
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleNextPhoto}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                  {/* Dot Indicators */}
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                                    {photos.slice(0, 5).map((_, index) => (
                                      <div
                                        key={index}
                                        className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                          index === propertyPhotoIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPropertyPhotoIndex(index);
                                        }}
                                      />
                                    ))}
                                    {photos.length > 5 && (
                                      <span className="text-white text-[8px] ml-0.5">+{photos.length - 5}</span>
                                    )}
                                  </div>
                                  {/* Counter Badge */}
                                  <Badge className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
                                    {propertyPhotoIndex + 1} of {photos.length}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                              <Home className="w-12 h-12 text-secondary" />
                            </div>
                          );
                        })()}
                        <h3 className="font-semibold text-lg">{currentMatch.property.address}</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            {currentMatch.property.monthly_rent 
                              ? `$${currentMatch.property.monthly_rent.toLocaleString()}/mo` 
                              : 'Rent: Not Set'}
                          </p>
                          <p className="text-muted-foreground">Unit: {currentMatch.property.bedrooms || 'N/A'} BR / {currentMatch.property.bathrooms || 'N/A'} BA</p>
                          <p className="text-muted-foreground">Available: {currentMatch.property.available_date ? new Date(currentMatch.property.available_date).toLocaleDateString() : 'Now'}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={(e) => handleViewPropertyDetails(currentMatch, e)}
                          disabled={isLoadingPropertyDetails}
                        >
                          {isLoadingPropertyDetails ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Property Card - LEFT (when mode is 'property') */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        {/* Property Photo with Navigation */}
                        {(() => {
                          const photos = currentMatch.property.unit_photos?.length > 0 
                            ? currentMatch.property.unit_photos 
                            : currentMatch.property.photos;
                          return photos && photos.length > 0 ? (
                            <div className="relative w-full h-32 rounded-lg overflow-hidden mx-auto group">
                              <img 
                                src={photos[propertyPhotoIndex] || photos[0]} 
                                alt={currentMatch.property.address}
                                className="w-full h-full object-cover transition-transform duration-300"
                              />
                              {photos.length > 1 && (
                                <>
                                  {/* Navigation Arrows */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handlePrevPhoto}
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleNextPhoto}
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </Button>
                                  {/* Dot Indicators */}
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                                    {photos.slice(0, 5).map((_, index) => (
                                      <div
                                        key={index}
                                        className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                          index === propertyPhotoIndex ? 'bg-white' : 'bg-white/50'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPropertyPhotoIndex(index);
                                        }}
                                      />
                                    ))}
                                    {photos.length > 5 && (
                                      <span className="text-white text-[8px] ml-0.5">+{photos.length - 5}</span>
                                    )}
                                  </div>
                                  {/* Counter Badge */}
                                  <Badge className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5">
                                    {propertyPhotoIndex + 1} of {photos.length}
                                  </Badge>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                              <Home className="w-12 h-12 text-secondary" />
                            </div>
                          );
                        })()}
                        <h3 className="font-semibold text-lg">{currentMatch.property.address}</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            {currentMatch.property.monthly_rent 
                              ? `$${currentMatch.property.monthly_rent.toLocaleString()}/mo` 
                              : 'Rent: Not Set'}
                          </p>
                          <p className="text-muted-foreground">Unit: {currentMatch.property.bedrooms || 'N/A'} BR / {currentMatch.property.bathrooms || 'N/A'} BA</p>
                          <p className="text-muted-foreground">Available: {currentMatch.property.available_date ? new Date(currentMatch.property.available_date).toLocaleDateString() : 'Now'}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1"
                          onClick={(e) => handleViewPropertyDetails(currentMatch, e)}
                          disabled={isLoadingPropertyDetails}
                        >
                          {isLoadingPropertyDetails ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Match Score with Navigation */}
                  <div className="text-center space-y-2">
                    {/* Navigation Controls */}
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={previous}
                        disabled={!hasPrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground min-w-[60px]">
                        {currentIndex + 1} of {totalMatches}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={next}
                        disabled={!hasNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className={`text-5xl font-bold ${getScoreColor(currentMatch.score, currentMatch.tier)}`}>
                      {currentMatch.score}%
                    </div>
                    <div className="text-sm text-muted-foreground">Match Score</div>
                    <Badge variant={getTierBadgeVariant(currentMatch.tier)} className={getScoreColor(currentMatch.score, currentMatch.tier)}>
                      {getScoreBadge(currentMatch.score, currentMatch.tier)}
                    </Badge>
                    
                  </div>

                  {/* Tenant Card - RIGHT (when mode is 'property') */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center space-y-3">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <Users className="w-12 h-12 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{currentMatch.tenant.full_name || 'Unnamed'}</h3>
                        
                        {/* Enhanced Tenant Needs Section */}
                        <div className="space-y-2 text-sm text-left px-4">
                          <div className="flex items-center gap-2">
                            <span>💰</span>
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="font-medium">${currentMatch.tenant.max_budget?.toLocaleString() || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🛏️</span>
                            <span className="text-muted-foreground">Needs:</span>
                            <span className="font-medium">{currentMatch.tenant.desired_bedrooms || 'N/A'} BR</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>📅</span>
                            <span className="text-muted-foreground">Move-in:</span>
                            <span className="font-medium">{formatMoveInDate(currentMatch.tenant)}</span>
                          </div>
                        </div>
                        
                        {/* View Full Profile Button */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary"
                          onClick={() => setSelectedTenantForProfile(currentMatch.tenant.id)}
                        >
                          <UserCircle className="h-3 w-3 mr-1" />
                          View Full Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Match Breakdown */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Match Breakdown</h4>
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Budget</span>
                      <span className="text-sm font-bold">{Math.round(currentMatch.breakdown.budget)}%</span>
                    </div>
                    <Progress value={currentMatch.breakdown.budget} />
                    <p className="text-xs text-muted-foreground">
                      {currentMatch.breakdown.budget >= 100 ? 'Can afford easily' :
                       currentMatch.breakdown.budget >= 90 ? 'Within budget' :
                       currentMatch.breakdown.budget >= 80 ? 'Slightly tight' : 'May struggle'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bedrooms</span>
                      <span className="text-sm font-bold">{Math.round(currentMatch.breakdown.bedrooms)}%</span>
                    </div>
                    <Progress value={currentMatch.breakdown.bedrooms} />
                    <p className="text-xs text-muted-foreground">
                      {currentMatch.breakdown.bedrooms === 100 ? 'Exact match' :
                       currentMatch.breakdown.bedrooms >= 80 ? 'Close match' : 'Different size'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Timing</span>
                      <span className="text-sm font-bold">{Math.round(currentMatch.breakdown.timing)}%</span>
                    </div>
                    <Progress value={currentMatch.breakdown.timing} />
                    <p className="text-xs text-muted-foreground">
                      {currentMatch.breakdown.timing >= 100 ? 'Both ready now' :
                       currentMatch.breakdown.timing >= 80 ? 'Within 30 days' : 'Different timing'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Location</span>
                      <span className="text-sm font-bold">{Math.round(currentMatch.breakdown.location)}%</span>
                    </div>
                    <Progress value={currentMatch.breakdown.location} />
                    <p className="text-xs text-muted-foreground">
                      {currentMatch.breakdown.location >= 95 ? 'Exact area' :
                       currentMatch.breakdown.location >= 80 ? 'Same city' :
                       currentMatch.breakdown.location >= 45 ? 'Same state' : 'No match'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location Preview with Map */}
            <Card className="mb-6">
              <CardHeader className="py-3 cursor-pointer" onClick={() => setShowLocationPreview(!showLocationPreview)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Preview
                  </CardTitle>
                  {showLocationPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {showLocationPreview && (
                <CardContent className="pt-0">
                  {/* Map showing property location */}
                  {currentMatch.property.latitude && currentMatch.property.longitude ? (
                    <div className="h-48 rounded-lg overflow-hidden mb-3">
                      <SimplePropertyMap 
                        properties={[{
                          id: currentMatch.property.id,
                          latitude: currentMatch.property.latitude,
                          longitude: currentMatch.property.longitude,
                          street_address: currentMatch.property.address,
                          city: currentMatch.property.city || undefined,
                          state: currentMatch.property.state || undefined,
                          zipcode: currentMatch.property.zipcode || undefined,
                          monthly_rent: currentMatch.property.monthly_rent || 0,
                          status: currentMatch.property.status || 'available',
                          owner_id: currentMatch.property.owner_id || '',
                        }]}
                        viewMode="map"
                        className="h-48"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-muted rounded-lg flex items-center justify-center mb-3">
                      <p className="text-muted-foreground text-sm">Map not available (missing coordinates)</p>
                    </div>
                  )}
                  
                  {/* Side-by-side location comparison */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1">
                        <Home className="h-3 w-3" /> Property Location
                      </p>
                      <p className="font-medium">
                        {[currentMatch.property.city, currentMatch.property.state].filter(Boolean).join(', ') || 'Not specified'}
                      </p>
                      {currentMatch.property.zipcode && (
                        <p className="text-xs text-muted-foreground">{currentMatch.property.zipcode}</p>
                      )}
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Tenant Wants
                      </p>
                      <p className="font-medium">
                        {[currentMatch.tenant.city, currentMatch.tenant.state].filter(Boolean).join(', ') || 'Any location'}
                      </p>
                      {currentMatch.tenant.zip_code && (
                        <p className="text-xs text-muted-foreground">{currentMatch.tenant.zip_code}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Points Info */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Points Available: +50 for creating this match</span>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="lg" className="gap-2" onClick={handleSkip}>
                <X className="w-4 h-4" />
                Skip
              </Button>
              <Button variant="outline" size="lg" className="gap-2" onClick={handleContactBoth}>
                <MessageSquare className="w-4 h-4" />
                Contact Both
              </Button>
              <Button size="lg" className="gap-2" onClick={handleCreateApplication} disabled={createApplication.isPending}>
                <Zap className="w-4 h-4" />
                Create Application +50
              </Button>
            </div>

            {/* Other Matches in This Area */}
            {matches.length > 1 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {mode === 'tenant' ? (
                      <>
                        <Home className="w-5 h-5" />
                        Other Matches in This Area
                      </>
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        Other Potential Tenants
                      </>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {mode === 'tenant' 
                      ? 'Similar properties based on price, bedrooms, and location'
                      : 'Similar tenants based on budget, needs, and preferences'
                    }
                  </p>
                  
                  {/* Tenant Filters (property mode only) */}
                  {mode === 'property' && (
                    <div className="flex flex-wrap gap-2 pt-3">
                      <Select value={tenantStateFilter} onValueChange={setTenantStateFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All States</SelectItem>
                          {uniqueTenantStates.map(state => (
                            <SelectItem key={state} value={state}>{state}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={tenantCityFilter} onValueChange={setTenantCityFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {uniqueTenantCities.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={tenantBedroomFilter} onValueChange={setTenantBedroomFilter}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Bedrooms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Bedrooms</SelectItem>
                          {uniqueTenantBedrooms.map(bed => (
                            <SelectItem key={bed} value={bed}>{bed}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {(tenantStateFilter !== 'all' || tenantCityFilter !== 'all' || tenantBedroomFilter !== 'all') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setTenantStateFilter('all');
                            setTenantCityFilter('all');
                            setTenantBedroomFilter('all');
                          }}
                        >
                          <X className="w-4 h-4 mr-1" /> Clear
                        </Button>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {mode === 'tenant' ? (
                          <>
                            <TableHead>Property Details</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Rent & Details</TableHead>
                            <TableHead>Market Status</TableHead>
                            <TableHead>Time on Market</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Tenant Details</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Budget & Needs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Move-In</TableHead>
                            <TableHead>Days In System</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">Match Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(mode === 'property' ? filteredMatches : matches)
                        .map((match) => ({ match, originalIndex: matches.indexOf(match) }))
                        .filter(({ originalIndex }) => originalIndex !== currentIndex)
                        .slice(0, showAllMatches ? undefined : 6)
                        .map(({ match, originalIndex }) => {
                        return (
                          <TableRow
                            key={mode === 'tenant' ? match.property.id : match.tenant.id}
                            className={`cursor-pointer transition-colors ${
                              originalIndex === currentIndex 
                                ? 'bg-accent/30 border-l-4 border-primary' 
                                : 'hover:bg-accent/50'
                            }`}
                            onClick={() => jumpTo(originalIndex)}
                          >
                            {mode === 'tenant' ? (
                              // PROPERTY ROW
                              <>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{match.property.address}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {match.property.bedrooms || 'N/A'} BR, {match.property.bathrooms || 'N/A'} BA
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {match.property.owner_id?.substring(0, 8) || 'Unknown'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-semibold text-success">
                                      ${match.property.monthly_rent?.toLocaleString() || 'N/A'}
                                      <span className="text-xs text-muted-foreground">/mo</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={match.property.status === 'available' ? 'success' : 'neutral'}>
                                    {match.property.status === 'available' ? 'Vacant' : match.property.status || 'Unknown'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    {match.property.available_date 
                                      ? new Date(match.property.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                      : 'Now'}
                                  </div>
                                </TableCell>
                              </>
                            ) : (
                              // TENANT ROW
                              <>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{match.tenant.full_name || 'Unnamed'}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {match.tenant.bedrooms_approved?.length 
                                        ? match.tenant.bedrooms_approved.join(', ') + ' approved'
                                        : 'BR not specified'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="text-sm">{match.tenant.email || 'No email'}</div>
                                    {match.tenant.phone && (
                                      <div className="text-sm text-muted-foreground">{match.tenant.phone}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-semibold text-success">
                                      {match.tenant.rent_range_min !== null && match.tenant.rent_range_max !== null
                                        ? `$${match.tenant.rent_range_min.toLocaleString()} - $${match.tenant.rent_range_max.toLocaleString()}`
                                        : match.tenant.max_rent 
                                          ? `Up to $${match.tenant.max_rent.toLocaleString()}`
                                          : 'Budget N/A'}
                                      <span className="text-xs text-muted-foreground">/mo</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {(() => {
                                        const city = match.tenant.city?.trim();
                                        const state = match.tenant.state?.trim();
                                        const zip = match.tenant.zip_code?.trim();
                                        
                                        // Build location like "Springfield, MA 01109"
                                        let location = '';
                                        if (city) location = city;
                                        if (state) location += location ? `, ${state}` : state;
                                        if (zip) location += location ? ` ${zip}` : zip;
                                        
                                        return location || 'Location N/A';
                                      })()}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {match.tenant.housing_status || 'Seeking'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="w-4 h-4" />
                                    {(() => {
                                      const window = match.tenant.move_in_window?.toLowerCase();
                                      if (!window) return 'Flexible';
                                      if (window === 'asap' || window === 'immediate') return 'ASAP';
                                      if (window === '30_days' || window === '30 days' || window === '1_month') return '30 Days';
                                      if (window === '60_days' || window === '1-2 months' || window === '1_2_months') return '1-2 Months';
                                      if (window === '90_days' || window === '2-3 months' || window === '2_3_months') return '2-3 Months';
                                      return match.tenant.move_in_window.replace(/\b\w/g, c => c.toUpperCase());
                                    })()}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm font-medium">
                                    {calculateDaysOnMarket(match.tenant.created_at)} days
                                  </div>
                                </TableCell>
                              </>
                            )}
                            
                            {/* Match Score Column (same for both) */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="text-right">
                                  <div className={`font-bold ${getScoreColor(match.score, match.tier)}`}>
                                    {match.score}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getScoreBadge(match.score, match.tier)}
                                  </div>
                                  {/* Show drive time in table if available */}
                                  {match.driveTime !== null && match.driveTime !== undefined && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <MapPin className="h-2.5 w-2.5" />
                                      {match.driveTime} min
                                    </div>
                                  )}
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </TableCell>
                            
                            {/* Actions Column */}
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleViewPropertyDetails(match, e)}
                                disabled={isLoadingPropertyDetails}
                              >
                                {isLoadingPropertyDetails ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {!showAllMatches && matches.length > 7 && (
                    <div className="text-center mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllMatches(true)}
                        className="gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-sm text-muted-foreground">
                          +{matches.length - 7} more matches available (excluding current)
                        </span>
                      </Button>
                    </div>
                  )}
                  {showAllMatches && matches.length > 6 && (
                    <div className="text-center mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllMatches(false)}
                        className="gap-2"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="text-sm text-muted-foreground">Show less</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </CardContent>
        </Card>

        {/* Property Details Modal - Full Marketplace View */}
        {fullPropertyForDetails && (
          <PropertyDetailsModalEnhanced
            property={fullPropertyForDetails}
            isOpen={isDetailsModalOpen}
            onClose={handleClosePropertyDetails}
            onInterestClick={() => {}}
            isSubmittingInterest={false}
            hasApplied={false}
            hideBuildingUnits={true}
          />
        )}
      </div>
    );
  }

  // No matches found
  if (stage === 'matching' && !currentMatch) {
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-4">
          <p className="text-muted-foreground">No matches found</p>
          <Button onClick={handleChangeSelection}>Change Selection</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Tenant Profile Modal - available on all stages */}
      {selectedTenantForProfile && (
        <TenantProfileModal
          isOpen={!!selectedTenantForProfile}
          onClose={() => setSelectedTenantForProfile(null)}
          tenantId={selectedTenantForProfile}
          propertyId=""
        />
      )}
    </>
  );
};
