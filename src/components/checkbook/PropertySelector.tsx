import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAllPropertiesWithUnits } from "@/hooks/useAllPropertiesWithUnits";
import { Home } from "lucide-react";

interface PropertySelectorProps {
  userId?: string;
  portfolioId?: string;
  value?: string;
  onChange: (propertyId: string, propertyData?: any) => void;
  label?: string;
}

export const PropertySelector = ({ 
  userId, 
  portfolioId, 
  value, 
  onChange,
  label = "Property (Optional)"
}: PropertySelectorProps) => {
  const { data: properties, isLoading } = useAllPropertiesWithUnits(userId, portfolioId);

  const handleChange = (propertyId: string) => {
    const property = properties?.find(p => p.id === propertyId);
    onChange(propertyId, property);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={handleChange} disabled={isLoading}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading properties..." : "Select property"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No property (manual entry)</span>
          </SelectItem>
          {properties?.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>{property.address}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
