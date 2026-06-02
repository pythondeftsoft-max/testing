import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Plus, Home, AlertTriangle, X, Calendar, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_PRIORITIES } from '@/utils/maintenanceUtils';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Validation schema
const maintenanceRequestSchema = z.object({
  property_id: z.string(),
  unit_id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description must be less than 1000 characters'),
  priority: z.enum(['low', 'medium', 'high'], { required_error: 'Priority is required' }),
  category: z.string().min(1, 'Category is required'),
  preferred_time: z.enum(['morning', 'afternoon', 'evening', 'anytime']).optional(),
  tenant_id: z.string(),
});

type MaintenanceRequestForm = z.infer<typeof maintenanceRequestSchema>;

interface TenantProperty {
  id: string;
  address: string;
  unit?: string;
}

interface TenantInfo {
  name: string;
  email: string;
  phone: string;
}

interface MaintenanceRequestModalProps {
  userId: string;
  portfolioId?: string;
  onRequestCreated?: () => void;
}

const MaintenanceRequestModal = ({ userId, portfolioId, onRequestCreated }: MaintenanceRequestModalProps) => {
  const [open, setOpen] = useState(false);
  const [tenantProperty, setTenantProperty] = useState<TenantProperty | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [currentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [assignedProperties, setAssignedProperties] = useState<Array<{
    unitId: string;
    propertyId: string;
    address: string;
    unitNumber?: string;
    fullDisplay: string;
  }>>([]);
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const { toast } = useToast();
  const { createRequest } = useMaintenanceRequests(portfolioId);

  const form = useForm<MaintenanceRequestForm>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      property_id: '',
      unit_id: '',
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      preferred_time: undefined,
      tenant_id: userId,
    },
  });

  // Fetch tenant info and property when modal opens
  useEffect(() => {
    if (open && userId) {
      fetchTenantInfo();
      fetchTenantProperty();
    }
  }, [open, userId]);

  const fetchTenantInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setTenantInfo({
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    }
  };

  const fetchTenantProperty = async () => {
    setLoading(true);
    try {
      // Step 1: Get tenant's assigned units
      const { data: assignedUnits, error: unitsError } = await supabase
        .from('property_units')
        .select('id, property_id, unit_number')
        .eq('tenant_id', userId);
      
      if (unitsError) throw unitsError;
      
      if (!assignedUnits || assignedUnits.length === 0) {
        toast({
          title: 'No Property Assigned',
          description: 'You are not currently assigned to a property. Please contact your property manager.',
          variant: 'destructive',
        });
        return;
      }
      
      // Step 2: Get property details separately to avoid RLS conflicts
      const propertyIds = assignedUnits.map(u => u.property_id);
      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('id, address, city, state')
        .in('id', propertyIds);
      
      if (propsError) throw propsError;
      
      // Step 3: Combine the data
      const unitsWithProperties = assignedUnits.map(unit => {
        const property = properties?.find(p => p.id === unit.property_id);
        return {
          ...unit,
          properties: property
        };
      });
      
      if (unitsWithProperties.length === 1) {
        // Single property - auto-fill and lock
        const unit = unitsWithProperties[0];
        const unitInfo = unit.unit_number ? ` - Unit ${unit.unit_number}` : '';
        const fullAddress = `${unit.properties?.address}${unitInfo}`;
        
        setTenantProperty({
          id: unit.property_id,
          address: fullAddress,
          unit: unit.id,
        });
        
        form.setValue('property_id', unit.property_id);
        form.setValue('unit_id', unit.id);
        form.setValue('tenant_id', userId);
        
        setShowPropertySelector(false);
      } else {
        // Multiple properties - show dropdown
        const propertyOptions = unitsWithProperties.map(unit => ({
          unitId: unit.id,
          propertyId: unit.property_id,
          address: unit.properties?.address || '',
          unitNumber: unit.unit_number,
          fullDisplay: `${unit.properties?.address}, ${unit.properties?.city}, ${unit.properties?.state}${unit.unit_number ? ` - Unit ${unit.unit_number}` : ''}`
        }));
        
        setAssignedProperties(propertyOptions);
        setShowPropertySelector(true);
        
        toast({
          title: 'Multiple Properties Found',
          description: 'Please select which property needs maintenance.',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error fetching tenant property:', error);
      toast({
        title: 'Error',
        description: 'Unable to load your property information.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // File upload dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    maxFiles: 3,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      setUploadedFiles(prev => [...prev, ...acceptedFiles].slice(0, 3));
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: MaintenanceRequestForm) => {
    try {
      let uploadedFileData: Array<{ path: string; name: string; size: number; type: string }> = [];
      
      // Upload files to Supabase Storage
      if (uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          const fileName = `${userId}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('maintenance-documents')
            .upload(fileName, file);
          
          if (!uploadError && uploadData) {
            uploadedFileData.push({
              path: uploadData.path,
              name: file.name,
              size: file.size,
              type: file.type
            });
          }
        }
      }
      
      // Build description with preferred time (no attachments in description)
      let fullDescription = data.description;
      
      if (data.preferred_time) {
        const timeLabels = {
          morning: 'Morning (8am-12pm)',
          afternoon: 'Afternoon (12pm-5pm)',
          evening: 'Evening (5pm-8pm)',
          anytime: 'Anytime'
        };
        fullDescription += `\n\n**Preferred Repair Time:** ${timeLabels[data.preferred_time]}`;
      }
      
      // Add tenant contact info to description
      if (tenantInfo) {
        fullDescription += `\n\n**Contact:** ${tenantInfo.name} | ${tenantInfo.email} | ${tenantInfo.phone}`;
      }
      
      const requestData = {
        property_id: data.property_id,
        unit_id: data.unit_id || null,
        title: data.title,
        description: fullDescription,
        priority: data.priority,
        category: data.category,
        tenant_id: userId,
        status: 'pending',
        submitted_date: new Date().toISOString(),
      };

      const result = await createRequest.mutateAsync(requestData);
      
      // Store attachments in maintenance_documents table
      if (uploadedFileData.length > 0 && result?.id) {
        for (const fileData of uploadedFileData) {
          await supabase
            .from('maintenance_documents')
            .insert({
              maintenance_request_id: result.id,
              document_type: fileData.type.startsWith('image/') ? 'photo' : 'attachment',
              file_name: fileData.name,
              file_path: fileData.path,
              file_size: fileData.size,
              file_type: fileData.type,
              uploaded_by: userId
            });
        }
      }
      
      toast({
        title: 'Request Submitted',
        description: 'Your maintenance request has been submitted successfully.',
      });
      
      form.reset();
      setUploadedFiles([]);
      setOpen(false);
      onRequestCreated?.();
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit maintenance request. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    form.reset();
    setUploadedFiles([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-openkey-blue hover:bg-openkey-blue-dark text-white">
          <Plus className="h-4 w-4 mr-2" />
          Submit New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-openkey-blue" />
            Create Maintenance Request
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-6 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Reported Date Display */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Reporting on:</span>
                  </div>
                  <p className="text-base font-medium mt-1">
                    {format(currentDate, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>

                {/* Loading State */}
                {loading && !tenantProperty && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-openkey-blue border-t-transparent rounded-full"></div>
                    <p className="text-sm text-gray-600">Loading your property information...</p>
                  </div>
                )}

                {/* No Property Error */}
                {!loading && !tenantProperty && !showPropertySelector && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 font-medium">⚠️ No Property Assigned</p>
                    <p className="text-xs text-red-600 mt-1">
                      You are not currently assigned to a property. Please contact your property manager to get access.
                    </p>
                  </div>
                )}

                {/* Property/Unit Field - Conditional Display */}
                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Property / Unit</FormLabel>
                      <FormControl>
                        {showPropertySelector ? (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              const selected = assignedProperties.find(p => p.propertyId === value);
                              if (selected) {
                                field.onChange(value);
                                form.setValue('unit_id', selected.unitId);
                                form.setValue('tenant_id', userId);
                                setTenantProperty({
                                  id: selected.propertyId,
                                  address: selected.fullDisplay,
                                  unit: selected.unitId,
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="border-border focus:border-openkey-blue">
                              <SelectValue placeholder="Select which property needs maintenance" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedProperties.map((prop) => (
                                <SelectItem key={prop.propertyId} value={prop.propertyId}>
                                  <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4 text-openkey-blue" />
                                    <span>{prop.fullDisplay}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="relative">
                            <Input
                              value={tenantProperty?.address || 'Loading your property...'}
                              disabled
                              className="bg-muted/30 cursor-not-allowed border-border pl-10 font-medium"
                            />
                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-openkey-blue" />
                          </div>
                        )}
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        {showPropertySelector 
                          ? 'Select the location where maintenance is needed.'
                          : 'This request will be sent to your property manager for this location.'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Leaking kitchen sink"
                          className="border-border focus:border-openkey-blue"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please provide detailed information about the issue..."
                          className="border-border focus:border-openkey-blue resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-border focus:border-openkey-blue">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MAINTENANCE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.replace('_', ' ').split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Photo/Video Upload */}
                <div className="space-y-3">
                  <FormLabel>Attach Photos or Videos (Optional)</FormLabel>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                      isDragActive ? "border-openkey-blue bg-openkey-blue/5" : "border-border hover:border-openkey-blue/50"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {isDragActive ? "Drop files here..." : "Drag & drop photos/videos, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 3 files, up to 10MB each
                    </p>
                  </div>
                  
                  {/* Uploaded Files Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-openkey-blue" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preferred Repair Time */}
                <FormField
                  control={form.control}
                  name="preferred_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Preferred Repair Time (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-border focus:border-openkey-blue">
                            <Clock className="h-4 w-4 mr-2 text-openkey-blue" />
                            <SelectValue placeholder="Select preferred time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">Morning (8am-12pm)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                          <SelectItem value="evening">Evening (5pm-8pm)</SelectItem>
                          <SelectItem value="anytime">Anytime</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={createRequest.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      loading || 
                      !tenantProperty || 
                      (showPropertySelector && !form.watch('property_id')) ||
                      createRequest.isPending
                    }
                    className="bg-openkey-blue hover:bg-openkey-blue-dark text-white"
                  >
                    {createRequest.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceRequestModal;