import React, { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { DashboardLoadingSkeleton } from '@/components/LoadingStates';
import { lazyRetry } from '@/lib/lazyRetry';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AdminDashboard = lazyRetry(() => import('@/components/admin/AdminDashboard'), 'admin-dash');
const LandlordDashboard = lazyRetry(() => import('@/components/LandlordDashboard'), 'landlord-dash');
const TenantDashboardModern = lazyRetry(() => import('@/components/TenantDashboardModern'), 'tenant-dash');
import PortfolioSelect from '@/pages/PortfolioSelect';

import { PermissionProvider } from '@/providers/PermissionProvider';
import { clearImpersonationData, getAdminSessionBackup } from '@/utils/impersonationUtils';
import { useAdminCheck } from '@/hooks/useAdminCheck';

import { Loader2 } from 'lucide-react';

// Type for navigation state passed from internal navigation
interface NavigationState {
  fromInternalNavigation?: boolean;
  user?: User;
  userProfile?: any;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const portfolioId = searchParams.get('portfolioId');
  
  // Secure admin check via RPC
  const { data: isSystemAdmin, isLoading: isAdminLoading } = useAdminCheck();
  
  // Check for internal navigation flag from URL param (works across all notification sources)
  const isInternalNavigation = searchParams.get('internal') === 'true';
  
  // Read navigation state passed from internal navigation (e.g., from notifications)
  const navState = location.state as NavigationState | null;
  
  // Get cached data
  const cachedUser = sessionStorage.getItem('dashboard_user');
  const cachedProfile = sessionStorage.getItem('dashboard_profile');
  
  // Priority: Navigation state > SessionStorage cache > null
  const [user, setUser] = useState<User | null>(() => {
    // Priority 1: Navigation state (instant, no flash)
    if (navState?.fromInternalNavigation && navState?.user) {
      console.log('Using user from navigation state');
      return navState.user;
    }
    // Priority 2: SessionStorage cache
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [userProfile, setUserProfile] = useState<any>(() => {
    // Priority 1: Navigation state
    if (navState?.fromInternalNavigation && navState?.userProfile) {
      console.log('Using profile from navigation state');
      return navState.userProfile;
    }
    // Priority 2: SessionStorage cache
    return cachedProfile ? JSON.parse(cachedProfile) : null;
  });
  
  // Don't show loading if we have navigation state data OR internal navigation with cache
  const hasNavStateData = navState?.fromInternalNavigation && navState?.user && navState?.userProfile;
  const hasInternalNavWithCache = isInternalNavigation && cachedUser && cachedProfile;
  const [loading, setLoading] = useState(!hasNavStateData && !hasInternalNavWithCache && (!user || !userProfile));
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading dashboard...');
  
  // Clean up internal param from URL on mount (without triggering re-render)
  useEffect(() => {
    if (isInternalNavigation) {
      console.log('Internal navigation detected - using cached data, cleaning URL');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('internal');
      const newUrl = newParams.toString() 
        ? `${location.pathname}?${newParams.toString()}`
        : location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  const [authError, setAuthError] = useState<string | null>(null);
  
  console.info('🏠 [Dashboard] Current route params:', { 
    portfolioId, 
    searchParams: Object.fromEntries(searchParams.entries()),
    pathname: window.location.pathname,
    hasCachedUser: !!user,
    hasCachedProfile: !!userProfile,
    hasNavState: !!navState?.fromInternalNavigation
  });

  const initializeAuth = async () => {
    try {
      console.log('Initializing dashboard authentication...');
      // Only set loading if we don't have cached data
      if (!user || !userProfile) {
        setLoading(true);
      }
      
      // First, get the current session to validate impersonation state
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Check for impersonation mode first
      const impersonationMode = localStorage.getItem('impersonation_mode') === 'true';
      const impersonatedUser = localStorage.getItem('impersonated_user');
      const adminBackup = getAdminSessionBackup();
      
      // SAFETY: Validate impersonation state matches current session
      // If admin_session_backup exists but user_id doesn't match current session, clear stale data
      if (impersonationMode && adminBackup && currentSession?.user) {
        if (adminBackup.user_id !== currentSession.user.id) {
          console.warn('Stale impersonation data detected - clearing. Backup user_id:', adminBackup.user_id, 'Current session:', currentSession.user.id);
          clearImpersonationData();
          // Continue with normal auth flow
        }
      }
      
      // Re-check after potential cleanup
      const isValidImpersonation = localStorage.getItem('impersonation_mode') === 'true' 
        && localStorage.getItem('impersonated_user') 
        && localStorage.getItem('admin_session_backup');
      
      if (isValidImpersonation && impersonatedUser) {
        console.log('Impersonation mode detected, using impersonated user data');
        const userData = JSON.parse(impersonatedUser);
        
        // Create a mock user object for impersonation
        const mockUser = {
          id: userData.id,
          email: userData.email || `${userData.name.toLowerCase().replace(' ', '.')}@example.com`,
          user_metadata: {
            first_name: userData.name.split(' ')[0],
            last_name: userData.name.split(' ')[1] || '',
            user_type: userData.user_type
          }
        };
        
        setUser(mockUser as any);

        // Get user profile for impersonated user
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error during impersonation:', profileError);
            // Use fallback profile
            setUserProfile({
              id: userData.id,
              user_type: userData.user_type,
              first_name: userData.name.split(' ')[0],
              last_name: userData.name.split(' ')[1] || ''
            });
          } else {
            console.log('Impersonated user profile loaded:', profile);
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error loading impersonated user profile:', error);
          // Use fallback profile
          setUserProfile({
            id: userData.id,
            user_type: userData.user_type,
            first_name: userData.name.split(' ')[0],
            last_name: userData.name.split(' ')[1] || ''
          });
        }
        
        setLoading(false);
        return;
      }
      
      // Regular authentication flow - ensure session is fully established
      console.log('Checking for existing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setAuthError('Session validation failed');
        setLoading(false);
        navigate('/auth');
        return;
      }

      if (!session?.user) {
        console.log('No active session, redirecting to auth');
        setLoading(false);
        navigate('/auth');
        return;
      }

      console.log('Active session found for user:', session.user.id, session.user.email);
      console.log('Session access token present:', !!session.access_token);
      console.log('Session details:', { 
        userId: session.user.id, 
        email: session.user.email,
        tokenExpiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'no expiry'
      });
      
      // Set user immediately after session validation and cache it
      setUser(session.user);
      sessionStorage.setItem('dashboard_user', JSON.stringify(session.user));

      // Get user profile with error handling
      try {
        console.log('Fetching user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          
          // If profile doesn't exist, create one based on email
          if (profileError.code === 'PGRST116') {
            console.log('Creating new profile for user');
            
            // Determine user type based on email with proper typing
            let userType: 'admin' | 'landlord' | 'tenant' = 'landlord';
            let firstName = 'Demo';
            let lastName = 'User';
            
            if (session.user.email === 'admin@openkey.com') {
              userType = 'admin';
              firstName = 'Admin';
              lastName = 'User';
            } else if (session.user.email === 'tenant@openkey.com') {
              userType = 'tenant';
              firstName = 'Demo';
              lastName = 'Tenant';
            }
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                user_type: userType,
                first_name: firstName,
                last_name: lastName
              })
              .select()
              .single();

            if (createError) {
              console.error('Failed to create profile:', createError);
              // Use fallback profile
              setUserProfile({
                id: session.user.id,
                user_type: userType,
                first_name: firstName,
                last_name: lastName
              });
            } else {
              console.log('New profile created:', newProfile);
              setUserProfile(newProfile);
            }
          } else {
            // Use fallback profile for other errors with proper typing
            const userType: 'admin' | 'landlord' | 'tenant' = session.user.email === 'admin@openkey.com' ? 'admin' : 
                            session.user.email === 'tenant@openkey.com' ? 'tenant' : 'landlord';
            const firstName = session.user.email === 'admin@openkey.com' ? 'Admin' : 
                             session.user.email === 'tenant@openkey.com' ? 'Demo' : 'Demo';
            const lastName = session.user.email === 'admin@openkey.com' ? 'User' : 
                            session.user.email === 'tenant@openkey.com' ? 'Tenant' : 'User';
            
            setUserProfile({
              id: session.user.id,
              user_type: userType,
              first_name: firstName,
              last_name: lastName
            });
          }
        } else {
          console.log('Profile loaded successfully:', profile);
          // Cache profile for faster subsequent loads
          // Override profile for demo users to ensure correct routing
          if (session.user.email === 'admin@openkey.com') {
            const adminProfile = {
              ...profile,
              user_type: 'admin' as const,
              first_name: 'Admin',
              last_name: 'User'
            };
            
            setUserProfile(adminProfile);
            sessionStorage.setItem('dashboard_profile', JSON.stringify(adminProfile));
          } else if (session.user.email === 'tenant@openkey.com') {
            const tenantProfile = {
              ...profile,
              user_type: 'tenant' as const,
              first_name: 'Demo',
              last_name: 'Tenant'
            };
            
            setUserProfile(tenantProfile);
            sessionStorage.setItem('dashboard_profile', JSON.stringify(tenantProfile));
          } else {
            setUserProfile(profile);
            sessionStorage.setItem('dashboard_profile', JSON.stringify(profile));
          }
        }
      } catch (error) {
        console.error('Profile handling error:', error);
        // Use fallback profile based on email with proper typing
        const userType: 'admin' | 'landlord' | 'tenant' = session.user.email === 'admin@openkey.com' ? 'admin' : 
                        session.user.email === 'tenant@openkey.com' ? 'tenant' : 'landlord';
        const firstName = session.user.email === 'admin@openkey.com' ? 'Admin' : 
                         session.user.email === 'tenant@openkey.com' ? 'Demo' : 'Demo';
        const lastName = session.user.email === 'admin@openkey.com' ? 'User' : 
                        session.user.email === 'tenant@openkey.com' ? 'Tenant' : 'User';
        
        setUserProfile({
          id: session.user.id,
          user_type: userType,
          first_name: firstName,
          last_name: lastName
        });
      }
      
      console.log('Dashboard authentication initialization completed');
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setAuthError('Failed to initialize dashboard');
      setLoading(false);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          // Clear impersonation data and cached session on logout
          clearImpersonationData();
          sessionStorage.removeItem('dashboard_user');
          sessionStorage.removeItem('dashboard_profile');
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            navigate('/auth');
          }
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Only reinitialize if user ID actually changed (not just token refresh)
          const currentUserId = user?.id;
          const newUserId = session.user.id;
          
          if (currentUserId && currentUserId === newUserId) {
            // Same user, just a token refresh - update session object but skip reinit
            console.log('Token refresh detected, skipping reinit');
            setUser(session.user);
            return;
          }
          
          // Different user or first load - proceed with full initialization
          if (mounted) {
            setUser(session.user);
            
            // CRITICAL: Verify cached profile belongs to current user to prevent user mismatch
            const cachedProfileStr = sessionStorage.getItem('dashboard_profile');
            let cachedProfile = null;
            let cacheUserMismatch = false;
            
            if (cachedProfileStr) {
              try {
                cachedProfile = JSON.parse(cachedProfileStr);
                // Check if cached profile ID matches current user ID
                if (cachedProfile.id !== session.user.id) {
                  console.log('Cache user mismatch detected - clearing stale cache', {
                    cachedUserId: cachedProfile.id,
                    currentUserId: session.user.id
                  });
                  cacheUserMismatch = true;
                  sessionStorage.removeItem('dashboard_user');
                  sessionStorage.removeItem('dashboard_profile');
                }
              } catch (e) {
                console.error('Error parsing cached profile:', e);
                sessionStorage.removeItem('dashboard_profile');
              }
            }
            
            // Check for navigation state OR valid sessionStorage
            const hasNavigationData = navState?.fromInternalNavigation && navState?.userProfile;
            
            if (!hasNavigationData && (!cachedProfile || cacheUserMismatch)) {
              // Only reinitialize if we truly don't have valid profile data
              console.log('New user signed in, loading profile...');
              setLoading(true);
              setTimeout(() => {
                if (mounted) {
                  initializeAuth();
                }
              }, 50);
            } else if (!cacheUserMismatch) {
              console.log('User signed in, using cached/nav profile - skipping reinit');
              setLoading(false);
            }
          }
        }
        // Ignore TOKEN_REFRESHED and INITIAL_SESSION - AuthProvider handles these
      }
    );

    // Initial auth check - skip if we have cached data from in-app navigation
    if (mounted) {
      const cachedUser = sessionStorage.getItem('dashboard_user');
      const cachedProfile = sessionStorage.getItem('dashboard_profile');
      
      if (cachedUser && cachedProfile) {
        // We have cached data, skip full initialization - just validate session in background
        console.log('Using cached auth data, skipping initializeAuth');
        setLoading(false);
        
        // Background session validation (non-blocking) - validates cache matches current user
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session && mounted) {
            console.log('Session expired, clearing cache and redirecting');
            sessionStorage.removeItem('dashboard_user');
            sessionStorage.removeItem('dashboard_profile');
            navigate('/auth');
          } else if (session && mounted) {
            // CRITICAL: Validate cached profile matches current session user
            try {
              const cachedProfileData = JSON.parse(cachedProfile!);
              if (cachedProfileData.id !== session.user.id) {
                console.log('Cache user mismatch detected during background validation', {
                  cachedUserId: cachedProfileData.id,
                  sessionUserId: session.user.id
                });
                sessionStorage.removeItem('dashboard_user');
                sessionStorage.removeItem('dashboard_profile');
                setLoading(true);
                initializeAuth();
              }
            } catch (e) {
              console.error('Error validating cached profile:', e);
              sessionStorage.removeItem('dashboard_user');
              sessionStorage.removeItem('dashboard_profile');
              initializeAuth();
            }
          }
        });
      } else {
        // No cached data, do full initialization
        initializeAuth();
      }
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove user dependency to prevent infinite loops


  // Loading timeout - show retry button after 12 seconds
  useEffect(() => {
    if (!loading) {
      setLoadingTimeout(false);
      setLoadingMessage('Loading dashboard...');
      return;
    }
    
    // Progressive loading messages
    const msg5s = setTimeout(() => setLoadingMessage('Still loading...'), 5000);
    const msg10s = setTimeout(() => setLoadingMessage('Almost there...'), 10000);
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
      setLoadingMessage('Taking longer than expected');
    }, 12000);
    
    return () => {
      clearTimeout(msg5s);
      clearTimeout(msg10s);
      clearTimeout(timeout);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <p className="text-foreground">{loadingMessage}</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare your workspace</p>
          </div>
          {loadingTimeout && (
            <div className="pt-4 space-x-2">
              <button 
                onClick={() => {
                  setLoading(true);
                  setLoadingTimeout(false);
                  setLoadingMessage('Retrying...');
                  initializeAuth();
                }} 
                className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
              >
                Retry
              </button>
              <button 
                onClick={() => navigate('/auth')} 
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90"
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{authError}</p>
          <button 
            onClick={() => navigate('/auth')} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Unable to load user data</p>
          <button 
            onClick={() => initializeAuth()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 mr-2"
          >
            Retry
          </button>
          <button 
            onClick={() => navigate('/auth')} 
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Wait for admin check to complete before routing - prevents showing wrong dashboard
  if (isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <p className="text-foreground">Preparing your dashboard...</p>
            <p className="text-sm text-muted-foreground">Checking permissions</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('Routing user with profile:', userProfile, 'isSystemAdmin:', isSystemAdmin);

  // Check for preview mode parameter (for notification link testing)
  const previewAs = searchParams.get('previewAs');
  
  // If in preview mode as tenant, show tenant view regardless of actual user type
  if (previewAs === 'tenant') {
    return <Suspense fallback={<DashboardLoadingSkeleton />}><TenantDashboardModern user={user} /></Suspense>;
  }

  // If in preview mode as landlord, show landlord view regardless of actual user type
  if (previewAs === 'landlord' && user && userProfile) {
    if (!portfolioId) {
      return <PortfolioSelect user={user} profile={userProfile} />;
    }
    return <Suspense fallback={<DashboardLoadingSkeleton />}><LandlordDashboard user={user} profile={userProfile} portfolioId={portfolioId} /></Suspense>;
  }

  // Route to appropriate dashboard based on user type - use secure RPC check for admin
  if (isSystemAdmin) {
    return <Suspense fallback={<DashboardLoadingSkeleton />}><AdminDashboard user={user} profile={userProfile} /></Suspense>;
  }

  if (userProfile.user_type === 'tenant') {
    return <Suspense fallback={<DashboardLoadingSkeleton />}><TenantDashboardModern user={user} /></Suspense>;
  }

  // For landlord and individual_owner types
  if (portfolioId) {
    return (
      <PermissionProvider portfolioId={portfolioId}>
        <Suspense fallback={<DashboardLoadingSkeleton />}>
          <LandlordDashboard 
            user={user} 
            profile={userProfile} 
            portfolioId={portfolioId} 
          />
        </Suspense>
      </PermissionProvider>
    );
  } else {
    return <PortfolioSelect user={user} profile={userProfile} />;
  }
};

export default Dashboard;
