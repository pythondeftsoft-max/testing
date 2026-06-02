import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, FileText, PenTool, Send, Lightbulb } from 'lucide-react';
import AdminEmailQueue from './AdminEmailQueue';
import EmailTemplatesTable from './EmailTemplatesTable';
import EmailComposer from './EmailComposer';
import EmailTemplateSuggestions from './EmailTemplateSuggestions';

const AdminEmailHub = () => {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Management Hub
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage email communications, templates, and campaigns
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Email Queue
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="compose" className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <AdminEmailQueue />
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplatesTable />
          </TabsContent>

          <TabsContent value="compose">
            <EmailComposer />
          </TabsContent>

          <TabsContent value="suggestions">
            <EmailTemplateSuggestions />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminEmailHub;