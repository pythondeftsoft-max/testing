
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Home, Settings, Brain, AlertTriangle, Download, RotateCcw } from 'lucide-react';
import { usePropertyImport } from './ImportContext';
import { useImportSession } from '@/hooks/useImportSession';
import { PostImportIntelligence } from './PostImportIntelligence';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const ImportCompletedStep = () => {
  const { sessionId, resetImport } = usePropertyImport();
  const { session, results } = useImportSession(sessionId || undefined);
  const [showIntelligence, setShowIntelligence] = useState(false);

  const handleStartNewImport = () => {
    resetImport();
  };

  if (showIntelligence && session && results) {
    return (
      <PostImportIntelligence 
        session={session} 
        results={results} 
        onBack={() => setShowIntelligence(false)} 
      />
    );
  }

  // Determine import status
  const failedImports = session?.failed_imports || 0;
  const successfulImports = session?.successful_imports || 0;
  const totalImports = failedImports + successfulImports;
  
  const isAllFailed = totalImports > 0 && failedImports === totalImports;
  const isPartialSuccess = failedImports > 0 && successfulImports > 0;
  const isAllSuccess = totalImports > 0 && failedImports === 0;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="text-center">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          isAllFailed ? 'bg-red-100' : isPartialSuccess ? 'bg-amber-100' : 'bg-green-100'
        }`}>
          <CheckCircle className={`h-8 w-8 ${
            isAllFailed ? 'text-red-600' : isPartialSuccess ? 'text-amber-600' : 'text-green-600'
          }`} />
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${
          isAllFailed ? 'text-red-800' : isPartialSuccess ? 'text-amber-800' : 'text-green-800'
        }`}>
          {isAllFailed ? 'Import Failed - Action Required' : 
           isPartialSuccess ? 'Import Completed with Issues' :
           'Import Completed Successfully!'}
        </h2>
        <p className="text-muted-foreground">
          {isAllFailed ? 'All properties failed to import. Please review and fix the issues below.' :
           isPartialSuccess ? 'Some properties imported successfully, but others need attention.' :
           'Your properties have been imported and are ready for review.'}
        </p>
      </div>

      {/* Import Summary */}
      {session && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{session.total_rows || 0}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{session.successful_imports || 0}</div>
                <div className="text-sm text-muted-foreground">Properties Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{session.failed_imports || 0}</div>
                <div className="text-sm text-muted-foreground">Failed Imports</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {session.successful_imports || 0}
                </div>
                <div className="text-sm text-muted-foreground">Need Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Details Section */}
      {(isAllFailed || isPartialSuccess) && results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Import Errors ({results.filter(r => r.status === 'failed').length} failures)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Error Summary */}
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">Common Issues Found:</h4>
                <div className="space-y-2">
                  {results
                    .filter(r => r.status === 'failed')
                    .reduce((acc, result) => {
                      const errorType = result.error_details?.field || 'general';
                      const message = result.error_details?.message || 'Unknown error';
                      const key = `${errorType}:${message}`;
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                    && Object.entries(
                      results
                        .filter(r => r.status === 'failed')
                        .reduce((acc, result) => {
                          const errorType = result.error_details?.field || 'general';
                          const message = result.error_details?.message || 'Unknown error';
                          const key = `${errorType}:${message}`;
                          acc[key] = (acc[key] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                    ).map(([errorKey, count]) => {
                      const [field, message] = errorKey.split(':');
                      return (
                        <div key={errorKey} className="flex items-center justify-between">
                          <div>
                            <Badge variant="destructive" className="mr-2">{field}</Badge>
                            <span className="text-sm text-red-800">{message}</span>
                          </div>
                          <Badge variant="outline">{count} row{count > 1 ? 's' : ''}</Badge>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Error Solutions */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">How to Fix These Issues:</h4>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• <strong>Database constraint violations:</strong> Check that all required fields are properly formatted</li>
                  <li>• <strong>Property creation failures:</strong> Ensure addresses, rent amounts, and property types are valid</li>
                  <li>• <strong>Unit creation failures:</strong> Verify unit numbers are unique and properly formatted</li>
                  <li>• <strong>Missing data:</strong> Fill in any required fields that may be empty</li>
                </ul>
              </div>

              {/* Failed Rows Details (Collapsible) */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    View Failed Rows Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {results
                      .filter(r => r.status === 'failed')
                      .map((result, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Row {result.row_number}</span>
                            <Badge variant="destructive">Failed</Badge>
                          </div>
                          <div className="text-red-700 mb-2">
                            <strong>Error:</strong> {result.error_details?.message || 'Unknown error'}
                          </div>
                          <div className="text-gray-600">
                            <strong>Address:</strong> {result.original_data?.address || result.original_data?.street_address || 'N/A'}
                          </div>
                        </div>
                      ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons for Errors */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Failed Rows
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Retry Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Review & Complete Property Details</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your imported properties are in draft status. Review and complete any missing details 
                  like amenities, descriptions, and photos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-medium text-green-900">Make Properties Available</h4>
                <p className="text-sm text-green-700 mt-1">
                  Once you've reviewed the details, mark properties as available to list them on the market.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-medium text-purple-900">Manage Your Portfolio</h4>
                <p className="text-sm text-purple-700 mt-1">
                  View applications, schedule showings, and manage your properties from your dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg" className="flex-1">
          <Link to="/dashboard" className="gap-2">
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => setShowIntelligence(true)}
          className="flex-1 gap-2"
        >
          <Brain className="h-4 w-4" />
          AI Intelligence Dashboard
        </Button>
        
        <Button asChild variant="outline" size="lg" className="flex-1">
          <Link to="/dashboard?tab=imported" className="gap-2">
            <Settings className="h-4 w-4" />
            Review Imported Properties
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          size="lg" 
          onClick={handleStartNewImport}
          className="flex-1 gap-2"
        >
          Import More Properties
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Import Details */}
      {sessionId && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Import Session ID</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{sessionId}</code>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportCompletedStep;
