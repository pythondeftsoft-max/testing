import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileText, Building2, Play, DollarSign, Building, Users, AlertCircle, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle } from '@/components/enhanced/CardEnhanced';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HierarchicalPropertySelector } from '@/components/ui/hierarchical-property-selector';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useUserPortfolios } from '@/hooks/useUserPortfolios';
import { useTheme } from '@/components/DynamicThemeProvider';
import { useAllPropertiesWithUnits, getPropertyIdsFromAllUnitIds } from '@/hooks/useAllPropertiesWithUnits';
import ReportGenerator from '../ReportGenerator';

interface ComprehensiveAnalyticsReportProps {
  onBack: () => void;
  portfolioId?: string;
}

const ComprehensiveAnalyticsReport: React.FC<ComprehensiveAnalyticsReportProps> = ({ 
  onBack, 
  portfolioId: initialPortfolioId 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(initialPortfolioId || 'everything');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [isAllPropertiesMode, setIsAllPropertiesMode] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { whiteLabelConfig, isWhiteLabeled } = useTheme();
  
  // Add debugging logs
  console.log('🔍 [COMPREHENSIVE_REPORT] Auth state:', { user: user?.id, authLoading, selectedPortfolio });
  
  // Fetch portfolios and properties data - only when user is authenticated
  const { portfolios, loading: portfoliosLoading } = useUserPortfolios(user?.id || '');
  const { 
    data: properties, 
    isLoading: propertiesLoading, 
    error: propertiesError, 
    refetch: refetchProperties,
    isFetching: propertiesRefetching 
  } = useAllPropertiesWithUnits(
    user?.id, // Query will be disabled until user is available
    selectedPortfolio === 'everything' ? undefined : selectedPortfolio
  );

  // Add debugging for properties
  console.log('🔍 [COMPREHENSIVE_REPORT] Properties state:', { 
    propertiesCount: properties?.length, 
    propertiesLoading, 
    propertiesError,
    userId: user?.id,
    selectedPortfolio 
  });

  const propertyOptions = properties || [];

  const includedSections = [
    { id: 'financial', name: 'Financial Performance', icon: DollarSign, description: 'Revenue, expenses, and profitability analysis' },
    { id: 'occupancy', name: 'Occupancy Analytics', icon: Building, description: 'Vacancy rates and turnover metrics' },
    { id: 'tenant', name: 'Tenant Insights', icon: Users, description: 'Satisfaction and retention analysis' },
    { id: 'maintenance', name: 'Maintenance Trends', icon: AlertCircle, description: 'Work orders and cost tracking' },
    { id: 'market', name: 'Market Intelligence', icon: TrendingUp, description: 'Competitive positioning and trends' },
    { id: 'portfolio', name: 'Portfolio Summary', icon: BarChart3, description: 'Executive dashboard and KPIs' },
  ];

  const handlePropertySelection = (propertyIds: string[], unitIds: string[]) => {
    setSelectedProperties(propertyIds);
    setSelectedUnitIds(unitIds);
  };

  // Reset selected properties when portfolio changes and refetch if needed
  useEffect(() => {
    setSelectedProperties([]);
    setSelectedUnitIds([]);
    setIsAllPropertiesMode(false);
    // Trigger refetch when portfolio changes and user is available
    if (user?.id && !propertiesLoading) {
      console.log('🔍 [COMPREHENSIVE_REPORT] Portfolio changed, refetching properties');
      refetchProperties();
    }
  }, [selectedPortfolio, user?.id, refetchProperties, propertiesLoading]);

  // Check if user has made explicit filter selections or is in "All Properties" mode
  const hasValidFilters = () => {
    return isAllPropertiesMode || selectedProperties.length > 0 || selectedUnitIds.length > 0;
  };

  const handleGenerateReport = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate reports.",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for report generation - handle "All Properties" mode and explicit selections
    const finalSelectedProperties = isAllPropertiesMode 
      ? propertyOptions.map(property => property.id)  // Use all properties when in "All Properties" mode
      : selectedUnitIds.length > 0 
        ? getPropertyIdsFromAllUnitIds(properties || [], selectedUnitIds)
        : selectedProperties;

    // Check if we actually have any properties available
    if (propertyOptions.length === 0) {
      toast({
        title: "No Properties Available",
        description: `No properties found for ${selectedPortfolio === 'everything' ? 'any portfolio' : 'the selected portfolio'}. Please try selecting a different portfolio or ensure properties exist.`,
        variant: "destructive",
      });
      return;
    }

    if (!hasValidFilters()) {
      toast({
        title: "No Properties or Units Selected",
        description: "Please select at least one property or unit to generate the report.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const reportGenerator = new ReportGenerator();
      
      const options = {
        type: 'comprehensive',
        format: 'pdf' as const,
        userId: user.id,
        portfolioId: selectedPortfolio === 'everything' ? undefined : selectedPortfolio,
        filters: {
          propertyIds: finalSelectedProperties,
          propertyTypes: [],
          occupancyRange: [0, 100] as [number, number],
          rentRange: [0, 10000] as [number, number],
          maintenanceStatus: [],
          paymentStatus: [],
          includeVacant: true,
          includeVoucher: true,
          selectedSections: ['executive', 'financial', 'property', 'maintenance', 'payment', 'lease']
        },
        whiteLabelConfig: isWhiteLabeled ? whiteLabelConfig : null
      };

      console.log('🔍 [COMPREHENSIVE_REPORT] Generating report with options:', options);
      await reportGenerator.generateReport(options);

      toast({
        title: "Report Generated",
        description: "Your comprehensive analytics report has been downloaded successfully.",
      });
    } catch (error) {
      console.error('🔍 [COMPREHENSIVE_REPORT] Error generating report:', error);
      toast({
        title: "Report Generation Failed", 
        description: error instanceof Error ? error.message : "An unexpected error occurred while generating the report.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getDisplayName = () => {
    if (selectedPortfolio === 'everything') return 'Everything';
    const portfolio = portfolios.find(p => p.id === selectedPortfolio);
    return portfolio?.client_name || 'Select Portfolio';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comprehensive Analytics Report</h1>
            <p className="text-muted-foreground">
              Complete portfolio performance analysis with enhanced metrics and professional visualizations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateReport}
            disabled={isGenerating || !hasValidFilters()}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <CardEnhanced>
        <CardEnhancedContent className="p-6">
          <div className="space-y-6">
            {/* Top row filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portfolio</label>
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select portfolio">
                      {portfoliosLoading ? 'Loading...' : getDisplayName()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everything">All Portfolios</SelectItem>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Properties Section */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Properties & Units</label>
                <div className="relative">
                  {authLoading ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/10">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : !user?.id ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/20 text-muted-foreground text-xs">
                      Authentication required
                    </div>
                  ) : propertiesLoading || propertiesRefetching ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/10">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  ) : propertiesError ? (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-destructive/10 text-destructive text-xs">
                      Error loading properties
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchProperties()}
                        className="ml-2 h-auto p-1 text-destructive hover:text-destructive/80"
                      >
                        Retry
                      </Button>
                    </div>
                  ) : propertyOptions.length > 0 ? (
                    <HierarchicalPropertySelector
                      properties={propertyOptions}
                      selectedPropertyIds={selectedProperties}
                      selectedUnitIds={selectedUnitIds}
                      onSelectionChange={handlePropertySelection}
                      onAllPropertiesModeChange={setIsAllPropertiesMode}
                      placeholder="Select properties and units..."
                    />
                  ) : (
                    <div className="flex items-center justify-center h-9 border rounded-md bg-muted/20 text-muted-foreground text-xs">
                      No properties available
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchProperties()}
                        className="ml-2 h-auto p-1 text-muted-foreground hover:text-muted-foreground/80"
                      >
                        Refresh
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleGenerateReport}
                disabled={
                  isGenerating || 
                  authLoading || 
                  !user?.id || 
                  propertiesLoading || 
                  propertiesRefetching ||
                  propertyOptions.length === 0 ||
                  !hasValidFilters()
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Report Overview Section */}
      <CardEnhanced className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardEnhancedHeader className="pb-4">
          <CardEnhancedTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            Comprehensive Analytics Report
          </CardEnhancedTitle>
        </CardEnhancedHeader>
        <CardEnhancedContent className="p-6 space-y-6">
          <p className="text-base leading-relaxed text-muted-foreground">
            Generate a complete performance overview combining financial metrics, operational KPIs, 
            tenant analytics, and market insights for strategic decision-making.
          </p>
          
          {/* Report Features */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-foreground/80 uppercase tracking-wide">
              Report Includes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {includedSections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/50"
                >
                  <div className="p-1.5 bg-primary/10 rounded-md">
                    <section.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{section.name}</div>
                    <div className="text-xs text-muted-foreground">{section.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Report Benefits */}
          <div className="bg-background/30 rounded-lg p-4 border border-border/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="font-medium text-sm mb-2">Strategic Insights</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Combine multiple data sources into one comprehensive view to identify trends, 
                  optimize operations, and maximize your portfolio's performance across all key metrics.
                </p>
              </div>
            </div>
          </div>
        </CardEnhancedContent>
      </CardEnhanced>

      {/* Report Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardEnhanced>
          <CardEnhancedContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Professional Format</h3>
            <p className="text-muted-foreground text-sm">
              Clean, corporate-style formatting with executive summaries, charts, and data visualizations 
              optimized for stakeholder presentations.
            </p>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced>
          <CardEnhancedContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enhanced Analytics</h3>
            <p className="text-muted-foreground text-sm">
              Advanced metrics including performance trends, comparative analysis, and predictive insights 
              for data-driven decision making.
            </p>
          </CardEnhancedContent>
        </CardEnhanced>

        <CardEnhanced>
          <CardEnhancedContent className="p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Ready to Share</h3>
            <p className="text-muted-foreground text-sm">
              High-quality PDF output with professional branding, executive summary pages, 
              and optimized for printing or digital sharing with stakeholders.
            </p>
          </CardEnhancedContent>
        </CardEnhanced>
      </div>
    </div>
  );
};

export default ComprehensiveAnalyticsReport;