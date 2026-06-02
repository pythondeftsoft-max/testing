import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { SimplifiedBulkPayoutFlow } from "./SimplifiedBulkPayoutFlow";
import { PayoutsList } from "./PayoutsList";
import { Send, History, BarChart3, DollarSign, Settings } from "lucide-react";

interface AllocationWorkspaceProps {
  userId: string;
  portfolioId?: string;
}

export const AllocationWorkspace = ({ userId, portfolioId }: AllocationWorkspaceProps) => {
  const [activeTab, setActiveTab] = useState('create');

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Send Payments</h1>
            <p className="text-muted-foreground">Create and manage payouts using Checkbook's payment system</p>
          </div>
        </div>
        
        {portfolioId && portfolioId !== 'everything' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Portfolio Context: Active Portfolio Selected
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  All payouts created will be associated with your selected portfolio for organized financial management.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Create Payout
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Payouts History
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <SimplifiedBulkPayoutFlow 
            userId={userId}
            portfolioId={portfolioId}
            onComplete={() => setActiveTab("history")}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <PayoutsList 
            userId={userId}
            portfolioId={portfolioId}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Payouts
                  </p>
                  <div className="text-2xl font-bold">$45,231.89</div>
                  <p className="text-xs text-muted-foreground">
                    All-time payouts sent
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Payouts
                  </p>
                  <div className="text-2xl font-bold">$12,234.00</div>
                  <p className="text-xs text-muted-foreground">
                    3 payouts processing
                  </p>
                </div>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    This Month
                  </p>
                  <div className="text-2xl font-bold">$28,097.89</div>
                  <p className="text-xs text-muted-foreground">
                    15 payouts completed
                  </p>
                </div>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex flex-row items-center justify-between space-y-0 pb-2 pt-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </p>
                  <div className="text-2xl font-bold">98.2%</div>
                  <p className="text-xs text-muted-foreground">
                    Delivery success rate
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};