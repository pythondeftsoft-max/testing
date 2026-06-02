
import React from 'react';
import { CardEnhanced, CardEnhancedContent, CardEnhancedHeader, CardEnhancedTitle, CardEnhancedDescription } from '@/components/enhanced/CardEnhanced';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface TaxManagementHeaderProps {
  currentYear: number;
  taxProfileStatus?: string;
  transactionCount: number;
  requiredFormsCount: number;
  completedFormsCount: number;
}

export const TaxManagementHeader: React.FC<TaxManagementHeaderProps> = ({
  currentYear,
  taxProfileStatus,
  transactionCount,
  requiredFormsCount,
  completedFormsCount
}) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'collected':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Collected</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <CardEnhanced variant="gradient" className="mb-6">
      <CardEnhancedHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardEnhancedTitle className="text-white text-2xl font-bold">
                Tax Management Overview
              </CardEnhancedTitle>
              <CardEnhancedDescription className="text-white/80">
                Manage W-9 forms, track tax-eligible transactions, and generate 1099 forms for {currentYear}
              </CardEnhancedDescription>
            </div>
          </div>
        </div>
      </CardEnhancedHeader>
      <CardEnhancedContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm font-medium text-white/80">W-9 Status</p>
            <div className="mt-2">
              {getStatusBadge(taxProfileStatus)}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm font-medium text-white/80">Tax Transactions</p>
            <p className="text-2xl font-bold text-white">{transactionCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm font-medium text-white/80">Required 1099s</p>
            <p className="text-2xl font-bold text-white">{requiredFormsCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <p className="text-sm font-medium text-white/80">Filed Forms</p>
            <p className="text-2xl font-bold text-openkey-gold">{completedFormsCount}</p>
          </div>
        </div>
      </CardEnhancedContent>
    </CardEnhanced>
  );
};
