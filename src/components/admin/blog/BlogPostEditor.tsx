import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, Tags, Upload, Loader2, Check, X, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BlogContentEditor } from './BlogContentEditor';
import { BlogLanguageSelector } from './BlogLanguageSelector';

import { useCreateBlogPost, useUpdateBlogPost } from '@/hooks/useBlogPosts';
import { useTranslateBlogPost } from '@/hooks/useTranslateBlogPost';

// Frontend-friendly URL for preview display (actual storage is still Supabase)
const PUBLISHED_SITE_URL = 'https://openkeyhousing.com';
const FRIENDLY_IMAGE_PATH = '/blog-images';

// Actual Supabase storage URL (used internally for uploads)
const STORAGE_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/property-images/blog-images`;

// Sanitize filename: lowercase, hyphens for spaces, remove special chars
const sanitizeFileName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Convert Supabase storage URL to friendly frontend URL for display
const toFriendlyUrl = (url: string): string => {
  if (!url) return '';
  // Match Supabase storage pattern and extract filename
  const match = url.match(/\/storage\/v1\/object\/public\/property-images\/blog-images\/(.+)$/);
  if (match) {
    return `${PUBLISHED_SITE_URL}${FRIENDLY_IMAGE_PATH}/${match[1]}`;
  }
  return url;
};

// Convert friendly URL back to Supabase URL for storage
const toStorageUrl = (url: string): string => {
  if (!url) return '';
  const friendlyPattern = new RegExp(`^${PUBLISHED_SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${FRIENDLY_IMAGE_PATH}/(.+)$`);
  const match = url.match(friendlyPattern);
  if (match) {
    return `${STORAGE_BASE_URL}/${match[1]}`;
  }
  return url;
};

interface BlogPostEditorProps {
  post?: any;
  onClose: () => void;
}

export const BlogPostEditor = ({ post, onClose }: BlogPostEditorProps) => {
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image_url: '',
    featured_image_alt: '',
    status: 'published',
    category_id: '',
    seo_title: '',
    seo_description: '',
    seo_keywords: [] as string[],
  });
  
  const [keywordInput, setKeywordInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // New states for custom filename feature
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [fileExtension, setFileExtension] = useState('');
  
  
  const translateBlogPost = useTranslateBlogPost();

  // Handle file selection (step 1 - just select, don't upload yet)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    setFileExtension(ext);
    setPendingFile(file);
    
    // Suggest a default name from the original filename (sanitized)
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    setCustomFileName(sanitizeFileName(baseName));
    
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Cancel pending upload
  const cancelPendingUpload = () => {
    setPendingFile(null);
    setCustomFileName('');
    setFileExtension('');
  };

  // Confirm upload with custom filename (step 2)
  const confirmUpload = async () => {
    if (!pendingFile || !customFileName.trim()) {
      toast.error('Please enter a filename');
      return;
    }

    setIsUploadingImage(true);
    try {
      const sanitizedName = sanitizeFileName(customFileName);
      const fileName = `${sanitizedName}.${fileExtension}`;
      const filePath = `blog-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, pendingFile, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, featured_image_url: publicUrl }));
      toast.success('Image uploaded successfully!');
      
      // Clear pending state
      cancelPendingUpload();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Get live preview URL (shows frontend-friendly URL)
  const getPreviewUrl = () => {
    if (!customFileName.trim() || !fileExtension) return '';
    return `${PUBLISHED_SITE_URL}${FRIENDLY_IMAGE_PATH}/${sanitizeFileName(customFileName)}.${fileExtension}`;
  };
  const createBlogPost = useCreateBlogPost();
  const updateBlogPost = useUpdateBlogPost();

  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        featured_image_url: post.featured_image_url || '',
        featured_image_alt: post.featured_image_alt || '',
        status: post.status || 'draft',
        category_id: post.category_id || '',
        seo_title: post.seo_title || '',
        seo_description: post.seo_description || '',
        seo_keywords: post.seo_keywords || [],
      });
    }
  }, [post]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: post ? prev.slug : generateSlug(title),
      seo_title: prev.seo_title || title,
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.seo_keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        seo_keywords: [...prev.seo_keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      seo_keywords: prev.seo_keywords.filter(k => k !== keyword)
    }));
  };

  const handleSubmit = async (status: string) => {
    const dataToSubmit = { 
      ...formData, 
      status,
      author_id: null,
      meta_tags: {},
      published_at: status === 'published' ? new Date().toISOString() : null,
      view_count: 0,
      content_structure: null,
      pillar_id: null,
      language: 'en',
      parent_post_id: null,
      featured_image_alt: formData.featured_image_alt || null,
      category_id: formData.category_id || null,
    };
    
    try {
      let postId = post?.id;
      
      if (post) {
        await updateBlogPost.mutateAsync({ id: post.id, ...dataToSubmit });
      } else {
        const result = await createBlogPost.mutateAsync(dataToSubmit);
        postId = result.id;
      }

      // If publishing and other languages are selected, trigger translation
      const nonEnglishLanguages = selectedLanguages.filter(l => l !== 'en');
      if (status === 'published' && nonEnglishLanguages.length > 0 && postId) {
        setIsTranslating(true);
        toast.info(`Creating ${nonEnglishLanguages.length} translation(s)...`);
        
        try {
          await translateBlogPost.mutateAsync({
            postId,
            targetLanguages: nonEnglishLanguages,
          });
        } catch (translationError) {
          console.error('Translation error:', translationError);
          // Don't block closing the editor, the post is already saved
        } finally {
          setIsTranslating(false);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  return (
    <div className="space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
      <div className="grid grid-cols-2 gap-6">
        {/* Main Content */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Enter post title..."
            />
          </div>

          <div>
            <Label htmlFor="slug">URL Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              placeholder="post-url-slug"
            />
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Brief summary of the post..."
              rows={3}
            />
          </div>

          <BlogContentEditor
            value={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <Separator />

              {/* Language Selector */}
              <BlogLanguageSelector
                selectedLanguages={selectedLanguages}
                onLanguagesChange={setSelectedLanguages}
                disabled={isTranslating}
              />

              <Separator />

              <div>
                <Label htmlFor="featured_image">Featured Image</Label>
                
                {/* Current image URL (read-only display or manual entry) */}
                {!pendingFile && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="featured_image"
                        value={toFriendlyUrl(formData.featured_image_url)}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          featured_image_url: toStorageUrl(e.target.value) 
                        }))}
                        placeholder="https://openkeyhousing.com/blog-images/..."
                        className="flex-1 text-xs"
                      />
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                          disabled={isUploadingImage}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isUploadingImage}
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4" />
                          </span>
                        </Button>
                      </label>
                    </div>
                    {formData.featured_image_url && (
                      <>
                        <p className="text-[10px] text-muted-foreground">
                          ℹ️ Displayed as friendly URL (stored in Supabase)
                        </p>
                        <img 
                          src={formData.featured_image_url} 
                          alt={formData.featured_image_alt || 'Preview'} 
                          className="h-20 w-auto rounded object-cover"
                        />
                        
                        {/* Alt Text Field */}
                        <div className="mt-3">
                          <Label htmlFor="featured_image_alt" className="text-xs">
                            Alt Text (SEO & Accessibility)
                          </Label>
                          <Input
                            id="featured_image_alt"
                            value={formData.featured_image_alt}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              featured_image_alt: e.target.value 
                            }))}
                            placeholder="Describe the image for search engines and screen readers"
                            className="text-xs mt-1"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formData.featured_image_alt.length}/125 characters
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Pending file: show filename editor */}
                {pendingFile && (
                  <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                    <div className="text-xs text-muted-foreground">
                      <strong>Your Live Site URL:</strong>
                      <code className="block mt-1 p-1.5 bg-background rounded text-[10px] break-all">
                        {PUBLISHED_SITE_URL}{FRIENDLY_IMAGE_PATH}/
                      </code>
                    </div>
                    
                    <div>
                      <Label htmlFor="custom_filename" className="text-xs">Your filename</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          id="custom_filename"
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          placeholder="my-image-name"
                          className="flex-1 text-sm"
                          disabled={isUploadingImage}
                        />
                        <span className="text-sm text-muted-foreground font-mono">.{fileExtension}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Use lowercase letters, numbers, and hyphens only
                      </p>
                    </div>

                    {customFileName.trim() && (
                      <div className="text-xs">
                        <strong className="text-foreground">Full URL Preview:</strong>
                        <code className="block mt-1 p-1.5 bg-background rounded text-[10px] break-all text-primary">
                          {getPreviewUrl()}
                        </code>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={confirmUpload}
                        disabled={isUploadingImage || !customFileName.trim()}
                        className="flex-1"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        {isUploadingImage ? 'Uploading...' : 'Confirm Upload'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={cancelPendingUpload}
                        disabled={isUploadingImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                  placeholder="SEO optimized title..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.seo_title.length}/60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seo_description">Meta Description</Label>
                <Textarea
                  id="seo_description"
                  value={formData.seo_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
                  placeholder="SEO meta description..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.seo_description.length}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="keywords">SEO Keywords</Label>
                <div className="flex space-x-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Add keyword..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" onClick={addKeyword} size="sm">
                    <Tags className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.seo_keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeKeyword(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isTranslating}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isTranslating}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit('published')} disabled={isTranslating}>
            {isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : selectedLanguages.length > 1 ? (
              <>
                <Languages className="h-4 w-4 mr-2" />
                Publish in {selectedLanguages.length} Languages
              </>
            ) : (
              post ? 'Update Post' : 'Publish Post'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
