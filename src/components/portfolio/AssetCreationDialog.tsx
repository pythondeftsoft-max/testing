
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar as CalendarIcon, DollarSign, Plus, Search, Check, TrendingUp, TrendingDown, Award, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAssetCategories, usePortfolioAssetOperations } from '@/hooks/usePortfolioAssets';
import { cn } from '@/lib/utils';
import type { CreateAssetParams } from '@/types/portfolio-assets';
import { SubcategorySelector } from './SubcategorySelector';
import { MetadataFields } from './MetadataFields';
import { Stepper } from '@/components/ui/stepper';
import { Progress } from '@/components/ui/progress';

const assetSchema = z.object({
  asset_category_id: z.string().min(1, 'Asset category is required'),
  asset_name: z.string().min(1, 'Asset name is required'),
  asset_description: z.string().optional(),
  asset_value: z.number().min(0, 'Asset value must be positive').optional(),
  acquisition_date: z.date().optional(),
  acquisition_cost: z.number().min(0, 'Acquisition cost must be positive').optional(),
  current_value: z.number().min(0, 'Current value must be positive').optional(),
  annual_income: z.number().min(0, 'Annual income must be positive').optional(),
  annual_expenses: z.number().min(0, 'Annual expenses must be positive').optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface AssetCreationDialogProps {
  portfolioId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetCreationDialog = ({ portfolioId, open, onOpenChange }: AssetCreationDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState('');
  const [marketLookupLoading, setMarketLookupLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: categories } = useAssetCategories();
  const { createAsset } = usePortfolioAssetOperations(portfolioId);

  // Default to the modern "investments" category
  const defaultCategoryId = categories?.find(cat => cat.name === 'investments' && cat.is_active)?.id || '';

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_category_id: defaultCategoryId,
      asset_name: '',
      asset_description: '',
      annual_income: 0,
      annual_expenses: 0,
      tags: [],
      metadata: {},
    },
  });

  // Calculate form completion for step 2
  const step2Progress = useMemo(() => {
    const assetName = form.watch('asset_name');
    const assetDescription = form.watch('asset_description');
    const fields = [assetName, assetDescription, subcategory];
    const completed = fields.filter(Boolean).length;
    return (completed / 3) * 100;
  }, [form.watch('asset_name'), form.watch('asset_description'), subcategory]);

  // Calculate ROI and performance metrics
  const performanceMetrics = useMemo(() => {
    const acquisitionCost = form.watch('acquisition_cost') || 0;
    const currentValue = form.watch('current_value') || 0;
    const annualIncome = form.watch('annual_income') || 0;
    const annualExpenses = form.watch('annual_expenses') || 0;

    const gain = currentValue - acquisitionCost;
    const roi = acquisitionCost > 0 ? ((gain / acquisitionCost) * 100) : 0;
    const netIncome = annualIncome - annualExpenses;
    const yieldPercentage = currentValue > 0 ? ((netIncome / currentValue) * 100) : 0;

    return {
      gain,
      roi,
      netIncome,
      yieldPercentage,
      isPositive: gain >= 0,
      isHighPerformer: roi > 15,
      isIncomeGenerator: netIncome > 0,
    };
  }, [
    form.watch('acquisition_cost'),
    form.watch('current_value'),
    form.watch('annual_income'),
    form.watch('annual_expenses'),
  ]);

  const handleCategoryChange = (categoryId: string) => {
    form.setValue('asset_category_id', categoryId);
    setSubcategory('');
    form.setValue('metadata', {});
  };

  const handleSubcategoryChange = (newSubcategory: string) => {
    setSubcategory(newSubcategory);
    // Reset metadata when subcategory changes
    form.setValue('metadata', {});
  };

  const handleMarketLookup = async () => {
    const ticker = form.getValues('metadata.ticker_symbol');
    if (!ticker) return;

    setMarketLookupLoading(true);
    try {
      // This would integrate with market data API in a real implementation
      // For now, we'll simulate the lookup
      console.log('Looking up market data for:', ticker);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would be replaced with actual market data API call
      const mockPrice = Math.random() * 1000 + 10;
      form.setValue('current_value', parseFloat(mockPrice.toFixed(2)));
      
    } catch (error) {
      console.error('Market lookup failed:', error);
    } finally {
      setMarketLookupLoading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      form.setValue('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue('tags', newTags);
  };

  const canProceedToStep2 = () => {
    return !!form.watch('asset_category_id') && !!subcategory;
  };

  const canProceedToStep3 = () => {
    return !!form.watch('asset_name');
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: AssetFormData) => {
    const createParams: CreateAssetParams = {
      portfolio_id: portfolioId,
      asset_category_id: data.asset_category_id,
      asset_name: data.asset_name,
      asset_description: data.asset_description,
      asset_value: data.asset_value,
      acquisition_date: data.acquisition_date,
      acquisition_cost: data.acquisition_cost,
      current_value: data.current_value,
      annual_income: data.annual_income || 0,
      annual_expenses: data.annual_expenses || 0,
      tags: tags,
      metadata: {
        ...data.metadata,
        subcategory: subcategory,
      },
    };

    setShowCelebration(true);
    createAsset.mutate(createParams, {
      onSuccess: () => {
        setTimeout(() => {
          onOpenChange(false);
          form.reset();
          setTags([]);
          setTagInput('');
          setSubcategory('');
          setCurrentStep(1);
          setShowCelebration(false);
        }, 1500);
      },
    });
  };

  const steps = ['Category', 'Details', 'Financials'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Add New Asset
            {showCelebration && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                className="text-2xl"
              >
                🎉
              </motion.div>
            )}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Select your asset type to get started"}
            {currentStep === 2 && "Tell us about your asset"}
            {currentStep === 3 && "Add financial details and complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <Stepper currentStep={currentStep - 1} steps={steps} className="mb-6" />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: Category Selection */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Asset Classification</h3>
                  </div>
                  
                  <SubcategorySelector
                    categories={categories}
                    selectedCategoryId={form.watch('asset_category_id')}
                    selectedSubcategory={subcategory}
                    onCategoryChange={handleCategoryChange}
                    onSubcategoryChange={handleSubcategoryChange}
                  />
                </motion.div>
              )}

              {/* STEP 2: Basic Details with Progress Tracking */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {Math.round(step2Progress)}% complete
                      </span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-success font-medium"
                      >
                        {step2Progress === 100 && "Great job! 🎯"}
                        {step2Progress >= 66 && step2Progress < 100 && "Almost there! 💪"}
                        {step2Progress >= 33 && step2Progress < 66 && "You're doing great! 🚀"}
                        {step2Progress < 33 && "Let's get started! ✨"}
                      </motion.span>
                    </div>
                    <Progress value={step2Progress} className="h-2" />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Basic Information
                      {step2Progress === 100 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-success"
                        >
                          <Check className="h-5 w-5" />
                        </motion.div>
                      )}
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="asset_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Asset Name
                            {field.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-success"
                              >
                                <Check className="h-4 w-4" />
                              </motion.div>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Apple Stock, My House, Bitcoin" 
                              {...field}
                              className={cn(
                                "transition-all",
                                field.value && "border-success/50"
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="asset_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Description (Optional)
                            {field.value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-success"
                              >
                                <Check className="h-4 w-4" />
                              </motion.div>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any details that help you track this asset..."
                              className={cn(
                                "resize-none transition-all",
                                field.value && "border-success/50"
                              )}
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            {field.value?.length || 0} characters
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dynamic Metadata Fields */}
                  {subcategory && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Asset-Specific Details</h3>
                        {(subcategory === 'crypto' || subcategory === 'stocks') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleMarketLookup}
                            disabled={marketLookupLoading || !form.watch('metadata.ticker_symbol')}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            {marketLookupLoading ? 'Looking up...' : 'Lookup Price'}
                          </Button>
                        )}
                      </div>
                      
                      <MetadataFields control={form.control} subcategory={subcategory} />
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3: Financial Information with Visualizations */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Financial Information</h3>
                    
                    {/* Performance Metrics Card */}
                    {(performanceMetrics.gain !== 0 || performanceMetrics.netIncome !== 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border bg-gradient-subtle-blue space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm">Performance Preview</h4>
                          {performanceMetrics.isHighPerformer && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 text-xs bg-warning text-warning-foreground px-2 py-1 rounded-full"
                            >
                              <Award className="h-3 w-3" />
                              High Performer
                            </motion.div>
                          )}
                          {performanceMetrics.isIncomeGenerator && !performanceMetrics.isHighPerformer && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 text-xs bg-success text-success-foreground px-2 py-1 rounded-full"
                            >
                              <Award className="h-3 w-3" />
                              Income Generator
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Capital Gain/Loss</p>
                            <div className="flex items-center gap-2">
                              {performanceMetrics.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-success" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-danger" />
                              )}
                              <span className={cn(
                                "text-lg font-bold",
                                performanceMetrics.isPositive ? "text-success" : "text-danger"
                              )}>
                                ${Math.abs(performanceMetrics.gain).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">ROI</p>
                            <span className={cn(
                              "text-lg font-bold",
                              performanceMetrics.roi > 0 ? "text-success" : "text-danger"
                            )}>
                              {performanceMetrics.roi.toFixed(2)}%
                            </span>
                          </div>
                          
                          {performanceMetrics.netIncome !== 0 && (
                            <>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Net Annual Income</p>
                                <span className={cn(
                                  "text-lg font-bold",
                                  performanceMetrics.netIncome > 0 ? "text-success" : "text-danger"
                                )}>
                                  ${Math.abs(performanceMetrics.netIncome).toFixed(2)}
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Yield</p>
                                <span className="text-lg font-bold text-info">
                                  {performanceMetrics.yieldPercentage.toFixed(2)}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="acquisition_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acquisition Cost (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">What you paid for this asset</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="current_value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Value (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Current market value</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="annual_income"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Income (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Rental income, dividends, etc.</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="annual_expenses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Expenses (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="pl-10"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                />
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">Maintenance, fees, etc.</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="acquisition_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Acquisition Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-4">
                    <Label>Tags (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" variant="outline" onClick={handleAddTag}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <motion.div
                            key={index}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1"
                          >
                            {tag}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-secondary-foreground/20"
                              onClick={() => handleRemoveTag(tag)}
                            >
                              ×
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Final Review Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border bg-card space-y-2"
                  >
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      Ready to Add
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {form.watch('asset_name')} will be added to your portfolio
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={currentStep === 1 ? () => onOpenChange(false) : handleBack}
                disabled={createAsset.isPending}
              >
                {currentStep === 1 ? (
                  "Cancel"
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </>
                )}
              </Button>
              
              {currentStep < 3 ? (
                <Button 
                  type="button" 
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedToStep2()) ||
                    (currentStep === 2 && !canProceedToStep3())
                  }
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={createAsset.isPending}
                  className="bg-gradient-blue-gold"
                >
                  {createAsset.isPending ? "Creating..." : "Add to Portfolio"}
                  {!createAsset.isPending && <Check className="h-4 w-4 ml-2" />}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
