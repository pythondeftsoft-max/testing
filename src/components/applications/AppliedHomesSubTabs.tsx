import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FileText, Heart } from 'lucide-react';
import SavedPropertiesList from '@/components/SavedPropertiesList';

interface AppliedHomesSubTabsProps {
  applicationsContent: React.ReactNode;
  userId: string;
}

export const AppliedHomesSubTabs = ({ applicationsContent, userId }: AppliedHomesSubTabsProps) => {
  const [activeSubTab, setActiveSubTab] = useState('applications');

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
      <TabsList className="command-tabs grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="applications" className="command-tab-trigger">
          <FileText className="h-4 w-4 mr-2" />
          Applications
        </TabsTrigger>
        <TabsTrigger value="saved" className="command-tab-trigger">
          <Heart className="h-4 w-4 mr-2" />
          Saved Properties
        </TabsTrigger>
      </TabsList>

      <TabsContent value="applications" className="space-y-6">
        {applicationsContent}
      </TabsContent>

      <TabsContent value="saved" className="space-y-6">
        <SavedPropertiesList />
      </TabsContent>
    </Tabs>
  );
};
