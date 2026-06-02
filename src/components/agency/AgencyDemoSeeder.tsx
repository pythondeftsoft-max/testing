import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Database, Loader2, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSuperAdminCheck } from '@/hooks/useSuperAdminCheck';

interface Props {
  agencyId: string;
}

const DEMO_TENANTS = [
  { first_name: 'Maria', last_name: 'Johnson' },
  { first_name: 'James', last_name: 'Williams' },
  { first_name: 'Patricia', last_name: 'Brown' },
  { first_name: 'Robert', last_name: 'Davis' },
  { first_name: 'Linda', last_name: 'Miller' },
  { first_name: 'Michael', last_name: 'Wilson' },
  { first_name: 'Elizabeth', last_name: 'Moore' },
  { first_name: 'David', last_name: 'Taylor' },
  { first_name: 'Jennifer', last_name: 'Anderson' },
  { first_name: 'Richard', last_name: 'Thomas' },
  { first_name: 'Susan', last_name: 'Jackson' },
  { first_name: 'Joseph', last_name: 'White' },
  { first_name: 'Sarah', last_name: 'Harris' },
  { first_name: 'Charles', last_name: 'Martin' },
  { first_name: 'Karen', last_name: 'Thompson' },
];

const VOUCHER_STATUSES = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'searching', 'searching', 'issued', 'issued', 'expired'];
const VOUCHER_TYPES = ['HCV', 'HCV', 'HCV', 'Project-Based', 'VASH', 'HCV', 'Emergency', 'HCV', 'HCV', 'Mainstream', 'HCV', 'HCV'];

const AgencyDemoSeeder: React.FC<Props> = ({ agencyId }) => {
  const { data: isSuperAdmin } = useSuperAdminCheck();
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const seedDemoData = async () => {
    if (!isSuperAdmin) { toast.error('Only super admins can seed demo data'); return; }
    setSeeding(true);

    try {
      // Seed vouchers (these are the primary records agencies care about)
      const voucherPayloads = DEMO_TENANTS.slice(0, 12).map((tenant, i) => ({
        agency_id: agencyId,
        tenant_id: '00000000-0000-0000-0000-000000000000', // placeholder
        voucher_type: VOUCHER_TYPES[i] || 'HCV',
        status: VOUCHER_STATUSES[i] || 'active',
        voucher_number: `DEMO-${String(i + 1).padStart(4, '0')}`,
        amount: 800 + Math.round(Math.random() * 1200),
        issued_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'DEMO_DATA',
      }));

      const { error: vErr } = await supabase.from('agency_vouchers').insert(voucherPayloads as any);
      if (vErr) throw vErr;

      // Seed some recertifications
      const recertPayloads = DEMO_TENANTS.slice(0, 5).map((_, i) => ({
        agency_id: agencyId,
        tenant_id: '00000000-0000-0000-0000-000000000000',
        type: 'annual' as const,
        status: (['upcoming', 'docs_requested', 'under_review', 'completed', 'overdue'] as const)[i],
        due_date: new Date(Date.now() + (30 - i * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'DEMO_DATA',
      }));

      await supabase.from('agency_recertifications').insert(recertPayloads as any);

      // Seed waitlist entries
      const waitlistPayloads = DEMO_TENANTS.slice(0, 8).map((tenant, i) => ({
        agency_id: agencyId,
        applicant_name: `${tenant.first_name} ${tenant.last_name}`,
        contact_email: `${tenant.first_name.toLowerCase()}.${tenant.last_name.toLowerCase()}@demo.com`,
        contact_phone: `555-${String(100 + i).padStart(3, '0')}-${String(1000 + i).padStart(4, '0')}`,
        household_size: 1 + Math.floor(Math.random() * 5),
        priority_category: (['general', 'elderly', 'disabled', 'veteran', 'general', 'homeless', 'general', 'general'] as const)[i],
        status: (['pending', 'pending', 'approved', 'approved', 'pending', 'waitlisted', 'pending', 'waitlisted'] as const)[i],
        notes: 'DEMO_DATA',
      }));

      await supabase.from('voucher_applications').insert(waitlistPayloads as any);

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('agency_activity_log').insert({
        agency_id: agencyId,
        actor_id: user?.id || null,
        action: 'demo_data_seeded',
        entity_type: 'agency',
        entity_id: agencyId,
        metadata: { vouchers: 12, recertifications: 5, waitlist: 8 },
      });

      setSeeded(true);
      toast.success('Demo data seeded! Dashboard should now show sample records.');
    } catch (err: any) {
      console.error('Seed error:', err);
      toast.error('Failed to seed demo data: ' + (err.message || 'Unknown error'));
    } finally {
      setSeeding(false);
    }
  };

  const cleanDemoData = async () => {
    if (!isSuperAdmin) return;
    setCleaning(true);
    try {
      await Promise.all([
        supabase.from('agency_vouchers').delete().eq('agency_id', agencyId).eq('notes', 'DEMO_DATA'),
        supabase.from('agency_recertifications').delete().eq('agency_id', agencyId).eq('notes', 'DEMO_DATA'),
        supabase.from('voucher_applications').delete().eq('agency_id', agencyId).eq('notes', 'DEMO_DATA'),
      ]);
      setSeeded(false);
      toast.success('Demo data cleaned up');
    } catch (err: any) {
      toast.error('Failed to clean demo data');
    } finally {
      setCleaning(false);
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Demo Data Seeder
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Populate this agency with realistic sample data for demos. All demo records are tagged and can be removed with one click.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">12 Vouchers</Badge>
          <Badge variant="outline">5 Recertifications</Badge>
          <Badge variant="outline">8 Waitlist Entries</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={seedDemoData} disabled={seeding || seeded} className="gap-2">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {seeding ? 'Seeding...' : seeded ? 'Demo Data Active' : 'Seed Demo Data'}
          </Button>

          {seeded && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" disabled={cleaning}>
                  {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Clean Up
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Demo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all demo records (vouchers, recertifications, waitlist entries) tagged as demo data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={cleanDemoData}>Remove Demo Data</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AgencyDemoSeeder;
