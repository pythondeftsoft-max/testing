import React from 'react';
import { CardEnhanced, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedContent } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, TrendingUp, Brain } from 'lucide-react';
import type { WidgetDefinition } from '@/types/widgetTypes';

interface PredictiveAnalysisPanelProps {
  widget: WidgetDefinition;
}

export const PredictiveAnalysisPanel: React.FC<PredictiveAnalysisPanelProps> = ({ widget }) => {
  // Generate mock analysis data based on widget type
  const getMockAnalysis = () => {
    const widgetType = widget.widgetType;
    
    // Generate insights based on widget category
    const insights = [];
    const recommendations = [];
    let detailsData = null;
    
    // Specific handling for concentration risk widgets
    if (widgetType.includes('concentration')) {
      insights.push(
        { type: 'warning', text: '65% of portfolio concentrated in Dallas-Fort Worth market' },
        { type: 'warning', text: '80% of assets are residential properties' },
        { type: 'info', text: 'Geographic concentration above industry benchmark (45%)' }
      );
      recommendations.push(
        'Consider geographic diversification into secondary markets',
        'Explore mixed-use or commercial property opportunities',
        'Target no more than 50% concentration in any single market'
      );
      detailsData = {
        type: 'concentration',
        byMarket: [
          { name: 'Dallas-Fort Worth', percentage: 65, risk: 'High' },
          { name: 'Houston', percentage: 20, risk: 'Medium' },
          { name: 'Austin', percentage: 15, risk: 'Low' }
        ],
        byPropertyType: [
          { name: 'Residential', percentage: 80, risk: 'High' },
          { name: 'Commercial', percentage: 15, risk: 'Low' },
          { name: 'Mixed-Use', percentage: 5, risk: 'Low' }
        ]
      };
    } else if (widgetType.includes('property') && widgetType.includes('risk')) {
      insights.push(
        { type: 'warning', text: '3 properties identified with elevated risk scores (>7.5/10)' },
        { type: 'warning', text: 'Vacancy risk detected in 2 properties' },
        { type: 'info', text: '12 properties maintain healthy risk profiles' }
      );
      recommendations.push(
        'Prioritize immediate inspection at 1842 Elm Street',
        'Review tenant stability at 456 Oak Avenue',
        'Implement preventive maintenance at high-risk locations'
      );
      detailsData = {
        type: 'propertyRisk',
        properties: [
          { 
            address: '1842 Elm Street, Dallas TX', 
            riskScore: 8.2, 
            factors: ['Deferred maintenance', 'Aging HVAC system', 'Roof needs replacement'],
            action: 'Schedule immediate inspection'
          },
          { 
            address: '456 Oak Avenue, Houston TX', 
            riskScore: 7.8, 
            factors: ['Tenant turnover (3 in 12 months)', 'Below market rent', 'Neighborhood decline'],
            action: 'Evaluate tenant screening process'
          },
          { 
            address: '789 Pine Drive, Austin TX', 
            riskScore: 7.6, 
            factors: ['High vacancy period (6 months)', 'Outdated amenities', 'Competition increased'],
            action: 'Consider renovation and reposition'
          }
        ]
      };
    } else if (widgetType.includes('financial') && widgetType.includes('health')) {
      insights.push(
        { type: 'warning', text: 'Debt Service Coverage Ratio below target (1.1 vs 1.25)' },
        { type: 'warning', text: 'Operating expense ratio trending upward (58% vs target 52%)' },
        { type: 'success', text: 'Cash flow remains positive across all properties' }
      );
      recommendations.push(
        'Reduce operating expenses by 6% through vendor renegotiation',
        'Increase rental income by addressing below-market units',
        'Consider refinancing high-interest debt to improve DSCR'
      );
      detailsData = {
        type: 'financialMetrics',
        metrics: [
          { name: 'Debt Service Coverage Ratio', current: '1.10', target: '1.25', status: 'Below Target', impact: 'High' },
          { name: 'Operating Expense Ratio', current: '58%', target: '52%', status: 'Above Target', impact: 'High' },
          { name: 'Cash on Cash Return', current: '7.2%', target: '8.0%', status: 'Below Target', impact: 'Medium' },
          { name: 'Occupancy Rate', current: '94%', target: '95%', status: 'Near Target', impact: 'Low' }
        ]
      };
    } else if (widgetType.includes('competitive')) {
      insights.push(
        { type: 'warning', text: 'Rental rates 8% below market average in Dallas market' },
        { type: 'warning', text: 'Tenant retention rate (72%) trails competitor average (82%)' },
        { type: 'success', text: 'Maintenance response time outperforms market by 15%' }
      );
      recommendations.push(
        'Implement 5-8% rent increases on lease renewals to match market',
        'Launch tenant retention program with amenity upgrades',
        'Leverage superior maintenance as marketing differentiator'
      );
      detailsData = {
        type: 'competitive',
        comparisons: [
          { area: 'Average Rent per Sq Ft', your: '$1.42', market: '$1.54', gap: '-8%', priority: 'High' },
          { area: 'Tenant Retention Rate', your: '72%', market: '82%', gap: '-10%', priority: 'High' },
          { area: 'Vacancy Rate', your: '6%', market: '5%', gap: '+1%', priority: 'Medium' },
          { area: 'Response Time (hrs)', your: '18', market: '24', gap: '-25%', priority: 'Low' }
        ]
      };
    } else if (widgetType.includes('maintenance') && widgetType.includes('optimization')) {
      insights.push(
        { type: 'warning', text: 'Average response time 48hrs vs industry standard 24hrs' },
        { type: 'warning', text: 'Maintenance costs 22% above market average' },
        { type: 'info', text: 'Identified $18,500 annual savings through vendor consolidation' }
      );
      recommendations.push(
        'Streamline work order dispatch system to reduce response time by 50%',
        'Renegotiate contracts with top 3 vendors for 15% cost reduction',
        'Implement preventive maintenance program to reduce emergency repairs by 30%'
      );
      detailsData = {
        type: 'maintenance',
        inefficiencies: [
          { area: 'Average Response Time', current: '48 hrs', target: '24 hrs', savings: '$12,000/year', action: 'Implement automated dispatch' },
          { area: 'HVAC Service Costs', current: '$285/unit', market: '$220/unit', savings: '$9,500/year', action: 'Consolidate to single preferred vendor' },
          { area: 'Emergency Repairs', current: '28%', target: '15%', savings: '$15,000/year', action: 'Launch preventive maintenance program' },
          { area: 'Vendor Management', current: '12 vendors', target: '6 vendors', savings: '$8,200/year', action: 'Consolidate and negotiate volume discounts' }
        ]
      };
    } else if (widgetType.includes('optimization')) {
      insights.push(
        { type: 'success', text: 'Optimization potential identified: 12% improvement' },
        { type: 'info', text: 'Current efficiency at 78%' }
      );
      recommendations.push(
        'Implement suggested pricing adjustments',
        'Review operational workflows for efficiency gains'
      );
    } else if (widgetType.includes('analysis')) {
      insights.push(
        { type: 'success', text: 'Strong performance in key metrics' },
        { type: 'warning', text: 'Minor improvements needed in 2 areas' }
      );
      recommendations.push(
        'Maintain current strategy for top performers',
        'Address underperforming areas with targeted interventions'
      );
    } else {
      insights.push(
        { type: 'info', text: 'Analysis complete with 85% confidence' },
        { type: 'success', text: 'Favorable outlook for next quarter' }
      );
      recommendations.push(
        'Continue monitoring key performance indicators',
        'Prepare for seasonal adjustments'
      );
    }
    
    return { insights, recommendations, detailsData };
  };
  
  const mockAnalysis = getMockAnalysis();
  
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <TrendingUp className="h-4 w-4 text-info" />;
    }
  };
  
  const getInsightBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'secondary';
    }
  };
  
  return (
    <CardEnhanced variant="elevated" hover className="h-full">
      <CardEnhancedHeader>
        <CardEnhancedTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {widget.name}
        </CardEnhancedTitle>
      </CardEnhancedHeader>
      <CardEnhancedContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{widget.description}</p>
        
        {/* AI Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">AI Insights</h4>
          <div className="space-y-2">
            {mockAnalysis.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                {getInsightIcon(insight.type)}
                <span className="text-sm text-foreground flex-1">{insight.text}</span>
                <Badge variant={getInsightBadgeVariant(insight.type)} className="text-xs">
                  {insight.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
          <ul className="space-y-1">
            {mockAnalysis.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="flex-1">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Details Data Breakdown (if applicable) */}
        {mockAnalysis.detailsData && (
          <div className="space-y-3">
            {mockAnalysis.detailsData.type === 'concentration' && (
              <>
                <h4 className="text-sm font-semibold text-foreground">Concentration Breakdown</h4>
                
                {/* By Market */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">By Geographic Market</p>
                  {mockAnalysis.detailsData.byMarket.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm text-foreground">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.percentage}%</span>
                        <Badge 
                          variant={item.risk === 'High' ? 'destructive' : item.risk === 'Medium' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {item.risk}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* By Property Type */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">By Property Type</p>
                  {mockAnalysis.detailsData.byPropertyType.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <span className="text-sm text-foreground">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{item.percentage}%</span>
                        <Badge 
                          variant={item.risk === 'High' ? 'destructive' : item.risk === 'Medium' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {item.risk}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {mockAnalysis.detailsData.type === 'propertyRisk' && (
              <>
                <h4 className="text-sm font-semibold text-foreground">High-Risk Properties</h4>
                <div className="space-y-3">
                  {mockAnalysis.detailsData.properties.map((property, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-destructive/20 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{property.address}</p>
                          <p className="text-xs text-muted-foreground mt-1">Risk Score: <span className="text-destructive font-semibold">{property.riskScore}/10</span></p>
                        </div>
                        <Badge variant="destructive" className="text-xs">High Risk</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Contributing Factors:</p>
                        {property.factors.map((factor, fIdx) => (
                          <p key={fIdx} className="text-xs text-foreground pl-2">• {factor}</p>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-primary font-medium">→ {property.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {mockAnalysis.detailsData.type === 'financialMetrics' && (
              <>
                <h4 className="text-sm font-semibold text-foreground">Key Metrics Requiring Attention</h4>
                <div className="space-y-2">
                  {mockAnalysis.detailsData.metrics.map((metric, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{metric.name}</span>
                        <Badge 
                          variant={metric.status.includes('Below') || metric.status.includes('Above') ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {metric.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Current: <span className="text-foreground font-semibold">{metric.current}</span></span>
                        <span className="text-muted-foreground">Target: <span className="text-foreground font-semibold">{metric.target}</span></span>
                        <Badge variant="outline" className="text-xs">{metric.impact} Impact</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {mockAnalysis.detailsData.type === 'competitive' && (
              <>
                <h4 className="text-sm font-semibold text-foreground">Competitive Performance Analysis</h4>
                <div className="space-y-2">
                  {mockAnalysis.detailsData.comparisons.map((comp, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{comp.area}</span>
                        <Badge 
                          variant={comp.priority === 'High' ? 'destructive' : comp.priority === 'Medium' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {comp.priority} Priority
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Your Performance</p>
                          <p className="text-foreground font-semibold">{comp.your}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Market Average</p>
                          <p className="text-foreground font-semibold">{comp.market}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gap</p>
                          <p className={`font-semibold ${comp.gap.startsWith('-') && !comp.gap.includes('hrs') ? 'text-destructive' : 'text-success'}`}>
                            {comp.gap}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {mockAnalysis.detailsData.type === 'maintenance' && (
              <>
                <h4 className="text-sm font-semibold text-foreground">Optimization Opportunities</h4>
                <div className="space-y-3">
                  {mockAnalysis.detailsData.inefficiencies.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-warning/20 space-y-2">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-foreground">{item.area}</span>
                        <Badge variant="secondary" className="text-xs text-success">{item.savings}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="text-foreground font-semibold">{item.current}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Target/Market</p>
                          <p className="text-foreground font-semibold">{item.target || item.market}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-primary font-medium">→ {item.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Confidence Score */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">AI Confidence</span>
            <Badge variant="outline" className="text-primary border-primary/30">
              {Math.floor(Math.random() * 15) + 80}%
            </Badge>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
