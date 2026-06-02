import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RenewalRow } from '@/hooks/renewal/useRenewalIntelligence';

interface Props {
  rows: RenewalRow[];
}

const RenewalPipelineFunnel: React.FC<Props> = ({ rows }) => {
  const stages = [
    { key: 'eligible', label: 'Eligible', match: (r: RenewalRow) => r.bucket === 'expiring_90' || r.bucket === 'expiring_60' },
    { key: 'notified', label: 'Notified', match: (r: RenewalRow) => r.status === 'notified' || r.status === 'notice_sent' },
    { key: 'negotiation', label: 'In Negotiation', match: (r: RenewalRow) => r.status === 'in_negotiation' || r.status === 'in_progress' },
    { key: 'signed', label: 'Signed', match: (r: RenewalRow) => r.status === 'signed' },
    { key: 'completed', label: 'Renewed', match: (r: RenewalRow) => r.bucket === 'completed' },
  ];

  const counts = stages.map(s => ({ ...s, count: rows.filter(s.match).length }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Renewal Pipeline Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {counts.map(s => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="w-24 text-xs text-muted-foreground">{s.label}</div>
            <div className="flex-1 bg-muted rounded h-6 overflow-hidden">
              <div
                className="h-full bg-primary/70 flex items-center justify-end pr-2 text-xs text-primary-foreground transition-all"
                style={{ width: `${(s.count / max) * 100}%`, minWidth: s.count > 0 ? '2rem' : '0' }}
              >
                {s.count > 0 && s.count}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RenewalPipelineFunnel;
