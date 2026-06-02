import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';

const mockVendors = [
  { name: 'Vendor A', quality: 92, timeliness: 88, cost: 75, communication: 95, overall: 87 },
  { name: 'Vendor B', quality: 85, timeliness: 92, cost: 82, communication: 88, overall: 87 },
  { name: 'Vendor C', quality: 78, timeliness: 80, cost: 95, communication: 85, overall: 85 },
  { name: 'Vendor D', quality: 90, timeliness: 85, cost: 78, communication: 92, overall: 86 },
];

export const VendorScorecardsPanel: React.FC = () => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Vendor Scorecards</h3>
        <Badge variant="outline">{mockVendors.length} Active Vendors</Badge>
      </div>

      <div className="space-y-4">
        {mockVendors.map((vendor, index) => (
          <Card key={index} className="p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{vendor.name}</h4>
              <div className="flex items-center gap-2">
                <Star className={`h-5 w-5 fill-current ${getScoreColor(vendor.overall)}`} />
                <span className={`font-bold ${getScoreColor(vendor.overall)}`}>{vendor.overall}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="font-medium">{vendor.quality}%</span>
                </div>
                <Progress value={vendor.quality} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Timeliness</span>
                  <span className="font-medium">{vendor.timeliness}%</span>
                </div>
                <Progress value={vendor.timeliness} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Cost Efficiency</span>
                  <span className="font-medium">{vendor.cost}%</span>
                </div>
                <Progress value={vendor.cost} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Communication</span>
                  <span className="font-medium">{vendor.communication}%</span>
                </div>
                <Progress value={vendor.communication} className="h-2" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
};
