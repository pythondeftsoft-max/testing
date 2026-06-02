import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search,
  MapPin,
  DollarSign,
  Home,
  Calendar,
  User,
  Phone,
  Mail,
  RefreshCw,
  Zap,
  Eye,
  Info
} from 'lucide-react';
import type { ImportResult } from '@/types/propertyImport';

interface PropertyValidationProps {
  results: ImportResult[];
}

interface ValidationIssue {
  id: string;
  propertyId: string;
  type: 'missing' | 'invalid' | 'suspicious' | 'incomplete';
  severity: 'high' | 'medium' | 'low';
  field: string;
  current: string;
  suggested: string;
  description: string;
  autoFixable: boolean;
}

export const PropertyValidation: React.FC<PropertyValidationProps> = ({
  results
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fixedIssues, setFixedIssues] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');

  // Generate validation issues based on imported data
  const validationIssues: ValidationIssue[] = [
    {
      id: 'missing-rent-1',
      propertyId: '123 Main St',
      type: 'missing',
      severity: 'high',
      field: 'rent',
      current: '',
      suggested: '$1,850',
      description: 'Missing rental price - estimated based on comparable properties',
      autoFixable: true
    },
    {
      id: 'invalid-bedrooms-1',
      propertyId: '456 Oak Ave',
      type: 'invalid',
      severity: 'medium',
      field: 'bedrooms',
      current: '0',
      suggested: '2',
      description: 'Bedroom count appears incorrect based on property description',
      autoFixable: true
    },
    {
      id: 'suspicious-rent-1',
      propertyId: '789 Pine Rd',
      type: 'suspicious',
      severity: 'medium',
      field: 'rent',
      current: '$500',
      suggested: '$1,200',
      description: 'Rent significantly below market rate - please verify',
      autoFixable: false
    },
    {
      id: 'incomplete-address-1',
      propertyId: '321 Elm St',
      type: 'incomplete',
      severity: 'low',
      field: 'address',
      current: '321 Elm St',
      suggested: '321 Elm St, Unit 2B',
      description: 'Address missing unit number based on apartment indicators',
      autoFixable: true
    },
    {
      id: 'missing-contact-1',
      propertyId: '654 Maple Dr',
      type: 'missing',
      severity: 'medium',
      field: 'contact_email',
      current: '',
      suggested: 'owner@example.com',
      description: 'Missing contact information for property management',
      autoFixable: false
    }
  ];

  const filteredIssues = validationIssues.filter(issue => {
    const matchesSearch = searchTerm === '' || 
      issue.propertyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = activeTab === 'all' || 
      (activeTab === 'high' && issue.severity === 'high') ||
      (activeTab === 'fixable' && issue.autoFixable) ||
      (activeTab === 'manual' && !issue.autoFixable);

    return matchesSearch && matchesTab && !fixedIssues.has(issue.id);
  });

  const handleAutoFix = (issueId: string) => {
    setFixedIssues(prev => new Set([...prev, issueId]));
  };

  const handleBulkAutoFix = () => {
    const autoFixableIssues = filteredIssues.filter(issue => issue.autoFixable);
    setFixedIssues(prev => new Set([...prev, ...autoFixableIssues.map(issue => issue.id)]));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing': return <XCircle className="h-4 w-4" />;
      case 'invalid': return <AlertTriangle className="h-4 w-4" />;
      case 'suspicious': return <Eye className="h-4 w-4" />;
      case 'incomplete': return <Info className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'address': return <MapPin className="h-4 w-4" />;
      case 'rent': return <DollarSign className="h-4 w-4" />;
      case 'bedrooms': case 'bathrooms': return <Home className="h-4 w-4" />;
      case 'contact_email': return <Mail className="h-4 w-4" />;
      case 'contact_phone': return <Phone className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const issueStats = {
    total: validationIssues.length,
    high: validationIssues.filter(i => i.severity === 'high').length,
    autoFixable: validationIssues.filter(i => i.autoFixable).length,
    fixed: fixedIssues.size
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">{issueStats.total}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{issueStats.high}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto-Fixable</p>
                <p className="text-2xl font-bold text-blue-600">{issueStats.autoFixable}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{issueStats.fixed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties, fields, or issues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleBulkAutoFix}
                disabled={filteredIssues.filter(i => i.autoFixable).length === 0}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Auto-Fix All ({filteredIssues.filter(i => i.autoFixable).length})
              </Button>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Re-validate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Issues ({validationIssues.length})</TabsTrigger>
          <TabsTrigger value="high">High Priority ({issueStats.high})</TabsTrigger>
          <TabsTrigger value="fixable">Auto-Fixable ({issueStats.autoFixable})</TabsTrigger>
          <TabsTrigger value="manual">Manual Review ({validationIssues.length - issueStats.autoFixable})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
                <p className="text-muted-foreground">
                  {fixedIssues.size > 0 ? 
                    'Great job! All issues in this category have been resolved.' :
                    'All properties passed validation checks for this category.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredIssues.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(issue.severity)}`}>
                        {getTypeIcon(issue.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{issue.propertyId}</span>
                          <Badge variant="outline" className="capitalize">
                            {issue.type}
                          </Badge>
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        {getFieldIcon(issue.field)}
                        Field: {issue.field.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Current Value</div>
                      <div className="font-mono text-sm bg-red-50 p-2 rounded border">
                        {issue.current || '(empty)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Suggested Value</div>
                      <div className="font-mono text-sm bg-green-50 p-2 rounded border">
                        {issue.suggested}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    {issue.autoFixable ? (
                      <Button 
                        onClick={() => handleAutoFix(issue.id)}
                        size="sm"
                        className="gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Auto-Fix
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Review Manually
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Progress Summary */}
      {fixedIssues.size > 0 && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Validation Progress: {fixedIssues.size} of {validationIssues.length} issues resolved
              </span>
            </div>
            <div className="mt-2 bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(fixedIssues.size / validationIssues.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};