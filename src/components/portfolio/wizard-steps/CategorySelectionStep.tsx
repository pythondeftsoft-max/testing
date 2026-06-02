
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { WizardData } from '../AddAssetWizard';
import { 
  TrendingUp, 
  Bitcoin, 
  Home, 
  Receipt, 
  Package, 
  Users, 
  Building2, 
  DollarSign, 
  Palette,
  Ship,
  Plane,
  Building,
  Store,
  Warehouse,
  Car,
  Truck
} from 'lucide-react';

const categoryIcons = {
  TrendingUp,
  Bitcoin,
  Home,
  Receipt,
  Package,
  Users,
  Building2,
  DollarSign,
  Palette,
};

const getSubcategoryIcon = (subcategoryValue: string) => {
  switch (subcategoryValue) {
    case 'yacht':
    case 'boat':
    case 'marina':
      return Ship;
    case 'aircraft':
      return Plane;
    case 'hotel':
    case 'motel':
    case 'office':
    case 'office_building':
    case 'medical':
      return Building;
    case 'retail':
    case 'restaurant':
    case 'shopping_center':
      return Store;
    case 'industrial':
    case 'warehouse':
    case 'warehouse_distribution':
    case 'manufacturing':
    case 'flex_space':
      return Warehouse;
    case 'car':
    case 'truck':
    case 'motorcycle':
      return Car;
    case 'rv':
    case 'atv':
      return Truck;
    case 'residential_rental':
    case 'primary_residence':
    case 'vacation_home':
      return Home;
    case 'golf_course':
    case 'prison':
      return Building2;
    default:
      return Building2;
  }
};

interface CategorySelectionStepProps {
  wizardData: WizardData;
  onDataChange: (updates: Partial<WizardData>) => void;
  onNext: () => void;
}

export const CategorySelectionStep: React.FC<CategorySelectionStepProps> = ({
  wizardData,
  onDataChange,
  onNext
}) => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useAssetCategories();

  // Force fresh data on mount
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
  }, [queryClient]);

  const handleCategorySelect = (category: any) => {
    console.log('📋 Category selected:', category.name, 'with', category.subcategories?.length || 0, 'subcategories');
    onDataChange({ 
      selectedCategory: category, 
      selectedSubcategory: undefined,
      selectedSymbol: undefined, // Also clear symbol when category changes
      metadata: {} // Reset metadata when category changes
    });
  };

  const handleSubcategorySelect = (subcategory: string) => {
    console.log('🎯 Subcategory selected:', subcategory);
    // Clear previously selected symbol when subcategory changes
    onDataChange({ 
      selectedSubcategory: subcategory,
      selectedSymbol: undefined,
      metadata: {} // Also reset metadata to prevent stale data
    });
  };

  const canProceed = !!wizardData.selectedCategory;

  if (isLoading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Asset Category</h3>
        <p className="text-muted-foreground">Choose the type of asset you want to add to your portfolio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((category) => {
          const IconComponent = categoryIcons[category.icon_name as keyof typeof categoryIcons] || Package;
          const isSelected = wizardData.selectedCategory?.id === category.id;
          
          return (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-md h-full flex flex-col ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
              onClick={() => handleCategorySelect(category)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${category.color_theme}-100 text-${category.color_theme}-600`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium">{category.display_name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col justify-between">
                <CardDescription className="text-xs">{category.description}</CardDescription>
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 min-h-[2rem]">
                    {category.subcategories.slice(0, 3).map((sub: any) => {
                      const SubIcon = getSubcategoryIcon(sub.value);
                      return (
                        <Badge key={sub.value} variant="secondary" className="text-xs flex items-center gap-1">
                          <SubIcon className="h-3 w-3" />
                          {sub.label}
                        </Badge>
                      );
                    })}
                    {category.subcategories.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{category.subcategories.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>


      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
};
