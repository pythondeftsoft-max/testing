import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Home, Building2, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ConditionalTenantFields from '@/components/ConditionalTenantFields';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { useTheme } from '@/components/DynamicThemeProvider';
import WhiteLabelBranding from '@/components/WhiteLabelBranding';
import { formatPhoneInput, cleanPhoneNumber } from '@/utils/phoneFormatting';
import { clearImpersonationData } from '@/utils/impersonationUtils';
import { SecureStorage } from '@/utils/secureStorage';

// Helper: Check if error is a network-level failure
const isNetworkError = (error: any): boolean => {
  const message = error?.message || '';
  return (
    message === 'Load failed' ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('Network request failed') ||
    message.includes('AbortError') ||
    message.includes('network') ||
    error?.name === 'TypeError' ||
    error?.name === 'AbortError'
  );
};

// Helper: Retry with exponential backoff for transient network errors
// Now with visible progress callback for user feedback
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 10,
  onAttempt?: (attempt: number, maxRetries: number) => void
): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0 && onAttempt) {
        onAttempt(attempt, maxRetries);
      }
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on network errors, not auth errors
      if (!isNetworkError(error) || attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (longer delays for flaky mobile: 3s, 5s, 8s, 10s, 10s...)
      const delays = [3000, 5000, 8000, 10000, 10000, 10000, 10000, 10000, 10000, 10000];
      const delay = delays[attempt] || 10000;
      console.log(`[Auth] Retry attempt ${attempt + 1} after ${delay}ms due to network error:`, error.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};

// Helper: Queue signup for background processing when retries fail
const queueSignupForBackgroundProcessing = async (
  email: string,
  password: string,
  signupMetadata: Record<string, any>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/queue-signup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, signupMetadata }),
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || 'Queue request failed' };
    }
    
    const data = await response.json();
    return { success: data.success, error: data.error };
  } catch (error: any) {
    console.error('[Auth] Queue signup failed:', error);
    return { success: false, error: error.message };
  }
};

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  // Forgot-password (request reset email) mode
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    userType: '' as '' | 'landlord' | 'tenant', // No default - must select first
    tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker', // Tenant sub-selection
    // Tenant-specific fields
    phoneType: '',
    countryCode: 'US',
    state: '',
    city: '',
    zipCode: '',
    voucherStatus: '',
    rentRangeMin: '',
    rentRangeMax: '',
    housingAuthority: '',
    housingAuthorityId: '',
    bedroomsApproved: [] as string[],
    moveInWindow: '',
    creditScoreRange: '',
    hasEviction: null,
    evictionDetails: '',
    hasPets: null,
    petType: '',
    hasAccessibilityNeeds: null,
    accessibilityDetails: '',
    hasFelonies: null,
    felonyDetails: '',
    employmentStatus: '',
    monthlyIncome: '',
    currentRentPortion: '',
    signupNotes: '',
    smsConsent: false,
    desiredSameLocation: true,
    desiredState: '',
    desiredCity: '',
    desiredZipCode: '',
    currentAddress: '',
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logAuthEvent } = useSecurityAudit();
  const { isWhiteLabeled } = useTheme();

  // Map legacy credit score values to database-compatible values
  const mapCreditScore = (value: string): string => {
    const mapping: Record<string, string> = {
      'excellent': '700+',
      'good': '640-699',
      'fair': '580-639',
      'poor': '500-579',
      'very-poor': 'below-500',
      'no-credit': 'not-specified',
      '700-plus': '700+'
    };
    return mapping[value] || value;
  };

  // Map legacy move-in window values to database-compatible values
  const mapMoveInWindow = (value: string): string => {
    const mapping: Record<string, string> = {
      'immediately': 'asap',
      'within-30-days': '30-days',
      '1-3-months': '1-2-months',
      '3-6-months': '1-2-months',
      '6-months-plus': '1-2-months'
    };
    return mapping[value] || value;
  };

  // Handle URL parameters and pre-populate form on component mount
  useEffect(() => {
    const mode = searchParams.get('mode');
    const type = searchParams.get('type');
    const referralCode = searchParams.get('referral') || searchParams.get('ref');
    
    // SEO context params
    const seoSource = searchParams.get('source');
    const seoTemplateType = searchParams.get('template_type');
    const seoCity = searchParams.get('city');
    const seoState = searchParams.get('state');
    const seoPageUrl = searchParams.get('page_url');
    
    // Store SEO context if coming from SEO page
    if (seoSource === 'seo') {
      const seoContext = {
        source: seoSource,
        template_type: seoTemplateType,
        city: seoCity,
        state: seoState,
        page_url: seoPageUrl
      };
      sessionStorage.setItem('seo_lead_context', JSON.stringify(seoContext));
      console.log('SEO context stored for signup:', seoContext);
    }
    
    if (mode === 'signup') {
      setIsLogin(false);
    }
    
    // Store referral code in sessionStorage if present
    if (referralCode) {
      sessionStorage.setItem('referral_code', referralCode);
      setIsLogin(false); // Force signup mode for referrals
    }

    // Handle type parameter - set userType directly (they came from intake or direct link)
    if (type === 'tenant' && mode === 'signup') {
      // Check for pre-filled tenant form data
      const tenantApplicationData = sessionStorage.getItem('tenant_application_data');
      
      if (tenantApplicationData) {
        try {
          const data = JSON.parse(tenantApplicationData);
          console.log('Pre-populating form with cached data:', data);
          
          // Pre-populate and auto-select housing_seeker intent since they came from intake
          setFormData(prev => ({
            ...prev,
            userType: 'tenant',
            tenantIntent: 'housing_seeker',
            email: data.email || '',
            phone: data.phoneNumber || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            phoneType: data.phoneType || '',
            countryCode: data.countryCode || 'US',
            state: data.state || '',
            city: data.city || '',
            zipCode: data.zipCode || '',
            voucherStatus: data.voucherStatus || '',
            rentRangeMin: data.rentRange ? data.rentRange.split('-')[0]?.replace(/\D/g, '') || '' : '',
            rentRangeMax: data.rentRange ? data.rentRange.split('-')[1]?.replace(/\D/g, '') || '' : '',
            housingAuthority: data.housingAuthorityIssuer || '',
            bedroomsApproved: data.bedroomsApproved ? [data.bedroomsApproved] : [],
            moveInWindow: mapMoveInWindow(data.moveInTiming || ''),
            creditScoreRange: mapCreditScore(data.creditScore || ''),
            hasEviction: data.evictionHistory === 'yes' ? true : data.evictionHistory === 'no' ? false : null,
            evictionDetails: data.evictionTimeAgo || '',
            hasPets: data.hasPets === 'yes' ? true : data.hasPets === 'no' ? false : null,
            petType: data.petType || '',
            hasAccessibilityNeeds: data.hasAccessibilityNeeds === 'yes' ? true : data.hasAccessibilityNeeds === 'no' ? false : null,
            accessibilityDetails: data.accessibilityDetails || '',
            hasFelonies: data.felonies === 'yes' ? true : data.felonies === 'no' || data.felonies === 'None' ? false : null,
            felonyDetails: data.felonies || '',
            employmentStatus: data.employmentStatus || '',
            monthlyIncome: data.monthlyIncome || '',
            currentRentPortion: data.currentRentPortion || '',
          }));
        } catch (error) {
          console.error('Error parsing tenant application data:', error);
          // Set tenant type, let them pick intent
          setFormData(prev => ({ ...prev, userType: 'tenant' }));
        }
      } else {
        // No cached data — set tenant type, they'll pick intent next
        setFormData(prev => ({ ...prev, userType: 'tenant' }));
      }
    } else if (type === 'landlord' && mode === 'signup') {
      // Direct landlord link - skip selection
      setFormData(prev => ({ ...prev, userType: 'landlord' }));
    }
    // If no type param, userType stays empty and selection cards will show
  }, [searchParams, toast, navigate]);

  // Handle account type selection during signup
  const handleAccountTypeSelect = (type: 'landlord' | 'tenant') => {
    if (type === 'tenant') {
      // Set userType FIRST, then skip intent selection
      setFormData(prev => ({ ...prev, userType: 'tenant' }));
      handleTenantIntentSelect('housing_seeker');
    } else {
      setFormData(prev => ({ ...prev, userType: 'landlord' }));
    }
  };

  // Handle tenant intent selection
  const handleTenantIntentSelect = (intent: 'housing_seeker' | 'rent_tracker') => {
    if (intent === 'housing_seeker') {
      // Check for pre-populated data from intake
      const existingData = sessionStorage.getItem('tenant_application_data');
      if (existingData) {
        try {
          const data = JSON.parse(existingData);
          setFormData(prev => ({
            ...prev,
            tenantIntent: 'housing_seeker',
            email: data.email || prev.email,
            phone: data.phoneNumber || prev.phone,
            firstName: data.firstName || prev.firstName,
            lastName: data.lastName || prev.lastName,
            phoneType: data.phoneType || '',
            countryCode: data.countryCode || 'US',
            state: data.state || '',
            city: data.city || '',
            zipCode: data.zipCode || '',
            voucherStatus: data.voucherStatus || '',
            rentRangeMin: data.rentRange ? data.rentRange.split('-')[0]?.replace(/\D/g, '') || '' : '',
            rentRangeMax: data.rentRange ? data.rentRange.split('-')[1]?.replace(/\D/g, '') || '' : '',
            housingAuthority: data.housingAuthorityIssuer || '',
            bedroomsApproved: data.bedroomsApproved ? [data.bedroomsApproved] : [],
            moveInWindow: mapMoveInWindow(data.moveInTiming || ''),
            creditScoreRange: mapCreditScore(data.creditScore || ''),
            hasEviction: data.evictionHistory === 'yes' ? true : data.evictionHistory === 'no' ? false : null,
            evictionDetails: data.evictionTimeAgo || '',
            hasPets: data.hasPets === 'yes' ? true : data.hasPets === 'no' ? false : null,
            petType: data.petType || '',
            hasAccessibilityNeeds: data.hasAccessibilityNeeds === 'yes' ? true : data.hasAccessibilityNeeds === 'no' ? false : null,
            accessibilityDetails: data.accessibilityDetails || '',
            hasFelonies: data.felonies === 'yes' ? true : data.felonies === 'no' || data.felonies === 'None' ? false : null,
            felonyDetails: data.felonies || '',
            employmentStatus: data.employmentStatus || '',
            monthlyIncome: data.monthlyIncome || '',
            currentRentPortion: data.currentRentPortion || '',
          }));
        } catch (error) {
          console.error('Error parsing tenant data:', error);
          setFormData(prev => ({ ...prev, tenantIntent: 'housing_seeker' }));
        }
      } else {
        setFormData(prev => ({ ...prev, tenantIntent: 'housing_seeker' }));
      }
    } else {
      setFormData(prev => ({ ...prev, tenantIntent: 'rent_tracker' }));
    }
  };

  // Reset account type selection
  const handleBackToSelection = () => {
    setFormData(prev => ({ ...prev, userType: '' as '' | 'landlord' | 'tenant', tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker' }));
  };

  // Go back to intent selection (tenant sub-step)
  const handleBackToIntentSelection = () => {
    setFormData(prev => ({ ...prev, tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker' }));
  };

  // State for showing recovery option after errors
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);

  // Handle session recovery - clears all secure data and reloads
  const handleSessionRecovery = () => {
    console.log('[Auth] User triggered session recovery');
    SecureStorage.clearSecureData();
    SecureStorage.clearSessionData();
    sessionStorage.clear();
    // Clear any stale auth tokens
    localStorage.removeItem('sb-kixsdhnfzjnxikmnbipi-auth-token');
    window.location.reload();
  };

  // Handle "Forgot password?" request — sends a password reset email
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (resetEmail || formData.email).trim();

    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter the email address for your account.',
        variant: 'destructive',
      });
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast({
        title: 'No Internet Connection',
        description: 'Please connect to the internet and try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setLoadingText('Sending reset link...');

    try {
      const { error } = await retryWithBackoff(
        async () =>
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          }),
        10,
        (attempt, max) => setLoadingText(`Still sending... (attempt ${attempt}/${max})`),
      );

      if (error) {
        logAuthEvent('password_reset_requested', undefined, {
          email,
          status: 'error',
          error_type: error.message,
        }).catch((err) => console.warn('Failed to log auth event:', err));
        throw error;
      }

      logAuthEvent('password_reset_requested', undefined, {
        email,
        status: 'sent',
      }).catch((err) => console.warn('Failed to log auth event:', err));

      // Always show a generic success state (avoid leaking which emails exist)
      setResetEmailSent(true);
      toast({
        title: 'Check your email',
        description: `If an account exists for ${email}, we've sent a password reset link.`,
      });
    } catch (error: any) {
      console.error('[Auth] Password reset request failed:', error);
      if (isNetworkError(error)) {
        toast({
          title: 'Connection problem',
          description: 'We could not reach the server. Please try again.',
          variant: 'destructive',
        });
      } else {
        // For non-network errors, still show a generic message to prevent enumeration
        setResetEmailSent(true);
        toast({
          title: 'Check your email',
          description: `If an account exists for ${email}, we've sent a password reset link.`,
        });
      }
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  // Return from forgot-password view back to the sign-in form
  const exitForgotPassword = () => {
    setIsForgotPassword(false);
    setResetEmailSent(false);
    setResetEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Auth] Form submitted, starting authentication...');
    setLoading(true);
    setLoadingText('Checking connection...');
    setShowRecoveryOption(false); // Reset recovery option

    // Check for offline status immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({
        title: "No Internet Connection",
        description: "Please connect to the internet and try again.",
        variant: "destructive",
      });
      setLoading(false);
      setLoadingText('');
      return;
    }

    // Defensive: Clear any potentially corrupted session data before login
    // This prevents stale encrypted data from causing issues
    if (isLogin) {
      SecureStorage.clearSecureData();
      SecureStorage.clearSessionData();
      // Clear stale Supabase token to ensure fresh login
      localStorage.removeItem('sb-kixsdhnfzjnxikmnbipi-auth-token');
    }

    try {
      if (isLogin) {
        setLoadingText('Signing in...');
        console.log('[Auth] Processing login for:', formData.email);
        
        // Progressive loading feedback for slow connections
        const loginStartTime = Date.now();
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - loginStartTime;
          if (elapsed > 15000) {
            setLoadingText('Connection is slow, please wait...');
          } else if (elapsed > 10000) {
            setLoadingText('Almost there...');
          } else if (elapsed > 5000) {
            setLoadingText('Still connecting...');
          }
        }, 1000);
        
        try {
          // Login WITHOUT timeout - let Supabase complete naturally
          // Retries only happen on network errors, not auth errors
          const { data, error } = await retryWithBackoff(
            async () => supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            }),
            10, // max retries
            (attempt, max) => setLoadingText(`Still connecting... (attempt ${attempt}/${max})`)
          );
          
          clearInterval(progressInterval);

          if (error) {
            // Log failed login attempt - fire and forget (don't block UI)
            logAuthEvent('failed_login_attempt', undefined, {
              email: formData.email,
              error_type: error.message,
              login_method: 'email'
            }).catch(err => console.warn('Failed to log auth event:', err));
            throw error;
          }

          // Log login duration for monitoring
          const loginDuration = Date.now() - loginStartTime;
          console.log(`[Auth] Login completed in ${loginDuration}ms`);

          // Clear any stale impersonation data on fresh sign-in
          clearImpersonationData();
          
          // CRITICAL: Clear dashboard cache to prevent user mismatch (e.g., admin cache shown to tenant)
          sessionStorage.removeItem('dashboard_user');
          sessionStorage.removeItem('dashboard_profile');
          
          // Successful login is logged by the useAuth hook
          toast({
            title: "Welcome back!",
            description: "You've been successfully logged in.",
          });

          // Add small delay to ensure auth state is updated
          setTimeout(() => navigate('/dashboard'), 100);
        } catch (loginError) {
          clearInterval(progressInterval);
          throw loginError;
        }
      } else {
        // Validate SMS consent for ALL signups (tenant and landlord)
        if (!formData.smsConsent) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          toast({
            title: "SMS Consent Required",
            description: "Please agree to receive text updates to continue.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate tenant has all required fields (safety net)
        if (formData.userType === 'tenant') {
          const missingFields = [];
          
          // Personal info (always required for all tenants)
          if (!formData.firstName?.trim()) missingFields.push('First Name');
          if (!formData.lastName?.trim()) missingFields.push('Last Name');
          if (!formData.phone?.trim()) missingFields.push('Phone Number');
          if (!formData.phoneType) missingFields.push('Phone Type');
          
          // Location (always required)
          if ((formData.countryCode || 'US') === 'US' && !formData.state?.trim()) missingFields.push('State');
          if ((formData.countryCode || 'US') === 'US' && !formData.city?.trim()) missingFields.push('City');
          if ((formData.countryCode || 'US') === 'US' && !formData.zipCode?.trim()) missingFields.push('Zip Code');
          
          // Housing fields only required for housing_seeker
          if (formData.tenantIntent !== 'rent_tracker') {
            if (!formData.voucherStatus) missingFields.push('Voucher Status');
            if (!formData.bedroomsApproved?.length) missingFields.push('Bedrooms Approved');
            if (!formData.rentRangeMin || !formData.rentRangeMax) missingFields.push('Rent Range');
            // Housing Authority is only collected (and only relevant) when the
            // tenant has or is applying for a voucher — see ConditionalTenantFields.
            const voucherHolder = formData.voucherStatus === 'yes' || formData.voucherStatus === 'in-progress';
            if (voucherHolder && !formData.housingAuthority?.trim()) missingFields.push('Housing Authority');
            
            // Background
            if (!formData.moveInWindow) missingFields.push('Move-in Timeline');
            if (!formData.creditScoreRange) missingFields.push('Credit Score');
            if (!formData.employmentStatus?.trim()) missingFields.push('Employment Status');
            if (!formData.monthlyIncome) missingFields.push('Monthly Income');
            if (formData.hasEviction === null || formData.hasEviction === undefined) missingFields.push('Eviction History');
            if (formData.hasPets === null || formData.hasPets === undefined) missingFields.push('Pet Information');
            if (formData.hasFelonies === null || formData.hasFelonies === undefined) missingFields.push('Criminal History');
            if (formData.hasAccessibilityNeeds === null || formData.hasAccessibilityNeeds === undefined) missingFields.push('Accessibility Needs');
            
            // Desired location validation (housing seeker + US + toggle OFF)
            if ((formData.countryCode || 'US') === 'US' && formData.desiredSameLocation === false) {
              if (!formData.desiredState?.trim()) missingFields.push('Desired State');
              if (!formData.desiredCity?.trim()) missingFields.push('Desired City');
              if (!formData.desiredZipCode?.trim()) missingFields.push('Desired Zip Code');
            }
          }
          
          // SMS consent required for all signups
          if (!formData.smsConsent) missingFields.push('SMS Consent');

          if (missingFields.length > 0) {
            console.log('[Auth] Validation failed, missing fields:', missingFields);
            // Scroll to top so toast is visible on mobile
            window.scrollTo({ top: 0, behavior: 'smooth' });
            toast({
              title: "Please Complete All Required Fields",
              description: `Missing: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? ` and ${missingFields.length - 3} more...` : ''}`,
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        setLoadingText('Creating account...');
        console.log('[Auth] Validation passed, preparing signup...');

        // Sign up with improved error handling
        // Safely access sessionStorage (may fail on mobile private browsing)
        let referralCode = null;
        let seoContext = null;
        try {
          referralCode = sessionStorage.getItem('referral_code');
          const seoContextStr = sessionStorage.getItem('seo_lead_context');
          seoContext = seoContextStr ? JSON.parse(seoContextStr) : null;
        } catch (storageError) {
          console.warn('[Auth] Could not access sessionStorage:', storageError);
        }
        
        // Build signup metadata - include ALL tenant fields so the trigger saves them atomically
        const signupMetadata: Record<string, any> = {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          company_name: formData.companyName?.trim() || null,
          phone: cleanPhoneNumber(formData.phone?.trim()) || null,
          user_type: formData.userType,
          referral_code: referralCode,
          seo_source: seoContext?.source || null,
          seo_template_type: seoContext?.template_type || null,
          seo_city: seoContext?.city || null,
          seo_state: seoContext?.state || null,
          seo_page_url: seoContext?.page_url || null,
          sms_consent: formData.smsConsent,
        };

        // Add tenant_intent to metadata
        if (formData.userType === 'tenant') {
          signupMetadata.tenant_intent = formData.tenantIntent || 'housing_seeker';
        }

        // Add ALL tenant-specific fields to metadata so the trigger can save them
        if (formData.userType === 'tenant') {
          signupMetadata.tenant_phone_type = formData.phoneType || null;
          signupMetadata.tenant_country_code = formData.countryCode || 'US';
          signupMetadata.tenant_state = formData.state?.trim() || null;
          signupMetadata.tenant_city = formData.city?.trim() || null;
          signupMetadata.tenant_zip_code = formData.zipCode?.trim() || null;
          signupMetadata.tenant_voucher_status = formData.voucherStatus || null;
          signupMetadata.tenant_housing_authority = formData.housingAuthority?.trim() || null;
          signupMetadata.tenant_housing_authority_id = formData.housingAuthorityId || null;
          signupMetadata.tenant_bedrooms_approved = formData.bedroomsApproved?.length > 0 ? formData.bedroomsApproved : null;
          signupMetadata.tenant_rent_range_min = formData.rentRangeMin || null;
          signupMetadata.tenant_rent_range_max = formData.rentRangeMax || null;
          signupMetadata.tenant_move_in_window = formData.moveInWindow || null;
          signupMetadata.tenant_credit_score_range = formData.creditScoreRange || null;
          signupMetadata.tenant_employment_status = formData.employmentStatus?.trim() || null;
          signupMetadata.tenant_monthly_income = formData.monthlyIncome || null;
          signupMetadata.tenant_has_eviction = formData.hasEviction ?? false;
          signupMetadata.tenant_eviction_details = formData.evictionDetails?.trim() || null;
          signupMetadata.tenant_has_pets = formData.hasPets ?? false;
          signupMetadata.tenant_pet_type = formData.petType?.trim() || null;
          signupMetadata.tenant_has_felonies = formData.hasFelonies ?? false;
          signupMetadata.tenant_felony_details = formData.felonyDetails?.trim() || null;
          signupMetadata.tenant_has_accessibility_needs = formData.hasAccessibilityNeeds ?? false;
          signupMetadata.tenant_accessibility_details = formData.accessibilityDetails?.trim() || null;
          signupMetadata.tenant_signup_notes = formData.signupNotes?.trim() || null;
          signupMetadata.tenant_current_address = formData.currentAddress?.trim() || null;
          
          // Desired location — copy from current if toggle is ON
          if (formData.tenantIntent === 'housing_seeker' && (formData.countryCode || 'US') === 'US') {
            if (formData.desiredSameLocation) {
              signupMetadata.tenant_desired_state = formData.state?.trim() || null;
              signupMetadata.tenant_desired_city = formData.city?.trim() || null;
              signupMetadata.tenant_desired_zip_code = formData.zipCode?.trim() || null;
            } else {
              signupMetadata.tenant_desired_state = formData.desiredState?.trim() || null;
              signupMetadata.tenant_desired_city = formData.desiredCity?.trim() || null;
              signupMetadata.tenant_desired_zip_code = formData.desiredZipCode?.trim() || null;
            }
          }
        }

        console.log('[Auth] Calling Supabase signUp...');
        
        // Store signup data for potential queue fallback
        const signupEmail = formData.email.toLowerCase().trim();
        const signupPassword = formData.password;
        
        // Signup with retry logic and visible progress (no artificial timeout)
        const { data, error } = await retryWithBackoff(
          async () => supabase.auth.signUp({
            email: signupEmail,
            password: signupPassword,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: signupMetadata,
            },
          }),
          10, // 10 retries for signup
          (attempt, maxRetries) => {
            // Update loading text with visible retry progress
            setLoadingText(`Still connecting... (attempt ${attempt + 1} of ${maxRetries + 1})`);
          }
        );

        console.log('[Auth] Supabase response received:', { hasData: !!data, hasError: !!error });

        if (error) throw error;
        
        setLoadingText('Setting up your profile...');

        // Tenant profile data is now saved atomically by the database trigger via signup metadata
        // No need for unreliable frontend updates - just clear cached data
        if (formData.userType === 'tenant' && data.user) {
          console.log('Tenant signup successful - profile data saved via database trigger');
          sessionStorage.removeItem('tenant_application_data');
          
          // Fire-and-forget: compute matches for new tenant immediately
          supabase.functions.invoke('compute-match-queue', {
            body: { directCompute: { entity_type: 'tenant', entity_id: data.user.id } }
          }).then(({ error }) => {
            if (error) console.warn('[Auth] Direct match compute for new tenant failed (non-blocking):', error);
            else console.log('[Auth] Direct match compute triggered for new tenant:', data.user!.id);
          });
        }

        // Clear referral code and SEO context from session storage after successful signup
        try {
          if (referralCode) {
            sessionStorage.removeItem('referral_code');
          }
          sessionStorage.removeItem('seo_lead_context');
        } catch (storageError) {
          console.warn('[Auth] Could not clear sessionStorage:', storageError);
        }

        // Check if user was auto-confirmed or needs email verification
        if (data.session) {
          // User was auto-confirmed - redirect to dashboard
          // CRITICAL: Clear dashboard cache to prevent user mismatch (e.g., old admin cache shown to new tenant)
          sessionStorage.removeItem('dashboard_user');
          sessionStorage.removeItem('dashboard_profile');
          
          toast({
            title: "Account created!",
            description: "You're now logged in. Redirecting to dashboard...",
          });
          setTimeout(() => navigate('/dashboard'), 100);
        } else {
          // Email confirmation required - switch to login mode
          toast({
            title: "Account created!",
            description: formData.userType === 'tenant' 
              ? "Your tenant account has been created. Please check your email to verify your account, then sign in."
              : "Please check your email to verify your account, then sign in.",
          });
          
          // Switch to login mode and keep email for convenience
          setIsLogin(true);
          setFormData(prev => ({
            ...prev,
            password: '',
            firstName: '',
            lastName: '',
            companyName: '',
            phone: '',
            userType: '' as '' | 'landlord' | 'tenant',
            tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker',
            // Keep email and country code for easy login
            phoneType: '',
            state: '',
            city: '',
            zipCode: '',
            voucherStatus: '',
            rentRangeMin: '',
            rentRangeMax: '',
            housingAuthority: '',
            bedroomsApproved: [],
            bathroomsApproved: [],
            moveInWindow: '',
            creditScoreRange: '',
            hasEviction: null,
            evictionDetails: '',
            hasPets: null,
            petType: '',
            hasAccessibilityNeeds: null,
            accessibilityDetails: '',
            hasFelonies: null,
            felonyDetails: '',
            employmentStatus: '',
            monthlyIncome: '',
            currentRentPortion: '',
            signupNotes: '',
          }));
        }
      }
    } catch (error: any) {
      console.error('[Auth] Error caught:', error);
      
      // Scroll to top so error toast is visible on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Handle network-level failures specifically (mobile reliability)
      // For SIGNUP only: Try to queue for background processing
      if (!isLogin && (isNetworkError(error) || error.message === 'Request timed out')) {
        setLoadingText('Your connection is unstable. Saving your data...');
        
        // Attempt to queue signup for background processing
        try {
          // Rebuild signup metadata for queue
          let referralCode = null;
          let seoContext = null;
          try {
            referralCode = sessionStorage.getItem('referral_code');
            const seoContextStr = sessionStorage.getItem('seo_lead_context');
            seoContext = seoContextStr ? JSON.parse(seoContextStr) : null;
          } catch (storageError) {
            console.warn('[Auth] Could not access sessionStorage:', storageError);
          }
          
          const queueMetadata: Record<string, any> = {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            company_name: formData.companyName?.trim() || null,
            phone: cleanPhoneNumber(formData.phone?.trim()) || null,
            user_type: formData.userType,
            referral_code: referralCode,
            seo_source: seoContext?.source || null,
            seo_template_type: seoContext?.template_type || null,
            sms_consent: formData.smsConsent,
          };
          
          // Add tenant fields if applicable
          if (formData.userType === 'tenant') {
            queueMetadata.tenant_phone_type = formData.phoneType || null;
            queueMetadata.tenant_country_code = formData.countryCode || 'US';
            queueMetadata.tenant_state = formData.state?.trim() || null;
            queueMetadata.tenant_city = formData.city?.trim() || null;
            queueMetadata.tenant_zip_code = formData.zipCode?.trim() || null;
            queueMetadata.tenant_voucher_status = formData.voucherStatus || null;
            queueMetadata.tenant_housing_authority = formData.housingAuthority?.trim() || null;
            queueMetadata.tenant_housing_authority_id = formData.housingAuthorityId || null;
            queueMetadata.tenant_bedrooms_approved = formData.bedroomsApproved?.length > 0 ? formData.bedroomsApproved : null;
            queueMetadata.tenant_rent_range_min = formData.rentRangeMin || null;
            queueMetadata.tenant_rent_range_max = formData.rentRangeMax || null;
            queueMetadata.tenant_move_in_window = formData.moveInWindow || null;
            queueMetadata.tenant_credit_score_range = formData.creditScoreRange || null;
            queueMetadata.tenant_employment_status = formData.employmentStatus?.trim() || null;
            queueMetadata.tenant_monthly_income = formData.monthlyIncome || null;
            queueMetadata.tenant_has_eviction = formData.hasEviction ?? false;
            queueMetadata.tenant_eviction_details = formData.evictionDetails?.trim() || null;
            queueMetadata.tenant_has_pets = formData.hasPets ?? false;
            queueMetadata.tenant_pet_type = formData.petType?.trim() || null;
            queueMetadata.tenant_has_felonies = formData.hasFelonies ?? false;
            queueMetadata.tenant_felony_details = formData.felonyDetails?.trim() || null;
            queueMetadata.tenant_has_accessibility_needs = formData.hasAccessibilityNeeds ?? false;
            queueMetadata.tenant_accessibility_details = formData.accessibilityDetails?.trim() || null;
            queueMetadata.tenant_signup_notes = formData.signupNotes?.trim() || null;
            queueMetadata.tenant_current_address = formData.currentAddress?.trim() || null;
          }
          
          const queueResult = await queueSignupForBackgroundProcessing(
            formData.email.toLowerCase().trim(),
            formData.password,
            queueMetadata
          );
          
          if (queueResult.success) {
            toast({
              title: "We've saved your information!",
              description: "Your connection is unstable, but we've saved your data. You'll receive an email when your account is ready.",
            });
            
            // Clear form and switch to login mode
            setIsLogin(true);
            setFormData(prev => ({
              ...prev,
              password: '',
              firstName: '',
              lastName: '',
              companyName: '',
              phone: '',
              userType: '' as '' | 'landlord' | 'tenant',
              tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker',
            }));
            return;
          }
        } catch (queueError) {
          console.error('[Auth] Queue signup also failed:', queueError);
        }
        
        // If queue also failed, save to localStorage as last resort
        try {
          localStorage.setItem('pending_signup_data', JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            userType: formData.userType,
            savedAt: new Date().toISOString(),
          }));
          toast({
            title: "No Connection Detected",
            description: "Your data has been saved locally. Please try again when you have a better signal.",
            variant: "destructive",
          });
        } catch (localStorageError) {
          toast({
            title: "Connection Error",
            description: "Unable to connect to the server. Please check your internet connection and try again.",
            variant: "destructive",
          });
        }
        return;
      }
      
      // For LOGIN network errors - just show the error
      if (isNetworkError(error)) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle timeout specifically (for login)
      if (error.message === 'Request timed out') {
        setShowRecoveryOption(true); // Show recovery option on timeout
        toast({
          title: "Request Timed Out",
          description: "The server is taking too long. Please check your connection and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Show recovery option for any login error (stale session might be the cause)
      if (isLogin) {
        setShowRecoveryOption(true);
      }
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message?.includes('Email already exists')) {
        errorMessage = "An account with this email already exists. Please use a different email or try signing in.";
      } else if (error.message?.includes('Invalid email format')) {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "An account with this email already exists. Please try signing in instead.";
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = "Password must be at least 6 characters long.";
      }
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log('[Auth] Finishing, setting loading to false');
      setLoading(false);
      setLoadingText('');
    }
  };

  // Show account type selection during signup when no type is selected
  const showAccountTypeSelection = !isLogin && !formData.userType;
  // Show tenant intent selection when tenant is selected but no intent yet
  const showTenantIntentSelection = !isLogin && formData.userType === 'tenant' && !formData.tenantIntent;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')}>
            <WhiteLabelBranding 
              className="text-3xl font-bold text-gradient-blue-gold mb-2 hover:opacity-80 transition-colors cursor-pointer"
              fallbackText="OpenKey"
            />
          </button>
          <p className="text-muted-foreground">Real Estate Management Platform</p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isForgotPassword
                ? 'Reset your password'
                : isLogin ? 'Sign in to your account' : (showAccountTypeSelection ? 'Create your account' : 'Create your account')}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? (resetEmailSent
                    ? 'Check your inbox for the reset link.'
                    : "Enter your email and we'll send you a link to reset your password.")
                : isLogin
                ? 'Welcome back! Please sign in to continue.'
                : (showAccountTypeSelection
                    ? 'What type of account do you need?'
                    : showTenantIntentSelection
                      ? 'What brings you to OpenKey?'
                      : `Setting up your ${formData.userType === 'landlord' ? 'Landlord / Property Manager' : formData.tenantIntent === 'rent_tracker' ? 'Rent Tracker' : 'Tenant'} account`
                  )
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Forgot Password View */}
            {isForgotPassword && (
              <div className="space-y-4">
                {resetEmailSent ? (
                  <div className="space-y-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      If an account exists for <span className="font-medium text-foreground">{(resetEmail || formData.email).trim()}</span>,
                      a password reset link is on its way. The link expires shortly, so use it soon.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setResetEmailSent(false)}
                    >
                      Resend or use a different email
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="resetEmail">Email *</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                      {loading ? (loadingText || 'Please wait...') : 'Send reset link'}
                    </Button>
                  </form>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={exitForgotPassword}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </button>
                </div>
              </div>
            )}

            {/* Account Type Selection Cards */}
            {!isForgotPassword && showAccountTypeSelection && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Tenant Card */}
                  <button
                    type="button"
                    onClick={() => handleAccountTypeSelect('tenant')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">Tenant</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">Looking for housing</span>
                  </button>

                  {/* Landlord Card */}
                  <button
                    type="button"
                    onClick={() => handleAccountTypeSelect('landlord')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">Landlord</span>
                    <span className="text-xs text-muted-foreground text-center mt-1">Property Manager</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            )}

            {/* Tenant Intent Selection removed — tenants go straight to housing seeker form */}

            {/* Login Form or Signup Form (after type + intent selection) */}
            {!isForgotPassword && (isLogin || (formData.userType && (formData.userType === 'landlord' || formData.tenantIntent))) && (
              <>
                {/* Back button during signup */}
                {!isLogin && formData.userType && (
                  <button
                    type="button"
                    onClick={handleBackToSelection}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {formData.userType === 'tenant' ? 'Change goal' : 'Change account type'}
                  </button>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {formData.userType === 'landlord' && (
                        <div>
                          <Label htmlFor="companyName">Company Name (Optional)</Label>
                          <Input
                            id="companyName"
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            setFormData({ ...formData, phone: formatted });
                          }}
                          placeholder="(555) 123-4567"
                          required
                        />
                      </div>

                      {/* Tenant-specific fields */}
                      {formData.userType === 'tenant' && formData.tenantIntent && (
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4 text-foreground">
                            {formData.tenantIntent === 'rent_tracker' ? 'Your Information' : 'Additional Information'}
                          </h3>
                          <ConditionalTenantFields formData={formData} setFormData={setFormData} tenantIntent={formData.tenantIntent} />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {/* Forgot password link - only during login */}
                    {isLogin && (
                      <div className="text-right mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(formData.email);
                            setResetEmailSent(false);
                            setIsForgotPassword(true);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SMS Consent Checkbox - only during signup */}
                  {!isLogin && (
                    <div className="flex items-start space-x-2 pt-2">
                      <Checkbox
                        id="smsConsent"
                        checked={formData.smsConsent}
                        onCheckedChange={(checked) => setFormData({ ...formData, smsConsent: !!checked })}
                        className="mt-0.5"
                      />
                      <Label htmlFor="smsConsent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        <span className="text-destructive">*</span> I agree to receive text updates from OpenKey about my housing search. Message frequency varies. Reply STOP to opt out.
                      </Label>
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
                    {loading ? (loadingText || 'Please wait...') : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                  
                  {/* Recovery option for stale session issues */}
                  {showRecoveryOption && isLogin && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={handleSessionRecovery}
                        className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                      >
                        Having trouble? Clear session and retry
                      </button>
                    </div>
                  )}
                </form>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      if (isLogin) {
                        // Switching to signup - reset userType to show selection
                        setFormData(prev => ({ ...prev, userType: '' as '' | 'landlord' | 'tenant', tenantIntent: '' as '' | 'housing_seeker' | 'rent_tracker' }));
                      }
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    {isLogin 
                      ? "Don't have an account? Sign up" 
                      : "Already have an account? Sign in"
                    }
                  </button>
                </div>

                {isLogin && (
                  <div className="text-center pt-1">
                    <a
                      href="/agency/login"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Agency Staff Login →
                    </a>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
