import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Bug, Copy, Check } from 'lucide-react';
import { isReportDebugEnabled, enableReportDebug, disableReportDebug } from '@/utils/debug';

interface ReportDebugPanelProps {
  title: string;
  parameters: any;
  results: any;
  loading: boolean;
  error: string | null;
}

export const ReportDebugPanel: React.FC<ReportDebugPanelProps> = ({
  title,
  parameters,
  results,
  loading,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(isReportDebugEnabled());
  const [copied, setCopied] = useState<string | null>(null);

  const toggleDebug = () => {
    if (debugEnabled) {
      disableReportDebug();
    } else {
      enableReportDebug();
    }
    setDebugEnabled(!debugEnabled);
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatJson = (obj: any) => JSON.stringify(obj, null, 2);

  if (!debugEnabled) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Debug Mode Disabled</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleDebug}
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Enable Debug
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-blue-900 flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Panel: {title}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleDebug}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Disable Debug
            </Button>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-blue-700">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {isOpen ? 'Collapse' : 'Expand'}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Quick Status */}
        <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
          <div className="bg-blue-100 p-3 rounded">
            <div className="font-medium text-blue-900">Status</div>
            <div className={`font-mono text-xs ${loading ? 'text-yellow-700' : error ? 'text-red-700' : 'text-green-700'}`}>
              {loading ? 'LOADING' : error ? 'ERROR' : 'SUCCESS'}
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded">
            <div className="font-medium text-blue-900">Results Count</div>
            <div className="font-mono text-xs text-blue-800">
              {results?.totalCount ?? results?.tenants?.length ?? results?.totalOwners ?? 'N/A'}
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded">
            <div className="font-medium text-blue-900">Properties</div>
            <div className="font-mono text-xs text-blue-800">
              {parameters?.computed?.finalPropertiesCount ?? parameters?.computed?.totalProperties ?? 'N/A'}
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded">
            <div className="font-medium text-blue-900">Portfolio</div>
            <div className="font-mono text-xs text-blue-800">
              {parameters?.portfolioId ?? parameters?.computed?.finalPortfolioId ?? parameters?.component?.selectedPortfolio ?? 'ALL'}
            </div>
          </div>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <div className="space-y-4">
              {/* Parameters */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Input Parameters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(parameters), 'params')}
                    className="h-6 px-2 text-blue-600"
                  >
                    {copied === 'params' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto font-mono text-blue-800 max-h-48 overflow-y-auto">
                  {formatJson(parameters)}
                </pre>
              </div>

              {/* Error */}
              {error && (
                <div>
                  <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
                  <pre className="bg-red-100 p-3 rounded text-xs overflow-x-auto font-mono text-red-800">
                    {error}
                  </pre>
                </div>
              )}

              {/* Results */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Results Summary</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatJson(results), 'results')}
                    className="h-6 px-2 text-blue-600"
                  >
                    {copied === 'results' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto font-mono text-blue-800 max-h-48 overflow-y-auto">
                  {formatJson(results)}
                </pre>
              </div>

              {/* Console Instructions */}
              <div className="bg-yellow-100 p-3 rounded text-xs text-yellow-800">
                <div className="font-medium mb-1">Console Debugging:</div>
                <div className="font-mono space-y-1">
                  <div>• Check console for detailed logs starting with 🔍</div>
                  <div>• Component logs: Look for "COMPONENT:" tags</div>
                  <div>• Hook logs: Look for hook-specific tags</div>
                  <div>• Use <code>enableReportDebug()</code> to enable debugging</div>
                  <div>• Use <code>disableReportDebug()</code> to disable debugging</div>
                </div>
              </div>

              {/* Filter Chain Summary */}
              {parameters?.component && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">Filter Chain Analysis</h4>
                  </div>
                  <div className="bg-blue-100 p-3 rounded text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium text-blue-900 mb-1">Component State</div>
                        <div className="font-mono text-blue-800 space-y-1">
                          <div>Portfolio: {parameters.component.selectedPortfolio}</div>
                          <div>All Properties: {String(parameters.component.isAllPropertiesMode)}</div>
                          <div>Selected Properties: {parameters.component.selectedPropertyIds?.length || 0}</div>
                          <div>Selected Units: {parameters.component.selectedUnitIds?.length || 0}</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-blue-900 mb-1">Computed Filters</div>
                        <div className="font-mono text-blue-800 space-y-1">
                          <div>Final Portfolio: {parameters.computed?.finalPortfolioId || 'N/A'}</div>
                          <div>Final Properties: {parameters.computed?.finalPropertyIds?.length || 'ALL'}</div>
                          <div>Final Units: {parameters.computed?.finalUnitIds?.length || 'ALL'}</div>
                          <div>Available Count: {parameters.computed?.availablePropertiesCount || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    
                    {parameters.component.validationErrors?.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        <div className="font-medium text-red-900 mb-1">Validation Issues</div>
                        <div className="text-red-800 space-y-1">
                          {parameters.component.validationErrors.map((error, idx) => (
                            <div key={idx}>• {error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};