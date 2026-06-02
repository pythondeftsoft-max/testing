
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { 
  User, Phone, Mail, MapPin, Calendar, DollarSign, Home, FileText, 
  Building2, CreditCard, Shield, Clock, MessageSquare, CheckCircle2,
  AlertCircle, TrendingUp, Star, Users
} from 'lucide-react';

interface TenantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyAddress: string;
  onMessage?: () => void;
}

const TenantDetailsModal = ({ isOpen, onClose, propertyId, propertyAddress, onMessage }: TenantDetailsModalProps) => {
  const [tenantData, setTenantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchTenantData();
    }
  }, [isOpen, propertyId]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      
      // For demo purposes, we'll show mock tenant data
      // In a real app, you'd fetch from a tenants table or lease records
      const mockTenantData = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '(555) 123-4567',
        leaseStartDate: '2023-06-01',
        leaseEndDate: '2024-05-31',
        monthlyRent: 1200,
        securityDeposit: 1200,
        moveInDate: '2023-06-01',
        creditScore: 742,
        creditScoreRange: '720-759',
        emergencyContact: {
          name: 'Michael Johnson',
          relationship: 'Spouse',
          phone: '(555) 765-4321'
        },
        employment: {
          employer: 'Tech Solutions Inc.',
          position: 'Software Developer',
          monthlyIncome: 4500,
          startDate: '2021-03-15'
        },
        rentHistory: [
          { month: 'December 2024', amount: 1200, status: 'paid', date: '2024-12-01' },
          { month: 'November 2024', amount: 1200, status: 'paid', date: '2024-11-01' },
          { month: 'October 2024', amount: 1200, status: 'paid', date: '2024-10-01' },
        ]
      };

      setTenantData(mockTenantData);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!tenantData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-600">No tenant data found for this property.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Credit score utility functions
  const getCreditScoreCategory = (score: number): string => {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    if (score >= 600) return 'Poor';
    return 'Very Poor';
  };

  const getCreditScoreColor = (score: number): string => {
    if (score >= 750) return 'bg-green-500/10 text-green-700 border-green-200';
    if (score >= 700) return 'bg-blue-500/10 text-blue-700 border-blue-200';
    if (score >= 650) return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
    if (score >= 600) return 'bg-orange-500/10 text-orange-700 border-orange-200';
    return 'bg-red-500/10 text-red-700 border-red-200';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="w-6 h-6" />
            {tenantData.firstName} {tenantData.lastName} - {propertyAddress}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Quick Stats Cards */}
          <div className="px-6 py-4 bg-muted/30">
            <div className="grid grid-cols-4 gap-4">
              <CardEnhanced variant="outlined" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-lg font-semibold">${tenantData.monthlyRent}</p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced variant="outlined" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Income</p>
                    <p className="text-lg font-semibold">${tenantData.employment.monthlyIncome}</p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced variant="outlined" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Ends</p>
                    <p className="text-lg font-semibold">{new Date(tenantData.leaseEndDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced variant="outlined" className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge variant="default" className="mt-1">On Time</Badge>
                  </div>
                </div>
              </CardEnhanced>
            </div>
          </div>

          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <div className="px-6 border-b">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="background" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Background
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 gap-6">
                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Basic Information
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                          <p className="text-lg font-semibold">{tenantData.firstName} {tenantData.lastName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {tenantData.email}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {tenantData.phone}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Move-in Date</label>
                          <p className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(tenantData.moveInDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>

                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Emergency Contact
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Name</label>
                          <p className="font-medium">{tenantData.emergencyContact.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                          <p>{tenantData.emergencyContact.relationship}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {tenantData.emergencyContact.phone}
                          </p>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                </div>
              </TabsContent>


              <TabsContent value="background" className="space-y-6 mt-0">
                <div className="grid grid-cols-3 gap-6">
                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Credit Score
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="space-y-4">
                      <div className="text-center">
                        <div className="mb-3">
                          <p className="text-3xl font-bold text-primary">{tenantData.creditScore}</p>
                          <p className="text-sm text-muted-foreground">Credit Score</p>
                        </div>
                        <div className="space-y-2">
                          <Badge 
                            variant="default" 
                            className={getCreditScoreColor(tenantData.creditScore)}
                          >
                            {getCreditScoreCategory(tenantData.creditScore)}
                          </Badge>
                          <p className="text-sm text-muted-foreground">Range: {tenantData.creditScoreRange}</p>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>

                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Background Checks
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Criminal Background</span>
                          <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Clear
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Eviction History</span>
                          <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Clear
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Employment Verification</span>
                          <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>

                  <CardEnhanced>
                    <CardEnhancedHeader>
                      <CardEnhancedTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Additional Information
                      </CardEnhancedTitle>
                    </CardEnhancedHeader>
                    <CardEnhancedContent className="space-y-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Pets</label>
                          <p>None</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Smoking</label>
                          <p>Non-smoker</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Previous Address</label>
                          <p className="text-sm">123 Oak Street, City, State 12345</p>
                        </div>
                      </div>
                    </CardEnhancedContent>
                  </CardEnhanced>
                </div>
              </TabsContent>


              <TabsContent value="documents" className="space-y-6 mt-0">
                <CardEnhanced>
                  <CardEnhancedHeader>
                    <CardEnhancedTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents & Files
                    </CardEnhancedTitle>
                  </CardEnhancedHeader>
                  <CardEnhancedContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Lease Agreement</p>
                            <p className="text-sm text-muted-foreground">PDF • 2.3 MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Application Form</p>
                            <p className="text-sm text-muted-foreground">PDF • 1.8 MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Income Verification</p>
                            <p className="text-sm text-muted-foreground">PDF • 1.2 MB</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Background Check</p>
                            <p className="text-sm text-muted-foreground">PDF • 950 KB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              </TabsContent>

              <TabsContent value="history" className="space-y-6 mt-0">
                <CardEnhanced>
                  <CardEnhancedHeader>
                    <CardEnhancedTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Payment History
                    </CardEnhancedTitle>
                  </CardEnhancedHeader>
                  <CardEnhancedContent>
                    <div className="space-y-3">
                      {tenantData.rentHistory.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{payment.month}</p>
                              <p className="text-sm text-muted-foreground">Paid on {new Date(payment.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${payment.amount}</p>
                            <Badge variant={payment.status === 'paid' ? 'default' : 'destructive'}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardEnhancedContent>
                </CardEnhanced>
              </TabsContent>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 border-t bg-muted/30">
              <div className="flex space-x-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    if (onMessage) {
                      onMessage();
                      onClose();
                    }
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button onClick={onClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantDetailsModal;
