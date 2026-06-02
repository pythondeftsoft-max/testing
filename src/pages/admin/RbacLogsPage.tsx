import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export default function RbacLogsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const portfolioId = searchParams.get('portfolioId') || 'everything';

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Redirect to User Roles page with logs tab
  useEffect(() => {
    if (!loading) {
      navigate(`/user-roles?portfolioId=${portfolioId}&tab=logs`);
    }
  }, [loading, portfolioId, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-muted-foreground">Redirecting to RBAC Logs...</div>
    </div>
  );
}