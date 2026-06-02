import React from 'react';
import { ImportDropzone } from '@/components/shared/ImportDropzone';

interface Props { agencyId: string; }

const LandlordsStep: React.FC<Props> = ({ agencyId }) => (
  <div className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Bring your existing landlords/owners across. Drop a CSV/XLSX export from Yardi, WinTen2+, Emphasys,
      or PHA-Web — or drag in W-9 PDFs and we'll parse them.
    </p>
    <ImportDropzone agencyId={agencyId} kind="landlords" />
  </div>
);

export default LandlordsStep;
