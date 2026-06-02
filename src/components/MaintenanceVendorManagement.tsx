import React, { useState } from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, User, Phone, Mail, DollarSign, Star } from 'lucide-react';

import { useMaintenanceVendors, type MaintenanceVendor } from '@/hooks/useMaintenanceVendors';
import { formatSpecialty, getSpecialtyColor, formatCurrency, MAINTENANCE_SPECIALTIES } from '@/utils/maintenanceUtils';

interface MaintenanceVendorManagementProps {
  userId: string;
  portfolioId?: string;
}

const MaintenanceVendorManagement = ({ userId, portfolioId }: MaintenanceVendorManagementProps) => {
  const { vendors, isLoading, createVendor, updateVendor, deleteVendor } = useMaintenanceVendors(portfolioId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<MaintenanceVendor | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    specialties: [] as string[],
    hourly_rate: '',
    notes: '',
    license_number: '',
    insurance_verified: false,
    emergency_contact: false
  });

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      specialties: [],
      hourly_rate: '',
      notes: '',
      license_number: '',
      insurance_verified: false,
      emergency_contact: false
    });
    setEditingVendor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const vendorData = {
      ...formData,
      account_id: userId,
      portfolio_id: portfolioId,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
      specialties: formData.specialties as any[]
    };

    if (editingVendor) {
      await updateVendor.mutateAsync({ id: editingVendor.id, ...vendorData });
    } else {
      await createVendor.mutateAsync(vendorData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (vendor: MaintenanceVendor) => {
    setEditingVendor(vendor);
    setFormData({
      company_name: vendor.company_name,
      contact_name: vendor.contact_name,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address || '',
      specialties: vendor.specialties || [],
      hourly_rate: vendor.hourly_rate?.toString() || '',
      notes: vendor.notes || '',
      license_number: vendor.license_number || '',
      insurance_verified: vendor.insurance_verified || false,
      emergency_contact: vendor.emergency_contact || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (vendorId: string) => {
    if (window.confirm('Are you sure you want to deactivate this vendor?')) {
      await deleteVendor.mutateAsync(vendorId);
    }
  };

  const handleSpecialtyChange = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  if (isLoading) {
    return (
      <CardEnhanced variant="elevated" hover={false}>
        <CardEnhancedContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>
    );
  }

  return (
    <CardEnhanced variant="elevated" hover={true} className="card-hover-gold animate-fade-in-up">
      <CardEnhancedHeader>
        <div className="flex justify-between items-center">
          <CardEnhancedTitle className="flex items-center gap-2" gradient>
            <User className="h-5 w-5 text-primary" />
            Maintenance Vendors
          </CardEnhancedTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm}
                  variant="blue"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0">
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>
                  {editingVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] px-6 pb-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Company Name, Contact Name, Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact_name">Contact Name *</Label>
                      <Input
                        id="contact_name"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 2: Email, Hourly Rate, License Number */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="license_number">License Number</Label>
                      <Input
                        id="license_number"
                        value={formData.license_number}
                        onChange={(e) => setFormData({...formData, license_number: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Row 3: Address and Notes side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Specialties</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {MAINTENANCE_SPECIALTIES.map((specialty) => (
                        <label key={specialty} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.specialties.includes(specialty)}
                            onChange={() => handleSpecialtyChange(specialty)}
                            className="rounded"
                          />
                          <span className="text-sm">{formatSpecialty(specialty)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.insurance_verified}
                        onChange={(e) => setFormData({...formData, insurance_verified: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Insurance Verified</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emergency_contact}
                        onChange={(e) => setFormData({...formData, emergency_contact: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">Emergency Contact</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      variant="gold"
                    >
                      {editingVendor ? 'Update' : 'Create'} Vendor
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
            </Dialog>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        {vendors.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Add your first vendor to get started with maintenance management.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Company
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Contact</TableHead>
                  <TableHead className="font-semibold text-foreground">Specialties</TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Rate
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Rating
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id} className="table-row-hover">
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground">{vendor.company_name}</div>
                        <div className="text-sm text-muted-foreground">{vendor.contact_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-foreground">
                          <Phone className="h-3 w-3 mr-1 text-primary" />
                          {vendor.phone}
                        </div>
                        <div className="flex items-center text-sm text-foreground">
                          <Mail className="h-3 w-3 mr-1 text-primary" />
                          {vendor.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.specialties?.slice(0, 3).map((specialty) => (
                           <Badge key={specialty} variant="outline" className="border-primary/20 text-primary">
                             {formatSpecialty(specialty)}
                           </Badge>
                         ))}
                         {vendor.specialties && vendor.specialties.length > 3 && (
                           <Badge variant="outline" className="border-accent/20 text-accent">
                            +{vendor.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.hourly_rate ? (
                        <div className="flex items-center font-medium text-foreground">
                          <DollarSign className="h-3 w-3 mr-1 text-accent" />
                          {formatCurrency(vendor.hourly_rate)}/hr
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1 text-accent" />
                        <span className="font-medium text-foreground">
                          {vendor.rating || 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                          className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(vendor.id)}
                          className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default MaintenanceVendorManagement;
