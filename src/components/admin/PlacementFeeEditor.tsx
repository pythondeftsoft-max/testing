import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DollarSign, AlertTriangle, TrendingUp, ChevronDown } from 'lucide-react';
import { usePlacementFeeConfig, useUpdatePlacementFeeConfig } from '@/hooks/usePlacementFeeConfig';

const PlacementFeeEditor = () => {
  const { data: config, isLoading } = usePlacementFeeConfig();
  const updateConfig = useUpdatePlacementFeeConfig();
  
  const [isOpen, setIsOpen] = useState(false);
  const [percentage, setPercentage] = useState('40');
  const [minFee, setMinFee] = useState('');
  const [maxFee, setMaxFee] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (config?.config_value) {
      setPercentage(config.config_value.percentage.toString());
      setMinFee(config.config_value.min_fee?.toString() || '');
      setMaxFee(config.config_value.max_fee?.toString() || '');
      setNotes(config.config_value.notes || '');
    }
  }, [config]);

  const handleSave = () => {
    const percentageNum = parseFloat(percentage);
    
    if (isNaN(percentageNum) || percentageNum < 0 || percentageNum > 100) {
      return;
    }

    updateConfig.mutate({
      percentage: percentageNum,
      min_fee: minFee ? parseFloat(minFee) : null,
      max_fee: maxFee ? parseFloat(maxFee) : null,
      notes: notes,
    });
  };

  const exampleRents = [1000, 1500, 2000, 2500];
  const currentPercentage = parseFloat(percentage) || 40;

  if (isLoading) {
    return <div>Loading placement fee configuration...</div>;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Placement Fee Configuration
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
            <CardDescription className="text-left">
              Set the placement fee percentage charged to landlords for successful tenant placements
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
        {/* Alert */}
        <Alert className="border-amber-400 bg-amber-50/50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Important Notice</AlertTitle>
          <AlertDescription className="text-amber-800">
            Changes to the placement fee will apply to new tenant requests only. Existing signed contracts remain unchanged.
          </AlertDescription>
        </Alert>

        {/* Percentage Input */}
        <div className="space-y-2">
          <Label htmlFor="percentage" className="text-sm font-medium">
            Placement Fee Percentage
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="percentage"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="max-w-[150px]"
            />
            <span className="text-sm font-medium">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Percentage of first month's rent charged as placement fee (0-100%)
          </p>
        </div>

        {/* Optional Min/Max Caps */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minFee" className="text-sm font-medium">
              Minimum Fee (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <Input
                id="minFee"
                type="number"
                step="1"
                min="0"
                value={minFee}
                onChange={(e) => setMinFee(e.target.value)}
                placeholder="No minimum"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxFee" className="text-sm font-medium">
              Maximum Fee (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <Input
                id="maxFee"
                type="number"
                step="1"
                min="0"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value)}
                placeholder="No maximum"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Internal Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any internal notes about this fee structure..."
            rows={3}
          />
        </div>

        {/* Example Calculations */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Example Fee Calculations
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {exampleRents.map((rent) => {
              const fee = Math.round(rent * (currentPercentage / 100));
              return (
                <div key={rent} className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground">
                    ${rent.toLocaleString()}/month
                  </div>
                  <div className="text-lg font-bold text-primary">
                    ${fee.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    placement fee
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="w-full"
        >
          {updateConfig.isPending ? 'Updating...' : 'Update Placement Fee'}
        </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default PlacementFeeEditor;
