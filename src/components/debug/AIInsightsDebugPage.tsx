import React from 'react';
import { AIInsightsDebugPanel } from '@/components/analytics/AIInsightsDebugPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AIInsightsDebugPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-openkey-blue flex items-center gap-2">
                <Settings className="h-6 w-6" />
                AI Insights Debug Console
              </h1>
              <p className="text-muted-foreground">
                Diagnostic tools for troubleshooting AI insights edge function issues
              </p>
            </div>
          </div>
        </div>

        <AIInsightsDebugPanel />

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Instructions</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p>1. <strong>Check Console Logs:</strong> Open browser DevTools → Console to see detailed request logs</p>
            <p>2. <strong>Monitor Network:</strong> Use the Network tab to see actual HTTP requests and responses</p>
            <p>3. <strong>Test Manually:</strong> Click "Test Request" to trigger a fresh AI insights request</p>
            <p>4. <strong>Copy Debug Info:</strong> Use "Copy Debug Info" to share error details with developers</p>
          </div>
        </div>
      </div>
    </div>
  );
};