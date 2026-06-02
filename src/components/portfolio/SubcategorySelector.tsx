
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  TrendingUp, 
  Banknote, 
  Home, 
  Car, 
  Palette,
  Ship,
  Plane,
  Building,
  Store,
  Warehouse,
  Truck
} from 'lucide-react';
import type { AssetCategory } from '@/types/portfolio-assets';

interface SubcategorySelectorProps {
  categories: AssetCategory[] | undefined;
  selectedCategoryId: string;
  selectedSubcategory: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
}

const getCategoryIcon = (iconName?: string) => {
  switch (iconName) {
    case 'building2': return Building2;
    case 'trending-up': return TrendingUp;
    case 'banknote': return Banknote;
    case 'home': return Home;
    case 'car': return Car;
    case 'palette': return Palette;
    default: return Building2;
  }
};

const getSubcategoryIcon = (subcategoryValue: string) => {
  switch (subcategoryValue) {
    case 'yacht':
    case 'boat':
      return Ship;
    case 'aircraft':
      return Plane;
    case 'hotel':
    case 'office':
      return Building;
    case 'retail':
      return Store;
    case 'industrial':
    case 'warehouse':
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
    default:
      return Building2;
  }
};

export const SubcategorySelector = ({
  categories,
  selectedCategoryId,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
}: SubcategorySelectorProps) => {
  const [subcategories, setSubcategories] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const selectedCategory = categories?.find(cat => cat.id === selectedCategoryId);
    if (selectedCategory?.subcategories && Array.isArray(selectedCategory.subcategories)) {
      setSubcategories(selectedCategory.subcategories as Array<{ value: string; label: string }>);
    } else {
      setSubcategories([]);
    }
    // Reset subcategory when category changes
    onSubcategoryChange('');
  }, [selectedCategoryId, categories, onSubcategoryChange]);

  return (
    <div className="space-y-4">
      <div>
        <Label>Asset Category</Label>
        <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select asset category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map(category => {
              const IconComponent = getCategoryIcon(category.icon_name);
              const isLegacy = category.display_name.includes('(Legacy)');
              return (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2 w-full">
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <span className={isLegacy ? "text-muted-foreground" : ""}>
                      {category.display_name}
                    </span>
                    {isLegacy && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Use "Investments" instead
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {subcategories.length > 0 && (
        <div>
          <Label>Asset Type</Label>
          <Select value={selectedSubcategory} onValueChange={onSubcategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map(sub => {
                const SubIcon = getSubcategoryIcon(sub.value);
                return (
                  <SelectItem key={sub.value} value={sub.value}>
                    <div className="flex items-center gap-2">
                      <SubIcon className="h-4 w-4" />
                      <span>{sub.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
