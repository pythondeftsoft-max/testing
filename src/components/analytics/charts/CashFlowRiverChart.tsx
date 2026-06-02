import React from 'react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { formatCurrency } from '@/lib/formatters';

interface WaterfallData {
  category: string;
  value: number;
  start: number;
  end: number;
  isIncome: boolean;
  color: string;
}

interface CashFlowRiverChartProps {
  grossIncome: number;
  mortgageCosts: number;
  maintenanceCosts: number;
  insuranceCosts: number;
  managementFees: number;
  otherExpenses: number;
  height?: number;
}

const CashFlowRiverChart = ({ 
  grossIncome, 
  mortgageCosts, 
  maintenanceCosts, 
  insuranceCosts, 
  managementFees, 
  otherExpenses, 
  height = 300 
}: CashFlowRiverChartProps) => {
  
  // Create waterfall data
  const waterfallData: WaterfallData[] = React.useMemo(() => {
    const data: WaterfallData[] = [];
    let runningTotal = 0;

    // Gross Income (starts from 0)
    data.push({
      category: 'Gross Income',
      value: grossIncome,
      start: 0,
      end: grossIncome,
      isIncome: true,
      color: 'hsl(var(--success))'
    });
    runningTotal = grossIncome;

    // Expenses (each subtracts from running total)
    const expenses = [
      { name: 'Mortgage', amount: mortgageCosts },
      { name: 'Maintenance', amount: maintenanceCosts },
      { name: 'Insurance', amount: insuranceCosts },
      { name: 'Management', amount: managementFees },
      { name: 'Other', amount: otherExpenses }
    ];

    expenses.forEach(expense => {
      if (expense.amount > 0) {
        data.push({
          category: expense.name,
          value: expense.amount,
          start: runningTotal - expense.amount,
          end: runningTotal,
          isIncome: false,
          color: 'hsl(var(--destructive))'
        });
        runningTotal -= expense.amount;
      }
    });

    // Net Cash Flow (final result)
    data.push({
      category: 'Net Cash Flow',
      value: Math.abs(runningTotal),
      start: 0,
      end: runningTotal,
      isIncome: runningTotal >= 0,
      color: runningTotal >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'
    });

    return data;
  }, [grossIncome, mortgageCosts, maintenanceCosts, insuranceCosts, managementFees, otherExpenses]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as WaterfallData;
      return (
        <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
          <p className="font-semibold text-foreground">{label}</p>
          <div className="space-y-1 text-sm">
            <p className={data.isIncome ? "text-success" : "text-destructive"}>
              {data.isIncome ? "Income" : "Expense"}: {formatCurrency(data.value)}
            </p>
            {data.category !== 'Net Cash Flow' && (
              <p className="text-muted-foreground">
                Running Total: {formatCurrency(data.end)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <CardEnhanced variant="elevated" className="card-hover-gold">
      <CardEnhancedHeader>
        <CardEnhancedTitle gradient>Cash Flow Waterfall</CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="category" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Waterfall bars */}
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {waterfallData.map((entry, index) => (
                <Cell key={`waterfall-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span>Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Net Cash Flow</span>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};

export default CashFlowRiverChart;