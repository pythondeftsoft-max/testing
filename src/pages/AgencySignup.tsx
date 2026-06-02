import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Building2, Search, Loader2, CheckCircle } from 'lucide-react';

interface PHA {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  pha_code: string | null;
}

const AgencySignup = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [phas, setPhas] = useState<PHA[]>([]);
  const [selectedPha, setSelectedPha] = useState<PHA | null>(null);
  const [phaOpen, setPhaOpen] = useState(false);
  const [phaSearch, setPhaSearch] = useState('');
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'select' | 'auth' | 'done'>('select');

  useEffect(() => {
    const fetchPHAs = async () => {
      let allPhas: PHA[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('housing_authorities')
          .select('id, name, city, state, pha_code')
          .eq('is_active', true)
          .range(from, from + batchSize - 1)
          .order('name');
        if (!data?.length) break;
        allPhas = [...allPhas, ...(data as PHA[])];
        if (data.length < batchSize) break;
        from += batchSize;
      }
      setPhas(allPhas);
    };
    fetchPHAs();
  }, []);

  useEffect(() => {
    if (user && selectedPha && step === 'auth') {
      registerStaff(user.id);
    }
  }, [user]);

  const filteredPhas = phaSearch
    ? phas.filter(p => p.name.toLowerCase().includes(phaSearch.toLowerCase()) || p.state?.toLowerCase().includes(phaSearch.toLowerCase()) || p.pha_code?.includes(phaSearch))
    : phas;

  const handleSelectPha = (pha: PHA) => {
    setSelectedPha(pha);
    setPhaOpen(false);
    if (user) {
      registerStaff(user.id);
    } else {
      setStep('auth');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email and password required'); return; }
    setRegistering(true);

    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) { toast.error(error.message); setRegistering(false); return; }
    if (data.user) {
      await registerStaff(data.user.id);
    }
  };

  const registerStaff = async (userId: string) => {
    if (!selectedPha) return;
    setRegistering(true);

    // Check if already staff
    const { data: existing } = await supabase
      .from('agency_staff')
      .select('id')
      .eq('user_id', userId)
      .eq('agency_id', selectedPha.id)
      .maybeSingle();

    if (existing) {
      toast.info('You are already registered with this agency');
      navigate('/agency');
      return;
    }

    const { error } = await supabase.from('agency_staff').insert({
      user_id: userId,
      agency_id: selectedPha.id,
      role: 'agency_admin' as any,
    } as any);

    if (error) {
      toast.error('Failed to register. Please contact support.');
      setRegistering(false);
      return;
    }

    setStep('done');
    setRegistering(false);
    toast.success('Agency portal activated!');
    setTimeout(() => navigate('/agency'), 2000);
  };

  if (step === 'done') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold">You're All Set!</h2>
            <p className="text-muted-foreground">Redirecting to your agency portal...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Agency Portal Signup</CardTitle>
          <CardDescription>Select your Public Housing Authority to get started — free access to the full platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PHA Selector */}
          <div className="space-y-2">
            <Label>Select Your Housing Authority</Label>
            <Popover open={phaOpen} onOpenChange={setPhaOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                  {selectedPha ? (
                    <span>{selectedPha.name} ({selectedPha.state})</span>
                  ) : (
                    <span className="text-muted-foreground">Search {phas.length.toLocaleString()} agencies...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name, state, or PHA code..." value={phaSearch} onValueChange={setPhaSearch} />
                  <CommandList>
                    <CommandEmpty>No agencies found</CommandEmpty>
                    <CommandGroup>
                      {filteredPhas.slice(0, 50).map(p => (
                        <CommandItem key={p.id} onSelect={() => handleSelectPha(p)}>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.city}, {p.state}{p.pha_code ? ` • ${p.pha_code}` : ''}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Auth form for non-logged-in users */}
          {step === 'auth' && !user && (
            <form onSubmit={handleSignup} className="space-y-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Create an account or log in to activate your portal.</p>
              <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" /></div>
              <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div><Label>Password *</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" className="w-full" disabled={registering}>
                {registering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</> : 'Create Account & Activate Portal'}
              </Button>
            </form>
          )}

          {registering && user && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Setting up your portal...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencySignup;
