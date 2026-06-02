import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bot, Settings, Sparkles, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BlogAISettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState({
    ai_model: 'gpt-4',
    max_tokens: 2000,
    temperature: 0.7,
    content_tone: 'professional',
    target_audience: 'property managers',
    seo_optimization_enabled: true,
    auto_tag_generation: true,
    content_guidelines: '',
    default_category_id: '',
  });

  const { data: aiSettings, isLoading } = useQuery({
    queryKey: ['blog-ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_ai_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  React.useEffect(() => {
    if (aiSettings) {
      const config = aiSettings.configuration as any;
      setSettings({
        ai_model: config?.ai_model || 'gpt-4',
        max_tokens: config?.max_tokens || 2000,
        temperature: config?.temperature || 0.7,
        content_tone: config?.content_tone || 'professional',
        target_audience: config?.target_audience || 'property managers',
        seo_optimization_enabled: config?.seo_optimization_enabled ?? true,
        auto_tag_generation: config?.auto_tag_generation ?? true,
        content_guidelines: config?.content_guidelines || '',
        default_category_id: config?.default_category_id || '',
      });
    }
  }, [aiSettings]);

  const saveSettings = useMutation({
    mutationFn: async (newSettings: typeof settings) => {
      const settingsData = {
        setting_name: 'blog_ai_config',
        setting_type: 'ai_generation',
        configuration: newSettings,
        is_active: true,
        description: 'Blog AI generation settings',
      };

      if (aiSettings?.id) {
        const { data, error } = await supabase
          .from('blog_ai_settings')
          .update(settingsData)
          .eq('id', aiSettings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('blog_ai_settings')
          .insert(settingsData)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-ai-settings'] });
      toast({
        title: 'Success',
        description: 'AI settings saved successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save AI settings',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveSettings.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Loading AI settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AI Content Settings</h2>
          <p className="text-muted-foreground">Configure AI-powered content generation</p>
        </div>
        <Button onClick={handleSave} disabled={saveSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Model Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ai_model">AI Model</Label>
              <Select 
                value={settings.ai_model} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, ai_model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={settings.max_tokens}
                onChange={(e) => setSettings(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                min={500}
                max={4000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Controls the maximum length of generated content
              </p>
            </div>

            <div>
              <Label htmlFor="temperature">Temperature: {settings.temperature}</Label>
              <Input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower values = more focused, higher values = more creative
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Content Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="content_tone">Content Tone</Label>
              <Select 
                value={settings.content_tone} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, content_tone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={settings.target_audience}
                onChange={(e) => setSettings(prev => ({ ...prev, target_audience: e.target.value }))}
                placeholder="e.g., property managers, landlords, tenants"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="seo_optimization"
                checked={settings.seo_optimization_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, seo_optimization_enabled: checked }))}
              />
              <Label htmlFor="seo_optimization">Enable SEO optimization</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto_tag_generation"
                checked={settings.auto_tag_generation}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_tag_generation: checked }))}
              />
              <Label htmlFor="auto_tag_generation">Auto-generate tags</Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Content Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="content_guidelines">Writing Guidelines</Label>
            <Textarea
              id="content_guidelines"
              value={settings.content_guidelines}
              onChange={(e) => setSettings(prev => ({ ...prev, content_guidelines: e.target.value }))}
              placeholder="Enter specific guidelines for AI content generation..."
              rows={6}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              These guidelines will be included in AI prompts to ensure consistent content quality and style
            </p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>AI Content Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>AI content generation preview will be implemented here</p>
            <p className="text-sm">Test your settings with sample content generation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};