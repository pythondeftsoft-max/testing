
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Plus, FileText } from 'lucide-react';
import { UnitDocumentUpload } from './UnitDocumentUpload';
import { UnitDocumentsList } from './UnitDocumentsList';
import { useUnitDocuments } from '@/hooks/useUnitDocuments';

interface UnitDocumentsTabProps {
  unit: any;
  property: any;
}

export const UnitDocumentsTab = ({ unit, property }: UnitDocumentsTabProps) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { documents } = useUnitDocuments(unit.id);
  // Group documents by type for categories
  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = [];
    }
    acc[doc.document_type].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);

  const categoryData = [
    { name: 'Lease Agreements', type: 'Lease Agreement', icon: FileText, color: 'text-blue-500' },
    { name: 'Inspection Reports', type: 'Inspection Report', icon: FileText, color: 'text-green-500' },
    { name: 'Maintenance Records', type: 'Maintenance Record', icon: FileText, color: 'text-purple-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Document Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Unit Documents</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryData.map((category) => {
          const count = documentsByType[category.type]?.length || 0;
          const Icon = category.icon;
          
          return (
            <Card key={category.type} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${category.color}`} />
                <h4 className="font-medium">{category.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {count} document{count !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Document List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitDocumentsList unitId={unit.id} canManage={true} />
        </CardContent>
      </Card>

      {/* Upload Modal */}
          <UnitDocumentUpload
            isOpen={uploadModalOpen}
            onClose={() => setUploadModalOpen(false)}
            unitId={unit.id}
          />
    </div>
  );
};
