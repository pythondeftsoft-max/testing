import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdvancedPortfolioAssets } from '@/hooks/useAdvancedPortfolioAssets';
import { useEnhancedLandlordAnalytics } from '@/hooks/useEnhancedLandlordAnalytics';
import { usePortfolioSnapshots, useLatestPortfolioSnapshot } from '@/hooks/usePortfolioSnapshots';
import { CardEnhanced } from '@/components/enhanced/CardEnhanced';
import { Button } from '@/components/ui/button';
import PortfolioSelectorDropdown from '@/components/PortfolioSelectorDropdown';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RefreshCw, Download, TrendingUp, DollarSign, Home, PieChart, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Portfolio360 = () => {
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<string>('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('everything');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { toast } = useToast();

  // Get portfolio from URL params
  useEffect(() => {
    const portfolioId = searchParams.get('portfolioId');
    if (portfolioId) {
      setSelectedPortfolio(portfolioId);
    }
  }, [searchParams]);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Data hooks
  const portfolioIdParam = selectedPortfolio === 'everything' ? undefined : selectedPortfolio;
  const { 
    assets, 
    holdingsSummary, 
    isLoading: assetsLoading, 
    error: assetsError, 
    refreshData: refreshAssets 
  } = useAdvancedPortfolioAssets(portfolioIdParam);

  const { 
    data: realEstateAnalytics, 
    isLoading: analyticsLoading 
  } = useEnhancedLandlordAnalytics(userId, portfolioIdParam);

  const { 
    data: snapshots, 
    isLoading: snapshotsLoading 
  } = usePortfolioSnapshots(userId, selectedPortfolio, 90);

  const { 
    data: latestSnapshot 
  } = useLatestPortfolioSnapshot(userId, selectedPortfolio);

  const isLoading = assetsLoading || analyticsLoading || snapshotsLoading;

  const handlePortfolioChange = (portfolioId: string) => {
    setSelectedPortfolio(portfolioId);
  };

  const handleRefresh = async () => {
    try {
      await refreshAssets();
      
      // Trigger manual snapshot
      const { error } = await supabase.functions.invoke('portfolio-snapshotter', {
        body: { 
          portfolioId: portfolioIdParam,
          userId: userId 
        }
      });

      if (error) throw error;

      toast({
        title: "Portfolio Refreshed",
        description: "Your 360° portfolio data has been updated.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh portfolio data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generatePDFReport = async () => {
    if (!latestSnapshot) {
      toast({
        title: "No Data Available",
        description: "Please wait for portfolio data to load before generating a report.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingReport(true);
    
    try {
      // Capture the portfolio dashboard
      const dashboardElement = document.getElementById('portfolio-360-dashboard');
      if (!dashboardElement) {
        throw new Error('Dashboard element not found');
      }

      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header
      pdf.setFontSize(20);
      pdf.text('Portfolio 360° Report', 20, 30);
      
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
      pdf.text(`Portfolio: ${selectedPortfolio === 'everything' ? 'All Assets' : 'Selected Portfolio'}`, 20, 50);

      // Add metrics summary
      if (latestSnapshot) {
        pdf.text('Portfolio Summary:', 20, 70);
        pdf.text(`Total Net Worth: $${latestSnapshot.net_worth.toLocaleString()}`, 30, 80);
        pdf.text(`Real Estate Value: $${latestSnapshot.total_real_estate_value.toLocaleString()}`, 30, 90);
        pdf.text(`Investment Assets: $${latestSnapshot.total_assets_value.toLocaleString()}`, 30, 100);
        pdf.text(`Properties: ${latestSnapshot.property_count}`, 30, 110);
        pdf.text(`Occupancy Rate: ${latestSnapshot.occupancy_rate.toFixed(1)}%`, 30, 120);
        pdf.text(`Monthly NOI: $${latestSnapshot.net_operating_income.toLocaleString()}`, 30, 130);
      }

      // Add dashboard image
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight > 200) {
        // If image is too tall, split across pages
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, Math.min(imgHeight, 250));
      } else {
        pdf.addImage(imgData, 'PNG', 20, 150, imgWidth, imgHeight);
      }

      // Save the PDF
      const fileName = `portfolio-360-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: "Report Generated",
        description: `PDF report "${fileName}" has been downloaded.`,
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: "Unable to generate PDF report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Prepare chart data
  const chartData = snapshots?.map(snapshot => ({
    date: new Date(snapshot.snapshot_date).toLocaleDateString(),
    netWorth: snapshot.net_worth,
    realEstate: snapshot.total_real_estate_value,
    assets: snapshot.total_assets_value,
    noi: snapshot.net_operating_income
  })) || [];

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle-blue">
      <div className="container mx-auto px-4 py-8 space-y-6" id="portfolio-360-dashboard">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gradient-blue-gold">
              Portfolio 360°
            </h1>
            <p className="text-muted-foreground">
              Complete overview of your investment portfolio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={generatePDFReport}
              variant="outline"
              size="sm"
              disabled={isGeneratingReport || !latestSnapshot}
              className="flex items-center gap-2"
            >
              <Download className={`w-4 h-4 ${isGeneratingReport ? 'animate-pulse' : ''}`} />
              {isGeneratingReport ? 'Generating...' : 'Export PDF'}
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Portfolio Selector */}
        <CardEnhanced className="p-6">
          <PortfolioSelectorDropdown
            selectedPortfolio={selectedPortfolio}
            onPortfolioChange={handlePortfolioChange}
            userId={userId}
          />
        </CardEnhanced>

        {/* Error State */}
        {assetsError && (
          <CardEnhanced className="p-6 border-danger">
            <div className="text-center text-danger">
              <p className="font-medium">Failed to load portfolio data</p>
              <p className="text-sm text-muted-foreground mt-1">{assetsError}</p>
              <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </div>
          </CardEnhanced>
        )}

        {/* Loading State */}
        {isLoading && !latestSnapshot && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <CardEnhanced key={i} className="p-6 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardEnhanced>
            ))}
          </div>
        )}

        {/* Content */}
        {!isLoading && latestSnapshot && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <CardEnhanced className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Worth</p>
                    <p className="text-2xl font-bold text-gradient-blue-gold">
                      ${latestSnapshot.net_worth.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Home className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Real Estate</p>
                    <p className="text-2xl font-bold">
                      ${latestSnapshot.total_real_estate_value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <PieChart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Investments</p>
                    <p className="text-2xl font-bold">
                      ${latestSnapshot.total_assets_value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly NOI</p>
                    <p className="text-2xl font-bold text-success">
                      ${latestSnapshot.net_operating_income.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardEnhanced>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Net Worth Trend */}
              <CardEnhanced className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Net Worth Trend</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Net Worth']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="netWorth" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.1)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardEnhanced>

              {/* Asset Allocation Trend */}
              <CardEnhanced className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Asset Allocation</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `$${value.toLocaleString()}`, 
                          name === 'realEstate' ? 'Real Estate' : 'Investments'
                        ]}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="realEstate" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="assets" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardEnhanced>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CardEnhanced className="p-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Portfolio Mix</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Properties</span>
                      <span className="font-medium">{latestSnapshot.property_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Investment Assets</span>
                      <span className="font-medium">{latestSnapshot.asset_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Occupancy Rate</span>
                      <span className="font-medium">{latestSnapshot.occupancy_rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced className="p-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Monthly Cash Flow</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Rental Income</span>
                      <span className="font-medium text-success">
                        ${latestSnapshot.monthly_rental_income.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Expenses</span>
                      <span className="font-medium text-danger">
                        ${latestSnapshot.monthly_expenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-sm">Net Operating Income</span>
                      <span className={latestSnapshot.net_operating_income >= 0 ? 'text-success' : 'text-danger'}>
                        ${latestSnapshot.net_operating_income.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardEnhanced>

              <CardEnhanced className="p-6">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Last Updated</h4>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {new Date(latestSnapshot.snapshot_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Portfolio snapshots are captured daily at 22:00 UTC
                  </p>
                </div>
              </CardEnhanced>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !latestSnapshot && (
          <CardEnhanced className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Portfolio Data</h3>
                <p className="text-muted-foreground">
                  Portfolio snapshots will be available once you add assets or properties.
                </p>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                Capture Snapshot
              </Button>
            </div>
          </CardEnhanced>
        )}
      </div>
    </div>
  );
};

export default Portfolio360;