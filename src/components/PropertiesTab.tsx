
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Plus, 
  Upload,
  Building, 
  Home,
  Building2,
  MapPin,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  Link2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PropertyCard from './PropertyCard';
import { CommercialPropertyCard } from './commercial/CommercialPropertyCard';
import PropertyDetailsModal from './PropertyDetailsModal';
import { AddPropertyModal } from './AddPropertyModal';
import { MultiStepEditPropertyForm } from './MultiStepEditPropertyForm';
import PermissionGuard from '@/components/permissions/PermissionGuard';
import { PropertyCardActions } from './PropertyCardActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComplexImportFlow } from './property-import/ComplexImportFlow';

interface PropertiesTabProps {
  portfolioId: string;
  userId: string;
}

type PropertyFilter = 'all' | 'residential' | 'commercial' | 'office' | 'retail' | 'warehouse' | 'industrial' | 'hospitality' | 'specialty';

interface PropertyData {
  id: string;
  address: string;
  city?: string;
  state?: string;
  monthly_rent?: number;
  commercial_type?: 'office' | 'retail' | 'warehouse' | 'industrial' | 'hospitality' | 'specialty' | 'mixed_use';
  source_badge?: 'manual' | 'parsed' | 'integration';
  property_type?: 'residential' | 'commercial';
  property_applications?: any[];
  // Commercial properties fields that might be missing
  asset_tags?: string[];
  is_multi_tenant?: boolean;
  [key: string]: any;
}

interface LandlordPropertyCardProps {
  property: PropertyData;
  onView: (property: PropertyData) => void;
  onEdit: (property: PropertyData) => void;
  onDelete: (propertyId: string) => void;
  portfolioId: string;
  currentUserId: string;
}

