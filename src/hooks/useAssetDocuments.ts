import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  PortfolioAssetDocument, 
  AssetDocumentCategory, 
  CreateAssetDocumentParams, 
  UpdateAssetDocumentParams, 
  AssetDocumentSearchParams 
} from '@/types/portfolio-asset-documents';

const ASSET_DOCUMENTS_KEYS = {
  all: ['asset-documents'] as const,
  categories: () => [...ASSET_DOCUMENTS_KEYS.all, 'categories'] as const,
  documents: () => [...ASSET_DOCUMENTS_KEYS.all, 'documents'] as const,
  portfolio: (portfolioId: string) => [...ASSET_DOCUMENTS_KEYS.documents(), portfolioId] as const,
  asset: (assetId: string) => [...ASSET_DOCUMENTS_KEYS.documents(), 'asset', assetId] as const,
  search: (params: AssetDocumentSearchParams) => [...ASSET_DOCUMENTS_KEYS.documents(), 'search', params] as const,
  detail: (documentId: string) => [...ASSET_DOCUMENTS_KEYS.documents(), documentId] as const,
  versions: (documentId: string) => [...ASSET_DOCUMENTS_KEYS.documents(), documentId, 'versions'] as const,
};

// Asset Document Categories
export const useAssetDocumentCategories = () => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.categories(),
    queryFn: async (): Promise<AssetDocumentCategory[]> => {
      const { data, error } = await supabase
        .from('asset_document_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      return data || [];
    },
  });
};

// Portfolio Asset Documents
export const usePortfolioAssetDocuments = (portfolioId: string) => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.portfolio(portfolioId),
    queryFn: async (): Promise<PortfolioAssetDocument[]> => {
      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .select(`
          *,
          portfolio_assets!inner(
            id,
            asset_name,
            asset_category:asset_categories(display_name, color_theme)
          )
        `)
        .eq('portfolio_id', portfolioId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortfolioAssetDocument[];
    },
    enabled: !!portfolioId,
  });
};

// Asset Documents by Asset ID
export const useAssetDocuments = (assetId: string) => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.asset(assetId),
    queryFn: async (): Promise<PortfolioAssetDocument[]> => {
      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortfolioAssetDocument[];
    },
    enabled: !!assetId,
  });
};

// Document Search
export const useAssetDocumentSearch = (params: AssetDocumentSearchParams) => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.search(params),
    queryFn: async (): Promise<PortfolioAssetDocument[]> => {
      let query = supabase
        .from('portfolio_asset_documents')
        .select(`
          *,
          portfolio_assets!inner(
            id,
            asset_name,
            asset_category:asset_categories(display_name, color_theme)
          )
        `)
        .eq('portfolio_id', params.portfolio_id);

      if (params.asset_id) {
        query = query.eq('asset_id', params.asset_id);
      }

      if (params.document_type) {
        query = query.eq('document_type', params.document_type);
      }

      if (params.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }

      if (params.search_term) {
        query = query.or(`document_name.ilike.%${params.search_term}%,tags.cs.{${params.search_term}}`);
      }

      if (params.expiring_within_days) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + params.expiring_within_days);
        query = query
          .not('expiration_date', 'is', null)
          .lte('expiration_date', expiryDate.toISOString().split('T')[0]);
      }

      query = query.order('created_at', { ascending: false });

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.page && params.limit) {
        const offset = (params.page - 1) * params.limit;
        query = query.range(offset, offset + params.limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as PortfolioAssetDocument[];
    },
    enabled: !!params.portfolio_id,
  });
};

