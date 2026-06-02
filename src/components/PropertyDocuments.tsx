import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PropertyDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
  metadata: any;
  unit_id?: string;
  unit_number?: string;
  unit_name?: string;
  storage_bucket?: string;
}

interface PropertyDocumentsProps {
  propertyId: string;
  isAdmin?: boolean;
}

const PropertyDocuments = ({ propertyId, isAdmin = false }: PropertyDocumentsProps) => {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [propertyId]);

  const fetchDocuments = async () => {
    try {
      // Fetch property-level documents
      const { data: propertyDocs, error: propertyError } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId);

      if (propertyError) throw propertyError;

      // Fetch unit-level documents for all units in this property
      const { data: unitDocs, error: unitError } = await supabase
        .from('property_unit_documents')
        .select(`
          *,
          property_units!inner(unit_number, unit_name, property_id)
        `)
        .eq('property_units.property_id', propertyId);

      if (unitError) throw unitError;

      // Combine and format documents
      const formattedPropertyDocs = (propertyDocs || []).map(doc => ({
        ...doc,
        storage_bucket: 'property-documents'
      }));

      const formattedUnitDocs = (unitDocs || []).map((doc: any) => ({
        id: doc.id,
        document_type: doc.document_type,
        file_name: doc.file_name,
        file_path: doc.file_path,
        created_at: doc.created_at,
        metadata: doc.metadata,
        unit_id: doc.unit_id,
        unit_number: doc.property_units.unit_number,
        unit_name: doc.property_units.unit_name,
        storage_bucket: 'unit-documents'
      }));

      // Combine and sort by created_at
      const allDocs = [...formattedPropertyDocs, ...formattedUnitDocs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load property documents.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const bucket = doc.storage_bucket || 'property-documents';
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: `${doc.file_name} is being downloaded.`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'placement_agreement':
        return 'Placement Agreement';
      case 'lease_agreement':
        return 'Lease Agreement';
      case 'inspection_report':
        return 'Inspection Report';
      case 'hap_w9_form':
        return 'W-9 Tax Form';
      case 'hap_direct_deposit_form':
        return 'Direct Deposit Authorization';
      case 'hap_pm_agreement':
        return 'Property Management Agreement';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'placement_agreement':
        return <Badge className="bg-green-100 text-green-800">Agreement</Badge>;
      case 'lease_agreement':
        return <Badge className="bg-blue-100 text-blue-800">Lease</Badge>;
      case 'inspection_report':
        return <Badge className="bg-yellow-100 text-yellow-800">Inspection</Badge>;
      case 'hap_w9_form':
        return <Badge className="bg-purple-100 text-purple-800">HAP Tax Form</Badge>;
      case 'hap_direct_deposit_form':
        return <Badge className="bg-indigo-100 text-indigo-800">HAP Banking</Badge>;
      case 'hap_pm_agreement':
        return <Badge className="bg-orange-100 text-orange-800">HAP Management</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Property Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No documents available for this property.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                      {getDocumentTypeBadge(doc.document_type)}
                      {doc.unit_id && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Unit {doc.unit_number || doc.unit_name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Uploaded {format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                      {doc.metadata?.signature && (
                        <span>• Signed by: {doc.metadata.signature}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyDocuments;