
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAssetInvitations } from '@/hooks/useAssetInvitations';
import { getAssetWorkflowType } from '@/utils/assetBehaviorUtils';

interface AssetInviteFormProps {
  assetId: string;
  assetName: string;
  assetCategory?: string;
  commercialSubtype?: string;
}

// Asset types that are investment/owner-operated style (don't support tenant invites)
const INVESTMENT_ASSET_TYPES = [
  'marina', 'yacht', 'prison', 'hotel', 'motel', 'restaurant', 
  'medical_facility', 'golf_course', 'parking_structure'
];

export const AssetInviteForm = ({ assetId, assetName, assetCategory, commercialSubtype }: AssetInviteFormProps) => {
  const [open, setOpen] = useState(false);
  
  // Determine asset behavior
  const mockAsset = {
    asset_category: assetCategory,
    commercial_subtype: commercialSubtype as any
  };
  const workflowType = getAssetWorkflowType(mockAsset);
  const isInvestmentStyle = workflowType === 'investment-only' || workflowType === 'owner-operated' ||
                           INVESTMENT_ASSET_TYPES.includes(commercialSubtype?.toLowerCase() || '');
  
  const [formData, setFormData] = useState({
    inviteeEmail: '',
    inviteeName: '',
    roleType: isInvestmentStyle ? 'viewer' : 'manager',
    inviteeType: isInvestmentStyle ? 'viewer' : 'tenant',
    monthlyAmount: '',
    currencyCode: 'USD',
    startDate: '',
    endDate: '',
    notes: ''
  });

  const { sendInvitation, loading } = useAssetInvitations(assetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await sendInvitation({
      assetId,
      inviteeEmail: formData.inviteeEmail,
      inviteeName: formData.inviteeName,
      roleType: formData.roleType,
      inviteeType: formData.inviteeType,
      monthlyAmount: formData.monthlyAmount ? parseFloat(formData.monthlyAmount) : undefined,
      currencyCode: formData.currencyCode,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      setOpen(false);
      setFormData({
        inviteeEmail: '',
        inviteeName: '',
        roleType: isInvestmentStyle ? 'viewer' : 'manager',
        inviteeType: isInvestmentStyle ? 'viewer' : 'tenant',
        monthlyAmount: '',
        currencyCode: 'USD',
        startDate: '',
        endDate: '',
        notes: ''
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          {isInvestmentStyle ? 'Invite Collaborator' : 'Invite User'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite User to {assetName}</DialogTitle>
        </DialogHeader>
        
        {isInvestmentStyle && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Investment Asset</p>
              <p className="text-blue-700">
                This asset supports collaborator invites only. For tenant management, 
                use the property-level invitation system.
              </p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invitee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteeName">Full Name</Label>
                  <Input
                    id="inviteeName"
                    value={formData.inviteeName}
                    onChange={(e) => handleInputChange('inviteeName', e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteeEmail">Email Address</Label>
                  <Input
                    id="inviteeEmail"
                    type="email"
                    value={formData.inviteeEmail}
                    onChange={(e) => handleInputChange('inviteeEmail', e.target.value)}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleType">Permission Level</Label>
                  <Select value={formData.roleType} onValueChange={(value) => handleInputChange('roleType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager (Full access)</SelectItem>
                      <SelectItem value="editor">Editor (Can modify)</SelectItem>
                      <SelectItem value="viewer">Viewer (Read only)</SelectItem>
                      <SelectItem value="billing_only">Billing Only (Financial access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inviteeType">Invitee Type</Label>
                  <Select value={formData.inviteeType} onValueChange={(value) => handleInputChange('inviteeType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!isInvestmentStyle && (
                        <SelectItem value="tenant">Tenant</SelectItem>
                      )}
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="property_manager">Property Manager</SelectItem>
                      <SelectItem value="landlord">Co-owner/Landlord</SelectItem>
                      <SelectItem value="viewer">General Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {formData.inviteeType === 'tenant' && !isInvestmentStyle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lease Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyAmount">Monthly Rent</Label>
                    <Input
                      id="monthlyAmount"
                      type="number"
                      value={formData.monthlyAmount}
                      onChange={(e) => handleInputChange('monthlyAmount', e.target.value)}
                      placeholder="1500.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currencyCode">Currency</Label>
                    <Select value={formData.currencyCode} onValueChange={(value) => handleInputChange('currencyCode', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Lease Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Lease End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional information or special terms..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
