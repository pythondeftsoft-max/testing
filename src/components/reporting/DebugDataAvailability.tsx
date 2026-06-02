import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PropertyDataSummary {
  propertyId: string;
  propertyAddress: string;
  paymentCount: number;
  dateRange: { earliest: string; latest: string } | null;
  totalAmount: number;
  paymentsInSelectedRange: number;
}

interface DebugDataAvailabilityProps {
  selectedProperties?: string[];
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

export const DebugDataAvailability: React.FC<DebugDataAvailabilityProps> = ({
  selectedProperties,
  startDate,
  endDate,
  onClose
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [propertySummary, setPropertySummary] = useState<PropertyDataSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterConflicts, setFilterConflicts] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      analyzeDataAvailability();
    }
  }, [user?.id, selectedProperties, startDate, endDate]);

  const analyzeDataAvailability = async () => {
    if (!user?.id || !startDate || !endDate) return;
    
    setIsLoading(true);
    try {
      // Get user's properties
      const { data: properties } = await supabase
        .from('properties')
        .select('id, address')
        .eq('owner_id', user.id);

      if (!properties || properties.length === 0) {
        setPropertySummary([]);
        return;
      }

      // Get all rent payments for user's properties
      const { data: allPayments } = await supabase
        .from('rent_payments')
        .select('property_id, amount, payment_date')
        .in('property_id', properties.map(p => p.id));

      if (!allPayments) {
        setPropertySummary([]);
        return;
      }

      // Analyze by property
      const summary: PropertyDataSummary[] = properties.map(property => {
        const propertyPayments = allPayments.filter(p => p.property_id === property.id);
        
        let dateRange = null;
        if (propertyPayments.length > 0) {
          const dates = propertyPayments.map(p => new Date(p.payment_date).getTime());
          const earliest = Math.min(...dates);
          const latest = Math.max(...dates);
          dateRange = {
            earliest: new Date(earliest).toISOString().split('T')[0],
            latest: new Date(latest).toISOString().split('T')[0]
          };
        }

        // Count payments in selected date range
        const paymentsInRange = propertyPayments.filter(p => {
          const paymentDate = new Date(p.payment_date);
          return paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
        });

        return {
          propertyId: property.id,
          propertyAddress: property.address,
          paymentCount: propertyPayments.length,
          dateRange,
          totalAmount: propertyPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          paymentsInSelectedRange: paymentsInRange.length
        };
      });

      setPropertySummary(summary);

      // Check for filter conflicts
      const conflicts: string[] = [];
      if (selectedProperties && selectedProperties.length > 0) {
        const selectedSummary = summary.filter(s => selectedProperties.includes(s.propertyId));
        const hasPaymentsInRange = selectedSummary.some(s => s.paymentsInSelectedRange > 0);
        
        if (!hasPaymentsInRange) {
          conflicts.push('Selected properties have no payments in the specified date range');
        }

        selectedProperties.forEach(propId => {
          const propSummary = summary.find(s => s.propertyId === propId);
          if (propSummary && propSummary.paymentsInSelectedRange === 0) {
            conflicts.push(`Property "${propSummary.propertyAddress}" has no payments in date range ${startDate} to ${endDate}`);
          }
        });
      }
      
      setFilterConflicts(conflicts);

    } catch (error) {
      console.error('Error analyzing data availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (summary: PropertyDataSummary) => {
    if (summary.paymentsInSelectedRange > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (summary.paymentCount > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (summary: PropertyDataSummary) => {
    if (summary.paymentsInSelectedRange > 0) {
      return `${summary.paymentsInSelectedRange} payments in range`;
    }
    if (summary.paymentCount > 0) {
      return `${summary.paymentCount} payments (outside range)`;
    }
    return 'No payment data';
  };

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bug className="h-4 w-4 text-blue-600" />
            Debug: Data Availability Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Filter Conflicts */}
          {filterConflicts.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <h4 className="font-medium text-red-800 mb-2">Filter Conflicts Detected:</h4>
              <ul className="space-y-1">
                {filterConflicts.map((conflict, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {conflict}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Date Range Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Query Parameters:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Date Range: {startDate} to {endDate}</div>
              <div>Selected Properties: {selectedProperties?.length || 0} of {propertySummary.length}</div>
            </div>
          </div>

          {/* Property Summary */}
          <div className="space-y-2">
            <h4 className="font-medium text-gray-800">Property Payment Data:</h4>
            {isLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-2">
                {propertySummary.map((summary) => (
                  <div 
                    key={summary.propertyId}
                    className={`p-2 rounded border text-sm ${
                      selectedProperties?.includes(summary.propertyId) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(summary)}
                        <span className="font-medium">{summary.propertyAddress}</span>
                        {selectedProperties?.includes(summary.propertyId) && (
                          <Badge variant="secondary" className="text-xs">Selected</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">
                        {getStatusText(summary)}
                      </span>
                    </div>
                    
                    {summary.dateRange && (
                      <div className="mt-1 text-xs text-gray-600">
                        Payment dates: {summary.dateRange.earliest} to {summary.dateRange.latest}
                      </div>
                    )}
                    
                    {summary.totalAmount > 0 && (
                      <div className="mt-1 text-xs text-gray-600">
                        Total amount: ${summary.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};