import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Share2, BarChart3, Settings, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WhiteLabelSEOManagerProps {
  configId: string;
}

interface SEOConfig {
  id?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  twitter_card_type?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image_url?: string;
  structured_data?: Record<string, any>;
  google_analytics_id?: string;
  google_tag_manager_id?: string;
  facebook_pixel_id?: string;
  sitemap_enabled?: boolean;
  robots_txt?: string;
  canonical_url?: string;
  hreflang_configs?: any[];
}

export function WhiteLabelSEOManager({ configId }: WhiteLabelSEOManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [seoData, setSeoData] = useState<SEOConfig>({});

  // Fetch SEO configuration
  const { data: seoConfig, isLoading } = useQuery({
    queryKey: ['whiteLabelSEO', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_seo_configs')
        .select('*')
        .eq('config_id', configId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as SEOConfig || {};
    },
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (seoConfig) {
      setSeoData(seoConfig);
    }
  }, [seoConfig]);

  // Save SEO configuration mutation
  const saveSEOMutation = useMutation({
    mutationFn: async (data: SEOConfig) => {
      if (seoConfig?.id) {
        const { data: updated, error } = await supabase
          .from('white_label_seo_configs')
          .update(data)
          .eq('id', seoConfig.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        const { data: created, error } = await supabase
          .from('white_label_seo_configs')
          .insert({ ...data, config_id: configId })
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelSEO'] });
      toast({
        title: "SEO settings saved",
        description: "Your SEO configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save SEO settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    saveSEOMutation.mutate(seoData);
  };

  const updateSeoData = (field: keyof SEOConfig, value: any) => {
    setSeoData(prev => ({ ...prev, [field]: value }));
  };

  const seoChecklist = [
    { 
      label: "Meta Title", 
      completed: !!seoData.meta_title, 
      description: "Essential for search rankings" 
    },
    { 
      label: "Meta Description", 
      completed: !!seoData.meta_description, 
      description: "Improves click-through rates" 
    },
    { 
      label: "Open Graph Image", 
      completed: !!seoData.og_image_url, 
      description: "Better social media sharing" 
    },
    { 
      label: "Google Analytics", 
      completed: !!seoData.google_analytics_id, 
      description: "Track website performance" 
    },
    { 
      label: "Sitemap Enabled", 
      completed: !!seoData.sitemap_enabled, 
      description: "Help search engines index your site" 
    }
  ];

  const completedChecks = seoChecklist.filter(item => item.completed).length;
  const seoScore = Math.round((completedChecks / seoChecklist.length) * 100);

  if (isLoading) {
    return <div className="text-center py-8">Loading SEO configuration...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          SEO & Marketing Manager
        </CardTitle>
        <CardDescription>
          Optimize your white-label site for search engines and social media
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* SEO Score Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                SEO Optimization Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold text-primary">{seoScore}%</div>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${seoScore}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {seoChecklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {item.completed ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={item.completed ? "text-green-700" : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic SEO</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="tracking">Analytics</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <Input
                    id="meta_title"
                    placeholder="Your Site Title - Primary Keyword"
                    value={seoData.meta_title || ''}
                    onChange={(e) => updateSeoData('meta_title', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {seoData.meta_title?.length || 0}/60 characters
                  </p>
                </div>
                <div>
                  <Label htmlFor="canonical_url">Canonical URL</Label>
                  <Input
                    id="canonical_url"
                    placeholder="https://your-domain.com"
                    value={seoData.canonical_url || ''}
                    onChange={(e) => updateSeoData('canonical_url', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  placeholder="A compelling description of your site that will appear in search results"
                  value={seoData.meta_description || ''}
                  onChange={(e) => updateSeoData('meta_description', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {seoData.meta_description?.length || 0}/160 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta_keywords">Meta Keywords</Label>
                <Input
                  id="meta_keywords"
                  placeholder="keyword1, keyword2, keyword3"
                  value={seoData.meta_keywords?.join(', ') || ''}
                  onChange={(e) => updateSeoData('meta_keywords', e.target.value.split(', '))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate keywords with commas
                </p>
              </div>

              <div>
                <Label htmlFor="robots_txt">Robots.txt Content</Label>
                <Textarea
                  id="robots_txt"
                  placeholder="User-agent: *&#10;Allow: /&#10;Sitemap: https://your-domain.com/sitemap.xml"
                  value={seoData.robots_txt || ''}
                  onChange={(e) => updateSeoData('robots_txt', e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sitemap_enabled"
                  checked={seoData.sitemap_enabled || false}
                  onCheckedChange={(checked) => updateSeoData('sitemap_enabled', checked)}
                />
                <Label htmlFor="sitemap_enabled">Enable XML Sitemap Generation</Label>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Open Graph (Facebook, LinkedIn)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="og_title">OG Title</Label>
                    <Input
                      id="og_title"
                      placeholder="Title for social media sharing"
                      value={seoData.og_title || ''}
                      onChange={(e) => updateSeoData('og_title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="og_image_url">OG Image URL</Label>
                    <Input
                      id="og_image_url"
                      placeholder="https://example.com/og-image.jpg"
                      value={seoData.og_image_url || ''}
                      onChange={(e) => updateSeoData('og_image_url', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="og_description">OG Description</Label>
                  <Textarea
                    id="og_description"
                    placeholder="Description for social media sharing"
                    value={seoData.og_description || ''}
                    onChange={(e) => updateSeoData('og_description', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Twitter Cards
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="twitter_title">Twitter Title</Label>
                    <Input
                      id="twitter_title"
                      placeholder="Title for Twitter sharing"
                      value={seoData.twitter_title || ''}
                      onChange={(e) => updateSeoData('twitter_title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter_image_url">Twitter Image URL</Label>
                    <Input
                      id="twitter_image_url"
                      placeholder="https://example.com/twitter-image.jpg"
                      value={seoData.twitter_image_url || ''}
                      onChange={(e) => updateSeoData('twitter_image_url', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="twitter_description">Twitter Description</Label>
                  <Textarea
                    id="twitter_description"
                    placeholder="Description for Twitter sharing"
                    value={seoData.twitter_description || ''}
                    onChange={(e) => updateSeoData('twitter_description', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="google_analytics_id">Google Analytics ID</Label>
                  <Input
                    id="google_analytics_id"
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                    value={seoData.google_analytics_id || ''}
                    onChange={(e) => updateSeoData('google_analytics_id', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your tracking ID from Google Analytics
                  </p>
                </div>

                <div>
                  <Label htmlFor="google_tag_manager_id">Google Tag Manager ID</Label>
                  <Input
                    id="google_tag_manager_id"
                    placeholder="GTM-XXXXXXX"
                    value={seoData.google_tag_manager_id || ''}
                    onChange={(e) => updateSeoData('google_tag_manager_id', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your container ID from Google Tag Manager
                  </p>
                </div>

                <div>
                  <Label htmlFor="facebook_pixel_id">Facebook Pixel ID</Label>
                  <Input
                    id="facebook_pixel_id"
                    placeholder="123456789012345"
                    value={seoData.facebook_pixel_id || ''}
                    onChange={(e) => updateSeoData('facebook_pixel_id', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your pixel ID from Facebook Business Manager
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div>
                <Label htmlFor="structured_data">Structured Data (JSON-LD)</Label>
                <Textarea
                  id="structured_data"
                  placeholder='{"@context": "https://schema.org", "@type": "Organization", "name": "Your Company"}'
                  value={JSON.stringify(seoData.structured_data || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      updateSeoData('structured_data', JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add structured data markup for rich snippets in search results
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">SEO Performance Tips</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Keep meta titles under 60 characters</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Keep meta descriptions between 120-160 characters</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Use high-quality images (1200x630px) for social media</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Include your primary keyword in title and description</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={saveSEOMutation.isPending}
            >
              {saveSEOMutation.isPending ? "Saving..." : "Save SEO Settings"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}