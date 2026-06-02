import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { PlatformFormula, FormulaVariable, FormulaMockExample, CreateFormulaInput } from '@/hooks/useFormulasReference';

interface AddEditFormulaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formula?: PlatformFormula | null;
  onSave: (data: CreateFormulaInput) => void;
  isLoading?: boolean;
}

const categories = [
  { value: 'financial', label: 'Financial' },
  { value: 'performance', label: 'Performance' },
  { value: 'occupancy', label: 'Occupancy' },
  { value: 'investment', label: 'Investment' },
  { value: 'health', label: 'Health' },
];

export const AddEditFormulaModal: React.FC<AddEditFormulaModalProps> = ({
  open,
  onOpenChange,
  formula,
  onSave,
  isLoading,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formulaExpression, setFormulaExpression] = useState('');
  const [category, setCategory] = useState<PlatformFormula['category']>('financial');
  const [variables, setVariables] = useState<FormulaVariable[]>([{ name: '', description: '' }]);
  const [mockInputs, setMockInputs] = useState<Record<string, string>>({});
  const [mockCalculation, setMockCalculation] = useState('');
  const [mockResult, setMockResult] = useState('');
  const [usedIn, setUsedIn] = useState('');

  const isEditing = !!formula;

  useEffect(() => {
    if (formula) {
      setName(formula.name);
      setDescription(formula.description);
      setFormulaExpression(formula.formula);
      setCategory(formula.category);
      setVariables(formula.variables?.length > 0 ? formula.variables : [{ name: '', description: '' }]);
      setMockInputs(
        formula.mock_example?.inputs
          ? Object.fromEntries(
              Object.entries(formula.mock_example.inputs).map(([k, v]) => [k, String(v)])
            )
          : {}
      );
      setMockCalculation(formula.mock_example?.calculation || '');
      setMockResult(formula.mock_example?.result || '');
      setUsedIn(formula.used_in?.join(', ') || '');
    } else {
      resetForm();
    }
  }, [formula, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setFormulaExpression('');
    setCategory('financial');
    setVariables([{ name: '', description: '' }]);
    setMockInputs({});
    setMockCalculation('');
    setMockResult('');
    setUsedIn('');
  };

  const handleAddVariable = () => {
    setVariables([...variables, { name: '', description: '' }]);
  };

  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleVariableChange = (index: number, field: keyof FormulaVariable, value: string) => {
    const updated = [...variables];
    updated[index][field] = value;
    setVariables(updated);
  };

  const handleSubmit = () => {
    const filteredVariables = variables.filter(v => v.name.trim() !== '');
    
    const mockExample: FormulaMockExample = {
      inputs: Object.fromEntries(
        Object.entries(mockInputs)
          .filter(([k, v]) => k.trim() && v.trim())
          .map(([k, v]) => [k, parseFloat(v) || 0])
      ),
      calculation: mockCalculation,
      result: mockResult,
    };

    const usedInArray = usedIn
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    onSave({
      name,
      description,
      formula: formulaExpression,
      category,
      variables: filteredVariables,
      mock_example: mockExample,
      used_in: usedInArray,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Formula' : 'Add New Formula'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Formula Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Return on Investment (ROI)"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this formula calculate and why is it useful?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PlatformFormula['category'])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="formula">Formula Expression *</Label>
              <Input
                id="formula"
                value={formulaExpression}
                onChange={(e) => setFormulaExpression(e.target.value)}
                placeholder="e.g., (NOI / Purchase Price) × 100"
              />
            </div>
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Variables</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddVariable}>
                <Plus className="w-4 h-4 mr-1" /> Add Variable
              </Button>
            </div>
            <div className="space-y-2">
              {variables.map((variable, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Variable name"
                    value={variable.name}
                    onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                    className="w-1/3"
                  />
                  <Input
                    placeholder="Description"
                    value={variable.description}
                    onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                    className="flex-1"
                  />
                  {variables.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveVariable(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mock Example */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <Label className="text-base font-medium mb-3 block">Example Calculation</Label>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Example Input Values</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add input values based on your variables above
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {variables.filter(v => v.name.trim()).map((variable) => (
                    <div key={variable.name} className="flex items-center gap-2">
                      <Label className="text-sm w-1/2 truncate">{variable.name}:</Label>
                      <Input
                        type="number"
                        placeholder="Value"
                        value={mockInputs[variable.name] || ''}
                        onChange={(e) => setMockInputs({ ...mockInputs, [variable.name]: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="mockCalculation">Calculation String</Label>
                <Input
                  id="mockCalculation"
                  value={mockCalculation}
                  onChange={(e) => setMockCalculation(e.target.value)}
                  placeholder="e.g., (24000 / 300000) × 100"
                />
              </div>

              <div>
                <Label htmlFor="mockResult">Result</Label>
                <Input
                  id="mockResult"
                  value={mockResult}
                  onChange={(e) => setMockResult(e.target.value)}
                  placeholder="e.g., 8%"
                />
              </div>
            </div>
          </div>

          {/* Used In */}
          <div>
            <Label htmlFor="usedIn">Used In (comma-separated)</Label>
            <Input
              id="usedIn"
              value={usedIn}
              onChange={(e) => setUsedIn(e.target.value)}
              placeholder="e.g., Dashboard, Property Analytics, Financial Reports"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name || !description || !formulaExpression}>
            {isLoading ? 'Saving...' : isEditing ? 'Update Formula' : 'Create Formula'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
