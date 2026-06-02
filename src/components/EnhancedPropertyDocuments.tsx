import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Eye, Calendar, Trash2, Upload, Plus, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import PropertyDocumentUpload from './PropertyDocumentUpload';

interface PropertyDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  created_at: string;
  metadata: any;
  source: 'property' | 'unit';
  unit_name?: string;
  unit_id?: string;
}

interface UnitOption {
  id: string;
  name: string;
}

interface EnhancedPropertyDocumentsProps {
  propertyId: string;
  isAdmin?: boolean;
}

const EnhancedPropertyDocuments = ({ propertyId, isAdmin = false }: EnhancedPropertyDocumentsProps) => {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [availableUnits, setAvailableUnits] = useState<UnitOption[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [propertyId]);

  // Reset to page 1 when filter or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnitFilter, itemsPerPage]);

  const fetchDocuments = async () => {
    try {
      // Fetch property-level documents
      const { data: propertyDocs, error: propError } = await supabase
        .from('property_documents')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (propError) throw propError;

      // Fetch units for this property
      const { data: units, error: unitsError } = await supabase
        .from('property_units')
        .select('id, unit_name, unit_number')
        .eq('property_id', propertyId);

      if (unitsError) throw unitsError;

      const unitIds = units?.map(u => u.id) || [];
      const unitMap = new Map(units?.map(u => [u.id, u.unit_name || u.unit_number || 'Unit']) || []);

      // Store units for filter dropdown
      setAvailableUnits(units?.map(u => ({
        id: u.id,
        name: u.unit_name || u.unit_number || 'Unit'
      })) || []);

      // Fetch unit-level documents
      let unitDocs: any[] = [];
      if (unitIds.length > 0) {
        const { data: unitDocsData, error: unitDocsError } = await supabase
          .from('property_unit_documents')
          .select('*')
          .in('unit_id', unitIds)
          .order('created_at', { ascending: false });

        if (unitDocsError) throw unitDocsError;
        unitDocs = unitDocsData || [];
      }

      // Combine documents with source indicator
      const allDocs: PropertyDocument[] = [
        ...(propertyDocs || []).map(d => ({
          ...d,
          source: 'property' as const,
        })),
        ...unitDocs.map(d => ({
          id: d.id,
          document_type: d.document_type,
          file_name: d.file_name,
          file_path: d.file_path,
          created_at: d.created_at,
          metadata: d.metadata,
          source: 'unit' as const,
          unit_name: unitMap.get(d.unit_id) || 'Unit',
          unit_id: d.unit_id,
        })),
      ];

      // Sort by date
      allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filter out placement agreements for non-admin users (landlords only need lease documents)
      const filteredDocs = isAdmin 
        ? allDocs 
        : allDocs.filter(doc => doc.document_type !== 'placement_agreement');

      setDocuments(filteredDocs);
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

  // Filter documents by selected unit
  const filteredDocuments = selectedUnitFilter === 'all'
    ? documents
    : selectedUnitFilter === 'property'
      ? documents.filter(doc => doc.source === 'property')
      : documents.filter(doc => doc.unit_id === selectedUnitFilter);

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredDocuments.length);
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handleDownload = async (doc: PropertyDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(doc.file_path);

      if (error) throw error;

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

  const handlePreview = async (doc: PropertyDocument) => {
    try {
      toast({ title: "Opening preview...", description: "Please wait..." });

      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error loading preview:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to preview the document. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (doc: PropertyDocument) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from the appropriate database table
      if (doc.source === 'property') {
        const { error: dbError } = await supabase
          .from('property_documents')
          .delete()
          .eq('id', doc.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('property_unit_documents')
          .delete()
          .eq('id', doc.id);
        if (dbError) throw dbError;
      }

      toast({
        title: "Document Deleted",
        description: `${doc.file_name} has been deleted.`,
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'placement_agreement':
        return 'Placement Agreement';
      case 'lease_agreement':
      case 'Lease Agreement':
        return 'Lease Agreement';
      case 'inspection_report':
        return 'Inspection Report';
      case 'hap_w9_form':
        return 'W-9 Tax Form';
      case 'hap_direct_deposit_form':
        return 'Direct Deposit Authorization';
      case 'hap_pm_agreement':
        return 'Property Management Agreement';
      case 'maintenance_report':
        return 'Maintenance Report';
      case 'insurance_document':
        return 'Insurance Document';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getDocumentTypeBadge = (type: string) => {
    switch (type) {
      case 'placement_agreement':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Agreement</Badge>;
      case 'lease_agreement':
      case 'Lease Agreement':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Lease</Badge>;
      case 'inspection_report':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Inspection</Badge>;
      case 'hap_w9_form':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">HAP Tax</Badge>;
      case 'hap_direct_deposit_form':
        return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">HAP Banking</Badge>;
      case 'hap_pm_agreement':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">HAP Management</Badge>;
      case 'maintenance_report':
        return <Badge variant="secondary">Maintenance</Badge>;
      case 'insurance_document':
        return <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">Insurance</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Property Documents</h3>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Unit Filter */}
          {availableUnits.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <Select value={selectedUnitFilter} onValueChange={setSelectedUnitFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  <SelectItem value="property">Property-wide</SelectItem>
                  {availableUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Items per page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Pagination info and arrows */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredDocuments.length > 0 ? `${startIndex + 1}-${endIndex} of ${filteredDocuments.length}` : '0 documents'}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= totalPages || totalPages === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Upload button (admin only) */}
          {isAdmin && (
            <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {selectedUnitFilter === 'all' 
              ? 'No documents available for this property.'
              : 'No documents match the selected filter.'}
          </p>
          {isAdmin && selectedUnitFilter === 'all' && (
            <Button size="sm" className="mt-4" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedDocuments.map((doc) => (
            <div key={`${doc.source}-${doc.id}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{getDocumentTypeLabel(doc.document_type)}</span>
                    {getDocumentTypeBadge(doc.document_type)}
                    {doc.source === 'unit' && doc.unit_name && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                        <Building2 className="h-3 w-3 mr-1" />
                        Unit {doc.unit_name}
                      </Badge>
                    )}
                    {doc.source === 'property' && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Property-wide
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Uploaded {format(new Date(doc.created_at), 'MMM dd, yyyy')}</span>
                    <span>• {doc.file_name}</span>
                    {doc.metadata?.notes && (
                      <span>• {doc.metadata.notes}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(doc)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Document</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{doc.file_name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doc)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <PropertyDocumentUpload
        isOpen={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        propertyId={propertyId}
        onUploadComplete={fetchDocuments}
      />
    </div>
  );
};

export default EnhancedPropertyDocuments;
