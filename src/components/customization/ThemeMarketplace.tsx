import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Palette, 
  Download, 
  Star, 
  Heart, 
  Search, 
  Filter,
  Code,
  Brush,
  Zap,
  Crown
} from 'lucide-react';

const ThemeMarketplace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const themes = [
    {
      id: 'modern-corporate',
      name: 'Modern Corporate',
      category: 'business',
      price: 'Free',
      rating: 4.8,
      downloads: 12400,
      preview: '🏢',
      isPremium: false,
      tags: ['corporate', 'clean', 'minimal']
    },
    {
      id: 'creative-agency',
      name: 'Creative Agency',
      category: 'creative',
      price: '$29',
      rating: 4.9,
      downloads: 8900,
      preview: '🎨',
      isPremium: true,
      tags: ['creative', 'colorful', 'dynamic']
    },
    {
      id: 'tech-startup',
      name: 'Tech Startup',
      category: 'technology',
      price: '$19',
      rating: 4.7,
      downloads: 15600,
      preview: '🚀',
      isPremium: true,
      tags: ['tech', 'modern', 'gradient']
    },
    {
      id: 'healthcare-pro',
      name: 'Healthcare Pro',
      category: 'healthcare',
      price: '$39',
      rating: 4.6,
      downloads: 3200,
      preview: '🏥',
      isPremium: true,
      tags: ['healthcare', 'trust', 'professional']
    }
  ];

  const plugins = [
    {
      id: 'analytics-plus',
      name: 'Analytics Plus',
      description: 'Advanced analytics and reporting features',
      price: '$15/month',
      rating: 4.5,
      installs: 5600,
      isPremium: true
    },
    {
      id: 'social-connect',
      name: 'Social Connect',
      description: 'Social media integration and sharing tools',
      price: 'Free',
      rating: 4.2,
      installs: 12800,
      isPremium: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Theme Marketplace</h2>
          <p className="text-muted-foreground">Discover and customize professional themes and plugins</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Code className="w-4 h-4 mr-2" />
            Custom Editor
          </Button>
          <Button variant="outline" size="sm">
            <Brush className="w-4 h-4 mr-2" />
            Brand Assets
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input 
            placeholder="Search themes and plugins..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <Tabs defaultValue="themes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="themes">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {themes.map((theme) => (
              <Card key={theme.id} className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-6xl">
                  {theme.preview}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{theme.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-warning" />
                          <span className="text-xs text-muted-foreground">{theme.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{theme.downloads.toLocaleString()} downloads</span>
                      </div>
                    </div>
                    {theme.isPremium && <Crown className="w-4 h-4 text-warning" />}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {theme.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{theme.price}</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button size="sm">
                        <Download className="w-4 h-4 mr-1" />
                        Install
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="plugins">
          <div className="space-y-4">
            {plugins.map((plugin) => (
              <Card key={plugin.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="w-8 h-8 text-primary" />
                        <div>
                          <h4 className="font-medium">{plugin.name}</h4>
                          <p className="text-sm text-muted-foreground">{plugin.description}</p>
                        </div>
                        {plugin.isPremium && <Crown className="w-4 h-4 text-warning" />}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current text-warning" />
                          <span>{plugin.rating}</span>
                        </div>
                        <span>{plugin.installs.toLocaleString()} installs</span>
                        <span className="font-medium text-foreground">{plugin.price}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Preview</Button>
                      <Button size="sm">Install</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="text-center py-12">
            <Palette className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Template Library Coming Soon</h3>
            <p className="text-muted-foreground">Advanced template system with inheritance and customization</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThemeMarketplace;