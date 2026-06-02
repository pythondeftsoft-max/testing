import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, KeyRound, Mail, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

/**
 * Claim flow for an applicant who submitted a voucher application via a PHA's
 * public form. The token is single-use and expires after 30 days.
 *
 * Flow:
 *  - Fetch application metadata by token (read-only RPC client-side; we just
 *    use the claim RPC after the user is authenticated).
 *  - If not authenticated: show a slim sign-up / sign-in card. Email is the
 *    application's email; user picks a password (or signs in if account exists).
 *  - On authenticated: call `claim_voucher_application(token)`, then route to
 *    the tenant Section 8 portal.
 */
export default function ClaimAccount() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [meta, setMeta] = useState<{
    email: string;
    agencyName: string;
    firstName: string;
    tokenType: 'voucher' | 'landlord' | 'property';
  } | null>(null);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch minimal metadata about the token (email + agency name) so we can
  // pre-fill the form. This is intentionally a public read using a thin SECURITY
  // DEFINER lookup we add inline below.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      // Try voucher application first
      const { data: voucher } = await supabase
        .from('voucher_applications')
        .select('email, first_name, claim_token_expires_at, claimed_at, housing_authorities!inner(name)')
        .eq('claim_token', token)
        .maybeSingle();
      if (cancelled) return;
      if (voucher) {
        if (voucher.claimed_at) {
          setError('This application has already been claimed. Please sign in.');
        } else if (voucher.claim_token_expires_at && new Date(voucher.claim_token_expires_at) < new Date()) {
          setError('This link has expired. Contact your housing authority for a new one.');
        } else {
          setMeta({
            email: voucher.email,
            firstName: voucher.first_name,
            agencyName: (voucher.housing_authorities as any)?.name ?? 'your housing authority',
            tokenType: 'voucher',
          });
        }
        setLoading(false);
        return;
      }

      // Try landlord registration token
      const { data: landlord } = await supabase
        .from('agency_landlords')
        .select('landlord_email, landlord_name, claim_token_expires_at, claimed_at, housing_authorities!inner(name)' as any)
        .eq('claim_token', token)
        .maybeSingle();
      if (cancelled) return;
      if (landlord) {
        const l = landlord as any;
        if (l.claimed_at) {
          setError('This landlord account has already been claimed. Please sign in.');
        } else if (l.claim_token_expires_at && new Date(l.claim_token_expires_at) < new Date()) {
          setError('This link has expired. Contact the housing authority for a new one.');
        } else {
          setMeta({
            email: l.landlord_email,
            firstName: (l.landlord_name || '').split(' ')[0] || 'there',
            agencyName: l.housing_authorities?.name ?? 'your housing authority',
            tokenType: 'landlord',
          });
        }
        setLoading(false);
        return;
      }

      // Try property token
      const { data: property } = await (supabase as any)
        .from('properties')
        .select('pending_owner_email, address, claim_token_expires_at, claimed_at')
        .eq('claim_token', token)
        .maybeSingle();
      if (cancelled) return;
      if (property) {
        if (property.claimed_at) {
          setError('This property has already been claimed. Please sign in.');
        } else if (property.claim_token_expires_at && new Date(property.claim_token_expires_at) < new Date()) {
          setError('This link has expired.');
        } else if (!property.pending_owner_email) {
          setError('This property is missing an owner email — contact the agency.');
        } else {
          setMeta({
            email: property.pending_owner_email,
            firstName: 'there',
            agencyName: property.address || 'your property',
            tokenType: 'property',
          });
        }
        setLoading(false);
        return;
      }

      setError('This link is invalid or has expired.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // If we already have an authenticated user matching the email, claim immediately.
  useEffect(() => {
    if (authLoading || !user || !meta || claiming || !token) return;
    if (user.email?.toLowerCase() !== meta.email.toLowerCase()) return;
    (async () => {
      setClaiming(true);
      const rpcName =
        meta.tokenType === 'voucher' ? 'claim_voucher_application'
        : meta.tokenType === 'landlord' ? 'claim_landlord_registration'
        : 'claim_property';
      const { data } = await (supabase.rpc as any)(rpcName, { _token: token });
      const result = data as { success?: boolean; error?: string } | null;
      if (result?.success) {
        toast.success(
          meta.tokenType === 'voucher' ? 'Application linked to your account'
          : meta.tokenType === 'landlord' ? 'Landlord account linked'
          : 'Property linked to your account'
        );
        const dest =
          meta.tokenType === 'voucher' ? '/section8-portal'
          : '/dashboard';
        navigate(dest);
      } else {
        setError(result?.error ?? 'Could not claim record');
        setClaiming(false);
      }
    })();
  }, [authLoading, user, meta, claiming, token, navigate]);

  const handleSignUp = async () => {
    if (!meta || !password) return;
    setWorking(true);
    const { error } = await supabase.auth.signUp({
      email: meta.email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/claim/${token}`,
        data: { first_name: meta.firstName, role: meta.tokenType === 'voucher' ? 'tenant' : 'landlord' },
      },
    });
    if (error) {
      // If user already exists, prompt sign-in instead.
      if (error.message?.toLowerCase().includes('already')) {
        setMode('signin');
        toast.info('You already have an OpenKey account — please sign in.');
      } else {
        toast.error(error.message);
      }
      setWorking(false);
      return;
    }
    toast.success('Account created — finalizing your application…');
    // useEffect will pick up the new auth state and run the claim RPC.
  };

  const handleSignIn = async () => {
    if (!meta || !password) return;
    setWorking(true);
    const { error } = await supabase.auth.signInWithPassword({ email: meta.email, password });
    if (error) {
      toast.error(error.message);
      setWorking(false);
      return;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Link unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/tenant/auth')}>Sign in instead</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (claiming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Linking your application…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Helmet><title>Confirm your application • OpenKey</title></Helmet>
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Welcome, {meta?.firstName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Confirm your application with <span className="font-medium text-foreground">{meta?.agencyName}</span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {mode === 'signup' ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {mode === 'signup' ? 'Create your OpenKey account' : 'Sign in to your account'}
            </CardTitle>
            <CardDescription>
              {mode === 'signup'
                ? 'Set a password to link your application and access updates.'
                : 'You already have an OpenKey account with this email.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={meta?.email ?? ''} disabled />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input
                id="pw"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <Button
              className="w-full"
              disabled={working || password.length < 8}
              onClick={mode === 'signup' ? handleSignUp : handleSignIn}
            >
              {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {mode === 'signup' ? 'Create account & confirm application' : 'Sign in & confirm application'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
              {mode === 'signup' ? 'I already have an OpenKey account' : 'I need to create an account'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
