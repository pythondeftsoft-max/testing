
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Home, 
  TrendingUp, 
  Clock, 
  DollarSign,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useSmartMatching, useInitiateMatch } from '@/hooks/useSmartMatching';
import { toast } from 'sonner';

const SmartMatches = () => {
  const [selectedCriteria, setSelectedCriteria] = useState({
    budgetTolerance: 20,
    locationRadius: 10,
    includeVoucherMatches: true,
    includePetMatches: true
  });

  const { data: matches, isLoading, error, refetch } = useSmartMatching(selectedCriteria);
  const { initiateMatch } = useInitiateMatch();

  const handleInitiateMatch = async (match: any) => {
    try {
      await initiateMatch(match);
      toast.success(`Match initiated between ${match.tenant.name} and ${match.property.address}`);
      refetch(); // Refresh the matches
    } catch (error) {
      console.error('Error initiating match:', error);
      toast.error('Failed to initiate match. Please try again.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'High Match';
    if (score >= 60) return 'Good Match';
    return 'Potential Match';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Analyzing smart matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-destructive">Error loading smart matches</div>
      </div>
    );
  }

  const highMatches = matches?.filter(m => m.compatibilityScore >= 85) || [];
  const goodMatches = matches?.filter(m => m.compatibilityScore >= 60 && m.compatibilityScore < 85) || [];
  const potentialMatches = matches?.filter(m => m.compatibilityScore < 60) || [];
  const urgentMatches = matches?.filter(m => m.urgency === 'high') || [];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-openkey-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{highMatches.length}</p>
                <p className="text-sm text-muted-foreground">High Matches (85%+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-openkey-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{goodMatches.length}</p>
                <p className="text-sm text-muted-foreground">Good Matches (60-84%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-openkey-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{matches?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-openkey-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Zap className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{urgentMatches.length}</p>
                <p className="text-sm text-muted-foreground">Urgent Matches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matches List */}
      <Card className="border-openkey-blue/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
            <TrendingUp className="h-5 w-5" />
            Smart Match Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered compatibility analysis between seeking tenants and available properties
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!matches || matches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No smart matches found at this time</p>
              <p className="text-sm">Try adjusting your matching criteria or check back later</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.slice(0, 10).map((match) => (
                <Card key={match.id} className="border-l-4 border-l-openkey-blue/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getScoreColor(match.compatibilityScore)} font-semibold`}>
                          {match.compatibilityScore}% {getScoreLabel(match.compatibilityScore)}
                        </Badge>
                        <Badge className={`${getUrgencyColor(match.urgency)} capitalize`}>
                          {match.urgency} Priority
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => handleInitiateMatch(match)}
                        className="bg-gradient-blue-gold text-white hover:opacity-90"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Initiate Match
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tenant Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-openkey-blue" />
                          <h4 className="font-semibold">Tenant: {match.tenant.name}</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{match.tenant.email}</span>
                          </div>
                          {match.tenant.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{match.tenant.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span>Budget: ${match.tenant.budget?.toLocaleString()}/month</span>
                          </div>
                          {match.tenant.move_in_date && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span>Move-in: {new Date(match.tenant.move_in_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {match.tenant.voucher_status === 'voucher' && (
                            <Badge variant="outline" className="text-xs">Voucher Holder</Badge>
                          )}
                          {match.tenant.pets && (
                            <Badge variant="outline" className="text-xs">Has Pets</Badge>
                          )}
                        </div>
                      </div>

                      {/* Property Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-openkey-blue" />
                          <h4 className="font-semibold">Property</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{match.property.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span>Rent: ${match.property.monthly_rent?.toLocaleString()}/month</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="h-3 w-3 text-muted-foreground" />
                            <span>{match.property.bedrooms} bed, {match.property.bathrooms} bath</span>
                          </div>
                          <div className="flex gap-2">
                            {match.property.voucher_accepted && (
                              <Badge variant="outline" className="text-xs">Accepts Vouchers</Badge>
                            )}
                            {match.property.pet_friendly && (
                              <Badge variant="outline" className="text-xs">Pet Friendly</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Match Reasons */}
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2 text-muted-foreground">Match Reasons:</h5>
                      <div className="flex flex-wrap gap-2">
                        {match.matchReasons.map((reason, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartMatches;
