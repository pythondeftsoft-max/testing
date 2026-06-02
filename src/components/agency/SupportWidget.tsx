import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { LifeBuoy, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  agencyId?: string;
}

export const SupportWidget: React.FC<Props> = ({ agencyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'normal',
  });

  const reset = () => {
    setForm({ subject: '', description: '', category: 'general', priority: 'normal' });
    setSubmitted(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: 'Please sign in to submit a ticket', variant: 'destructive' });
      return;
    }
    if (!form.subject.trim() || !form.description.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        agency_id: agencyId || null,
        submitted_by: user.id,
        submitter_email: user.email || '',
        submitter_name: user.user_metadata?.full_name || user.email || '',
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        page_url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: 'Ticket submitted', description: 'Our team will reach out shortly.' });
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => { setOpen(true); }}
        size="lg"
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 shadow-lg p-0"
        aria-label="Get help"
      >
        <LifeBuoy className="h-6 w-6" />
      </Button>

      <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setTimeout(reset, 300); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" /> Get Help
            </SheetTitle>
            <SheetDescription>
              Stuck on something? Send us a quick note and we'll get back within one business day.
            </SheetDescription>
          </SheetHeader>

          {submitted ? (
            <div className="mt-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <h3 className="font-semibold text-lg">Ticket received</h3>
              <p className="text-sm text-muted-foreground">
                We'll reach out at the email on your account.
              </p>
              <Button variant="outline" onClick={() => { setOpen(false); }}>Close</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Question</SelectItem>
                      <SelectItem value="bug">Bug / Error</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="training">Training Help</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent — blocking work</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Short summary"
                  maxLength={200}
                  required
                />
              </div>
              <div>
                <Label>What's going on?</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what you're trying to do, what happened, and any error messages."
                  rows={6}
                  maxLength={4000}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Submit Ticket</>}
              </Button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