// Single Document
export const useAssetDocument = (documentId: string) => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.detail(documentId),
    queryFn: async (): Promise<PortfolioAssetDocument | null> => {
      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .select(`
          *,
          portfolio_assets!inner(
            id,
            asset_name,
            asset_category:asset_categories(display_name, color_theme)
          )
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data as PortfolioAssetDocument;
    },
    enabled: !!documentId,
  });
};

// Document Versions
export const useAssetDocumentVersions = (documentId: string) => {
  return useQuery({
    queryKey: ASSET_DOCUMENTS_KEYS.versions(documentId),
    queryFn: async (): Promise<PortfolioAssetDocument[]> => {
      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .select('*')
        .or(`id.eq.${documentId},parent_document_id.eq.${documentId}`)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return (data || []) as PortfolioAssetDocument[];
    },
    enabled: !!documentId,
  });
};

// Document Operations
export const useAssetDocumentOperations = (portfolioId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadDocument = useMutation({
    mutationFn: async (params: CreateAssetDocumentParams): Promise<PortfolioAssetDocument> => {
      // Generate file path
      const fileExt = params.file.name.split('.').pop();
      const fileName = `${params.asset_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('asset-documents')
        .upload(fileName, params.file);

      if (uploadError) throw uploadError;

      // Create document record
      const documentData = {
        asset_id: params.asset_id,
        portfolio_id: params.portfolio_id,
        document_name: params.document_name,
        document_type: params.document_type,
        file_path: uploadData.path,
        file_size: params.file.size,
        mime_type: params.file.type,
        tags: params.tags || [],
        metadata: params.metadata || {},
        expiration_date: params.expiration_date ? new Date(params.expiration_date).toISOString().split('T')[0] : null,
      };

      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .insert(documentData)
        .select()
        .single();

      if (error) throw error;
      return data as PortfolioAssetDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.portfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.asset(data.asset_id) });
      toast({
        title: "Document uploaded successfully",
        description: `${data.document_name} has been uploaded.`,
      });
    },
    onError: (error) => {
      console.error('Error uploading document:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async (params: UpdateAssetDocumentParams): Promise<PortfolioAssetDocument> => {
      let updateData: any = {
        document_name: params.document_name,
        document_type: params.document_type,
        tags: params.tags,
        metadata: params.metadata,
        expiration_date: params.expiration_date ? new Date(params.expiration_date).toISOString().split('T')[0] : null,
      };

      // If a new file is provided, upload it
      if (params.file) {
        const fileExt = params.file.name.split('.').pop();
        const fileName = `${params.asset_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('asset-documents')
          .upload(fileName, params.file);

        if (uploadError) throw uploadError;

        updateData = {
          ...updateData,
          file_path: uploadData.path,
          file_size: params.file.size,
          mime_type: params.file.type,
          version_number: 2, // Will be properly incremented
        };
      }

      const { data, error } = await supabase
        .from('portfolio_asset_documents')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as PortfolioAssetDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.portfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.asset(data.asset_id) });
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.versions(data.id) });
      toast({
        title: "Document updated successfully",
        description: `${data.document_name} has been updated.`,
      });
    },
    onError: (error) => {
      console.error('Error updating document:', error);
      toast({
        title: "Update failed",
        description: "Failed to update document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      // Get document info first
      const { data: document, error: fetchError } = await supabase
        .from('portfolio_asset_documents')
        .select('file_path, asset_id')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('asset-documents')
        .remove([document.file_path]);

      if (storageError) console.warn('Storage deletion failed:', storageError);

      // Delete from database
      const { error } = await supabase
        .from('portfolio_asset_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.portfolio(portfolioId) });
      queryClient.invalidateQueries({ queryKey: ASSET_DOCUMENTS_KEYS.all });
      toast({
        title: "Document deleted successfully",
        description: "The document has been removed.",
      });
    },
    onError: (error) => {
      console.error('Error deleting document:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadDocument = useMutation({
    mutationFn: async (document: PortfolioAssetDocument): Promise<void> => {
      const { data, error } = await supabase.storage
        .from('asset-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = document.document_name;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "The document is being downloaded.",
      });
    },
    onError: (error) => {
      console.error('Error downloading document:', error);
      toast({
        title: "Download failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
  };
};