import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UnitStatusProps {
  formData: {
    status: string;
    on_market: boolean;
    description: string;
  };
  updateFormData: (field: string, value: string | boolean) => void;
}

export const UnitStatus: React.FC<UnitStatusProps> = ({
  formData,
  updateFormData,
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unit Status & Marketing</CardTitle>
          <CardDescription>
            Configure the current status of the unit and whether it should be listed on the market.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => updateFormData('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-7">
              <Checkbox
                id="on_market"
                checked={formData.on_market}
                onCheckedChange={(checked) => updateFormData('on_market', !!checked)}
              />
              <Label htmlFor="on_market">List on market</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Detailed unit description..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};