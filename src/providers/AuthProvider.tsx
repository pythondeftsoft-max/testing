import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/react-query';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track if we've already set up the subscription
  const subscriptionRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate subscriptions
    if (subscriptionRef.current) {
      console.log('[AuthProvider] Subscription already exists, skipping');
      return;
    }
    subscriptionRef.current = true;
    
    console.log('[AuthProvider] Setting up SINGLE auth subscription for entire app');
    
    // SINGLE subscription for the ENTIRE app
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 [AuthProvider] Auth state change:', event, {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });

        // Clear all cached per-user data on sign out so a different account
        // doesn't see the previous account's data (e.g. portfolio metrics).
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }

        // Synchronous state updates only - no async operations here
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Post-login MFA challenge: if the user just signed in, has a verified
        // factor, but the current session is only AAL1, push them to the
        // challenge screen. Users without factors are unaffected.
        if (event === 'SIGNED_IN' && session) {
          // Defer to avoid recursive auth calls inside the callback.
          setTimeout(async () => {
            try {
              const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
              if (
                aal?.currentLevel === 'aal1' &&
                aal?.nextLevel === 'aal2' &&
                typeof window !== 'undefined' &&
                !window.location.pathname.startsWith('/auth/mfa-challenge')
              ) {
                window.location.assign('/auth/mfa-challenge');
              }
            } catch (e) {
              console.warn('[AuthProvider] MFA AAL check failed (non-fatal):', e);
            }
          }, 0);
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id
      });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('[AuthProvider] Cleaning up auth subscription');
      subscription.unsubscribe();
      subscriptionRef.current = false;
    };
  }, []); // Empty dependency array - subscription created ONCE

  const signOut = async () => {
    console.log('[AuthProvider] Signing out user');
    // Proactively clear the React Query cache so no per-user data leaks into
    // the next account during the sign-in transition.
    queryClient.clear();
    const result = await supabase.auth.signOut();
    // State will be updated via onAuthStateChange listener
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
