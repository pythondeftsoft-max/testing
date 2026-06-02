import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Home, Bed, Bath, DollarSign, MapPin, UserCheck, UserX, Users, Clock } from 'lucide-react';
import { useLandlordPendingMatches, useLandlordRespondToMatch, MatchProposalWithDetails } from '@/hooks/useMatchProposals';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface MatchCardProps {
  match: MatchProposalWithDetails;
  onRespond: (proposalId: string, unitId: string, tenantId: string, approved: boolean, notes?: string) => Promise<void>;
  isPending: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onRespond, isPending }) => {
  const [notes, setNotes] = useState('');
  const [showDenyReason, setShowDenyReason] = useState(false);

  const property = match.property_units?.properties;
  const unit = match.property_units;
  const tenant = match.tenant;

  const handleApprove = async () => {
    await onRespond(match.id, match.unit_id, match.tenant_id, true);
  };

  const handleDeny = async () => {
    if (!showDenyReason) {
      setShowDenyReason(true);
      return;
    }
    await onRespond(match.id, match.unit_id, match.tenant_id, false, notes || undefined);
    setShowDenyReason(false);
    setNotes('');
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            <Users className="h-3 w-3 mr-1" />
            Tenant Interested
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(match.tenant_responded_at || match.created_at), { addSuffix: true })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tenant Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              {tenant?.first_name?.charAt(0) || tenant?.last_name?.charAt(0) || 'T'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-semibold">
              {tenant?.first_name || tenant?.last_name 
                ? `${tenant?.first_name || ''} ${tenant?.last_name || ''}`.trim()
                : 'Unknown Tenant'}
            </h4>
            <p className="text-sm text-muted-foreground">{tenant?.email}</p>
          </div>
        </div>

        {/* Tenant Notes if any */}
        {match.tenant_notes && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tenant's note:</strong> {match.tenant_notes}
            </p>
          </div>
        )}

        {/* Property Info */}
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{property?.address}</span>
            {unit?.unit_name && (
              <Badge variant="outline" className="text-xs">
                {unit.unit_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground pl-6">
            <MapPin className="h-3 w-3" />
            <span>{property?.city}, {property?.state}</span>
          </div>
          <div className="flex gap-4 text-sm pl-6">
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" /> {unit?.bedrooms} bed
            </span>
            <span className="flex items-center gap-1">
              <Bath className="h-3 w-3" /> {unit?.bathrooms} bath
            </span>
            <span className="flex items-center gap-1 font-medium">
              <DollarSign className="h-3 w-3" /> ${unit?.monthly_rent}/mo
            </span>
          </div>
        </div>

        {/* Deny reason input */}
        {showDenyReason && (
          <div className="space-y-2">
            <Label htmlFor={`denyNotes-${match.id}`}>Reason for denial (Optional)</Label>
            <Textarea
              id={`denyNotes-${match.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide feedback for the tenant..."
              rows={2}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {showDenyReason ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowDenyReason(false)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleDeny}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Deny'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDeny}
                disabled={isPending}
              >
                <UserX className="h-4 w-4 mr-1" />
                Deny
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleApprove}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-1" />
                )}
                Set as Primary
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const LandlordMatchReview: React.FC = () => {
  const { user } = useAuth();
  const { data: pendingMatches, isLoading } = useLandlordPendingMatches(user?.id);
  const respondToMatch = useLandlordRespondToMatch();

  const handleRespond = async (
    proposalId: string,
    unitId: string,
    tenantId: string,
    approved: boolean,
    notes?: string
  ) => {
    await respondToMatch.mutateAsync({
      proposalId,
      unitId,
      tenantId,
      approved,
      notes
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pendingMatches || pendingMatches.length === 0) {
    return null; // Don't render anything if no pending matches
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          {pendingMatches.length}
        </Badge>
        <h3 className="font-semibold">Pending Tenant Matches</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pendingMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onRespond={handleRespond}
            isPending={respondToMatch.isPending}
          />
        ))}
      </div>
    </div>
  );
};

export default LandlordMatchReview;
