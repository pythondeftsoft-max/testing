import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, BarChart3, Bot, LayoutTemplate, Play, Shield } from 'lucide-react';
import { ContentManager } from './content/ContentManager';
import { BlogAnalytics } from './blog/BlogAnalytics';
import { SEOBlogEngine } from './blog/SEOBlogEngine';
import { TemplateGallery } from './content/TemplateGallery';
import { ContentEditor } from './content/ContentEditor';
import { FeatureDemoManager } from './FeatureDemoManager';
import RFPLibraryManager from './RFPLibraryManager';

export const BlogControlCenter = () => {
  const [activeSubTab, setActiveSubTab] = useState('content');
  const [templateCreate, setTemplateCreate] = useState<{ contentType: string; template: string } | null>(null);

  const handleCreateFromTemplate = (contentType: string, template: string) => {
    setTemplateCreate({ contentType, template });
    setActiveSubTab('content');
  };

  return (
    <Card className="border-openkey-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gradient-blue-gold">
          <FileText className="h-5 w-5" />
          Content Center
        </CardTitle>
        <CardDescription>
          Manage all content — pages, blogs, landings — from one place
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templateCreate ? (
          <ContentEditor
            contentId={null}
            onClose={() => setTemplateCreate(null)}
            defaultContentType={templateCreate.contentType}
            defaultTemplate={templateCreate.template}
          />
        ) : (
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="content">
                <FileText className="h-4 w-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="templates">
                <LayoutTemplate className="h-4 w-4 mr-2" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="seo-engine">
                <Bot className="h-4 w-4 mr-2" />
                SEO Engine
              </TabsTrigger>
              <TabsTrigger value="feature-demos">
                <Play className="h-4 w-4 mr-2" />
                Demos
              </TabsTrigger>
              <TabsTrigger value="rfp-library">
                <Shield className="h-4 w-4 mr-2" />
                RFP Library
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              <ContentManager />
            </TabsContent>

            <TabsContent value="templates">
              <TemplateGallery onCreateFromTemplate={handleCreateFromTemplate} />
            </TabsContent>

            <TabsContent value="analytics">
              <BlogAnalytics />
            </TabsContent>

            <TabsContent value="seo-engine">
              <SEOBlogEngine />
            </TabsContent>

            <TabsContent value="feature-demos">
              <FeatureDemoManager />
            </TabsContent>

            <TabsContent value="rfp-library">
              <RFPLibraryManager />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
