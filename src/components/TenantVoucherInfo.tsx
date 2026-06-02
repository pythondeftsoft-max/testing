
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  Shield,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import VoucherManagementModal from '@/components/VoucherManagementModal';

interface TenantVoucherInfoProps {
  userId: string;
  currentUserId?: string | null;
}

const TenantVoucherInfo = ({ userId, currentUserId }: TenantVoucherInfoProps) => {
  const { tenantData, loading, error, refetch } = useTenantProfile(userId, undefined, currentUserId || undefined);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading voucher information...</p>
        </div>
      </div>
    );
  }

  if (error || !tenantData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Voucher Info</h3>
          <p className="text-gray-600">{error || 'Voucher data not found'}</p>
        </div>
      </div>
    );
  }

  // Check if tenant has voucher information
  const hasVoucher = tenantData.voucher && tenantData.lease;

  if (!hasVoucher) {
    return (
      <>
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Voucher Information</h3>
          <p className="text-gray-600 mb-4">Add your voucher information to help landlords understand your housing assistance</p>
          <Button 
            onClick={() => setShowVoucherModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Voucher Information
          </Button>
        </div>

      <VoucherManagementModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        userId={userId}
        onSuccess={() => {
          refetch();
          setShowVoucherModal(false);
        }}
      />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rent Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Current Rent</p>
                <p className="text-2xl font-bold text-gray-900">${tenantData.lease.totalRent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">HAP Assistance</p>
                <p className="text-2xl font-bold text-gray-900">${tenantData.lease.hapPortion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tenant Portion</p>
                <p className="text-2xl font-bold text-gray-900">${tenantData.lease.tenantPortion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voucher Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voucher Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Voucher Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Voucher Number</label>
              <p className="text-gray-900 mt-1">{tenantData.voucher.number}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Voucher Type</label>
              <p className="text-gray-900 mt-1">{tenantData.voucher.type}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Public Housing Authority</label>
              <p className="text-gray-900 mt-1">{tenantData.voucher.pha}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Expiration Date</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <p className="text-gray-900">{new Date(tenantData.voucher.expirationDate).toLocaleDateString()}</p>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Caseworker Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Caseworker Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <p className="text-gray-900 mt-1">{tenantData.voucher.caseworker.name}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-500" />
                <p className="text-gray-900">{tenantData.voucher.caseworker.phone}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-gray-500" />
                <p className="text-gray-900">{tenantData.voucher.caseworker.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rent Breakdown Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monthly Rent Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="font-medium text-gray-700">Total Monthly Rent</span>
              <span className="text-lg font-bold text-gray-900">${tenantData.lease.totalRent}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">HAP Portion (Housing Authority Payment)</span>
              <span className="text-green-600 font-medium">${tenantData.lease.hapPortion}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-t">
              <span className="text-gray-600">Your Portion</span>
              <span className="text-purple-600 font-medium">${tenantData.lease.tenantPortion}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantVoucherInfo;
