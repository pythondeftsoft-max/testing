
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const EmptyApplications = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tenant Applications
        </CardTitle>
        <CardDescription>Manage screening requests from potential tenants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No screening requests received yet.</p>
          <p className="text-sm">Applications will appear here when tenants request screening for your properties.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptyApplications;
