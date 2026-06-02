import React from 'react';
import { ImportDropzone } from '@/components/shared/ImportDropzone';

interface Props { agencyId: string; }

const InspectorsStep: React.FC<Props> = ({ agencyId }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Invite or import your inspector roster. Drop a CSV with name/email/phone, or upload territory
      schedules — we'll prep their accounts and their My Day view.
    </p>
    <ImportDropzone agencyId={agencyId} kind="inspectors" />
  </div>
);

export default InspectorsStep;
