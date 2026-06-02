import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  agencySlug: string;
}

export const GoLiveStep: React.FC<Props> = ({ agencySlug }) => (
  <div className="space-y-3 text-sm">
    <p>You're all set! Here are a few things to try first:</p>
    <ul className="space-y-2">
      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Submit a test RFTA from the Agency Dashboard</li>
      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Send a test notice to verify email delivery</li>
      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Visit your public waitlist page: <code className="text-xs bg-muted px-1 py-0.5 rounded">/agency/{agencySlug}/apply</code></li>
      <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Run your first SEMAP score from the Reports tab</li>
    </ul>
    <p className="text-xs text-muted-foreground pt-2">
      Click <strong>Go Live</strong> below to mark onboarding complete and unlock the full dashboard.
    </p>
  </div>
);

export default GoLiveStep;
