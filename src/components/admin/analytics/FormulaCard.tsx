import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Pencil, 
  Trash2, 
  Calculator,
  DollarSign,
  TrendingUp,
  Home,
  PieChart,
  Heart,
  Lock
} from 'lucide-react';
import { PlatformFormula } from '@/hooks/useFormulasReference';

interface FormulaCardProps {
  formula: PlatformFormula;
  onEdit: (formula: PlatformFormula) => void;
  onDelete: (id: string) => void;
}

const categoryConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  financial: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: DollarSign, label: 'Financial' },
  performance: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingUp, label: 'Performance' },
  occupancy: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Home, label: 'Occupancy' },
  investment: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: PieChart, label: 'Investment' },
  health: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Heart, label: 'Health' },
};

export const FormulaCard: React.FC<FormulaCardProps> = ({ formula, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = categoryConfig[formula.category] || categoryConfig.financial;
  const CategoryIcon = config.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={config.color}>
                <CategoryIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              {formula.is_system && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  System
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg font-semibold">{formula.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{formula.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(formula)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {!formula.is_system && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(formula.id)}
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formula Expression */}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase">Formula</span>
          </div>
          <code className="text-sm font-mono font-semibold text-primary">
            {formula.formula}
          </code>
        </div>

        {/* Variables */}
        {formula.variables && formula.variables.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Variables</h4>
            <div className="space-y-1">
              {formula.variables.map((variable, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="font-medium text-foreground">{variable.name}:</span>
                  <span className="text-muted-foreground">{variable.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Example */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span>View Example Calculation</span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <h4 className="text-xs font-medium text-muted-foreground uppercase mb-3">Example Calculation</h4>
              
              {/* Inputs */}
              {formula.mock_example?.inputs && Object.keys(formula.mock_example.inputs).length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground">Given:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries(formula.mock_example.inputs).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}</span> = <span className="text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculation */}
              {formula.mock_example?.calculation && (
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground">Calculation:</span>
                  <div className="mt-1">
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {formula.mock_example.calculation}
                    </code>
                  </div>
                </div>
              )}

              {/* Result */}
              {formula.mock_example?.result && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Result:</span>
                  <Badge variant="default" className="text-base font-semibold">
                    {formula.mock_example.result}
                  </Badge>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Used In Tags */}
        {formula.used_in && formula.used_in.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Used In</h4>
            <div className="flex flex-wrap gap-1">
              {formula.used_in.map((location, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
