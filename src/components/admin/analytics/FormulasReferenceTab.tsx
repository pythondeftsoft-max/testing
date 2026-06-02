import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Calculator, BookOpen, Download } from 'lucide-react';
import { toast } from 'sonner';
import { generatePDF } from '@/utils/pdfGenerator';
import { FormulaCard } from './FormulaCard';
import { AddEditFormulaModal } from './AddEditFormulaModal';
import {
  useFormulas,
  useCreateFormula,
  useUpdateFormula,
  useDeleteFormula,
  PlatformFormula,
  CreateFormulaInput,
} from '@/hooks/useFormulasReference';

export const FormulasReferenceTab: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<PlatformFormula | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Always fetch all formulas - filter client-side for display
  const { data: allFormulas, isLoading } = useFormulas();
  const createFormula = useCreateFormula();
  const updateFormula = useUpdateFormula();
  const deleteFormula = useDeleteFormula();

  // Filter by category for display
  const displayedFormulas = allFormulas?.filter((formula) => {
    if (categoryFilter === 'all') return true;
    return formula.category === categoryFilter;
  });

  // Filter by search query
  const filteredFormulas = displayedFormulas?.filter((formula) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      formula.name.toLowerCase().includes(query) ||
      formula.description.toLowerCase().includes(query) ||
      formula.formula.toLowerCase().includes(query)
    );
  });

  const handleEdit = (formula: PlatformFormula) => {
    setEditingFormula(formula);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteFormula.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleSave = (data: CreateFormulaInput) => {
    if (editingFormula) {
      updateFormula.mutate({ id: editingFormula.id, ...data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingFormula(null);
        },
      });
    } else {
      createFormula.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false);
        },
      });
    }
  };

  const handleOpenModal = () => {
    setEditingFormula(null);
    setIsModalOpen(true);
  };

  const handleDownloadPDF = async () => {
    if (!allFormulas || allFormulas.length === 0) {
      toast.error('No formulas to export');
      return;
    }

    toast.loading('Generating PDF...', { id: 'pdf-export' });

    try {
      const categoryOrder = ['financial', 'investment', 'occupancy', 'health', 'performance'];
      const groupedFormulas = categoryOrder.reduce((acc, cat) => {
        acc[cat] = allFormulas.filter(f => f.category === cat);
        return acc;
      }, {} as Record<string, PlatformFormula[]>);

      const categoryLabels: Record<string, string> = {
        financial: 'Financial Metrics',
        investment: 'Investment Analysis',
        occupancy: 'Occupancy & Vacancy',
        health: 'Health Scores',
        performance: 'Performance Indicators',
      };

      let htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 800px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #DC6419; padding-bottom: 20px;">
            <h1 style="color: #DC6419; margin: 0; font-size: 28px;">OpenKey Property Management</h1>
            <h2 style="color: #333; margin: 10px 0 0 0; font-size: 20px;">Formula Reference Library</h2>
            <p style="color: #666; margin: 10px 0 0 0;">${allFormulas.length} formulas documented</p>
          </div>
      `;

      for (const category of categoryOrder) {
        const categoryFormulas = groupedFormulas[category];
        if (!categoryFormulas || categoryFormulas.length === 0) continue;

        htmlContent += `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="color: #DC6419; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px;">
              ${categoryLabels[category]} (${categoryFormulas.length})
            </h3>
        `;

        for (const formula of categoryFormulas) {
          const variables = formula.variables;
          const mockExample = formula.mock_example;
          const usedIn = formula.used_in;

          htmlContent += `
            <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid;">
              <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${formula.name}</h4>
              <p style="margin: 0 0 12px 0; color: #666; font-size: 12px;">${formula.description}</p>
              
              <div style="background: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <code style="font-family: 'Monaco', 'Consolas', monospace; color: #DC6419; font-size: 12px;">${formula.formula}</code>
              </div>
          `;

          if (variables && variables.length > 0) {
            htmlContent += `
              <div style="margin-bottom: 12px;">
                <strong style="font-size: 11px; color: #333;">Variables:</strong>
                <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px;">
                  ${variables.map((v) => `
                    <tr>
                      <td style="padding: 4px 8px; border: 1px solid #e0e0e0; background: #fff; font-family: monospace; width: 30%;">${v.name}</td>
                      <td style="padding: 4px 8px; border: 1px solid #e0e0e0; background: #fff;">${v.description}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `;
          }

          if (mockExample) {
            htmlContent += `
              <div style="background: #fff8f0; border: 1px solid #ffd9b3; border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <strong style="font-size: 11px; color: #333;">Example:</strong>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                  ${mockExample.inputs ? `<div><strong>Inputs:</strong> ${Object.entries(mockExample.inputs).map(([k, v]) => `${k} = ${v}`).join(', ')}</div>` : ''}
                  ${mockExample.calculation ? `<div><strong>Calculation:</strong> ${mockExample.calculation}</div>` : ''}
                  ${mockExample.result ? `<div><strong>Result:</strong> <span style="color: #DC6419; font-weight: bold;">${mockExample.result}</span></div>` : ''}
                </div>
              </div>
            `;
          }

          if (usedIn && usedIn.length > 0) {
            htmlContent += `
              <div style="font-size: 11px;">
                <strong style="color: #333;">Used in:</strong>
                ${usedIn.map(location => `<span style="display: inline-block; background: #e8e8e8; padding: 2px 8px; border-radius: 12px; margin: 2px; font-size: 10px;">${location}</span>`).join('')}
              </div>
            `;
          }

          htmlContent += `</div>`;
        }

        htmlContent += `</div>`;
      }

      htmlContent += `</div>`;

      const today = new Date().toISOString().split('T')[0];
      await generatePDF.generatePDFFromHTML(htmlContent, {
        filename: `openkey-formulas-reference-${today}.pdf`,
        headerText: 'OpenKey Formula Reference',
        footerText: `Generated on ${new Date().toLocaleDateString()}`,
        quality: 1.2,
      });

      toast.success('PDF downloaded successfully!', { id: 'pdf-export' });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    }
  };

  const categoryCounts = allFormulas?.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Formula Reference Library
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Documentation for all calculation formulas used across the platform
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadPDF} disabled={isLoading || !allFormulas?.length}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handleOpenModal}>
                <Plus className="w-4 h-4 mr-2" />
                Add Formula
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search formulas by name, description, or expression..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all" className="gap-1">
                All
                <Badge variant="secondary" className="ml-1 text-xs">
                  {allFormulas?.length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-1">
                Financial
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts['financial'] || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="investment" className="gap-1">
                Investment
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts['investment'] || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="occupancy" className="gap-1">
                Occupancy
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts['occupancy'] || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-1">
                Health
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts['health'] || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-1">
                Performance
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts['performance'] || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Formula Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredFormulas && filteredFormulas.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFormulas.map((formula) => (
            <FormulaCard
              key={formula.id}
              formula={formula}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No formulas found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? 'Try adjusting your search or filter criteria'
                : 'Add your first formula to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleOpenModal} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Formula
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AddEditFormulaModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setEditingFormula(null);
        }}
        formula={editingFormula}
        onSave={handleSave}
        isLoading={createFormula.isPending || updateFormula.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Formula?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the formula from the reference library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
