import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, Home, DollarSign, Ticket, Phone, Mail, Building2, Calendar, MessageSquare, ExternalLink, Send, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { FinderTenant } from '@/hooks/usePropertyFinder';
import { format, formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link } from 'react-router-dom';

interface TenantMatchSummaryProps {
  tenant: FinderTenant;
}

export const TenantMatchSummary: React.FC<TenantMatchSummaryProps> = ({ tenant }) => {
  const [activityOpen, setActivityOpen] = useState(false);
  const stats = tenant.push_stats;
  const hasActivity = stats.total > 0;

  const signedUpAgo = tenant.created_at
    ? formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })
    : null;
  const lastUpdated = tenant.updated_at
    ? formatDistanceToNow(new Date(tenant.updated_at), { addSuffix: true })
    : null;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{tenant.full_name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {tenant.email !== 'N/A' && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {tenant.email}
                  </span>
                )}
                {tenant.phone !== 'N/A' && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {tenant.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-1">
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              <Link to={`/admin/tenants/${tenant.id}`}>
                <ExternalLink className="w-3 h-3" />
                Profile
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              <Link to={`/admin?tab=conversations&tenant=${tenant.user_id}`}>
                <MessageSquare className="w-3 h-3" />
                Messages
              </Link>
            </Button>
          </div>
        </div>

        {/* Criteria badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tenant.voucher_holder && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              <Ticket className="w-3 h-3 mr-1" />
              Voucher: ${tenant.voucher_amount.toLocaleString()}
              {tenant.voucher_status && ` · ${tenant.voucher_status}`}
            </Badge>
          )}
          {tenant.housing_authority_name && (
            <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">
              <Building2 className="w-3 h-3 mr-1" />
              {tenant.housing_authority_name}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            {tenant.city !== 'N/A' ? tenant.city : ''}{tenant.state ? `, ${tenant.state}` : ''}
            {tenant.zip_code !== 'N/A' ? ` ${tenant.zip_code}` : ''}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Home className="w-3 h-3 mr-1" />
            {tenant.bedrooms_approved.length > 0
              ? `${tenant.bedrooms_approved.join(', ')} BR`
              : 'Any BR'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            ${tenant.rent_range_min.toLocaleString()} – ${tenant.rent_range_max.toLocaleString()}
          </Badge>
        </div>

        {/* Activity & timing row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground border-t border-primary/10 pt-2">
          {signedUpAgo && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Signed up {signedUpAgo}
            </span>
          )}
          {lastUpdated && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated}
            </span>
          )}

          {/* Push activity counter */}
          {hasActivity ? (
            <Popover open={activityOpen} onOpenChange={setActivityOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded border border-primary/20 hover:bg-primary/10 text-foreground"
                >
                  <Send className="w-3 h-3" />
                  Pushed to {stats.total} {stats.total === 1 ? 'property' : 'properties'}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <p className="text-xs font-medium">Push activity</p>
                  <div className="space-y-1.5 text-xs">
                    <ActivityRow icon={Clock} color="text-blue-600" label="Pending" value={stats.pending} />
                    <ActivityRow icon={CheckCircle2} color="text-green-600" label="Interested / with landlord" value={stats.interested} />
                    <ActivityRow icon={XCircle} color="text-red-600" label="Declined" value={stats.declined} />
                    <ActivityRow icon={AlertCircle} color="text-amber-600" label="Expired, no response" value={stats.expired} />
                  </div>
                  {stats.last_pushed_at && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      Last push {formatDistanceToNow(new Date(stats.last_pushed_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-muted-foreground">
              <Send className="w-3 h-3" />
              Never pushed
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ActivityRow: React.FC<{ icon: React.ComponentType<{ className?: string }>; color: string; label: string; value: number }> = ({ icon: Icon, color, label, value }) => (
  <div className="flex items-center justify-between">
    <span className="flex items-center gap-1.5">
      <Icon className={`w-3 h-3 ${color}`} />
      {label}
    </span>
    <span className="font-medium">{value}</span>
  </div>
);
