import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Shield, CheckCircle2, XCircle, AlertTriangle, Settings, FileText, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ScreeningCriteria {
  minCreditScore: number;
  incomeMultiplier: number;
  maxEvictions: number;
  maxCriminalRecords: number;
  requireEmploymentVerification: boolean;
  requireRentalHistory: boolean;
  customNotes: string;
}

interface ScreeningResult {
  id: string;
  applicantName: string;
  applicationDate: string;
  creditScore: number | null;
  monthlyIncome: number | null;
  evictionCount: number;
  employmentVerified: boolean;
  rentalHistoryVerified: boolean;
  overallResult: 'pass' | 'fail' | 'review';
  failReasons: string[];
  adverseActionSent: boolean;
}

const DEFAULT_CRITERIA: ScreeningCriteria = {
  minCreditScore: 620,
  incomeMultiplier: 3,
  maxEvictions: 0,
  maxCriminalRecords: 0,
  requireEmploymentVerification: true,
  requireRentalHistory: true,
  customNotes: '',
};

// Mock data for demonstration
const MOCK_RESULTS: ScreeningResult[] = [
  {
    id: '1', applicantName: 'John Smith', applicationDate: '2026-04-10',
    creditScore: 720, monthlyIncome: 4500, evictionCount: 0,
    employmentVerified: true, rentalHistoryVerified: true,
    overallResult: 'pass', failReasons: [], adverseActionSent: false,
  },
  {
    id: '2', applicantName: 'Jane Doe', applicationDate: '2026-04-08',
    creditScore: 580, monthlyIncome: 2800, evictionCount: 1,
    employmentVerified: true, rentalHistoryVerified: false,
    overallResult: 'fail', failReasons: ['Credit score below minimum', 'Prior eviction', 'Rental history not verified'], adverseActionSent: false,
  },
  {
    id: '3', applicantName: 'Robert Johnson', applicationDate: '2026-04-05',
    creditScore: 650, monthlyIncome: 3200, evictionCount: 0,
    employmentVerified: false, rentalHistoryVerified: true,
    overallResult: 'review', failReasons: ['Employment not verified'], adverseActionSent: false,
  },
];

