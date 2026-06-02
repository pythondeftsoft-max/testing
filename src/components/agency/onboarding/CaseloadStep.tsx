import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ExternalLink, SkipForward, Upload } from 'lucide-react';
import AgencyDataImport from '../AgencyDataImport';

interface Props {
  agencyId: string;
}

/**
 * Either embeds the full import wizard inline, or shows a "skip for now"
 * exit so the user can come back to it later from the Caseload tab.
 */
export const CaseloadStep: React.FC<Props> = ({ agencyId }) => {
  const [mode, setMode] = useState<'choose' | 'import' | 'skipped'>('choose');

  if (mode === 'import') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Importing data — finish or back out anytime.</p>
          <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>
            ← Back to options
          </Button>
        </div>
        <AgencyDataImport agencyId={agencyId} />
      </div>
    );
  }

  if (mode === 'skipped') {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <SkipForward className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Skipped for now.</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You can import your tenant, voucher, and landlord data anytime from <strong>Caseload → Import</strong>.
          </p>
          <Button size="sm" variant="outline" onClick={() => setMode('choose')}>
            Change my mind
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Migrate your existing tenant, voucher, and landlord records — or skip and do this later.
      </p>

      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> CSV upload with auto column mapping</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Multi-entity (tenants, landlords, vouchers, units)</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Validation + preview before commit</div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={() => setMode('import')}>
          <Upload className="h-4 w-4 mr-1" /> Start import now
        </Button>
        <Button variant="outline" onClick={() => setMode('skipped')}>
          <SkipForward className="h-4 w-4 mr-1" /> Skip for now
        </Button>
        <Button variant="ghost" asChild>
          <a href="/agency?tab=import" target="_blank" rel="noopener" className="flex items-center gap-1">
            Open in new tab <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default CaseloadStep;
