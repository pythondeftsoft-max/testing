
import { supabase } from '@/integrations/supabase/client';

// Portfolio points configuration
const PORTFOLIO_POINTS_CONFIG = {
  rent_payment: 50,
  lease_signing: 100,
  maintenance_completion: 25,
  tenant_retention: 75,
  property_inspection: 30,
  lease_renewal: 60,
  application_processing: 20,
  rent_collection: 40,
} as const;

export type PortfolioEventType = keyof typeof PORTFOLIO_POINTS_CONFIG;

// Enhanced utility functions using the new edge function system
export const awardPortfolioPointsForEvent = async (
  eventType: PortfolioEventType,
  portfolioId: string,
  options: {
    propertyId?: string;
    tenantId?: string;
    notes?: string;
    multiplier?: number;
    metadata?: Record<string, any>;
  } = {}
) => {
  try {
    // Use the new process-portfolio-events edge function for automated processing
    const { data, error } = await supabase.functions.invoke('process-portfolio-events', {
      body: {
        eventType,
        portfolioId,
        propertyId: options.propertyId,
        tenantId: options.tenantId,
        metadata: {
          ...options.metadata,
          multiplier: options.multiplier,
          customNotes: options.notes,
        },
      },
    });

    if (error) throw error;

    console.log(`Processed ${eventType} event for portfolio ${portfolioId}:`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to process ${eventType} event:`, error);
    return { success: false, error };
  }
};

// Enhanced specific event handlers using the new automation system
export const handleRentPaymentPoints = async (
  portfolioId: string,
  rentAmount: number,
  options?: {
    propertyId?: string;
    tenantId?: string;
    isEarly?: boolean;
  }
) => {
  return awardPortfolioPointsForEvent('rent_payment', portfolioId, {
    propertyId: options?.propertyId,
    tenantId: options?.tenantId,
    metadata: {
      rentAmount,
      isEarly: options?.isEarly || false,
    },
  });
};

export const handleLeaseSigningPoints = async (
  portfolioId: string,
  propertyId: string,
  tenantId: string
) => {
  return awardPortfolioPointsForEvent('lease_signing', portfolioId, {
    propertyId,
    tenantId,
  });
};

export const handleMaintenanceCompletionPoints = async (
  portfolioId: string,
  propertyId: string,
  maintenanceRequestId: string
) => {
  return awardPortfolioPointsForEvent('maintenance_completion', portfolioId, {
    propertyId,
    metadata: {
      maintenanceRequestId,
    },
  });
};

export const handleLeaseRenewalPoints = async (
  portfolioId: string,
  propertyId: string,
  tenantId: string,
  monthsRetained?: number
) => {
  return awardPortfolioPointsForEvent('lease_renewal', portfolioId, {
    propertyId,
    tenantId,
    metadata: {
      monthsRetained,
    },
  });
};

export const handleTenantRetentionPoints = async (
  portfolioId: string,
  propertyId: string,
  tenantId: string,
  monthsRetained: number
) => {
  return awardPortfolioPointsForEvent('tenant_retention', portfolioId, {
    propertyId,
    tenantId,
    metadata: {
      monthsRetained,
    },
  });
};

export const handlePropertyInspectionPoints = async (
  portfolioId: string,
  propertyId: string,
  inspectionType: string
) => {
  return awardPortfolioPointsForEvent('property_inspection', portfolioId, {
    propertyId,
    metadata: {
      inspectionType,
    },
  });
};

export const handleApplicationProcessingPoints = async (
  portfolioId: string,
  propertyId: string,
  applicationId: string
) => {
  return awardPortfolioPointsForEvent('application_processing', portfolioId, {
    propertyId,
    metadata: {
      applicationId,
    },
  });
};

export const handleRentCollectionPoints = async (
  portfolioId: string,
  propertyId: string,
  collectionAmount: number
) => {
  return awardPortfolioPointsForEvent('rent_collection', portfolioId, {
    propertyId,
    metadata: {
      collectionAmount,
    },
  });
};

// Bulk event processing for multiple events
export const processBulkPortfolioEvents = async (
  events: Array<{
    eventType: PortfolioEventType;
    portfolioId: string;
    propertyId?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
  }>
) => {
  const results = await Promise.allSettled(
    events.map(event => awardPortfolioPointsForEvent(
      event.eventType,
      event.portfolioId,
      {
        propertyId: event.propertyId,
        tenantId: event.tenantId,
        metadata: event.metadata,
      }
    ))
  );

  const successful = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.filter(result => result.status === 'rejected').length;

  console.log(`Bulk processing completed: ${successful} successful, ${failed} failed`);
  return { successful, failed, results };
};
