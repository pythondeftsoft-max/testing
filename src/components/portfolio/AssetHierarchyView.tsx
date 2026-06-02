import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, Plus, TrendingUp, Calendar } from 'lucide-react';
import { usePortfolioAssets, useAssetRelationships } from '@/hooks/usePortfolioAssets';
import type { PortfolioAsset, AssetRelationship } from '@/types/portfolio-assets';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AssetNode {
  asset: PortfolioAsset;
  children: AssetNode[];
  relationships: AssetRelationship[];
}

interface AssetHierarchyViewProps {
  portfolioId: string;
  onCreateRelationship: (parentAsset: PortfolioAsset) => void;
  onRecordValuation: (asset: PortfolioAsset) => void;
}

export const AssetHierarchyView: React.FC<AssetHierarchyViewProps> = ({
  portfolioId,
  onCreateRelationship,
  onRecordValuation,
}) => {
  const { data: assets = [] } = usePortfolioAssets(portfolioId);
  
  // Build hierarchy structure
  const hierarchy = useMemo(() => {
    const allRelationships: AssetRelationship[] = [];
    
    // Collect all relationships for all assets
    assets.forEach(asset => {
      // In a real implementation, you'd fetch all relationships at once
      // For now, we'll create a simplified structure
    });

    // Create a map of parent-child relationships
    const childrenMap = new Map<string, PortfolioAsset[]>();
    const parentMap = new Map<string, string>();

    allRelationships.forEach(rel => {
      if (!childrenMap.has(rel.parent_asset_id)) {
        childrenMap.set(rel.parent_asset_id, []);
      }
      
      const childAsset = assets.find(a => a.id === rel.child_asset_id);
      if (childAsset) {
        childrenMap.get(rel.parent_asset_id)?.push(childAsset);
        parentMap.set(rel.child_asset_id, rel.parent_asset_id);
      }
    });

    // Find root assets (assets with no parents)
    const rootAssets = assets.filter(asset => !parentMap.has(asset.id));

    // Build tree structure
    const buildTree = (asset: PortfolioAsset): AssetNode => {
      const children = childrenMap.get(asset.id) || [];
      return {
        asset,
        children: children.map(buildTree),
        relationships: allRelationships.filter(
          rel => rel.parent_asset_id === asset.id || rel.child_asset_id === asset.id
        ),
      };
    };

    return rootAssets.map(buildTree);
  }, [assets]);

  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (assetId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(assetId)) {
      newExpanded.delete(assetId);
    } else {
      newExpanded.add(assetId);
    }
    setExpandedNodes(newExpanded);
  };

  const AssetNodeComponent: React.FC<{ 
    node: AssetNode; 
    level: number;
  }> = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.asset.id);
    const hasChildren = node.children.length > 0;
    const indentClass = level > 0 ? `ml-${level * 6}` : '';

    return (
      <div className={`${indentClass} mb-2`}>
        <Card className="border-l-4" style={{ borderLeftColor: node.asset.asset_category?.color_theme || '#6366f1' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNode(node.asset.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <div>
                  <CardTitle className="text-base">{node.asset.asset_name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {node.asset.asset_category?.display_name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(node.asset.current_value || node.asset.asset_value)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordValuation(node.asset)}
                  className="h-8"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Value
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateRelationship(node.asset)}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Annual Income:</span>
                <div className="font-medium text-green-600">
                  {formatCurrency(node.asset.annual_income)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Annual Expenses:</span>
                <div className="font-medium text-red-600">
                  {formatCurrency(node.asset.annual_expenses)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Net Income:</span>
                <div className="font-medium">
                  {formatCurrency(node.asset.annual_income - node.asset.annual_expenses)}
                </div>
              </div>
            </div>
            
            {node.asset.acquisition_date && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Acquired: {formatDate(new Date(node.asset.acquisition_date))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {isExpanded && hasChildren && (
          <div className="ml-4 mt-2">
            {node.children.map(childNode => (
              <AssetNodeComponent
                key={childNode.asset.id}
                node={childNode}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (hierarchy.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-muted-foreground">
            No assets found in this portfolio.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Asset Hierarchy</h3>
        <div className="text-sm text-muted-foreground">
          {assets.length} assets total
        </div>
      </div>
      
      <div className="space-y-4">
        {hierarchy.map(rootNode => (
          <AssetNodeComponent
            key={rootNode.asset.id}
            node={rootNode}
            level={0}
          />
        ))}
      </div>
    </div>
  );
};