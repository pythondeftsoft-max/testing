import { useState } from 'react';
import { Building2, TrendingUp, Coins, Landmark, Package, Zap, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AssetQuickTemplatesProps {
  portfolioId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssetAdded: () => void;
}

interface AssetTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  defaultValues: {
    asset_name: string;
    asset_description: string;
    asset_value: number;
    annual_income: number;
    annual_expenses: number;
    metadata: Record<string, any>;
    tags: string[];
  };
}

export const AssetQuickTemplates = ({ 
  portfolioId, 
  isOpen, 
  onClose, 
  onAssetAdded 
}: AssetQuickTemplatesProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<AssetTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const assetTemplates: AssetTemplate[] = [
    // Real Estate Templates
    {
      id: 'residential-property',
      category: 'Real Estate',
      name: 'Residential Property',
      description: 'Single-family home, condo, or rental property',
      icon: Building2,
      color: 'text-blue-600',
      defaultValues: {
        asset_name: 'Residential Property',
        asset_description: 'Residential investment property',
        asset_value: 500000,
        annual_income: 24000,
        annual_expenses: 8000,
        metadata: {
          property_type: 'residential',
          bedrooms: 3,
          bathrooms: 2,
          square_feet: 1500,
          year_built: 2000,
          occupancy_status: 'rented'
        },
        tags: ['real-estate', 'rental', 'residential']
      }
    },
    {
      id: 'commercial-property',
      category: 'Real Estate',
      name: 'Commercial Property',
      description: 'Office building, retail space, or warehouse',
      icon: Building2,
      color: 'text-green-600',
      defaultValues: {
        asset_name: 'Commercial Property',
        asset_description: 'Commercial investment property',
        asset_value: 1200000,
        annual_income: 96000,
        annual_expenses: 24000,
        metadata: {
          property_type: 'commercial',
          lease_type: 'triple_net',
          square_feet: 5000,
          year_built: 1995,
          occupancy_rate: 0.9
        },
        tags: ['real-estate', 'commercial', 'income-property']
      }
    },
    
    // Stock Templates
    {
      id: 'blue-chip-stock',
      category: 'Stocks',
      name: 'Blue Chip Stock',
      description: 'Large-cap dividend-paying stock',
      icon: TrendingUp,
      color: 'text-blue-700',
      defaultValues: {
        asset_name: 'Blue Chip Stock',
        asset_description: 'Large-cap dividend stock investment',
        asset_value: 50000,
        annual_income: 1500,
        annual_expenses: 50,
        metadata: {
          asset_type: 'stock',
          symbol: '',
          sector: 'technology',
          market_cap: 'large',
          dividend_yield: 0.03
        },
        tags: ['stocks', 'dividends', 'blue-chip']
      }
    },
    {
      id: 'growth-stock',
      category: 'Stocks',
      name: 'Growth Stock',
      description: 'High-growth potential stock',
      icon: TrendingUp,
      color: 'text-green-700',
      defaultValues: {
        asset_name: 'Growth Stock',
        asset_description: 'High-growth stock investment',
        asset_value: 25000,
        annual_income: 0,
        annual_expenses: 25,
        metadata: {
          asset_type: 'stock',
          symbol: '',
          sector: 'technology',
          market_cap: 'mid',
          pe_ratio: 35
        },
        tags: ['stocks', 'growth', 'technology']
      }
    },

    // ETF Template
    {
      id: 'index-etf',
      category: 'ETFs',
      name: 'Index ETF',
      description: 'Diversified index fund or ETF',
      icon: Package,
      color: 'text-purple-600',
      defaultValues: {
        asset_name: 'Index ETF',
        asset_description: 'Diversified index fund investment',
        asset_value: 100000,
        annual_income: 2000,
        annual_expenses: 100,
        metadata: {
          asset_type: 'etf',
          symbol: '',
          expense_ratio: 0.001,
          asset_class: 'equity',
          geographic_focus: 'us'
        },
        tags: ['etf', 'diversified', 'index']
      }
    },

    // Bond Templates
    {
      id: 'government-bond',
      category: 'Bonds',
      name: 'Government Bond',
      description: 'Treasury or municipal bond',
      icon: Landmark,
      color: 'text-indigo-600',
      defaultValues: {
        asset_name: 'Government Bond',
        asset_description: 'Government bond investment',
        asset_value: 75000,
        annual_income: 2250,
        annual_expenses: 0,
        metadata: {
          asset_type: 'bond',
          bond_type: 'treasury',
          maturity_date: '2030-12-31',
          coupon_rate: 0.03,
          credit_rating: 'AAA'
        },
        tags: ['bonds', 'government', 'fixed-income']
      }
    },

    // Crypto Template
    {
      id: 'cryptocurrency',
      category: 'Crypto',
      name: 'Cryptocurrency',
      description: 'Digital asset investment',
      icon: Coins,
      color: 'text-orange-600',
      defaultValues: {
        asset_name: 'Cryptocurrency',
        asset_description: 'Digital currency investment',
        asset_value: 15000,
        annual_income: 0,
        annual_expenses: 0,
        metadata: {
          asset_type: 'crypto',
          symbol: '',
          blockchain: 'ethereum',
          staking_yield: 0.05
        },
        tags: ['crypto', 'digital-assets', 'volatile']
      }
    }
  ];

  const categories = [...new Set(assetTemplates.map(t => t.category))];

  const handleCreateFromTemplate = async (template: AssetTemplate) => {
    setIsCreating(true);
    try {
      // Here you would call your asset creation API
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Asset Created",
        description: `${template.name} has been added to your portfolio`,
      });
      
      onAssetAdded();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create asset from template",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-6 w-6 text-openkey-gold" />
            Quick Asset Templates
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Get started quickly with pre-configured asset templates. You can customize the details after creation.
          </p>

          {categories.map(category => {
            const categoryTemplates = assetTemplates.filter(t => t.category === category);
            
            return (
              <div key={category} className="space-y-3">
                <h3 className="text-lg font-semibold text-openkey-blue">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryTemplates.map(template => {
                    const IconComponent = template.icon;
                    
                    return (
                      <Card 
                        key={template.id}
                        className="cursor-pointer border-openkey-blue/20 bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:border-openkey-blue/40"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-subtle-blue/20 flex items-center justify-center">
                              <IconComponent className={`h-4 w-4 ${template.color}`} />
                            </div>
                            {template.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                          
                          {/* Template Preview */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Value:</span>
                              <p className="font-medium">${template.defaultValues.asset_value.toLocaleString()}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Income:</span>
                              <p className="font-medium text-green-600">${template.defaultValues.annual_income.toLocaleString()}/yr</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {template.defaultValues.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <Button
                            onClick={() => handleCreateFromTemplate(template)}
                            disabled={isCreating}
                            size="sm"
                            variant="gradient"
                            className="w-full"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {isCreating ? 'Creating...' : 'Use Template'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};