import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Code, Palette, Layout, Zap, Eye, Save, Play, Monitor, Smartphone, Tablet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WhiteLabelAdvancedCustomizerProps {
  configId: string;
}

interface CustomTheme {
  id?: string;
  theme_name: string;
  is_active: boolean;
  custom_css?: string;
  custom_js?: string;
  component_overrides?: Record<string, any>;
  layout_config?: Record<string, any>;
  animation_settings?: Record<string, any>;
  responsive_breakpoints?: Record<string, any>;
  created_at?: string;
}

interface PageComponent {
  id?: string;
  page_type: string;
  component_type: string;
  component_data: Record<string, any>;
  position_order: number;
  is_visible: boolean;
}

export function WhiteLabelAdvancedCustomizer({ configId }: WhiteLabelAdvancedCustomizerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTheme, setActiveTheme] = useState<CustomTheme>({
    theme_name: 'Custom Theme',
    is_active: false
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');

  // Fetch custom themes
  const { data: themes, isLoading: themesLoading } = useQuery({
    queryKey: ['whiteLabelThemes', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_custom_themes')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CustomTheme[];
    }
  });

  // Fetch page components
  const { data: pageComponents } = useQuery({
    queryKey: ['whiteLabelPageComponents', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_page_components')
        .select('*')
        .eq('config_id', configId)
        .order('position_order');
      
      if (error) throw error;
      return data as PageComponent[];
    }
  });

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async (themeData: CustomTheme) => {
      if (themeData.id) {
        const { data, error } = await supabase
          .from('white_label_custom_themes')
          .update({
            ...themeData,
            custom_css: cssCode,
            custom_js: jsCode
          })
          .eq('id', themeData.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('white_label_custom_themes')
          .insert({
            ...themeData,
            config_id: configId,
            custom_css: cssCode,
            custom_js: jsCode
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelThemes'] });
      toast({
        title: "Theme saved",
        description: "Your custom theme has been saved successfully.",
      });
    }
  });

  // Add page component mutation
  const addComponentMutation = useMutation({
    mutationFn: async (component: Omit<PageComponent, 'id'>) => {
      const { data, error } = await supabase
        .from('white_label_page_components')
        .insert({ ...component, config_id: configId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whiteLabelPageComponents'] });
      toast({
        title: "Component added",
        description: "Page component has been added successfully.",
      });
    }
  });

  const handleSaveTheme = () => {
    saveThemeMutation.mutate(activeTheme);
  };

  const handlePreviewTheme = () => {
    // This would open a preview modal or new window
    toast({
      title: "Preview",
      description: "Opening theme preview...",
    });
  };

  const componentTypes = [
    { value: 'hero', label: 'Hero Section' },
    { value: 'features', label: 'Features Grid' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'pricing', label: 'Pricing Table' },
    { value: 'contact', label: 'Contact Form' },
    { value: 'footer', label: 'Footer' },
    { value: 'navigation', label: 'Navigation' },
    { value: 'content', label: 'Content Block' }
  ];

  const animationPresets = [
    { value: 'none', label: 'No Animation' },
    { value: 'fade', label: 'Fade In' },
    { value: 'slide', label: 'Slide Up' },
    { value: 'bounce', label: 'Bounce In' },
    { value: 'zoom', label: 'Zoom In' }
  ];

  if (themesLoading) {
    return <div className="text-center py-8">Loading customizer...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Advanced Customizer
        </CardTitle>
        <CardDescription>
          Create advanced customizations with CSS, JavaScript, and drag-and-drop page builder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="page-builder">Page Builder</TabsTrigger>
            <TabsTrigger value="css-editor">CSS Editor</TabsTrigger>
            <TabsTrigger value="js-editor">JS Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Custom Themes</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage custom themes for your white-label site
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handlePreviewTheme}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={handleSaveTheme} disabled={saveThemeMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveThemeMutation.isPending ? "Saving..." : "Save Theme"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Theme Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme_name">Theme Name</Label>
                    <Input
                      id="theme_name"
                      value={activeTheme.theme_name}
                      onChange={(e) => setActiveTheme(prev => ({ ...prev, theme_name: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={activeTheme.is_active}
                      onCheckedChange={(checked) => setActiveTheme(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Set as Active Theme</Label>
                  </div>

                  <div>
                    <Label>Animation Style</Label>
                    <Select
                      value={activeTheme.animation_settings?.style || 'none'}
                      onValueChange={(value) => setActiveTheme(prev => ({
                        ...prev,
                        animation_settings: { ...prev.animation_settings, style: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {animationPresets.map(preset => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Layout Style</Label>
                    <Select
                      value={activeTheme.layout_config?.style || 'standard'}
                      onValueChange={(value) => setActiveTheme(prev => ({
                        ...prev,
                        layout_config: { ...prev.layout_config, style: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="full-width">Full Width</SelectItem>
                        <SelectItem value="boxed">Boxed</SelectItem>
                        <SelectItem value="sidebar">With Sidebar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Existing Themes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {themes?.map((theme) => (
                      <div
                        key={theme.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setActiveTheme(theme)}
                      >
                        <div>
                          <div className="font-medium">{theme.theme_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(theme.created_at || '').toLocaleDateString()}
                          </div>
                        </div>
                        {theme.is_active && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="page-builder" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Page Builder</h3>
                <p className="text-sm text-muted-foreground">
                  Build your page layout with drag-and-drop components
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Components</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {componentTypes.map((component) => (
                      <Button
                        key={component.value}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => addComponentMutation.mutate({
                          page_type: 'landing',
                          component_type: component.value,
                          component_data: {},
                          position_order: (pageComponents?.length || 0) + 1,
                          is_visible: true
                        })}
                      >
                        <Layout className="h-4 w-4 mr-2" />
                        {component.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Page Preview ({previewMode})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`
                    border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 min-h-[400px]
                    ${previewMode === 'mobile' ? 'max-w-sm' : previewMode === 'tablet' ? 'max-w-2xl' : 'w-full'}
                    mx-auto
                  `}>
                    <div className="space-y-4">
                      {pageComponents?.filter(c => c.is_visible).map((component, index) => (
                        <div
                          key={component.id}
                          className="p-4 border border-muted rounded-lg bg-muted/20"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">
                              {componentTypes.find(t => t.value === component.component_type)?.label || component.component_type}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              Position {component.position_order}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Component content would be rendered here based on configuration
                          </div>
                        </div>
                      ))}
                      {(!pageComponents || pageComponents.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground">
                          No components added yet. Use the components panel to add elements to your page.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="css-editor" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Custom CSS</h3>
                <p className="text-sm text-muted-foreground">
                  Add custom CSS to override default styles
                </p>
              </div>
              <Button onClick={handleSaveTheme} disabled={saveThemeMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save CSS
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSS Editor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder={`/* Add your custom CSS here */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 0;
}

.hero-title {
  font-size: 3rem;
  color: white;
  text-align: center;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
}`}
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    rows={20}
                    className="font-mono"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSS Reference</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Common Selectors:</h4>
                      <div className="space-y-1 font-mono bg-muted p-2 rounded">
                        <div>.hero-section</div>
                        <div>.navigation</div>
                        <div>.features-grid</div>
                        <div>.testimonials</div>
                        <div>.pricing-table</div>
                        <div>.contact-form</div>
                        <div>.footer</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Utility Classes:</h4>
                      <div className="space-y-1 font-mono bg-muted p-2 rounded">
                        <div>.container</div>
                        <div>.text-center</div>
                        <div>.text-primary</div>
                        <div>.btn-primary</div>
                        <div>.card</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Responsive Breakpoints:</h4>
                      <div className="space-y-1 font-mono bg-muted p-2 rounded">
                        <div>@media (max-width: 640px)</div>
                        <div>@media (max-width: 768px)</div>
                        <div>@media (max-width: 1024px)</div>
                        <div>@media (max-width: 1280px)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="js-editor" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Custom JavaScript</h3>
                <p className="text-sm text-muted-foreground">
                  Add custom JavaScript for advanced functionality
                </p>
              </div>
              <Button onClick={handleSaveTheme} disabled={saveThemeMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save JavaScript
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">JavaScript Editor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder={`// Add your custom JavaScript here
document.addEventListener('DOMContentLoaded', function() {
  // Smooth scrolling for anchor links
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  
  // Custom form validation
  const forms = document.querySelectorAll('.contact-form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      // Add your validation logic here
    });
  });
});`}
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    rows={20}
                    className="font-mono"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">JavaScript Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Common Use Cases:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Form validation and submission</li>
                        <li>• Smooth scrolling navigation</li>
                        <li>• Modal popups and overlays</li>
                        <li>• Dynamic content loading</li>
                        <li>• Analytics event tracking</li>
                        <li>• Custom animations</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Security Notes:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Avoid inline event handlers</li>
                        <li>• Sanitize user inputs</li>
                        <li>• Use CSP-compliant code</li>
                        <li>• Test thoroughly before publishing</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Available APIs:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• DOM manipulation</li>
                        <li>• Fetch API for requests</li>
                        <li>• Local/Session Storage</li>
                        <li>• Intersection Observer</li>
                        <li>• ResizeObserver</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}