import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ScrapedPropertyData } from '@/lib/api/propertyScraperApi';

interface QuickImportInput {
  // Property data (from scraping or manual entry)
  address: string;
  city: string;
  state: string;
  zipCode: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  description?: string;
  propertyType: 'house' | 'apartment' | 'townhouse' | 'mobile_home';
  amenities: string[];
  petFriendly?: boolean;
  petDeposit?: number;
  photos?: string[];
  sourceUrl?: string;
  
  // Client/Portfolio
  portfolioId?: string; // Existing portfolio
  newClient?: {
    name: string;
    email?: string;
    phone?: string;
  };
  
  // Import options
  listOnMarketplace: boolean;
  
  // Push to tenant
  pushToTenant?: {
    tenantId: string;
    tenantName: string;
  };
  
  // Admin context
  adminUserId: string;
}

interface QuickImportResult {
  propertyId: string;
  unitId: string;
  portfolioId: string;
  pushId?: string;
  success: boolean;
}

export const useQuickPropertyImport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuickImportInput): Promise<QuickImportResult> => {
      let portfolioId = input.portfolioId;

      // Step 1: Create new client/portfolio if needed
      if (!portfolioId && input.newClient) {
        console.log('Creating new client portfolio:', input.newClient.name);
        
        const { data: newPortfolio, error: portfolioError } = await supabase
          .from('portfolios')
          .insert({
            client_name: input.newClient.name,
            client_email: input.newClient.email || null,
            client_phone: input.newClient.phone || null,
            manager_id: input.adminUserId,
          })
          .select('id')
          .single();

        if (portfolioError) {
          console.error('Failed to create portfolio:', portfolioError);
          throw new Error(`Failed to create client: ${portfolioError.message}`);
        }

        portfolioId = newPortfolio.id;
        console.log('Created portfolio:', portfolioId);
      }

      if (!portfolioId) {
        throw new Error('A client must be selected or created');
      }

      // Step 2: Create property
      console.log('Creating property:', input.address);
      
      // Build amenities object from array
      const amenitiesObject: Record<string, boolean> = {};
      for (const key of input.amenities) {
        amenitiesObject[key] = true;
      }

      const { data: newProperty, error: propertyError } = await supabase
        .from('properties')
        .insert({
          address: input.address,
          city: input.city,
          state: input.state,
          zipcode: input.zipCode,
          property_type: input.propertyType,
          portfolio_id: portfolioId,
          owner_id: input.adminUserId,
          on_market: input.listOnMarketplace,
          listing_status: input.listOnMarketplace ? 'active' : 'pending_activation',
          activated_at: input.listOnMarketplace ? new Date().toISOString() : null,
          activated_by: input.listOnMarketplace ? input.adminUserId : null,
          admin_listed: true,
          photos: input.photos || [],
          amenities: input.amenities,
          pets_allowed: input.petFriendly || false,
          pet_deposit: input.petDeposit || null,
          source_url: input.sourceUrl || null,
        })
        .select('id')
        .single();

      if (propertyError) {
        console.error('Failed to create property:', propertyError);
        throw new Error(`Failed to create property: ${propertyError.message}`);
      }

      const propertyId = newProperty.id;
      console.log('Created property:', propertyId);

      // Step 3: Create unit
      console.log('Creating unit for property:', propertyId);
      
      const { data: newUnit, error: unitError } = await supabase
        .from('property_units')
        .insert({
          property_id: propertyId,
          unit_number: 'Main',
          monthly_rent: input.rent,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          square_feet: input.squareFeet || null,
          description: input.description || null,
          status: input.listOnMarketplace ? 'vacant' : 'unlisted',
          on_market: input.listOnMarketplace,
          listing_status: input.listOnMarketplace ? 'active' : 'pending_activation',
          photos: input.photos || [],
        })
        .select('id')
        .single();

      if (unitError) {
        console.error('Failed to create unit:', unitError);
        throw new Error(`Failed to create unit: ${unitError.message}`);
      }

      const unitId = newUnit.id;
      console.log('Created unit:', unitId);

      let pushId: string | undefined;

      // Step 4: Push to tenant if requested
      if (input.pushToTenant) {
        console.log('Pushing to tenant:', input.pushToTenant.tenantName);
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // 14 days expiry

        const { data: newPush, error: pushError } = await supabase
          .from('property_pushes')
          .insert({
            tenant_id: input.pushToTenant.tenantId,
            property_id: propertyId,
            unit_id: unitId,
            admin_id: input.adminUserId,
            status: 'push_sent',
            expires_at: expiresAt.toISOString(),
            quota_bypass: true,
            email_sent: false,
          })
          .select('id')
          .single();

        if (pushError) {
          console.error('Failed to create push:', pushError);
          // Don't fail the whole import, just log the error
          toast.error('Property imported but push to tenant failed');
        } else {
          pushId = newPush.id;
          console.log('Created push:', pushId);

          // Create notification for tenant
          try {
            await supabase
              .from('notifications')
              .insert({
                user_id: input.pushToTenant.tenantId,
                type: 'property_match',
                title: 'New Property Match!',
                message: `A matchmaker found a property for you at ${input.address}, ${input.city}`,
                is_read: false,
                data: {
                  property_id: propertyId,
                  unit_id: unitId,
                  push_id: pushId,
                },
              });
            console.log('Created notification for tenant');
          } catch (notifError) {
            console.error('Failed to create notification:', notifError);
          }

          // Try to send email notification
          try {
            await supabase.functions.invoke('send-property-match-email', {
              body: {
                pushId: pushId,
                tenantId: input.pushToTenant.tenantId,
                propertyId: propertyId,
              },
            });
            console.log('Email notification sent');
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the import for email issues
          }
        }
      }

      return {
        propertyId,
        unitId,
        portfolioId,
        pushId,
        success: true,
      };
    },
    onSuccess: (result, input) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['property-pushes'] });
      queryClient.invalidateQueries({ queryKey: ['internal-matches'] });

      const successMessage = input.pushToTenant
        ? `Property imported and sent to ${input.pushToTenant.tenantName}!`
        : 'Property imported successfully!';

      toast.success(successMessage, {
        description: `${input.address}, ${input.city}`,
      });
    },
    onError: (error) => {
      console.error('Quick import failed:', error);
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
};
