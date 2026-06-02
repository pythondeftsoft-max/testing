import React from 'react';
import { FinancialWidgetWrapper } from '../wrappers/FinancialWidgetWrapper';
import { WidgetType } from '../GenerateMoreWidgetsButton';
import { MockScenarioType, getScenarioDescription, generateMockCashFlowData, generateMockProfitLossData, generateMockInvestmentData } from '@/utils/mockFinancialReports';
import EnhancedMetricCard from '@/components/analytics/EnhancedMetricCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface DynamicWidgetProps {
  widgetId: string;
  widgetType: WidgetType;
  scenario: MockScenarioType;
  isFavorited: boolean;
  onToggleFavorite: (widgetId: string, widgetData: any) => void;
  onDelete: (widgetId: string) => void;
  onRegenerate: (widgetId: string) => void;
}

export const DynamicWidget: React.FC<DynamicWidgetProps> = ({
  widgetId,
  widgetType,
  scenario,
  isFavorited,
  onToggleFavorite,
  onDelete,
  onRegenerate,
}) => {
  // Generate mock data based on widget type and scenario
  const generateWidgetData = () => {
    switch (widgetType.category) {
      case 'income':
        return generateMockCashFlowData(scenario);
      case 'expenses':
        return generateMockProfitLossData(scenario);
      case 'investment':
        return generateMockInvestmentData(scenario);
      case 'leasing':
      case 'tenant-performance':
      case 'maintenance':
      case 'vendor-operations':
        // For operational categories, use appropriate data type based on widget needs
        return generateMockCashFlowData(scenario); // Default to cash flow data for now
      default:
        return [];
    }
  };

  const data = generateWidgetData();
  
  // Render different widget types
  const renderWidgetContent = () => {
    switch (widgetType.id) {
      case 'rental-income-trends':
        return (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.isArray(data) ? data : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Gross Rent']} />
                <Line type="monotone" dataKey="gross_rent" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'maintenance-cost-trends':
        return (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={Array.isArray(data) ? data : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Math.abs(Number(value || 0)).toLocaleString()}`, 'Maintenance']} />
                <Bar dataKey="maintenance_expenses" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'market-value-trends':
        const investmentData = !Array.isArray(data) ? data : { totalValue: 0, capRate: 0, cashOnCash: 0, appreciationRate: 0 };
        return (
          <div className="grid grid-cols-2 gap-4">
            <EnhancedMetricCard
              title="Total Value"
              value={`$${(investmentData.totalValue || 0).toLocaleString()}`}
              trend={{ value: 5.2, isPositive: true, percentage: 5.2 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50"
            />
            <EnhancedMetricCard
              title="Cap Rate"
              value={`${(investmentData.capRate || 0).toFixed(1)}%`}
              trend={{ value: 0.3, isPositive: true, percentage: 0.3 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50"
            />
            <EnhancedMetricCard
              title="Cash-on-Cash"
              value={`${(investmentData.cashOnCash || 0).toFixed(1)}%`}
              trend={{ value: 1.2, isPositive: true, percentage: 1.2 }}
              className="bg-gradient-to-r from-purple-50 to-violet-50"
            />
            <EnhancedMetricCard
              title="Appreciation"
              value={`${(investmentData.appreciationRate || 0).toFixed(1)}%`}
              trend={{ value: 0.8, isPositive: true, percentage: 0.8 }}
              className="bg-gradient-to-r from-orange-50 to-amber-50"
            />
          </div>
        );
      
      default:
        // Generic chart for other widget types
        return (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.isArray(data) ? data.slice(0, 6) : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total_revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  return (
    <FinancialWidgetWrapper
      widgetId={widgetId}
      title={widgetType.name}
      description={`${widgetType.description} - ${getScenarioDescription(scenario)}`}
      tab="financial"
      category={widgetType.category}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
      onDelete={onDelete}
      onRegenerate={onRegenerate}
      badge={{ text: "Generated", variant: "secondary" }}
      className="col-span-full"
    >
      {renderWidgetContent()}
    </FinancialWidgetWrapper>
  );
};