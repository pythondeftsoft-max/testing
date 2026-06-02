import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Eye, Trash2, Building, Users, FileCheck } from 'lucide-react';
import PropertyDocuments from './PropertyDocuments';

interface LandlordDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
  size?: number;
  property_id?: string;
  property_address?: string;
}

interface LandlordDocumentsProps {
  userId: string;
}

const LandlordDocuments = ({ userId }: LandlordDocumentsProps) => {
  const [documents, setDocuments] = useState<LandlordDocument[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('personal');
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
    fetchProperties();
  }, [userId]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, address')
        .eq('owner_id', userId)
        .order('address');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      // Fetch personal landlord documents (stored in tenant_documents table with landlord user_id)
      const { data: personalDocs, error: personalError } = await supabase
        .from('tenant_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (personalError) throw personalError;

      // Fetch property documents for all properties owned by this landlord
      const { data: propertyDocs, error: propertyError } = await supabase
        .from('property_documents')
        .select(`
          *,
          properties!inner(address, owner_id)
        `)
        .eq('properties.owner_id', userId)
        .order('created_at', { ascending: false });

      if (propertyError) throw propertyError;

      // Combine and format documents
      const personalDocumentList = personalDocs?.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type,
        url: doc.file_path,
        uploaded_at: doc.created_at,
        size: doc.file_size
      })) || [];

      const propertyDocumentList = propertyDocs?.map(doc => ({
        id: doc.id,
        name: doc.file_name,
        type: doc.document_type,
        url: doc.file_path,
        uploaded_at: doc.created_at,
        size: doc.file_size,
        property_id: doc.property_id,
        property_address: doc.properties?.address
      })) || [];

      setDocuments([...personalDocumentList, ...propertyDocumentList]);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'openkey_agreement':
        return <FileCheck className="h-5 w-5 text-green-600" />;
      case 'property_contract':
        return <Building className="h-5 w-5 text-blue-600" />;
      case 'tenant_agreement':
        return <Users className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !selectedDocumentType) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and document type",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      
      if (selectedProperty && selectedProperty !== 'personal') {
        // Upload to property documents
        const filePath = `${selectedProperty}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('property_documents')
          .insert({
            property_id: selectedProperty,
            uploaded_by: userId,
            document_type: selectedDocumentType,
            file_name: selectedFile.name,
            file_path: filePath,
            file_size: selectedFile.size,
            mime_type: selectedFile.type
          });

        if (dbError) throw dbError;
      } else {
        // Upload to personal documents
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tenant-documents')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('tenant_documents')
          .insert({
            user_id: userId,
            file_name: selectedFile.name,
            file_path: filePath,
            document_type: selectedDocumentType,
            file_size: selectedFile.size,
            mime_type: selectedFile.type
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      // Reset form
      setSelectedFile(null);
      setSelectedDocumentType('');
      setSelectedProperty('');
      const fileInput = document.getElementById('document-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (document: LandlordDocument) => {
    try {
      const bucketName = document.property_id ? 'property-documents' : 'tenant-documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(document.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      URL.revokeObjectURL(url);
      window.document.body.removeChild(anchor);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Download failed",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const viewDocument = async (document: LandlordDocument) => {
    try {
      const bucketName = document.property_id ? 'property-documents' : 'tenant-documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(document.url, 60 * 60); // 1 hour expiry

      if (error) throw error;

      if (data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({
        title: "View failed",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  const deleteDocument = async (document: LandlordDocument) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const bucketName = document.property_id ? 'property-documents' : 'tenant-documents';
      const tableName = document.property_id ? 'property_documents' : 'tenant_documents';

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([document.url]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  // Filter documents
  const personalDocuments = documents.filter(doc => !doc.property_id);
  const propertyDocuments = documents.filter(doc => doc.property_id);

  const groupedPersonalDocuments = personalDocuments.reduce((acc, doc) => {
    const type = doc.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, LandlordDocument[]>);

  const groupedPropertyDocuments = propertyDocuments.reduce((acc, doc) => {
    const property = doc.property_address || 'Unknown Property';
    if (!acc[property]) acc[property] = [];
    acc[property].push(doc);
    return acc;
  }, {} as Record<string, LandlordDocument[]>);

  const personalDocumentTypeLabels = {
    openkey_agreement: 'OpenKey Agreements',
    insurance: 'Insurance Documents',
    legal: 'Legal Documents',
    financial: 'Financial Documents',
    other: 'Other Documents'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="document-category">Document Category</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal/Business Documents</SelectItem>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      Property: {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProperty === 'personal' ? (
                    <>
                      <SelectItem value="openkey_agreement">OpenKey Agreement</SelectItem>
                      <SelectItem value="insurance">Insurance Documents</SelectItem>
                      <SelectItem value="legal">Legal Documents</SelectItem>
                      <SelectItem value="financial">Financial Documents</SelectItem>
                      <SelectItem value="other">Other Documents</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="placement_agreement">Placement Agreement</SelectItem>
                      <SelectItem value="lease_agreement">Lease Agreement</SelectItem>
                      <SelectItem value="inspection_report">Inspection Report</SelectItem>
                      <SelectItem value="tenant_contract">Tenant Contract</SelectItem>
                      <SelectItem value="other">Other Property Documents</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="document-upload">Choose File</Label>
              <Input
                id="document-upload"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </p>
            </div>

            <Button 
              onClick={uploadDocument} 
              disabled={uploading || !selectedFile || !selectedDocumentType}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>

            {selectedFile && (
              <div className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal">Personal/Business Documents</TabsTrigger>
          <TabsTrigger value="properties">Property Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          {/* Personal Documents by Category */}
          {Object.entries(personalDocumentTypeLabels).map(([type, label]) => {
            const typeDocuments = groupedPersonalDocuments[type] || [];
            
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getDocumentIcon(type)}
                    {label}
                    <span className="text-sm font-normal text-gray-500">
                      ({typeDocuments.length})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {typeDocuments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No {label.toLowerCase()} uploaded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {typeDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getDocumentIcon(document.type)}
                            <div>
                              <p className="font-medium">{document.name}</p>
                              <p className="text-sm text-gray-500">
                                Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                                {document.size && ` • ${(document.size / 1024 / 1024).toFixed(1)} MB`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewDocument(document)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadDocument(document)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDocument(document)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          {/* Property Documents by Property */}
          {Object.entries(groupedPropertyDocuments).map(([propertyAddress, propertyDocs]) => (
            <Card key={propertyAddress}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  {propertyAddress}
                  <span className="text-sm font-normal text-gray-500">
                    ({propertyDocs.length} documents)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {propertyDocs.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(document.type)}
                        <div>
                          <p className="font-medium">{document.name}</p>
                          <p className="text-sm text-gray-500">
                            {document.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • 
                            Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
                            {document.size && ` • ${(document.size / 1024 / 1024).toFixed(1)} MB`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDocument(document)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadDocument(document)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDocument(document)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {Object.keys(groupedPropertyDocuments).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No property documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Upload documents for specific properties using the form above
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LandlordDocuments;