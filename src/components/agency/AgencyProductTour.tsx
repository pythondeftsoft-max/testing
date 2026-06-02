import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Building2, Users, FileText, DollarSign, Mail, ChevronRight, Sparkles } from 'lucide-react';

interface Props {
  agencyId: string;
  agencyName: string;
}

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to OpenKey',
    body: 'This quick tour shows you the five tabs you\'ll use most. It takes about 60 seconds.',
  },
  {
    icon: Building2,
    title: 'Overview Tab',
    body: 'Your home base. See pending work, upcoming inspections, expiring leases, and SEMAP score at a glance.',
  },
  {
    icon: Users,
    title: 'Caseload',
    body: 'Manage tenants, vouchers, applications, and landlords. Auto-assign work to caseworkers as you scale.',
  },
  {
    icon: FileText,
    title: 'Compliance',
    body: 'RFTAs, inspections, recertifications, hearings — anything HUD audits, lives here.',
  },
  {
    icon: DollarSign,
    title: 'Finance',
    body: 'HAP contracts, batched landlord payments, payment standards, FSS escrow tracking.',
  },
  {
    icon: Mail,
    title: 'Communications',
    body: 'Send notices to tenants and landlords, set automated reminders, and customize templates.',
  },
];

export const AgencyProductTour: React.FC<Props> = ({ agencyId, agencyName }) => {
  const storageKey = `agency_tour_seen_${agencyId}`;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(storageKey)) {
      // Slight delay so the dashboard renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>
            {step === 0 ? `${current.title}, ${agencyName}!` : current.title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <Progress value={progress} className="h-1.5" />
        <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={close}>Skip tour</Button>
          <Button onClick={next}>
            {step === STEPS.length - 1 ? 'Get Started' : 'Next'}
            {step < STEPS.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
