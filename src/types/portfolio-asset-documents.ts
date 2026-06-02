export interface AssetDocumentCategory {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  asset_category_ids: string[];
  icon_name?: string;
  color_theme: string;
  is_active: boolean;
  created_at: string;
}

export interface PortfolioAssetDocument {
  id: string;
  asset_id: string;
  portfolio_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  version_number: number;
  parent_document_id?: string;
  tags: string[];
  metadata: Record<string, any>;
  expiration_date?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  asset?: PortfolioAsset;
  category?: AssetDocumentCategory;
  parent_document?: PortfolioAssetDocument;
  versions?: PortfolioAssetDocument[];
}

export interface CreateAssetDocumentParams {
  asset_id: string;
  portfolio_id: string;
  document_name: string;
  document_type: string;
  file: File;
  tags?: string[];
  metadata?: Record<string, any>;
  expiration_date?: Date | string;
}

export interface UpdateAssetDocumentParams extends Partial<CreateAssetDocumentParams> {
  id: string;
  file?: File;
}

export interface AssetDocumentSearchParams {
  portfolio_id: string;
  asset_id?: string;
  document_type?: string;
  tags?: string[];
  search_term?: string;
  expiring_within_days?: number;
  page?: number;
  limit?: number;
}

export interface AssetDocumentUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  document_id?: string;
}

import { PortfolioAsset } from './portfolio-assets';