import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, FileCheck } from 'lucide-react';

const auditItems = [
  { category: 'Building Codes', items: 15, passed: 14, failed: 0, pending: 1, lastAudit: '2025-01-15' },
  { category: 'Fire Safety', items: 12, passed: 11, failed: 1, pending: 0, lastAudit: '2025-02-01' },
  { category: 'Accessibility', items: 8, passed: 7, failed: 0, pending: 1, lastAudit: '2025-01-20' },
  { category: 'Environmental', items: 10, passed: 9, failed: 1, pending: 0, lastAudit: '2025-02-10' },
  { category: 'Health & Safety', items: 18, passed: 16, failed: 1, pending: 1, lastAudit: '2025-01-28' },
  { category: 'Insurance Requirements', items: 6, passed: 6, failed: 0, pending: 0, lastAudit: '2025-02-05' },
];

export const ComplianceAuditPanel: React.FC = () => {
  const totals = auditItems.reduce(
    (acc, item) => ({
      items: acc.items + item.items,
      passed: acc.passed + item.passed,
      failed: acc.failed + item.failed,
      pending: acc.pending + item.pending,
    }),
    { items: 0, passed: 0, failed: 0, pending: 0 }
  );

  const complianceRate = Math.round((totals.passed / totals.items) * 100);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Compliance Audit Results</h3>
        <Badge variant={complianceRate >= 90 ? 'default' : 'secondary'}>
          {complianceRate}% Compliant
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-green-500/10">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Passed</span>
          </div>
          <p className="text-2xl font-bold">{totals.passed}</p>
        </Card>
        <Card className="p-4 bg-destructive/10">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
          <p className="text-2xl font-bold">{totals.failed}</p>
        </Card>
        <Card className="p-4 bg-yellow-500/10">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="text-2xl font-bold">{totals.pending}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {auditItems.map((item, index) => (
          <div key={index} className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{item.category}</span>
              </div>
              <span className="text-xs text-muted-foreground">Last audit: {item.lastAudit}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>{item.passed} passed</span>
              </div>
              {item.failed > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  <span>{item.failed} failed</span>
                </div>
              )}
              {item.pending > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span>{item.pending} pending</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
