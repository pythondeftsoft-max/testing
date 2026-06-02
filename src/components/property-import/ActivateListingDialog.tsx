import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ActivateListingDialogProps {
  propertyId: string;
  mode: 'admin' | 'landlord';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}

const ADMIN_TERMS = (pct: number) =>
  `By activating this listing on behalf of the property owner, I confirm OpenKey's standard placement fee of ${pct}% of the first month's rent applies for any tenant matched and placed through the platform. The owner has been informed of and accepted these terms outside the platform.`;

const LANDLORD_TERMS = (pct: number) =>
  `LISTING & PLACEMENT AGREEMENT

By activating this listing, I (the landlord/owner) agree to the following:

1. PLACEMENT FEE. OpenKey is entitled to a placement fee equal to ${pct}% of the first full month's rent for any tenant introduced through the OpenKey platform that signs a lease at this property within 90 days of introduction.

2. EXCLUSIVITY. This is a non-exclusive listing. I may continue to market the unit elsewhere.

3. TRUTHFULNESS. All information about the property, units, rent, and availability is accurate to the best of my knowledge.

4. FAIR HOUSING. I will comply with all federal, state, and local fair housing laws and will not unlawfully discriminate against any applicant.

5. DEACTIVATION. I may deactivate this listing at any time; the placement fee remains owed for any tenant already introduced.

By typing my full legal name below and clicking "Sign & Activate," I am providing my electronic signature and agreeing to the above terms.`;

export function ActivateListingDialog({
  propertyId,
  mode,
  open,
  onOpenChange,
  onActivated,
}: ActivateListingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [unitCount, setUnitCount] = useState(0);
  const [feePct, setFeePct] = useState(40);
  const [signature, setSignature] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset
      setSignature('');
      setConfirmed(false);
      setProperty(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: prop, error: propErr } = await supabase
          .from('properties')
          .select('id, property_name, address, placement_fee_pct, listing_status, on_market')
          .eq('id', propertyId)
          .maybeSingle();

        if (propErr) throw propErr;

        const { count } = await supabase
          .from('property_units')
          .select('id', { count: 'exact', head: true })
          .eq('property_id', propertyId);

        if (cancelled) return;
        setProperty(prop);
        setUnitCount(count ?? 0);
        setFeePct(Number(prop?.placement_fee_pct ?? 40));
      } catch (e: any) {
        toast.error(`Failed to load property: ${e?.message || e}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, propertyId]);

  const canSubmit =
    !submitting &&
    confirmed &&
    (mode === 'admin' || signature.trim().length >= 2);

  const handleActivate = async () => {
    if (!property) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not signed in');
        setSubmitting(false);
        return;
      }

      // Landlords sign and create an audit row. Admins skip the audit row
      // (admin authority is implicit) and just flip the listing on.
      if (mode === 'landlord') {
        const { error: actErr } = await supabase.from('listing_activations').insert({
          property_id: propertyId,
          signed_by: session.user.id,
          signer_role: 'landlord',
          signer_name: signature.trim(),
          placement_fee_pct: feePct,
          agreement_text: LANDLORD_TERMS(feePct),
          user_agent: navigator.userAgent,
        });
        if (actErr) throw actErr;
      }

      // Flip property on-market
      const { error: propErr } = await supabase
        .from('properties')
        .update({
          on_market: true,
          listing_status: 'active',
          activated_at: new Date().toISOString(),
          activated_by: session.user.id,
          placement_fee_pct: feePct,
        })
        .eq('id', propertyId);
      if (propErr) throw propErr;

      // Flip all units on-market
      const { error: unitsErr } = await supabase
        .from('property_units')
        .update({ on_market: true, listing_status: 'active' })
        .eq('property_id', propertyId);
      if (unitsErr) throw unitsErr;

      // Enqueue match recompute (fire-and-forget)
      void supabase
        .from('match_compute_queue')
        .upsert(
          {
            entity_type: 'property',
            entity_id: propertyId,
            requested_at: new Date().toISOString(),
            processing_started_at: null,
            attempts: 0,
            last_error: null,
          },
          { onConflict: 'entity_type,entity_id' },
        )
        .then(({ error }) => {
          if (error) console.warn('[ActivateListing] enqueue match failed (non-blocking):', error);
        });

      toast.success('Listing activated — units are live on the marketplace');
      onActivated?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error('[ActivateListing] failed:', e);
      toast.error(`Activation failed: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const isAlreadyActive = property?.listing_status === 'active' && property?.on_market;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'landlord' ? 'Activate Listing' : 'List on Marketplace'}</DialogTitle>
          <DialogDescription>
            {mode === 'landlord'
              ? 'Review the placement terms, sign, and publish your units to the marketplace.'
              : 'Publish this building to the marketplace.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !property ? (
          <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Property not found.
          </div>
        ) : isAlreadyActive ? (
          <div className="py-6 text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" /> This listing is already active.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Property summary */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <p className="font-medium text-sm">
                {property.property_name || property.address}
              </p>
              <p className="text-xs text-muted-foreground">{property.address}</p>
              <div className="flex gap-2 pt-1">
                <Badge variant="outline">{unitCount} unit{unitCount === 1 ? '' : 's'}</Badge>
                <Badge variant="outline">Status: {property.listing_status}</Badge>
              </div>
            </div>

            {mode === 'landlord' ? (
              <>
                {/* Fee (read-only for landlord) */}
                <div className="space-y-1">
                  <Label>Placement fee</Label>
                  <div className="text-sm font-medium">{feePct}%</div>
                  <p className="text-xs text-muted-foreground">
                    Fee on the first full month's rent for any tenant placed via OpenKey.
                  </p>
                </div>

                {/* Terms */}
                <div className="space-y-2">
                  <Label>Agreement</Label>
                  <div className="rounded-md border bg-background p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                    {LANDLORD_TERMS(feePct)}
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-1">
                  <Label htmlFor="signature">
                    Type your full legal name to sign <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="signature"
                    placeholder="e.g. Jane Doe"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    maxLength={120}
                    autoComplete="off"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(!!v)}
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree to the terms above and consent to use my typed name as my electronic signature.
                  </span>
                </label>
              </>
            ) : (
              // Admin: simple confirm only — no fee terms shown, no signature.
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(!!v)}
                  className="mt-0.5"
                />
                <span>List this property and all its units on the marketplace now.</span>
              </label>
            )}
          </div>
        )}

        {!isAlreadyActive && property && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleActivate} disabled={!canSubmit}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'landlord' ? 'Sign & Activate' : 'List on Marketplace'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
