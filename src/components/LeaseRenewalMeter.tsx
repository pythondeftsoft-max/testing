import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaseRenewalMeterProps {
  userId: string;
  leaseEndDate?: string;
  propertyId?: string;
}

export const LeaseRenewalMeter: React.FC<LeaseRenewalMeterProps> = ({ 
  userId, 
  leaseEndDate, 
  propertyId 
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast } = useToast();

  // Calculate days left
  const calculateDaysLeft = () => {
    if (!leaseEndDate) return null;
    
    const today = new Date();
    const endDate = new Date(leaseEndDate);
    const timeDiff = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return Math.max(0, daysLeft);
  };

  const daysLeft = calculateDaysLeft();

  // Determine color and status based on days left
  const getStatusInfo = (days: number | null) => {
    if (days === null) {
      return {
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/20',
        strokeColor: 'hsl(var(--muted-foreground))',
        message: 'No lease end date available',
        zone: 'gray'
      };
    }

    if (days >= 186) {
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        strokeColor: 'hsl(142, 76%, 36%)', // green-600
        message: 'Plenty of time left on your lease.',
        zone: 'green'
      };
    } else if (days >= 91) {
      return {
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        strokeColor: 'hsl(45, 93%, 47%)', // yellow-500
        message: 'You\'re eligible to request a lease renewal!',
        zone: 'yellow'
      };
    } else {
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        strokeColor: 'hsl(0, 84%, 60%)', // red-500
        message: 'Your lease is ending soon — take action now.',
        zone: 'red'
      };
    }
  };

  const statusInfo = getStatusInfo(daysLeft);

  // Calculate progress percentage (reverse logic: 365 days = 0%, 0 days = 100%)
  const calculateProgress = (days: number | null) => {
    if (days === null) return 0;
    const maxDays = 365;
    return Math.min(100, Math.max(0, ((maxDays - days) / maxDays) * 100));
  };

  const progress = calculateProgress(daysLeft);

  // Handle lease renewal request
  const handleRenewalRequest = async () => {
    if (!propertyId) {
      toast({
        title: "Error",
        description: "Property information not available",
        variant: "destructive",
      });
      return;
    }

    setIsRequesting(true);

    try {
      // Check if there's already a pending renewal request
      const { data: existingRequest } = await supabase
        .from('lease_renewals')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', userId)
        .eq('renewal_status', 'pending')
        .single();

      if (existingRequest) {
        toast({
          title: "Request Already Exists",
          description: "You already have a pending lease renewal request.",
        });
        setIsRequesting(false);
        return;
      }

      const { error } = await supabase
        .from('lease_renewals')
        .insert({
          property_id: propertyId,
          tenant_id: userId,
          current_lease_end: leaseEndDate,
          renewal_status: 'pending',
          notice_sent_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast({
        title: "Renewal Request Sent!",
        description: "Your lease renewal request has been sent to your landlord. They will be notified and can respond through their dashboard.",
      });
    } catch (error) {
      console.error('Error requesting lease renewal:', error);
      toast({
        title: "Error",
        description: "Failed to send renewal request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  // Show eligibility countdown if not yet eligible
  const getDaysUntilEligible = () => {
    if (daysLeft === null || daysLeft <= 185) return null;
    return daysLeft - 185;
  };

  const daysUntilEligible = getDaysUntilEligible();

  return (
    <CardEnhanced variant="elevated" className="card-hover-gold h-full flex flex-col">
      <CardEnhancedHeader className="pb-4">
        <div className="flex items-center gap-2">
          <CardEnhancedTitle className="flex items-center gap-2 text-lg font-bold text-openkey-blue">
            <div className="p-2 rounded-lg bg-teal-500 shadow-sm">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            Lease Renewal Countdown
          </CardEnhancedTitle>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent className="space-y-6 flex-grow flex flex-col">
        {/* Main Display */}
        <div className="text-center space-y-2">
          {daysLeft !== null ? (
            <>
              <div className="text-3xl font-bold text-foreground">{daysLeft}</div>
              <div className="text-sm text-muted-foreground">days remaining</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">--</div>
              <div className="text-sm text-muted-foreground">No lease data</div>
            </>
          )}
        </div>

        {/* Speedometer-Style Meter */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative w-80 h-48">
            <svg
              className="w-full h-full"
              viewBox="0 0 320 160"
            >
              {/* Color Zones Background - Semicircle design */}
              {/* Red Zone (0-90 days) */}
              <path
                d="M 40 140 A 120 120 0 0 1 100 40"
                fill="none"
                stroke="#dc2626"
                strokeWidth="20"
                className="opacity-40"
              />
              
              {/* Yellow Zone (91-185 days) */}
              <path
                d="M 100 40 A 120 120 0 0 1 220 40"
                fill="none"
                stroke="#eab308"
                strokeWidth="20"
                className="opacity-40"
              />
              
              {/* Green Zone (186-365 days) */}
              <path
                d="M 220 40 A 120 120 0 0 1 280 140"
                fill="none"
                stroke="#16a34a"
                strokeWidth="20"
                className="opacity-40"
              />
              
              {/* Minor tick marks */}
              {Array.from({ length: 19 }, (_, i) => {
                const angle = Math.PI + (i * Math.PI) / 18; // Semicircle from π to 2π
                const x1 = 160 + 100 * Math.cos(angle);
                const y1 = 140 + 100 * Math.sin(angle);
                const x2 = 160 + 110 * Math.cos(angle);
                const y2 = 140 + 110 * Math.sin(angle);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    className="opacity-50"
                  />
                );
              })}
              
              {/* Major tick marks and labels */}
              {/* 0 days mark */}
              <g>
                <line
                  x1="60"
                  y1="140"
                  x2="40"
                  y2="140"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                />
                <text
                  x="30"
                  y="145"
                  textAnchor="middle"
                  className="text-lg font-bold fill-current text-foreground"
                >
                  0
                </text>
              </g>
              
              {/* 365 days mark */}
              <g>
                <line
                  x1="260"
                  y1="140"
                  x2="280"
                  y2="140"
                  stroke="hsl(var(--foreground))"
                  strokeWidth="3"
                />
                <text
                  x="290"
                  y="145"
                  textAnchor="middle"
                  className="text-lg font-bold fill-current text-foreground"
                >
                  365
                </text>
              </g>
              
              {/* Needle */}
              {daysLeft !== null && (
                <g>
                  {(() => {
                    // Clamp days into [0,365]
                    const safeDays = Math.max(0, Math.min(daysLeft, 365));
                    // Map 0→365 days to π→0 radians (left to right)
                    const ratio = safeDays / 365;
                    const needleAngle = Math.PI * (1 - ratio);
                    const needleLength = 80;
                    const needleEndX = 160 + needleLength * Math.cos(needleAngle);
                    const needleEndY = 140 - needleLength * Math.sin(needleAngle);
                    
                    return (
                      <>
                        {/* Needle shadow */}
                        <line
                          x1="162"
                          y1="142"
                          x2={needleEndX + 2}
                          y2={needleEndY + 2}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        {/* Main needle */}
                        <line
                          x1="160"
                          y1="140"
                          x2={needleEndX}
                          y2={needleEndY}
                          stroke="#000"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        {/* Center dot */}
                        <circle
                          cx="160"
                          cy="140"
                          r="8"
                          fill="#000"
                          stroke="hsl(var(--background))"
                          strokeWidth="2"
                        />
                      </>
                    );
                  })()}
                </g>
              )}
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-8">
              <div className="text-5xl font-bold text-foreground">
                {daysLeft !== null ? daysLeft : '--'}
              </div>
              <div className="text-lg text-muted-foreground">
                days left
              </div>
            </div>
          </div>
          
          {/* Status Message */}
          <div className={`text-sm text-center p-2 rounded-lg ${statusInfo.bgColor} max-w-xs`}>
            <span className={`font-medium ${statusInfo.color}`}>
              {statusInfo.message}
            </span>
          </div>
        </div>

        {/* Lease End Date */}
        {leaseEndDate && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Lease ends: {new Date(leaseEndDate).toLocaleDateString()}</span>
          </div>
        )}

        {/* Action Button or Countdown */}
        {daysLeft !== null && daysLeft <= 185 ? (
          <Button 
            onClick={handleRenewalRequest}
            disabled={isRequesting}
            variant="blue"
            className="w-full mt-auto"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRequesting ? 'Requesting...' : 'Request Lease Renewal'}
          </Button>
        ) : daysUntilEligible !== null ? (
          <div className="text-center text-sm text-muted-foreground mt-auto">
            <Clock className="w-4 h-4 mx-auto mb-1" />
            <div>You'll be eligible to renew in</div>
            <div className="font-medium">{daysUntilEligible} days</div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground mt-auto">
            Lease information not available
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};