const LandlordPropertyCard = ({ property, onView, onEdit, onDelete, portfolioId, currentUserId }: LandlordPropertyCardProps) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{property.address}</CardTitle>
            {property.city && property.state && (
              <p className="text-sm text-muted-foreground mt-1">
                {property.city}, {property.state}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {property.source_badge && (
              <Badge variant="secondary">{property.source_badge}</Badge>
            )}
            <Badge variant="outline">
              {property.property_type || 'residential'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">
              ${property.monthly_rent?.toLocaleString() || 'N/A'}/month
            </span>
            {property.commercial_type && (
              <Badge variant="outline">{property.commercial_type}</Badge>
            )}
          </div>
          
          <PropertyCardActions
            property={property}
            onEdit={() => onEdit(property)}
            onDelete={() => onDelete(property.id)}
            onViewDetails={() => onView(property)}
            currentUserId={currentUserId}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const PropertiesTab = ({ portfolioId, userId }: PropertiesTabProps) => {
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('all');
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showComplexImport, setShowComplexImport] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmAddress, setDeleteConfirmAddress] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [preserveScroll, setPreserveScroll] = useState(false);

  useEffect(() => {
    console.log('🏠 PropertiesTab: portfolioId changed to:', portfolioId);
    fetchProperties(false); // Initial load, show loading state
  }, [portfolioId]);

  const fetchProperties = async (backgroundRefetch = false) => {
    try {
      // Only show loading state on initial fetch, not on background refetches
      if (!backgroundRefetch) {
        setLoading(true);
      }
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          property_applications(
            id,
            status,
            tenant_id,
            profiles(first_name, last_name)
          )
        `)
        .eq('portfolio_id', portfolioId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include commercial property information
      const transformedProperties: PropertyData[] = (data || []).map((property: any) => ({
        ...property,
        property_type: property.commercial_type ? 'commercial' : 'residential',
        source_badge: property.source_badge || 'manual',
        asset_tags: property.asset_tags || [],
        is_multi_tenant: property.is_multi_tenant || false,
        // Ensure tenant management fields are available
        status: property.status || 'available',
        occupancy_status: property.occupancy_status || 'vacant',
        tenant_id: property.tenant_id || null,
        default_tenant_type: property.default_tenant_type || 'voucher'
      }));

      setProperties(transformedProperties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: "Error",
        description: "Failed to fetch properties",
        variant: "destructive"
      });
    } finally {
      // Only clear loading state if we set it
      if (!backgroundRefetch) {
        setLoading(false);
      }
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    // Find the property to get its address for confirmation dialog
    const property = properties.find(p => p.id === propertyId);
    setDeleteConfirmId(propertyId);
    setDeleteConfirmAddress(property?.address || 'this property');
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    console.log('🗑️ DELETE STARTED:', deleteConfirmId);
    console.log('🌐 URL BEFORE DELETE:', window.location.href);
    console.log('📑 TAB BEFORE DELETE:', new URLSearchParams(window.location.search).get('tab'));

    try {
      // Save current scroll position
      const scrollPosition = window.scrollY;
      console.log('📍 Scroll position saved:', scrollPosition);
      setPreserveScroll(true);
      
      // Optimistically update UI - remove property immediately
      console.log('⚡ Optimistic update: removing from UI');
      setProperties(prevProperties => 
        prevProperties.filter(p => p.id !== deleteConfirmId)
      );

      // Restore scroll position after React re-renders
      requestAnimationFrame(() => {
        console.log('📜 Restoring scroll to:', scrollPosition);
        window.scrollTo(0, scrollPosition);
        setPreserveScroll(false);
      });

      // Then perform the database update
      console.log('💾 Updating database...');
      const { error } = await supabase
        .from('properties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteConfirmId);

      if (error) {
        console.error('❌ Database update failed:', error);
        throw error;
      }

      console.log('✅ Database updated successfully');

      // Only invalidate deleted properties cache for trash modal
      // PropertiesTab uses optimistic updates, so no need to invalidate main caches
      console.log('♻️ Invalidating deleted-properties cache...');
      queryClient.invalidateQueries({ queryKey: ['deleted-properties'] });
      console.log('✅ Cache invalidation complete');

      toast({
        title: "Success",
        description: "Property moved to trash"
      });

      setDeleteConfirmId(null);
      setDeleteConfirmAddress('');
      
      console.log('🏁 DELETE COMPLETED SUCCESSFULLY');
      console.log('🌐 URL AFTER DELETE:', window.location.href);
      console.log('📑 TAB AFTER DELETE:', new URLSearchParams(window.location.search).get('tab'));
    } catch (error) {
      console.error('💥 DELETE FAILED:', error);
      
      // If deletion fails, refetch to restore UI to accurate state
      fetchProperties(false);
      
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive"
      });
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = !searchTerm || 
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.state?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      propertyFilter === 'all' ||
      (propertyFilter === 'residential' && property.property_type === 'residential') ||
      (propertyFilter === 'commercial' && property.property_type === 'commercial') ||
      (['office', 'retail', 'warehouse', 'industrial', 'hospitality', 'specialty'].includes(propertyFilter) && 
       property.commercial_type === propertyFilter);

    return matchesSearch && matchesFilter;
  });

  const getPropertyCountsByType = () => {
    const counts = {
      all: properties.length,
      residential: properties.filter(p => p.property_type === 'residential').length,
      commercial: properties.filter(p => p.property_type === 'commercial').length,
      office: properties.filter(p => p.commercial_type === 'office').length,
      retail: properties.filter(p => p.commercial_type === 'retail').length,
      warehouse: properties.filter(p => p.commercial_type === 'warehouse').length,
      industrial: properties.filter(p => p.commercial_type === 'industrial').length,
      hospitality: properties.filter(p => p.commercial_type === 'hospitality').length,
      specialty: properties.filter(p => p.commercial_type === 'specialty').length,
    };
    return counts;
  };

  const counts = getPropertyCountsByType();

  return (
    <div className="space-y-6">
      {/* Header - Always rendered so tour targets exist */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building className="w-6 h-6" />
            Properties ({loading ? '...' : properties.length})
          </h2>
          <p className="text-gray-600">
            Manage your real estate portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/property-import?portfolioId=${portfolioId}`)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <PermissionGuard 
            object="portfolio.properties" 
            action="create" 
            scope="portfolio" 
            portfolioId={portfolioId}
            fallback={
              <Button disabled className="flex items-center gap-2 opacity-50" data-tour="add-property-btn">
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
            }
          >
            <div className="flex items-stretch" data-tour="add-property-btn">
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-r-none">
                <Plus className="w-4 h-4" />
                Add Property
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-l-none border-l border-primary-foreground/20 px-2" aria-label="More add options">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setShowAddModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span>Add single property</span>
                      <span className="text-xs text-muted-foreground">Manually enter property details</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowComplexImport(true)} className="gap-2">
                    <Link2 className="w-4 h-4" />
                    <div className="flex flex-col">
                      <span>Import apartment complex</span>
                      <span className="text-xs text-muted-foreground">Paste a listing URL to auto-import all units</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <Card data-tour="property-on-market-info">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search properties by address, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={propertyFilter} onValueChange={(value) => setPropertyFilter(value as PropertyFilter)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties ({counts.all})</SelectItem>
                <SelectItem value="residential">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Residential ({counts.residential})
                  </div>
                </SelectItem>
                <SelectItem value="commercial">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Commercial ({counts.commercial})
                  </div>
                </SelectItem>
                {counts.office > 0 && <SelectItem value="office">Office ({counts.office})</SelectItem>}
                {counts.retail > 0 && <SelectItem value="retail">Retail ({counts.retail})</SelectItem>}
                {counts.warehouse > 0 && <SelectItem value="warehouse">Warehouse ({counts.warehouse})</SelectItem>}
                {counts.industrial > 0 && <SelectItem value="industrial">Industrial ({counts.industrial})</SelectItem>}
                {counts.hospitality > 0 && <SelectItem value="hospitality">Hospitality ({counts.hospitality})</SelectItem>}
                {counts.specialty > 0 && <SelectItem value="specialty">Specialty ({counts.specialty})</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          
          {/* Quick filter badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge 
              variant={propertyFilter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPropertyFilter('all')}
            >
              All ({counts.all})
            </Badge>
            <Badge 
              variant={propertyFilter === 'residential' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPropertyFilter('residential')}
            >
              <Home className="w-3 h-3 mr-1" />
              Residential ({counts.residential})
            </Badge>
            <Badge 
              variant={propertyFilter === 'commercial' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setPropertyFilter('commercial')}
            >
              <Building2 className="w-3 h-3 mr-1" />
              Commercial ({counts.commercial})
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid - Conditional on loading */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">Loading properties...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div 
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
            style={{ minHeight: preserveScroll ? `${scrollContainerRef.current?.scrollHeight}px` : undefined }}
            ref={scrollContainerRef}
          >
            {filteredProperties.map((property) => (
              property.property_type === 'commercial' ? (
                <CommercialPropertyCard
                  key={property.id}
                  property={{
                    ...property,
                    property_type: 'commercial' as const,
                    commercial_type: property.commercial_type as any,
                    asset_tags: property.asset_tags || [],
                    is_multi_tenant: property.is_multi_tenant || false,
                    address: property.address || '',
                    city: property.city || '',
                    state: property.state || '',
                    zip_code: property.zip_code || ''
                  }}
                  onView={(prop) => setSelectedProperty(prop)}
                  onEdit={(prop) => setEditingProperty(prop)}
                />
              ) : (
                <LandlordPropertyCard
                  key={property.id}
                  property={property}
                  portfolioId={portfolioId}
                  currentUserId={userId}
                  onView={(prop) => setSelectedProperty(prop)}
                  onEdit={(prop) => setEditingProperty(prop)}
                  onDelete={handleDeleteProperty}
                />
              )
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || propertyFilter !== 'all' 
                    ? "Try adjusting your filters or search term"
                    : "Get started by adding your first property"}
                </p>
                <PermissionGuard 
                  object="portfolio.properties" 
                  action="create" 
                  scope="portfolio" 
                  portfolioId={portfolioId}
                  fallback={null}
                >
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Property
                  </Button>
                </PermissionGuard>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <AddPropertyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPropertyAdded={() => {
          fetchProperties();
          setShowAddModal(false);
        }}
        portfolioId={portfolioId}
        userId={userId}
      />

      {/* Apartment Complex Import (paste URL → full building + units) */}
      <Dialog open={showComplexImport} onOpenChange={setShowComplexImport}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Apartment Complex</DialogTitle>
          </DialogHeader>
          <ComplexImportFlow
            mode="landlord"
            portfolioId={portfolioId}
            onImportComplete={() => {
              fetchProperties();
            }}
            onComplete={() => setShowComplexImport(false)}
            onBack={() => setShowComplexImport(false)}
          />
        </DialogContent>
      </Dialog>

      <MultiStepEditPropertyForm
        isOpen={!!editingProperty}
        onClose={() => setEditingProperty(null)}
        onSave={() => {
          fetchProperties();
          setEditingProperty(null);
        }}
        editingProperty={editingProperty}
        userId={userId}
        portfolioId={portfolioId}
      />

      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
        onEdit={() => {
          if (selectedProperty) {
            setSelectedProperty(null);
            setEditingProperty(selectedProperty);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirmAddress}</strong>? 
              This will move the property to trash where you can restore or permanently delete it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PropertiesTab;
