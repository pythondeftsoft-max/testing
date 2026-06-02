import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantProfileData } from './useTenantProfile';

export interface ProfileRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'basic' | 'financial' | 'housing' | 'background';
  missingFields: string[];
  icon: string;
}

export interface ProfileAnalysis {
  completionPercentage: number;
  recommendations: ProfileRecommendation[];
  criticalMissing: string[];
  isProfileComplete: boolean;
}

const CRITICAL_FIELDS = [
  'firstName',
  'lastName', 
  'phone',
  'city',
  'creditScore',
  'rentRangeMin',
  'rentRangeMax',
  'moveInWindow'
];

const IMPORTANT_FIELDS = [
  'zipCode',
  'voucherStatus',
  'phoneType',
  'bedroomsApproved'
];

export const useProfileAnalysis = (userId: string) => {
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantProfile = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get tenant profile  
      const { data: tenantProfileData, error: tenantError } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (tenantError && tenantError.code !== 'PGRST116') {
        console.error('Tenant profile error:', tenantError);
      }

      setTenantProfile({ ...profile, ...tenantProfileData });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProfile = (profile: any): ProfileAnalysis => {
    if (!profile) {
      return {
        completionPercentage: 0,
        recommendations: [],
        criticalMissing: CRITICAL_FIELDS,
        isProfileComplete: false
      };
    }

    const recommendations: ProfileRecommendation[] = [];
    const missingFields: string[] = [];
    const criticalMissing: string[] = [];

    // Check critical fields
    CRITICAL_FIELDS.forEach(field => {
      const value = getFieldValue(profile, field);
      if (!value || value === '' || value === null || value === undefined) {
        criticalMissing.push(field);
        missingFields.push(field);
      }
    });

    // Check important fields
    IMPORTANT_FIELDS.forEach(field => {
      const value = getFieldValue(profile, field);
      if (!value || value === '' || value === null || value === undefined) {
        missingFields.push(field);
      }
    });

    // Generate recommendations based on missing fields
    if (criticalMissing.includes('firstName') || criticalMissing.includes('lastName')) {
      recommendations.push({
        id: 'basic-info',
        title: 'Complete Basic Information',
        description: 'Add your full name to help landlords identify your application.',
        priority: 'high',
        category: 'basic',
        missingFields: ['firstName', 'lastName'],
        icon: 'User'
      });
    }

    if (criticalMissing.includes('phone')) {
      recommendations.push({
        id: 'contact-info',
        title: 'Add Contact Information',
        description: 'Provide your phone number so landlords can reach you quickly.',
        priority: 'high',
        category: 'basic',
        missingFields: ['phone'],
        icon: 'Phone'
      });
    }

    if (criticalMissing.includes('city') || missingFields.includes('zipCode')) {
      recommendations.push({
        id: 'location-info',
        title: 'Set Your Location',
        description: 'Add your city and zip code to find relevant properties nearby.',
        priority: 'high',
        category: 'basic',
        missingFields: ['city', 'zipCode'],
        icon: 'MapPin'
      });
    }

    if (criticalMissing.includes('creditScore')) {
      recommendations.push({
        id: 'credit-info',
        title: 'Add Credit Information',
        description: 'Specify your credit score range to help landlords assess your application.',
        priority: 'high',
        category: 'financial',
        missingFields: ['creditScore'],
        icon: 'CreditCard'
      });
    }

    if (criticalMissing.includes('rentRangeMin') || criticalMissing.includes('rentRangeMax')) {
      recommendations.push({
        id: 'rent-budget',
        title: 'Set Your Budget',
        description: 'Define your rent range to see properties that match your budget.',
        priority: 'high',
        category: 'financial',
        missingFields: ['rentRangeMin', 'rentRangeMax'],
        icon: 'DollarSign'
      });
    }

    if (criticalMissing.includes('moveInWindow')) {
      recommendations.push({
        id: 'move-in-timeline',
        title: 'Add Move-in Timeline',
        description: 'Let landlords know when you need to move in.',
        priority: 'medium',
        category: 'housing',
        missingFields: ['moveInWindow'],
        icon: 'Calendar'
      });
    }

    if (missingFields.includes('voucherStatus')) {
      recommendations.push({
        id: 'voucher-status',
        title: 'Update Voucher Status',
        description: 'Specify if you have a housing voucher to find accepting properties.',
        priority: 'medium',
        category: 'housing',
        missingFields: ['voucherStatus'],
        icon: 'FileText'
      });
    }

    if (missingFields.includes('bedroomsApproved')) {
      recommendations.push({
        id: 'housing-needs',
        title: 'Specify Housing Needs',
        description: 'Add how many bedrooms you need to filter relevant properties.',
        priority: 'medium',
        category: 'housing',
        missingFields: ['bedroomsApproved'],
        icon: 'Home'
      });
    }

    // Calculate completion percentage
    const totalFields = CRITICAL_FIELDS.length + IMPORTANT_FIELDS.length;
    const completedFields = totalFields - missingFields.length;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    const isProfileComplete = criticalMissing.length === 0 && missingFields.length <= 2;

    return {
      completionPercentage,
      recommendations: recommendations.slice(0, 4), // Limit to 4 recommendations
      criticalMissing,
      isProfileComplete
    };
  };

  const getFieldValue = (profile: any, field: string) => {
    const fieldMapping: { [key: string]: string } = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      city: 'city',
      zipCode: 'zip_code',
      creditScore: 'credit_score_range',
      rentRangeMin: 'rent_range_min',
      rentRangeMax: 'rent_range_max',
      moveInWindow: 'move_in_window',
      voucherStatus: 'voucher_status',
      phoneType: 'phone_type',
      bedroomsApproved: 'bedrooms_approved'
    };

    const dbField = fieldMapping[field] || field;
    return profile[dbField];
  };

  useEffect(() => {
    if (userId) {
      fetchTenantProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (tenantProfile) {
      const profileAnalysis = analyzeProfile(tenantProfile);
      setAnalysis(profileAnalysis);
    }
  }, [tenantProfile]);

  return { analysis, loading, refetch: fetchTenantProfile };
};