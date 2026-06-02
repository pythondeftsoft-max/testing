import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Home, Phone, Mail, Calendar } from 'lucide-react';
import { useNewPropertyAcquisitions } from '@/hooks/useLandlordPlacementFees';
import { format } from 'date-fns';
import { usePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';

const NewAcquisitionsTable = () => {
  const { newAcquisitions, isLoading, updateAcquisitionFollowUp } = useNewPropertyAcquisitions();
  const { data: placementFeeConfig } = usePlacementFeeConfig();
  const placementFeePercentage = placementFeeConfig?.config_value?.percentage || 40;
  const placementFeeDecimal = placementFeePercentage / 100;
  
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [notes, setNotes] = useState('');

  const getFollowUpBadge = (status: string) => {
    switch (status) {
      case 'none':
        return <Badge variant="outline">No Contact</Badge>;
      case 'contacted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Contacted</Badge>;
      case 'follow_up_needed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Follow-up Needed</Badge>;
      case 'placement_discussed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Placement Discussed</Badge>;
      case 'fee_agreed':
        return <Badge className="bg-green-600">Fee Agreed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdateFollowUp = async () => {
    if (selectedProperty && followUpStatus) {
      await updateAcquisitionFollowUp.mutateAsync({
        propertyId: selectedProperty.id,
        status: followUpStatus,
        notes: notes,
      });
      setSelectedProperty(null);
      setFollowUpStatus('');
      setNotes('');
    }
  };

  if (isLoading) {
    return <div>Loading new acquisitions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          New Property Acquisitions
        </CardTitle>
        <CardDescription>
          Track landlords who recently acquired properties for {placementFeePercentage}% fee outreach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Landlord</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Potential Fee</TableHead>
                <TableHead>Follow-up Status</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newAcquisitions?.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {property.profiles?.first_name} {property.profiles?.last_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {property.profiles?.email}
                      </div>
                      {property.profiles?.phone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {property.profiles?.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{property.address}</div>
                      <div className="text-sm text-gray-500">
                        {property.bedrooms}br / {property.bathrooms}ba
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {property.purchase_date ? format(new Date(property.purchase_date), 'MMM dd, yyyy') : 'Not set'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">${property.monthly_rent?.toLocaleString() || 'Not set'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      ${property.monthly_rent ? Math.round(property.monthly_rent * placementFeeDecimal).toLocaleString() : 'TBD'}
                    </div>
                    <div className="text-xs text-gray-500">{placementFeePercentage}% of first month</div>
                  </TableCell>
                  <TableCell>{getFollowUpBadge(property.follow_up_status || 'none')}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {property.last_outreach_date 
                        ? format(new Date(property.last_outreach_date), 'MMM dd, yyyy')
                        : 'Never'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedProperty(property)}
                        >
                          Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Follow-up Status</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium">{property.address}</p>
                            <p className="text-sm text-gray-600">
                              {property.profiles?.first_name} {property.profiles?.last_name}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Follow-up Status</label>
                            <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
                                <SelectItem value="placement_discussed">Placement Discussed</SelectItem>
                                <SelectItem value="fee_agreed">Fee Agreed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Outreach Notes</label>
                            <Textarea
                              placeholder="Add notes about the conversation..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              rows={3}
                            />
                          </div>
                          
                          <Button 
                            className="w-full"
                            onClick={handleUpdateFollowUp}
                            disabled={!followUpStatus || updateAcquisitionFollowUp.isPending}
                          >
                            {updateAcquisitionFollowUp.isPending ? 'Updating...' : 'Update Status'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {(!newAcquisitions || newAcquisitions.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No new property acquisitions found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewAcquisitionsTable;