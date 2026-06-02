import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/DynamicThemeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Building2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const AgencyLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWhiteLabeled, whiteLabelConfig } = useTheme();

  // White-label context: when present, this login is locked to a specific PHA.
  const wlAgencyId = (whiteLabelConfig as any)?.agency_id as string | undefined;
  const brandName = isWhiteLabeled ? (whiteLabelConfig?.company_name || 'your housing authority') : 'OpenKey';
  const logoUrl = isWhiteLabeled ? whiteLabelConfig?.company_logo_url : null;

  // SEO
  useEffect(() => {
    const title = isWhiteLabeled
      ? `Sign in | ${brandName}`
      : 'Agency Portal Login | OpenKey';
    document.title = title;
    const desc = isWhiteLabeled
      ? `Staff sign-in for ${brandName}.`
      : 'Housing authority staff login for the OpenKey Agency Portal.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, [isWhiteLabeled, brandName]);

  useEffect(() => {
    if (user) {
      const checkAgencyAccess = async () => {
        const { data } = await supabase
          .from('agency_staff')
          .select('id, agency_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        if (data) {
          if (wlAgencyId && data.agency_id !== wlAgencyId) {
            await supabase.auth.signOut();
            toast.error('Wrong agency', {
              description: `This account isn't part of ${brandName}.`,
            });
            return;
          }
          navigate('/agency');
        }
      };
      checkAgencyAccess();
    }
  }, [user, navigate, wlAgencyId, brandName]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error('Login failed', { description: error.message });
        return;
      }

      const { data: staffRecord } = await supabase
        .from('agency_staff')
        .select('id, agency_id, role')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!staffRecord) {
        await supabase.auth.signOut();
        toast.error('Access denied', { description: 'This account does not have agency portal access.' });
        return;
      }

      // White-label gate: enforce one-PHA-per-branded-domain
      if (wlAgencyId && staffRecord.agency_id !== wlAgencyId) {
        await supabase.auth.signOut();
        toast.error('Wrong agency', {
          description: `This account isn't part of ${brandName}. Please use your own agency's login URL.`,
        });
        return;
      }

      toast.success('Welcome back!');
      navigate('/agency');
    } catch (err: any) {
      toast.error('Login failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {!isWhiteLabeled && (
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        )}

        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isWhiteLabeled ? `Sign in to ${brandName}` : 'Agency Portal'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isWhiteLabeled ? 'Staff Login' : 'Housing Authority Staff Login'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the agency dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {isWhiteLabeled
                ? `${brandName} accounts are managed by your administrator. Contact them if you need access.`
                : 'Agency accounts are managed by OpenKey administrators. Contact your administrator if you need access.'}
            </p>

            {!isWhiteLabeled && (
              <p className="text-xs text-center mt-3">
                <Link to="/auth?mode=login" className="text-primary hover:underline">
                  Not a housing authority? Tenant / Landlord login →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgencyLogin;
