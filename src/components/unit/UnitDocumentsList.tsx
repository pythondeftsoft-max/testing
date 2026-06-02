import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  FileIcon
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useUnitDocuments, type UnitDocument } from '@/hooks/useUnitDocuments';
import { toast } from '@/hooks/use-toast';

interface UnitDocumentsListProps {
  unitId: string;
  canManage?: boolean;
}

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  'Lease Agreement': 'bg-blue-100 text-blue-800',
  'Inspection Report': 'bg-green-100 text-green-800',
  'Maintenance Record': 'bg-orange-100 text-orange-800',
  'Tenant Application': 'bg-purple-100 text-purple-800',
  'Insurance Document': 'bg-red-100 text-red-800',
  'Utility Bill': 'bg-yellow-100 text-yellow-800',
  'Certificate': 'bg-indigo-100 text-indigo-800',
  'Other': 'bg-gray-100 text-gray-800'
};

export const UnitDocumentsList = ({ unitId, canManage = true }: UnitDocumentsListProps) => {
  const { documents, loading, deleteDocument, getSignedUrl, downloadDocument } = useUnitDocuments(unitId);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<UnitDocument | null>(null);
  const [localDocuments, setLocalDocuments] = useState<UnitDocument[]>([]);

  // Sync with hook documents
  useEffect(() => {
    setLocalDocuments(documents);
  }, [documents]);

  const filteredDocuments = localDocuments.filter(doc => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(localDocuments.map(doc => doc.document_type))];

  const handlePreview = async (document: UnitDocument) => {
    try {
      const signedUrl = await getSignedUrl(document.file_path);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening document preview:', error);
    }
  };

  const handleDelete = (document: UnitDocument) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    // Close dialog immediately
    setDeleteDialogOpen(false);

    // Optimistically remove from local state
    const deletedDoc = documentToDelete;
    setLocalDocuments(prev => prev.filter(doc => doc.id !== deletedDoc.id));
    setDocumentToDelete(null);

    // Perform deletion in background (deleteDocument now handles toasts)
    try {
      const success = await deleteDocument(deletedDoc.id);
      
      if (!success) {
        throw new Error('Delete operation failed');
      }
    } catch (error) {
      console.error('Error during delete:', error);
      
      // Rollback: restore document to list
      setLocalDocuments(prev => [deletedDoc, ...prev].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));

      toast({
        title: 'Delete failed',
        description: 'Failed to delete document. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeColor = (type: string) => {
    return DOCUMENT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      {localDocuments.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{document.file_name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <Badge className={getDocumentTypeColor(document.document_type)}>
                          {document.document_type}
                        </Badge>
                        <span>{formatFileSize(document.file_size)}</span>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(document.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(document)}
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(document)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : localDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Upload lease agreements, inspection reports, and other unit-specific documents
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No documents match your search criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};