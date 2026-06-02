import React, { useState } from 'react';
import { Calculator, Home, BarChart3, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type ToolType = 'eligibility' | 'rent-analyzer' | 'market-demand';

interface ToolEmbedProps {
  tool: ToolType;
  city?: string | null;
  state?: string | null;
  className?: string;
}

const TOOL_CONFIG: Record<ToolType, { icon: React.ElementType; title: string; subtitle: string; fullPath: string; color: string }> = {
  eligibility: {
    icon: Calculator,
    title: 'Check Your Section 8 Eligibility',
    subtitle: 'Find out if you qualify for housing assistance',
    fullPath: '/tools/eligibility-calculator',
    color: 'text-primary',
  },
  'rent-analyzer': {
    icon: Home,
    title: 'Rent & Voucher Analyzer',
    subtitle: 'See what HUD pays for rentals in this area',
    fullPath: '/tools/rent-analyzer',
    color: 'text-primary',
  },
  'market-demand': {
    icon: BarChart3,
    title: 'Housing Market Demand',
    subtitle: 'Explore voucher demand and affordable housing gaps',
    fullPath: '/tools/market-demand',
    color: 'text-primary',
  },
};

const ToolEmbed: React.FC<ToolEmbedProps> = ({ tool, city, state, className = '' }) => {
  const navigate = useNavigate();
  const config = TOOL_CONFIG[tool];
  const Icon = config.icon;

  const [zip, setZip] = useState('');
  const [householdSize, setHouseholdSize] = useState('1');
  const [income, setIncome] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!zip || zip.length < 5) {
      setError('Please enter a valid ZIP code');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (tool === 'eligibility') {
        const incomeNum = parseFloat(income);
        if (!incomeNum || incomeNum <= 0) {
          setError('Please enter your annual income');
          setLoading(false);
          return;
        }
        const { data, error: fnError } = await supabase.functions.invoke('hud-intelligence-engine', {
          body: { mode: 'income-limits', zip, householdSize: parseInt(householdSize), income: incomeNum },
        });
        if (fnError) throw fnError;
        setResult({ type: 'eligibility', data: data?.data });
      } else if (tool === 'rent-analyzer') {
        const { data, error: fnError } = await supabase.functions.invoke('hud-intelligence-engine', {
          body: { mode: 'fmr', zip, bedrooms: 2 },
        });
        if (fnError) throw fnError;
        setResult({ type: 'rent', data: data?.data });
      } else {
        const { data, error: fnError } = await supabase.functions.invoke('hud-intelligence-engine', {
          body: { mode: 'demand', zip },
        });
        if (fnError) throw fnError;
        setResult({ type: 'demand', data: data?.data });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try the full tool.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`border-2 border-primary/20 bg-card shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-primary/5 border-b border-primary/10 px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={20} className={config.color} />
        </div>
        <div>
          <h3 className="font-bold text-card-foreground text-sm tracking-tight">{config.title}</h3>
          <p className="text-xs text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">ZIP Code</Label>
            <Input
              placeholder="e.g. 77001"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="h-9 text-sm"
            />
          </div>

          {tool === 'eligibility' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Household Size</Label>
                <Select value={householdSize} onValueChange={setHouseholdSize}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'person' : 'people'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Annual Household Income</Label>
                <Input
                  placeholder="e.g. 25000"
                  value={income}
                  onChange={(e) => setIncome(e.target.value.replace(/[^\d.]/g, ''))}
                  className="h-9 text-sm"
                  type="number"
                />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full gap-2"
          variant="gradient"
          size="sm"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
          {tool === 'eligibility' ? 'Check Eligibility' : tool === 'rent-analyzer' ? 'Analyze Rent' : 'Check Demand'}
        </Button>

        {/* Quick Result */}
        {result && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            {result.type === 'eligibility' && result.data && (
              <>
                <p className="text-sm font-semibold text-card-foreground">
                  {result.data.eligible ? '✅ You may qualify!' : '⚠️ You may not qualify'}
                </p>
                {result.data.incomeCategory && (
                  <p className="text-xs text-muted-foreground">
                    Income Category: <span className="font-medium text-card-foreground">{result.data.incomeCategory}</span>
                  </p>
                )}
              </>
            )}
            {result.type === 'rent' && result.data && (
              <>
                <p className="text-sm font-semibold text-card-foreground">Fair Market Rent (2BR)</p>
                <p className="text-xl font-bold text-primary">
                  ${result.data.fmr || result.data.basicdata?.rent_2br || '—'}/mo
                </p>
              </>
            )}
            {result.type === 'demand' && result.data && (
              <>
                <p className="text-sm font-semibold text-card-foreground">Voucher Demand Score</p>
                <p className="text-xl font-bold text-primary">{result.data.demandScore || '—'}/100</p>
              </>
            )}
          </div>
        )}

        {/* Full tool link */}
        <div className="pt-2 border-t border-border/50 text-center">
          <button
            onClick={() => navigate(config.fullPath)}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
          >
            See the full {tool === 'eligibility' ? 'calculator' : 'analyzer'} <ArrowRight size={12} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ToolEmbed;
