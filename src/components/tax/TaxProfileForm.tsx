import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Download } from 'lucide-react';
import { useTaxProfileMutation, TaxProfile } from '@/hooks/useTaxData';

const taxProfileSchema = z.object({
  entity_type: z.enum(['individual', 'sole_proprietorship', 'partnership', 'c_corporation', 's_corporation', 'llc', 'trust', 'estate', 'other']),
  business_name: z.string().optional(),
  individual_name: z.string().optional(),
  tax_id_type: z.enum(['ssn', 'ein', 'itin']),
  tax_id_number: z.string().min(9, 'Tax ID must be at least 9 characters'),
  address_line_1: z.string().min(1, 'Address is required'),
  address_line_2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip_code: z.string().min(5, 'ZIP code must be at least 5 characters'),
  country: z.string().default('US'),
  backup_withholding_exempt: z.boolean().default(false),
  fatca_exempt: z.boolean().default(false),
}).refine((data) => {
  if (data.entity_type === 'individual' && !data.individual_name) {
    return false;
  }
  if (data.entity_type !== 'individual' && !data.business_name) {
    return false;
  }
  return true;
}, {
  message: "Name is required based on entity type",
  path: ["individual_name", "business_name"],
});

type TaxProfileFormData = z.infer<typeof taxProfileSchema>;

interface TaxProfileFormProps {
  userId: string;
  portfolioId?: string;
  existingProfile?: TaxProfile | null;
}

const ENTITY_TYPE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'c_corporation', label: 'C Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'llc', label: 'LLC' },
  { value: 'trust', label: 'Trust' },
  { value: 'estate', label: 'Estate' },
  { value: 'other', label: 'Other' },
];

const TAX_ID_TYPE_OPTIONS = [
  { value: 'ssn', label: 'Social Security Number (SSN)' },
  { value: 'ein', label: 'Employer Identification Number (EIN)' },
  { value: 'itin', label: 'Individual Taxpayer Identification Number (ITIN)' },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const TaxProfileForm: React.FC<TaxProfileFormProps> = ({
  userId,
  portfolioId,
  existingProfile,
}) => {
  const [isEditing, setIsEditing] = useState(!existingProfile);
  const taxProfileMutation = useTaxProfileMutation();

  const form = useForm<TaxProfileFormData>({
    resolver: zodResolver(taxProfileSchema),
    defaultValues: {
      entity_type: existingProfile?.entity_type || 'individual',
      business_name: existingProfile?.business_name || '',
      individual_name: existingProfile?.individual_name || '',
      tax_id_type: existingProfile?.tax_id_type || 'ssn',
      tax_id_number: existingProfile?.tax_id_number || '',
      address_line_1: existingProfile?.address_line_1 || '',
      address_line_2: existingProfile?.address_line_2 || '',
      city: existingProfile?.city || '',
      state: existingProfile?.state || '',
      zip_code: existingProfile?.zip_code || '',
      country: existingProfile?.country || 'US',
      backup_withholding_exempt: existingProfile?.backup_withholding_exempt || false,
      fatca_exempt: existingProfile?.fatca_exempt || false,
    },
  });

  const watchEntityType = form.watch('entity_type');

  const onSubmit = async (data: TaxProfileFormData) => {
    const profileData = {
      ...data,
      user_id: userId,
      portfolio_id: portfolioId,
      id: existingProfile?.id,
      status: 'collected' as const,
    };

    taxProfileMutation.mutate(profileData, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const formatTaxId = (value: string, type: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, '');
    
    if (type === 'ssn') {
      // Format as XXX-XX-XXXX
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
    } else if (type === 'ein') {
      // Format as XX-XXXXXXX
      if (numbers.length <= 2) return numbers;
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 9)}`;
    } else {
      // ITIN format similar to SSN
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 9)}`;
    }
  };

  if (!isEditing && existingProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              W-9 Tax Information
            </span>
            <Button variant="outline" onClick={handleEdit}>
              Edit
            </Button>
          </CardTitle>
          <CardDescription>
            Review your tax information on file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
              <p className="text-sm">
                {ENTITY_TYPE_OPTIONS.find(opt => opt.value === existingProfile.entity_type)?.label}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {existingProfile.entity_type === 'individual' ? 'Full Name' : 'Business Name'}
              </label>
              <p className="text-sm">
                {existingProfile.entity_type === 'individual' 
                  ? existingProfile.individual_name 
                  : existingProfile.business_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tax ID Type</label>
              <p className="text-sm">
                {TAX_ID_TYPE_OPTIONS.find(opt => opt.value === existingProfile.tax_id_type)?.label}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tax ID</label>
              <p className="text-sm">***-**-{existingProfile.tax_id_number?.slice(-4)}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground">Address</label>
            <div className="text-sm space-y-1">
              <p>{existingProfile.address_line_1}</p>
              {existingProfile.address_line_2 && <p>{existingProfile.address_line_2}</p>}
              <p>{existingProfile.city}, {existingProfile.state} {existingProfile.zip_code}</p>
              <p>{existingProfile.country}</p>
            </div>
          </div>

          {existingProfile.w9_form_url && (
            <div className="pt-4 border-t">
              <label className="text-sm font-medium text-muted-foreground">W-9 Form</label>
              <div className="flex items-center gap-2 mt-1">
                <FileText className="w-4 h-4" />
                <a 
                  href={existingProfile.w9_form_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Download W-9 Form
                </a>
                <Download className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          W-9 Tax Information
        </CardTitle>
        <CardDescription>
          Provide your tax information for 1099 reporting compliance. This information is encrypted and secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Entity Type */}
            <FormField
              control={form.control}
              name="entity_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entity Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ENTITY_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name Fields */}
            {watchEntityType === 'individual' ? (
              <FormField
                control={form.control}
                name="individual_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your full legal name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your business name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tax ID Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tax_id_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TAX_ID_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_id_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID Number</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        placeholder="XXX-XX-XXXX"
                        onChange={(e) => {
                          const formatted = formatTaxId(e.target.value, form.watch('tax_id_type'));
                          field.onChange(formatted);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Your tax identification number (encrypted and secure)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>
              
              <FormField
                control={form.control}
                name="address_line_1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_line_2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apartment, suite, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ZIP Code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Exemptions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Exemptions</h3>
              
              <FormField
                control={form.control}
                name="backup_withholding_exempt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Exempt from backup withholding
                      </FormLabel>
                      <FormDescription>
                        Check if you are exempt from backup withholding
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fatca_exempt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Exempt from FATCA reporting
                      </FormLabel>
                      <FormDescription>
                        Check if you are exempt from Foreign Account Tax Compliance Act reporting
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={taxProfileMutation.isPending}
                className="flex-1"
              >
                {taxProfileMutation.isPending ? 'Saving...' : 'Save W-9 Information'}
              </Button>
              {existingProfile && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};