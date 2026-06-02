import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Copy, CheckCircle } from 'lucide-react';
import { getAllEmailTemplateSuggestions } from '@/utils/emailTemplateHelpers';
import { toast } from 'sonner';

const EmailTemplateSuggestions = () => {
  const suggestions = getAllEmailTemplateSuggestions();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Recommended Email Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set up these templates to enable automated notifications for lease renewal responses
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.slug} className="border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{suggestion.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {suggestion.slug}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Subject Template</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(suggestion.subject_template, 'Subject')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-sm">
                  {suggestion.subject_template}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Available Variables</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestion.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">HTML Template Sample</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(suggestion.sample_html, 'HTML Template')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-md font-mono text-xs max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{suggestion.sample_html.trim()}</pre>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    How to create this template:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-800 dark:text-blue-200">
                    <li>Go to the "Templates" tab</li>
                    <li>Click "Create Template"</li>
                    <li>Use the slug: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{suggestion.slug}</code></li>
                    <li>Copy and customize the subject and HTML above</li>
                    <li>Set audience to "Individual" and mark as active</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

export default EmailTemplateSuggestions;
