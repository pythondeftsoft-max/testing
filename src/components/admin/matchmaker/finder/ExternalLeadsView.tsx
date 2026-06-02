import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Globe, Search, Home, MapPin, Building2, Plus } from 'lucide-react';
import { FinderTenant, generateExternalSearchLinks, ExternalSearchLink } from '@/hooks/usePropertyFinder';
import { QuickImportModal } from './QuickImportModal';

interface ExternalLeadsViewProps {
  tenant: FinderTenant;
  adminUserId: string;
}

const platformIcons: Record<string, string> = {
  trulia: '🏠',
  zillow: '🔵',
  google: '🔍',
  apartments: '🏢',
  affordable: '💚',
};

const platformColors: Record<string, string> = {
  'Trulia': 'border-green-200 bg-green-50/50',
  'Zillow': 'border-blue-200 bg-blue-50/50',
  'Google': 'border-orange-200 bg-orange-50/50',
  'Apartments.com': 'border-purple-200 bg-purple-50/50',
  'AffordableHousing.com': 'border-emerald-200 bg-emerald-50/50',
};

export const ExternalLeadsView: React.FC<ExternalLeadsViewProps> = ({ tenant, adminUserId }) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const searchLinks = generateExternalSearchLinks(tenant);

  return (
    <div className="space-y-6">
      {/* Header with Quick Import Button */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">External Property Search</h3>
              <Button onClick={() => setShowImportModal(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Quick Import
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Search platforms below, then use Quick Import to add properties with URL scraping.
            </p>
          </div>
        </div>
      </div>

      <QuickImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        tenant={tenant}
        adminUserId={adminUserId}
      />

      {/* Tenant Criteria Summary */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          <Building2 className="w-3 h-3 mr-1" />
          {tenant.city !== 'N/A' ? tenant.city : ''}{tenant.state ? `, ${tenant.state}` : ''}
        </Badge>
        {tenant.zip_code && tenant.zip_code !== 'N/A' && (
          <Badge variant="outline">
            <MapPin className="w-3 h-3 mr-1" />
            {tenant.zip_code}
          </Badge>
        )}
        <Badge variant="outline">
          <Home className="w-3 h-3 mr-1" />
          {tenant.bedrooms_approved.length > 0 
            ? `${tenant.bedrooms_approved.join(', ')} BR` 
            : 'Any BR'}
        </Badge>
        <Badge variant="outline">
          ${tenant.rent_range_min.toLocaleString()} - ${tenant.rent_range_max.toLocaleString()}
        </Badge>
      </div>

      {/* Search Links */}
      <div className="grid gap-4 md:grid-cols-2">
        {searchLinks.map((link, index) => (
          <Card 
            key={index}
            className={`${platformColors[link.platform] || 'border-gray-200 bg-gray-50/50'} transition-all`}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Platform Header */}
                <div className="flex items-center gap-2">
                  <span className="text-xl">{platformIcons[link.icon] || '🔗'}</span>
                  <div>
                    <h4 className="font-semibold">{link.platform}</h4>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                </div>

                {/* Search Buttons */}
                <div className="flex gap-2">
                  {/* City Search Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start gap-2 hover:bg-white"
                    onClick={() => window.open(link.cityUrl, '_blank')}
                  >
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{link.cityLabel}</span>
                    <ExternalLink className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
                  </Button>

                  {/* Zip Code Search Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start gap-2 hover:bg-white disabled:opacity-50"
                    onClick={() => link.hasZip && window.open(link.zipUrl, '_blank')}
                    disabled={!link.hasZip}
                    title={!link.hasZip ? 'No zip code on file' : `Search in ${link.zipLabel}`}
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{link.hasZip ? link.zipLabel : 'No zip'}</span>
                    <ExternalLink className="w-3 h-3 ml-auto shrink-0 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pro Tips */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-amber-600" />
            Pro Tips for Finding Section 8 Properties
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Filter by "Section 8 accepted" or "Voucher accepted" when available</li>
            <li>Look for individual landlords who may be more flexible</li>
            <li>Check listings that mention "affordable housing" or "income-based"</li>
            <li>Note the property details and add it to our system to track</li>
            <li>Properties with multiple tenant matches should be prioritized</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
