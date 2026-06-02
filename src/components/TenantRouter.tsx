
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const TenantRouter = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkTenantStatus = async () => {
      try {
        // Check if user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check if user is a tenant
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          
          // Check if user type is 'tenant' (using string comparison to avoid TS issues)
          if (profile?.user_type === 'tenant') {
            // Existing tenant user, go to dashboard
            navigate('/dashboard');
            return;
          }
        }

        // Check if there's a tenant application (using localStorage for now)
        const hasApplication = localStorage.getItem('tenant_application_submitted');
        
        if (hasApplication) {
          // Has application, can create account
          navigate('/tenant-auth');
        } else {
          // No application, must fill out form first
          navigate('/tenant-form');
        }
      } catch (error) {
        console.error('Error checking tenant status:', error);
        // Default to tenant form
        navigate('/tenant-form');
      } finally {
        setLoading(false);
      }
    };

    checkTenantStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return null;
};

export default TenantRouter;
