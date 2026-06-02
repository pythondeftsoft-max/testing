import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Building2, Wand2, AlertCircle, List, Database } from 'lucide-react';
import { useSyncTransactions, useBackfillPaymentRecords } from '@/hooks/useLandlordPlaidTransactions';
import { usePaymentTaggingStats } from '@/hooks/usePaymentTaggingData';
import { UntaggedPropertiesTable } from './UntaggedPropertiesTable';
import { TaggedTransactionsTable } from './TaggedTransactionsTable';
import { AutoTagRulesTable } from './AutoTagRulesTable';
import { usePaymentTaggingTabStore } from '@/stores/paymentTaggingTabStore';

interface PaymentTaggingTabProps {
  landlordId: string;
  portfolioId?: string;
}

export const PaymentTaggingTab = ({ landlordId, portfolioId }: PaymentTaggingTabProps) => {
  const { activeTab, setActiveTab } = usePaymentTaggingTabStore();

  const { data: stats, isLoading: statsLoading } = usePaymentTaggingStats();
  const syncTransactions = useSyncTransactions();
  const backfillPayments = useBackfillPaymentRecords();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Tagging</p>
              <p className="text-blue-700">
                Track which properties have received payments this month. Tag incoming bank deposits to your properties 
                to keep rent tracking accurate and ensure HAP/voucher payments are properly assigned.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupied Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '...' : stats?.untaggedCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">need payment tracking</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tagged This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold flex items-baseline gap-1">
              <span className="text-green-600">
                {statsLoading ? '...' : formatCurrency(stats?.amountTaggedToProperties || 0)}
              </span>
              <span className="text-muted-foreground text-lg">/</span>
              <span className="text-blue-600">
                {statsLoading ? '...' : formatCurrency(stats?.amountTrackedFromPlaid || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">tagged / tracked from bank</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bank Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">synced from Plaid</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Tag Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {statsLoading ? '...' : stats?.activeRulesCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">active rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="command-tabs">
            <TabsTrigger value="untagged" className="command-tab-trigger flex items-center gap-2" data-tour="tagging-untagged-tab">
              <Building2 className="h-4 w-4" />
              Untagged Properties
              {stats?.untaggedCount ? (
                <Badge variant="secondary" className="ml-1 bg-orange-100 text-orange-800">
                  {stats.untaggedCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="tagged" className="command-tab-trigger flex items-center gap-2" data-tour="tagging-tagged-tab">
              <List className="h-4 w-4" />
              Tagged & Tracked
            </TabsTrigger>
            <TabsTrigger value="rules" className="command-tab-trigger flex items-center gap-2" data-tour="tagging-rules-tab">
              <Wand2 className="h-4 w-4" />
              Auto-Tag Rules
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => backfillPayments.mutate()}
              disabled={backfillPayments.isPending}
              title="Sync tagged payments to All Incoming Payments"
              data-tour="sync-payment-records-btn"
            >
              <Database className={`h-4 w-4 mr-2 ${backfillPayments.isPending ? 'animate-spin' : ''}`} />
              Sync Payment Records
            </Button>
            <Button
              variant="outline"
              onClick={() => syncTransactions.mutate()}
              disabled={syncTransactions.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncTransactions.isPending ? 'animate-spin' : ''}`} />
              Sync Bank
            </Button>
          </div>
        </div>

        <TabsContent value="untagged" className="mt-0">
          <UntaggedPropertiesTable landlordId={landlordId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="tagged" className="mt-0">
          <TaggedTransactionsTable landlordId={landlordId} portfolioId={portfolioId} />
        </TabsContent>

        <TabsContent value="rules" className="mt-0">
          <AutoTagRulesTable landlordId={landlordId} portfolioId={portfolioId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