const TenantScreeningHub: React.FC<{ landlordId: string }> = ({ landlordId }) => {
  const [criteria, setCriteria] = useState<ScreeningCriteria>(DEFAULT_CRITERIA);
  const [results, setResults] = useState<ScreeningResult[]>(MOCK_RESULTS);
  const [showCriteria, setShowCriteria] = useState(false);
  const [adverseActionId, setAdverseActionId] = useState<string | null>(null);

  const passCount = results.filter(r => r.overallResult === 'pass').length;
  const failCount = results.filter(r => r.overallResult === 'fail').length;
  const reviewCount = results.filter(r => r.overallResult === 'review').length;

  const scoreApplicant = (result: ScreeningResult): { verdict: 'pass' | 'fail' | 'review'; reasons: string[] } => {
    const reasons: string[] = [];
    if (result.creditScore && result.creditScore < criteria.minCreditScore) reasons.push(`Credit score ${result.creditScore} below minimum ${criteria.minCreditScore}`);
    if (result.monthlyIncome && result.monthlyIncome < criteria.incomeMultiplier * 1200) reasons.push(`Income doesn't meet ${criteria.incomeMultiplier}x rent requirement`);
    if (result.evictionCount > criteria.maxEvictions) reasons.push(`${result.evictionCount} prior eviction(s) exceeds maximum ${criteria.maxEvictions}`);
    if (criteria.requireEmploymentVerification && !result.employmentVerified) reasons.push('Employment not verified');
    if (criteria.requireRentalHistory && !result.rentalHistoryVerified) reasons.push('Rental history not verified');
    
    if (reasons.length === 0) return { verdict: 'pass', reasons: [] };
    if (reasons.length <= 1) return { verdict: 'review', reasons };
    return { verdict: 'fail', reasons };
  };

  const handleSendAdverseAction = (id: string) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, adverseActionSent: true } : r));
    setAdverseActionId(null);
    toast.success('Adverse action notice sent');
  };

  const resultIcon = (result: string) => {
    if (result === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (result === 'fail') return <XCircle className="h-4 w-4 text-destructive" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{results.length}</p><p className="text-xs text-muted-foreground">Total Screened</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{passCount}</p><p className="text-xs text-muted-foreground">Passed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{failCount}</p><p className="text-xs text-muted-foreground">Failed</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{reviewCount}</p><p className="text-xs text-muted-foreground">Needs Review</p></CardContent></Card>
      </div>

      <Button variant="outline" onClick={() => setShowCriteria(true)}>
        <Settings className="h-4 w-4 mr-1" /> Screening Criteria
      </Button>

      {/* Results */}
      <div className="space-y-3">
        {results.map(result => (
          <Card key={result.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {resultIcon(result.overallResult)}
                  <div>
                    <p className="font-medium">{result.applicantName}</p>
                    <p className="text-xs text-muted-foreground">Applied {result.applicationDate}</p>
                  </div>
                </div>
                <Badge variant={result.overallResult === 'pass' ? 'success' : result.overallResult === 'fail' ? 'destructive' : 'secondary'}>
                  {result.overallResult.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                <div><span className="text-muted-foreground">Credit:</span> <span className="font-medium">{result.creditScore || 'N/A'}</span></div>
                <div><span className="text-muted-foreground">Income:</span> <span className="font-medium">${result.monthlyIncome?.toLocaleString() || 'N/A'}/mo</span></div>
                <div><span className="text-muted-foreground">Evictions:</span> <span className="font-medium">{result.evictionCount}</span></div>
                <div><span className="text-muted-foreground">Employment:</span> <span className="font-medium">{result.employmentVerified ? '✓ Verified' : '✗ Unverified'}</span></div>
              </div>
              {result.failReasons.length > 0 && (
                <div className="mt-2 p-2 rounded bg-muted text-xs space-y-1">
                  {result.failReasons.map((r, i) => <p key={i} className="text-muted-foreground">• {r}</p>)}
                </div>
              )}
              {result.overallResult === 'fail' && !result.adverseActionSent && (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setAdverseActionId(result.id)}>
                  <FileText className="h-3 w-3 mr-1" /> Send Adverse Action Notice
                </Button>
              )}
              {result.adverseActionSent && (
                <Badge variant="outline" className="mt-2 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Adverse Action Sent</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Criteria Dialog */}
      <Dialog open={showCriteria} onOpenChange={setShowCriteria}>
        <DialogContent>
          <DialogHeader><DialogTitle>Screening Criteria Builder</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Min Credit Score</Label><Input type="number" value={criteria.minCreditScore} onChange={e => setCriteria(c => ({ ...c, minCreditScore: Number(e.target.value) }))} /></div>
              <div><Label>Income Multiplier (x rent)</Label><Input type="number" step="0.5" value={criteria.incomeMultiplier} onChange={e => setCriteria(c => ({ ...c, incomeMultiplier: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Max Evictions</Label><Input type="number" value={criteria.maxEvictions} onChange={e => setCriteria(c => ({ ...c, maxEvictions: Number(e.target.value) }))} /></div>
              <div><Label>Max Criminal Records</Label><Input type="number" value={criteria.maxCriminalRecords} onChange={e => setCriteria(c => ({ ...c, maxCriminalRecords: Number(e.target.value) }))} /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={criteria.requireEmploymentVerification} onCheckedChange={v => setCriteria(c => ({ ...c, requireEmploymentVerification: v }))} />
              <Label>Require Employment Verification</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={criteria.requireRentalHistory} onCheckedChange={v => setCriteria(c => ({ ...c, requireRentalHistory: v }))} />
              <Label>Require Rental History</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowCriteria(false); toast.success('Criteria saved'); }}>Save Criteria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adverse Action Dialog */}
      <Dialog open={!!adverseActionId} onOpenChange={o => { if (!o) setAdverseActionId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adverse Action Notice</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Per the Fair Credit Reporting Act (FCRA) and Fair Housing Act, you must provide written notice when denying a rental application based on screening results.
            </p>
            {adverseActionId && (
              <div className="p-3 border rounded bg-muted text-sm space-y-1">
                <p className="font-medium">Reasons for Denial:</p>
                {results.find(r => r.id === adverseActionId)?.failReasons.map((r, i) => <p key={i}>• {r}</p>)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">This notice will be sent to the applicant via their registered email address.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdverseActionId(null)}>Cancel</Button>
            <Button onClick={() => adverseActionId && handleSendAdverseAction(adverseActionId)}>Send Notice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TenantScreeningHub;
