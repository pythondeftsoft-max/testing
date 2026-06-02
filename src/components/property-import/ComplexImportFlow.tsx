import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Building2, Search, CheckCircle, ImageIcon, MapPin, Phone, Mail, PawPrint, Car, ArrowLeft, Plus, X, Star, ChevronLeft, ChevronRight, Trash2, Layers, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { complexScraperApi, type ScrapedComplex, type ScrapedFloorPlan } from '@/lib/api/complexScraperApi';
import { supabase } from '@/integrations/supabase/client';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { ActivateListingDialog } from './ActivateListingDialog';

interface ComplexImportFlowProps {
  onComplete?: () => void;
  onBack?: () => void;
  portfolioId?: string;
  onImportComplete?: () => void;
  /** 'admin' shows client picker; 'landlord' hides it and uses portfolioId directly */
  mode?: 'admin' | 'landlord';
}

type Step = 'url-input' | 'scraping' | 'review' | 'importing' | 'done';

export function ComplexImportFlow({ onComplete, onBack, portfolioId, onImportComplete, mode = 'admin' }: ComplexImportFlowProps) {
  const isLandlordMode = mode === 'landlord';
  const [step, setStep] = useState<Step>('url-input');
  const [url, setUrl] = useState('');
  const [complexData, setComplexData] = useState<ScrapedComplex | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{ propertyId: string; unitsCreated: number } | null>(null);

  // Client state (persisted across "Import Another")
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>(portfolioId || '');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  // Contact info (simple text fields, not user accounts)
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Listing destination + 40% confirmation
  // Default: save off-market so the building stages safely; user must opt in to publish now.
  const [listOnMarketplace, setListOnMarketplace] = useState(false);
  const [feeConfirmed, setFeeConfirmed] = useState(false);
  const [landlordSignature, setLandlordSignature] = useState('');
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  // Fetch user ID for portfolios hook
  const [userId, setUserId] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const { portfolios, loading: portfoliosLoading, refetch: refetchPortfolios } = useUserPortfolios(userId);

  // Auto-fill contact info from scraped data
  useEffect(() => {
    if (complexData?.contact_info) {
      setContactName(complexData.contact_info.name || '');
      setContactPhone(complexData.contact_info.phone || '');
      setContactEmail(complexData.contact_info.email || '');
    }
  }, [complexData]);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) { toast.error('Client name is required'); return; }
    setCreatingClient(true);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({
          client_name: newClientName.trim(),
          client_email: newClientEmail.trim() || null,
          manager_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast.success(`Client "${newClientName}" created`);
      setSelectedPortfolioId(data.id);
      setNewClientName('');
      setNewClientEmail('');
      setShowNewClient(false);
      refetchPortfolios();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleScrape = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    setStep('scraping');

    const result = await complexScraperApi.scrapeComplexUrl(url.trim());

    if (!result.success || !result.data) {
      toast.error(result.error || 'Failed to scrape complex');
      setStep('url-input');
      return;
    }

    // Client-side photo dedupe safety net (collapse CDN size/format variants)
    const dedupePhotos = (photos: string[]): string[] => {
      const seen = new Map<string, string>();
      for (const raw of photos || []) {
        if (typeof raw !== 'string') continue;
        const u = raw.trim();
        if (!u || u.startsWith('data:') || u.includes('#')) continue;
        if (/img-loading|img-none|placeholder|no[-_]?image/i.test(u)) continue;
        let key = u;
        try {
          const parsed = new URL(u);
          const host = parsed.hostname.replace(/^www\./, '');
          // apts247 asset id pattern
          const m = parsed.pathname.match(/^\/(\d{3,})\/\d{2,5}x\d{2,5}\.(?:webp|jpe?g|png|avif|gif)$/i);
          if (host.endsWith('apts247.info') && m) {
            key = `apts247:${m[1]}`;
          } else {
            // Strip extension + size suffix + query for general dedupe
            let path = parsed.pathname
              .replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, '')
              .replace(/@[1-3]x(?=\.[a-z]{3,4}$)/i, '')
              .replace(/\.(webp|jpe?g|png|avif|gif)$/i, '');
            key = `${host}${path.toLowerCase()}`;
          }
        } catch { /* keep raw key */ }
        if (!seen.has(key)) seen.set(key, u);
      }
      return Array.from(seen.values());
    };
    result.data.photos = dedupePhotos(result.data.photos);

    setComplexData(result.data);
    // Default selection: skip rows whose (beds, baths, normalized name) was already seen
    const normName = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seenSig = new Set<string>();
    const defaultSelected = new Set<number>();
    result.data.floor_plans.forEach((fp, i) => {
      const sig = `${fp.bedrooms ?? ''}|${fp.bathrooms ?? ''}|${normName(fp.name)}`;
      if (!seenSig.has(sig)) {
        seenSig.add(sig);
        defaultSelected.add(i);
      }
    });
    setSelectedPlans(defaultSelected);
    const counts: Record<number, string> = {};
    result.data.floor_plans.forEach((fp, i) => {
      counts[i] = String(fp.available_units && fp.available_units > 0 ? fp.available_units : 1);
    });
    setUnitCounts(counts);
    setStep('review');
    const dupeCount = result.data.floor_plans.length - defaultSelected.size;
    toast.success(
      `Found ${result.data.floor_plans.length} floor plan${result.data.floor_plans.length === 1 ? '' : 's'}${dupeCount > 0 ? ` (${dupeCount} likely duplicate${dupeCount === 1 ? '' : 's'} unchecked)` : ''} at ${result.data.property_name || 'this complex'}`
    );
  };

  const togglePlan = (index: number) => {
    setSelectedPlans(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (!complexData) return;
    if (selectedPlans.size === complexData.floor_plans.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(complexData.floor_plans.map((_, i) => i)));
    }
  };

  // Photo management
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());
  const handlePhotoError = (url: string) => {
    setFailedPhotos(prev => {
      if (prev.has(url)) return prev;
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    // Also drop from complexData so it's not imported
    setComplexData(prev => prev ? { ...prev, photos: prev.photos.filter(p => p !== url) } : prev);
  };

  const removePhoto = (index: number) => {
    if (!complexData) return;
    setComplexData({
      ...complexData,
      photos: complexData.photos.filter((_, i) => i !== index),
    });
  };

  const setMainPhoto = (index: number) => {
    if (!complexData || index === 0) return;
    const photos = [...complexData.photos];
    const [moved] = photos.splice(index, 1);
    photos.unshift(moved);
    setComplexData({ ...complexData, photos });
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    if (!complexData) return;
    const photos = [...complexData.photos];
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;
    [photos[index], photos[newIndex]] = [photos[newIndex], photos[index]];
    setComplexData({ ...complexData, photos });
  };

  // Manual floor plan management
  const [showAddFloorPlan, setShowAddFloorPlan] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', bedrooms: '', bathrooms: '', sqft: '', rentMin: '', rentMax: '' });
  const [unitCounts, setUnitCounts] = useState<Record<number, string>>({});
  const [editedPlans, setEditedPlans] = useState<ScrapedFloorPlan[]>([]);

  // Sync editedPlans when complexData changes
  useEffect(() => {
    if (complexData?.floor_plans) {
      setEditedPlans(complexData.floor_plans.map(fp => ({ ...fp })));
    }
  }, [complexData?.floor_plans]);

  const addManualFloorPlan = () => {
    if (!complexData || !newPlan.name.trim()) { toast.error('Floor plan name is required'); return; }
    const plan: ScrapedFloorPlan = {
      name: newPlan.name.trim(),
      bedrooms: newPlan.bedrooms ? parseInt(newPlan.bedrooms) : 0,
      bathrooms: newPlan.bathrooms ? parseFloat(newPlan.bathrooms) : 1,
      sqft_min: newPlan.sqft ? parseInt(newPlan.sqft) : null,
      sqft_max: newPlan.sqft ? parseInt(newPlan.sqft) : null,
      rent_min: newPlan.rentMin ? parseInt(newPlan.rentMin) : null,
      rent_max: newPlan.rentMax ? parseInt(newPlan.rentMax) : null,
      availability: null,
      deposit: null,
      available_units: null,
      photos: [],
    };
    const newPlans = [...complexData.floor_plans, plan];
    setComplexData({ ...complexData, floor_plans: newPlans });
    setSelectedPlans(prev => new Set([...prev, newPlans.length - 1]));
    setUnitCounts(prev => ({ ...prev, [newPlans.length - 1]: '1' }));
    setNewPlan({ name: '', bedrooms: '', bathrooms: '', sqft: '', rentMin: '', rentMax: '' });
    setShowAddFloorPlan(false);
    toast.success(`Added "${plan.name}"`);
  };

  // Delete a floor plan row (handles both editedPlans and complexData)
  const deleteFloorPlan = (index: number) => {
    if (!complexData) return;
    const source = editedPlans.length > 0 ? editedPlans : complexData.floor_plans;
    const removed = source[index];
    const newPlans = source.filter((_, i) => i !== index);
    setComplexData({ ...complexData, floor_plans: newPlans });
    setEditedPlans(newPlans.map(fp => ({ ...fp })));
    // Re-index selectedPlans and unitCounts
    setSelectedPlans(prev => {
      const next = new Set<number>();
      prev.forEach(idx => {
        if (idx === index) return;
        next.add(idx > index ? idx - 1 : idx);
      });
      return next;
    });
    setUnitCounts(prev => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const idx = parseInt(k);
        if (idx === index) return;
        next[idx > index ? idx - 1 : idx] = v;
      });
      return next;
    });
    toast.success(`Removed "${removed?.name || 'floor plan'}"`);
  };

  // Auto-merge near-duplicates: same (beds, baths) + similar normalized name.
  // Sums unit counts, widens rent range, keeps the longest name.
  const autoMergeDuplicates = () => {
    if (!complexData) return;
    const source = editedPlans.length > 0 ? editedPlans : complexData.floor_plans;
    if (source.length < 2) return;
    const normName = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const groups = new Map<string, number[]>();
    source.forEach((fp, i) => {
      const sig = `${fp.bedrooms ?? ''}|${fp.bathrooms ?? ''}|${normName(fp.name)}`;
      const arr = groups.get(sig) || [];
      arr.push(i);
      groups.set(sig, arr);
    });
    const merged: ScrapedFloorPlan[] = [];
    const newCounts: Record<number, string> = {};
    let mergedAny = 0;
    let outIdx = 0;
    groups.forEach(indices => {
      const plans = indices.map(i => source[i]);
      if (plans.length === 1) {
        merged.push(plans[0]);
        newCounts[outIdx] = unitCounts[indices[0]] ?? '1';
      } else {
        mergedAny += plans.length - 1;
        const longestName = plans.reduce((a, b) => ((a.name?.length || 0) >= (b.name?.length || 0) ? a : b)).name;
        const rentMins = plans.map(p => p.rent_min).filter((v): v is number => typeof v === 'number');
        const rentMaxs = plans.map(p => p.rent_max).filter((v): v is number => typeof v === 'number');
        const sqftMins = plans.map(p => p.sqft_min).filter((v): v is number => typeof v === 'number');
        const sqftMaxs = plans.map(p => p.sqft_max).filter((v): v is number => typeof v === 'number');
        const deposits = plans.map(p => p.deposit).filter((v): v is number => typeof v === 'number');
        merged.push({
          ...plans[0],
          name: longestName,
          rent_min: rentMins.length ? Math.min(...rentMins) : plans[0].rent_min,
          rent_max: rentMaxs.length ? Math.max(...rentMaxs) : plans[0].rent_max,
          sqft_min: sqftMins.length ? Math.min(...sqftMins) : plans[0].sqft_min,
          sqft_max: sqftMaxs.length ? Math.max(...sqftMaxs) : plans[0].sqft_max,
          deposit: deposits.length ? Math.max(...deposits) : plans[0].deposit,
        });
        const summed = indices.reduce((sum, i) => sum + (parseInt(unitCounts[i]) || 1), 0);
        newCounts[outIdx] = String(summed);
      }
      outIdx++;
    });
    if (mergedAny === 0) {
      toast.info('No duplicates to merge');
      return;
    }
    setComplexData({ ...complexData, floor_plans: merged });
    setEditedPlans(merged.map(fp => ({ ...fp })));
    setSelectedPlans(new Set(merged.map((_, i) => i)));
    setUnitCounts(newCounts);
    toast.success(`Merged ${mergedAny} duplicate${mergedAny === 1 ? '' : 's'}`);
  };

  const handleImport = async () => {
    if (!complexData || selectedPlans.size === 0) return;
    if (!isLandlordMode && !selectedPortfolioId) {
      toast.error('Please select or create a client before importing');
      return;
    }

    // Activation gate: only landlords listing live must sign the 40% agreement.
    // Admins never sign during import; off-market never signs.
    if (listOnMarketplace && isLandlordMode) {
      if (!feeConfirmed) {
        toast.error('Please confirm the placement fee terms before listing');
        return;
      }
      if (landlordSignature.trim().length < 2) {
        toast.error('Please type your full legal name to sign');
        return;
      }
    }

    setStep('importing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        setStep('review');
        return;
      }

      let ownerId = session.user.id;

      const addr = complexData.address;
      const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

      // Compute property-level monthly_rent from highest rent_max across selected plans
      const plansForRent = editedPlans.length > 0 ? editedPlans : complexData.floor_plans;
      const rentValues = Array.from(selectedPlans)
        .map(i => plansForRent[i]?.rent_max ?? plansForRent[i]?.rent_min)
        .filter((v): v is number => v != null && v > 0);
      const propertyRent = rentValues.length > 0 ? Math.max(...rentValues) : null;

      const goingLive = listOnMarketplace; // captured for clarity below

      // Create the property
      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert({
          address: fullAddress || complexData.property_name || url,
          street_address: addr.street || null,
          city: addr.city || null,
          state: addr.state || null,
          zipcode: addr.zip || null,
          property_name: complexData.property_name || null,
          property_type: 'apartment' as any,
          description: complexData.description || null,
          photos: complexData.photos.slice(0, 100),
          amenities: complexData.community_amenities || [],
          community_amenities: complexData.community_amenities || [],
          year_built: complexData.year_built || null,
          stories: complexData.stories || null,
          unit_count: Array.from(selectedPlans).reduce((sum, i) => sum + (parseInt(unitCounts[i]) || 1), 0),
          monthly_rent: propertyRent,
          on_market: goingLive,
          listing_status: goingLive ? 'active' : 'pending_activation',
          activated_at: goingLive ? new Date().toISOString() : null,
          activated_by: goingLive ? session.user.id : null,
          status: 'available',
          default_tenant_type: 'market_rate',
          owner_id: ownerId,
          admin_listed: !isLandlordMode,
          pet_friendly: complexData.pet_policy?.allowed ?? null,
          pet_deposit: complexData.pet_policy?.deposit ?? null,
          pet_fee_monthly: complexData.pet_policy?.monthly_fee ?? null,
          utilities_included: complexData.utilities_included || [],
          parking_available: !!complexData.parking?.type,
          walk_score: complexData.walk_score || null,
          transit_score: complexData.transit_score || null,
          country: 'US',
          import_source: 'complex_scraper',
          portfolio_id: selectedPortfolioId || null,
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
        })
        .select('id')
        .single();

      if (propError || !property) {
        console.error('Error creating property:', propError);
        toast.error('Failed to create property');
        setStep('review');
        return;
      }

      // Create units for selected floor plans, multiplied by count
      const unitInserts: any[] = [];
      const plansToImport = editedPlans.length > 0 ? editedPlans : complexData.floor_plans;
      plansToImport.forEach((fp, i) => {
        if (!selectedPlans.has(i)) return;
        const count = parseInt(unitCounts[i]) || 1;
        for (let n = 1; n <= count; n++) {
          const unitLabel = count > 1 ? `${fp.name || `${fp.bedrooms}BR`}-${n}` : (fp.name || `Unit ${fp.bedrooms}BR`);
          unitInserts.push({
            property_id: property.id,
            unit_number: unitLabel,
            unit_name: fp.name || null,
            bedrooms: fp.bedrooms ?? null,
            bathrooms: fp.bathrooms ?? null,
            square_feet: fp.sqft_min || fp.sqft_max || null,
            monthly_rent: fp.rent_max ?? fp.rent_min ?? null,
            security_deposit_amount: fp.deposit || null,
            photos: fp.photos?.length ? fp.photos : null,
            on_market: goingLive,
            listing_status: goingLive ? 'active' : 'pending_activation',
            status: 'vacant',
            availability_date: null,
            unit_amenities: complexData.unit_amenities || [],
          });
        }
      });

      const { error: unitsError } = await supabase
        .from('property_units')
        .insert(unitInserts);

      if (unitsError) {
        console.error('Error creating units:', unitsError);
        toast.error('Property created but some units failed to import');
      }

      // Audit row only when a landlord signs to go live.
      // Admins listing live skip the audit row (admin authority is implicit).
      if (goingLive && isLandlordMode) {
        const { error: actErr } = await supabase.from('listing_activations').insert({
          property_id: property.id,
          signed_by: session.user.id,
          signer_role: 'landlord',
          signer_name: landlordSignature.trim(),
          placement_fee_pct: 40,
          agreement_text: `LISTING & PLACEMENT AGREEMENT — Landlord agrees to OpenKey 40% placement fee on first month's rent for any tenant placed via the platform within 90 days. Non-exclusive listing. Fair-housing compliant. Electronic signature provided by typing full legal name.`,
          user_agent: navigator.userAgent,
        });
        if (actErr) {
          console.warn('[ComplexImport] activation audit insert failed:', actErr);
          // Non-fatal: property is already on-market.
        }
      }

      setImportResult({ propertyId: property.id, unitsCreated: unitInserts.length });
      setStep('done');
      toast.success(
        goingLive
          ? `Imported & listed ${complexData.property_name} (${unitInserts.length} units)`
          : `Saved ${complexData.property_name} off-market (${unitInserts.length} units) — ready to activate`,
      );
      onImportComplete?.();


      // Fire-and-forget: enqueue match computation only when units are live.
      // Off-market units are excluded by the matcher anyway, so skip the enqueue.
      if (goingLive) {
        void (async () => {
          try {
            await supabase.from('match_compute_queue').upsert(
              {
                entity_type: 'property',
                entity_id: property.id,
                requested_at: new Date().toISOString(),
                processing_started_at: null,
                attempts: 0,
                last_error: null,
              },
              { onConflict: 'entity_type,entity_id' }
            );
            console.log(`[ComplexImport] Match compute queued for property:${property.id}`);
          } catch (e) {
            // Swallow — must NEVER bubble to the runtime error overlay
            console.warn('[ComplexImport] Match compute enqueue failed (non-blocking):', e);
          }
        })();
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed');
      setStep('review');
    }
  };

  // ── URL Input Step ──
  if (step === 'url-input') {
    return (
      <div className="space-y-6">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <div className="text-center space-y-2">
          <Building2 className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">Import Apartment Complex</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Paste an Apartments.com, Zillow, or similar complex URL to extract all floor plans and unit details automatically.
          </p>
        </div>
        <div className="flex gap-2 max-w-xl mx-auto">
          <Input
            type="url"
            placeholder="https://www.apartments.com/vi-collina-austin-tx/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScrape()}
          />
          <Button onClick={handleScrape} className="gap-2 whitespace-nowrap">
            <Search className="h-4 w-4" /> Scrape Complex
          </Button>
        </div>
      </div>
    );
  }

  // ── Scraping Step ──
  if (step === 'scraping') {
    return (
      <div className="text-center py-12 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <h3 className="text-lg font-semibold">Scraping Complex...</h3>
        <p className="text-sm text-muted-foreground">Extracting floor plans, photos, amenities, and pricing. This may take 30-60 seconds.</p>
      </div>
    );
  }

  // ── Review Step ──
  if (step === 'review' && complexData) {
    const addr = complexData.address;
    const fullAddress = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ');

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setStep('url-input')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Try Different URL
        </Button>

        {/* Property Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {complexData.property_name || 'Apartment Complex'}
            </CardTitle>
            {fullAddress && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {fullAddress}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {complexData.year_built && (
                <div><span className="text-muted-foreground">Built:</span> {complexData.year_built}</div>
              )}
              {complexData.total_units && (
                <div><span className="text-muted-foreground">Total Units:</span> {complexData.total_units}</div>
              )}
              {complexData.stories && (
                <div><span className="text-muted-foreground">Stories:</span> {complexData.stories}</div>
              )}
              {complexData.photos.length > 0 && (
                <div className="flex items-center gap-1"><ImageIcon className="h-3 w-3 text-muted-foreground" /> {complexData.photos.length} photos</div>
              )}
            </div>
            {complexData.pages_scraped && complexData.pages_scraped.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Smart scrape pulled {complexData.pages_scraped.length} page{complexData.pages_scraped.length === 1 ? '' : 's'}: {complexData.pages_scraped.join(', ')}
                {complexData.photo_stats && complexData.photo_stats.raw > complexData.photo_stats.unique && (
                  <> · de-duped {complexData.photo_stats.raw} → {complexData.photo_stats.unique} photos</>
                )}
              </p>
            )}

            {/* Photos preview - editable with reordering */}
            {complexData.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Photos <span className="text-muted-foreground font-normal">(arrows to reorder, ★ main, ✕ remove)</span></p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {complexData.photos.map((photo, i) => (
                    <div key={i} className="relative flex-shrink-0 group">
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        onError={() => handlePhotoError(photo)}
                        className={`h-20 w-32 object-cover rounded-md border bg-muted ${i === 0 ? 'ring-2 ring-primary' : ''}`}
                      />
                      {i === 0 && (
                        <Badge className="absolute bottom-1 left-1 text-[10px] px-1 py-0">Main</Badge>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Set as main */}
                      {i !== 0 && (
                        <button
                          onClick={() => setMainPhoto(i)}
                          className="absolute top-1 left-1 bg-background/80 text-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Set as main photo"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      {/* Left/Right arrows for reordering */}
                      <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <button
                            onClick={() => movePhoto(i, 'left')}
                            className="bg-background/80 text-foreground rounded p-0.5"
                            title="Move left"
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </button>
                        )}
                        {i < complexData.photos.length - 1 && (
                          <button
                            onClick={() => movePhoto(i, 'right')}
                            className="bg-background/80 text-foreground rounded p-0.5"
                            title="Move right"
                          >
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {complexData.community_amenities.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Community Amenities</p>
                <div className="flex flex-wrap gap-1">
                  {complexData.community_amenities.map((a, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quick info row */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              {complexData.pet_policy?.allowed !== null && (
                <span className="flex items-center gap-1"><PawPrint className="h-3 w-3" /> {complexData.pet_policy.allowed ? 'Pets OK' : 'No Pets'}</span>
              )}
              {complexData.parking?.type && (
                <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {complexData.parking.type}{complexData.parking.cost ? ` ($${complexData.parking.cost}/mo)` : ''}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client & Contact Assignment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{isLandlordMode ? 'Property Contact' : 'Assign Client & Contact'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isLandlordMode && (
            <div className="space-y-2">
              {/* Client/Portfolio Selector */}
              <Label>Client / Portfolio <span className="text-destructive">*</span></Label>
              {!showNewClient ? (
                <div className="flex gap-2">
                  <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={portfoliosLoading ? 'Loading clients...' : 'Select a client'} />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client_name} {p.property_count ? `(${p.property_count} properties)` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setShowNewClient(true)} title="Add new client">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">New Client</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Client name *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                    <Input placeholder="Email (optional)" type="email" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateClient} disabled={creatingClient} className="gap-1">
                      {creatingClient ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Create Client
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewClient(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Property Contact Info (simple text fields) */}
            <div className="space-y-2">
              <Label>Property Contact <span className="text-muted-foreground text-xs font-normal">(auto-filled from listing)</span></Label>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input
                    placeholder="Contact name"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Listing Status — single On/Off toggle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Listing Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setListOnMarketplace(false);
                  setFeeConfirmed(false);
                  setLandlordSignature('');
                }}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors ${
                  !listOnMarketplace
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <EyeOff className="h-4 w-4" /> Off Market
              </button>
              <button
                type="button"
                onClick={() => setListOnMarketplace(true)}
                className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-colors ${
                  listOnMarketplace
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <Eye className="h-4 w-4" /> On Market
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {listOnMarketplace
                ? 'Units publish immediately and start matching with tenants.'
                : isLandlordMode
                  ? 'All info is saved but units stay hidden from renters. You can activate (and sign the 40% agreement) later from the property page.'
                  : 'All info is saved but units stay hidden from renters until activated.'}
            </p>

            {/* Landlord-only: 40% sign panel when listing live */}
            {listOnMarketplace && isLandlordMode && (
              <div className="rounded-md border bg-muted/20 p-3 space-y-3">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Placement Agreement (40%)
                  </Label>
                  <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed rounded border bg-background p-2">
                    {`By activating this listing, I agree to OpenKey's placement fee of 40% of the first full month's rent for any tenant introduced through OpenKey that signs a lease at this property within 90 days. Non-exclusive listing. I will comply with all fair-housing laws. I may deactivate at any time; the placement fee remains owed for tenants already introduced. Typing my full legal name below is my electronic signature.`}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="landlord-sig">
                    Type your full legal name to sign <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="landlord-sig"
                    placeholder="e.g. Jane Doe"
                    value={landlordSignature}
                    onChange={(e) => setLandlordSignature(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={feeConfirmed}
                    onCheckedChange={(v) => setFeeConfirmed(!!v)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree to the agreement above and consent to use my typed name as my electronic signature.
                  </span>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floor Plans Table */}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">
                  Floor Plans ({complexData.floor_plans.length})
                </CardTitle>
                {complexData.pages_scraped && complexData.pages_scraped.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Scraped from: {complexData.pages_scraped.join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedPlans.size} selected</Badge>
                <Button variant="ghost" size="sm" onClick={autoMergeDuplicates} className="gap-1">
                  <Layers className="h-3.5 w-3.5" /> Merge duplicates
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedPlans.size === complexData.floor_plans.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {complexData.floor_plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No floor plans extracted. The page structure may not be supported, or the content may be behind a login.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Floor Plan</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Baths</TableHead>
                    <TableHead>Sqft</TableHead>
                    <TableHead>Rent Range</TableHead>
                    
                    <TableHead>Deposit</TableHead>
                    <TableHead className="w-20">Count</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(editedPlans.length > 0 ? editedPlans : complexData.floor_plans).map((fp, i) => {
                    const updatePlan = (field: keyof ScrapedFloorPlan, value: any) => {
                      setEditedPlans(prev => {
                        const updated = [...prev];
                        updated[i] = { ...updated[i], [field]: value };
                        return updated;
                      });
                    };
                    return (
                    <TableRow key={i} className={selectedPlans.has(i) ? '' : 'opacity-50'}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPlans.has(i)}
                          onCheckedChange={() => togglePlan(i)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 w-28 text-sm"
                          value={fp.name || ''}
                          onChange={e => updatePlan('name', e.target.value)}
                          placeholder="Plan name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 w-14 text-center text-sm"
                          value={fp.bedrooms ?? ''}
                          onChange={e => updatePlan('bedrooms', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.5"
                          className="h-7 w-14 text-center text-sm"
                          value={fp.bathrooms ?? ''}
                          onChange={e => updatePlan('bathrooms', e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 w-20 text-sm"
                          value={fp.sqft_min ?? ''}
                          onChange={e => {
                            const v = e.target.value ? parseInt(e.target.value) : null;
                            setEditedPlans(prev => {
                              const updated = [...prev];
                              updated[i] = { ...updated[i], sqft_min: v, sqft_max: v };
                              return updated;
                            });
                          }}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-7 w-20 text-sm"
                            value={fp.rent_min ?? ''}
                            onChange={e => updatePlan('rent_min', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Min"
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <Input
                            type="number"
                            className="h-7 w-20 text-sm"
                            value={fp.rent_max ?? ''}
                            onChange={e => updatePlan('rent_max', e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Max"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-7 w-20 text-sm"
                          value={fp.deposit ?? ''}
                          onChange={e => updatePlan('deposit', e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          className="h-7 w-16 text-center"
                          value={unitCounts[i] ?? '1'}
                          onChange={e => setUnitCounts(prev => ({ ...prev, [i]: e.target.value }))}
                          onBlur={e => {
                            const val = parseInt(e.target.value);
                            if (!e.target.value || isNaN(val) || val < 1) {
                              setUnitCounts(prev => ({ ...prev, [i]: '1' }));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFloorPlan(i)}
                          title="Remove floor plan"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Add Floor Plan manually */}
            <div className="mt-3">
              {!showAddFloorPlan ? (
                <Button variant="outline" size="sm" onClick={() => setShowAddFloorPlan(true)} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Floor Plan
                </Button>
              ) : (
                <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <p className="text-sm font-medium">New Floor Plan</p>
                  <div className="grid grid-cols-6 gap-2">
                    <Input placeholder="Name (e.g. A1)" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} />
                    <Input placeholder="Beds" type="number" value={newPlan.bedrooms} onChange={e => setNewPlan({ ...newPlan, bedrooms: e.target.value })} />
                    <Input placeholder="Baths" type="number" step="0.5" value={newPlan.bathrooms} onChange={e => setNewPlan({ ...newPlan, bathrooms: e.target.value })} />
                    <Input placeholder="Sqft" type="number" value={newPlan.sqft} onChange={e => setNewPlan({ ...newPlan, sqft: e.target.value })} />
                    <Input placeholder="Rent Min" type="number" value={newPlan.rentMin} onChange={e => setNewPlan({ ...newPlan, rentMin: e.target.value })} />
                    <Input placeholder="Rent Max" type="number" value={newPlan.rentMax} onChange={e => setNewPlan({ ...newPlan, rentMax: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addManualFloorPlan}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddFloorPlan(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Import Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStep('url-input')}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={selectedPlans.size === 0 || (!isLandlordMode && !selectedPortfolioId)}
            className="gap-2"
          >
            {listOnMarketplace ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {(() => {
              const n = Array.from(selectedPlans).reduce((sum, i) => sum + (parseInt(unitCounts[i]) || 1), 0);
              const noun = `${n} Unit${n !== 1 ? 's' : ''}`;
              return listOnMarketplace ? `List ${noun} Live` : `Save ${noun} Off-Market`;
            })()}
          </Button>
        </div>
      </div>
    );
  }

  // ── Importing Step ──
  if (step === 'importing') {
    return (
      <div className="text-center py-12 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
        <h3 className="text-lg font-semibold">Importing Property & Units...</h3>
        <p className="text-sm text-muted-foreground">Creating property record and {selectedPlans.size} unit(s).</p>
      </div>
    );
  }

  // ── Done Step ──
  if (step === 'done' && importResult) {
    const clientName = portfolios.find(p => p.id === selectedPortfolioId)?.client_name;
    const wasListed = listOnMarketplace;

    return (
      <>
        <div className="text-center py-12 space-y-4">
          <CheckCircle className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold">
            {wasListed ? 'Import Complete & Listed!' : 'Saved Off-Market'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {wasListed ? 'Created' : 'Saved'}{' '}
            <strong>{complexData?.property_name || 'property'}</strong> with{' '}
            {importResult.unitsCreated} unit(s).
            {!wasListed && ' Units are hidden from renters until you activate.'}
          </p>
          {(clientName || contactName) && (
            <div className="flex justify-center gap-3 text-xs text-muted-foreground">
              {clientName && <Badge variant="outline">Client: {clientName}</Badge>}
              {contactName && <Badge variant="outline">Contact: {contactName}</Badge>}
            </div>
          )}
          <div className="flex justify-center gap-3 pt-4 flex-wrap">
            {!wasListed && (
              <Button onClick={() => setShowActivateDialog(true)} className="gap-2">
                <Eye className="h-4 w-4" /> Activate Listing
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setStep('url-input');
              setUrl('');
              setComplexData(null);
              setSelectedPlans(new Set());
              setImportResult(null);
              setContactName('');
              setContactPhone('');
              setContactEmail('');
              setListOnMarketplace(false);
              setFeeConfirmed(false);
              setLandlordSignature('');
            }}>
              Import Another (Same Client)
            </Button>
            {onComplete && (
              <Button variant="ghost" onClick={onComplete}>Done</Button>
            )}
          </div>
        </div>

        <ActivateListingDialog
          propertyId={importResult.propertyId}
          mode={isLandlordMode ? 'landlord' : 'admin'}
          open={showActivateDialog}
          onOpenChange={setShowActivateDialog}
          onActivated={() => onImportComplete?.()}
        />
      </>
    );
  }

  return null;
}
