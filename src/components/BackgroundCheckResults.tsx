import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, XCircle, Shield, FileText, User, AlertCircle, Clock, Database, MapPin, Phone, CreditCard, Building2, Scale, Search, Calendar, Award, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface BackgroundCheckResultsProps {
  results: {
    identity_verification: {
      name_match: boolean;
      address_verified: boolean;
      ssn_format_valid: boolean;
      confidence_score: number;
    };
    criminal_records: {
      county_searches: any[];
      state_searches: any[];
      federal_searches: any[];
      records_found: number;
      search_coverage: string[];
    };
    civil_records: {
      evictions: any[];
      judgments: any[];
      liens: any[];
      records_found: number;
    };
    sex_offender_check: {
      found: boolean;
      registries_searched: string[];
      records: any[];
    };
    risk_assessment: {
      overall_score: number;
      risk_level: string;
      flags: string[];
      summary: string;
    };
    data_sources: {
      sources_used: string[];
      search_date: string;
      coverage_percentage: number;
    };
  };
  checkDate: string;
  tenantName: string;
  formData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    lastFourSSN?: string;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    employer?: string;
    position?: string;
    monthlyIncome?: string;
  };
}

const BackgroundCheckResults = ({ results, checkDate, tenantName, formData }: BackgroundCheckResultsProps) => {
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-5 w-5" />;
      case 'medium': return <AlertTriangle className="h-5 w-5" />;
      case 'high': return <XCircle className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const formatPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
    }
    return phone;
  };

  const formatSSN = (ssn: string) => {
    return `***-**-${ssn}`;
  };

  const formatAddress = (formData: any) => {
    const parts = [formData.street, formData.city, formData.state, formData.zipCode].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Background Check Results - {tenantName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Completed on {new Date(checkDate).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Risk Score */}
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {results.risk_assessment.overall_score}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Risk Score</div>
            </div>
            
            {/* Risk Level */}
            <div className="text-center p-3 border rounded-lg flex items-center justify-center">
              <div className={cn(
                "inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full border text-xs md:text-sm font-medium",
                getRiskLevelColor(results.risk_assessment.risk_level)
              )}>
                {getRiskIcon(results.risk_assessment.risk_level)}
                <span className="hidden sm:inline">{results.risk_assessment.risk_level.toUpperCase()} RISK</span>
                <span className="sm:hidden">{results.risk_assessment.risk_level.toUpperCase()}</span>
              </div>
            </div>
            
            {/* Coverage */}
            <div className="text-center p-3 border rounded-lg">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                {results.data_sources.coverage_percentage}%
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">Coverage</div>
            </div>
          </div>
          
          {/* Summary */}
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <p className="text-sm">{results.risk_assessment.summary}</p>
          </div>
          
          {/* Flags */}
          {results.risk_assessment.flags.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Items Requiring Attention
              </h4>
              <div className="space-y-1">
                {results.risk_assessment.flags.map((flag, index) => (
                  <Badge key={index} variant="outline" className="mr-2">
                    {flag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results Tabs */}
      <Tabs defaultValue="identity" className="w-full">
        <div className="sticky top-0 bg-background z-10 pb-2 border-b">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="identity" className="flex items-center gap-1 text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Identity</span>
              <span className="sm:hidden">ID</span>
            </TabsTrigger>
            <TabsTrigger value="criminal" className="flex items-center gap-1 text-xs md:text-sm">
              <Shield className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Criminal</span>
              <span className="sm:hidden">Crime</span>
            </TabsTrigger>
            <TabsTrigger value="civil" className="flex items-center gap-1 text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Civil</span>
              <span className="sm:hidden">Civil</span>
            </TabsTrigger>
            <TabsTrigger value="registry" className="flex items-center gap-1 text-xs md:text-sm">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Registry</span>
              <span className="sm:hidden">Reg</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Identity Verification Tab */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identity Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Submitted Information Section */}
              {formData && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Submitted Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Personal Information */}
                    <Card className="border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Personal Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">
                            {formData.firstName && formData.lastName 
                              ? `${formData.firstName} ${formData.lastName}` 
                              : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date of Birth:</span>
                          <span className="font-medium">
                            {formData.dateOfBirth || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last 4 SSN:</span>
                          <span className="font-medium font-mono">
                            {formData.lastFourSSN ? formatSSN(formData.lastFourSSN) : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">
                            {formData.phone ? formatPhone(formData.phone) : 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium text-xs break-all">
                            {formData.email || 'Not provided'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Address Information */}
                    <Card className="border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Street:</span>
                          <span className="font-medium">
                            {formData.street || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City:</span>
                          <span className="font-medium">
                            {formData.city || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">State:</span>
                          <span className="font-medium">
                            {formData.state || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ZIP Code:</span>
                          <span className="font-medium">
                            {formData.zipCode || 'Not provided'}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground text-xs">Full Address:</span>
                          <div className="text-xs font-medium mt-1">
                            {formatAddress(formData) || 'Not provided'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Employment Information */}
                    <Card className="border-muted">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Employment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Employer:</span>
                          <span className="font-medium">
                            {formData.employer || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Position:</span>
                          <span className="font-medium">
                            {formData.position || 'Not provided'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Yearly Income:</span>
                          <span className="font-medium">
                            {formData.monthlyIncome 
                              ? formatCurrency(parseFloat(formData.monthlyIncome))
                              : 'Not provided'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Name Match</span>
                  {results.identity_verification.name_match ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Address Verified</span>
                  {results.identity_verification.address_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">SSN Format Valid</span>
                  {results.identity_verification.ssn_format_valid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                {(results.identity_verification as any).phone_verified !== undefined && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">Phone Verified</span>
                    {(results.identity_verification as any).phone_verified ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {/* Verification Evidence Cards */}
              <div className="space-y-4">
                {/* Name Verification Evidence */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Name Verification Evidence</h4>
                    <Badge variant="outline" className="ml-auto">
                      {(results.identity_verification as any).evidence?.name_verification?.algorithm_used || 'Standard Validation'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Verification Method:</span>
                      <span className="text-muted-foreground">Fuzzy String Matching Algorithm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timestamp:</span>
                      <span className="text-muted-foreground">
                        {new Date((results.identity_verification as any).evidence?.name_verification?.verification_timestamp || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Confidence Factors:</div>
                      <div className="space-y-1">
                        {((results.identity_verification as any).evidence?.name_verification?.confidence_factors || []).map((factor: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-xs">{factor.factor}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Weight: {factor.weight}%</span>
                              {factor.passed ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Verification Evidence */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Address Verification Evidence</h4>
                    <Badge variant="outline" className="ml-auto">
                      {(results.identity_verification as any).evidence?.address_verification?.api_used || 'Standard Validation'}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>API Service:</span>
                      <span className="text-muted-foreground">Nominatim OpenStreetMap</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Geocoding Result:</span>
                      <span className={`font-medium ${results.identity_verification.address_verified ? 'text-green-600' : 'text-red-600'}`}>
                        {results.identity_verification.address_verified ? 'Coordinates Found' : 'Address Not Found'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence Level:</span>
                      <span className="text-muted-foreground">
                        {(results.identity_verification as any).evidence?.address_verification?.response_details?.confidence_level || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification Time:</span>
                      <span className="text-muted-foreground">
                        {new Date((results.identity_verification as any).evidence?.address_verification?.verification_timestamp || Date.now()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SSN Analysis Evidence */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">SSN Analysis Evidence</h4>
                    <Badge variant="outline" className="ml-auto">
                      Multi-Step Validation
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="text-xs text-muted-foreground mb-2">Validation Steps Performed:</div>
                    <div className="space-y-1">
                      {((results.identity_verification as any).evidence?.ssn_analysis?.validation_steps || []).map((step: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            {step.result ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                            <span className="text-xs">{step.step}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{step.description}</span>
                        </div>
                      ))}
                    </div>
                    {(results.identity_verification as any).evidence?.ssn_analysis?.area_code_analysis && (
                      <div className="mt-3 pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-1">Area Code Analysis:</div>
                        <div className="flex justify-between">
                          <span className="text-xs">Area Code:</span>
                          <span className="text-xs font-mono">{(results.identity_verification as any).evidence.ssn_analysis.area_code_analysis.area}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone Verification Evidence */}
                {(results.identity_verification as any).phone_verified !== undefined && (
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Phone Verification Evidence</h4>
                      <Badge variant="outline" className="ml-auto">
                        Format Analysis
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="text-xs text-muted-foreground mb-2">Validation Checks:</div>
                      <div className="space-y-1">
                        {((results.identity_verification as any).evidence?.phone_verification?.checks_performed || []).map((check: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-xs">{check.check}</span>
                            {check.passed ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>Phone Type:</span>
                        <span className="text-muted-foreground">
                          {(results.identity_verification as any).evidence?.phone_verification?.phone_type || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confidence Score Summary */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{results.identity_verification.confidence_score}%</div>
                      <div className="text-sm text-muted-foreground">Overall Confidence</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm font-medium mb-2">Scoring Breakdown:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span>Name Match:</span>
                          <span className="font-medium">{results.identity_verification.name_match ? '25pts' : '0pts'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Address Verified:</span>
                          <span className="font-medium">{results.identity_verification.address_verified ? '35pts' : '0pts'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SSN Valid:</span>
                          <span className="font-medium">{results.identity_verification.ssn_format_valid ? '30pts' : '0pts'}</span>
                        </div>
                        {(results.identity_verification as any).phone_verified !== undefined && (
                          <div className="flex justify-between">
                            <span>Phone Verified:</span>
                            <span className="font-medium">{(results.identity_verification as any).phone_verified ? '10pts' : '0pts'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Criminal Records Tab */}
        <TabsContent value="criminal">
          <Card>
            <CardHeader>
              <CardTitle>Criminal Records Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.criminal_records.county_searches.length}</div>
                  <div className="text-sm text-muted-foreground">County Searches</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.criminal_records.state_searches.length}</div>
                  <div className="text-sm text-muted-foreground">State Searches</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.criminal_records.federal_searches.length}</div>
                  <div className="text-sm text-muted-foreground">Federal Searches</div>
                </div>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Search Coverage</h4>
                {results.criminal_records.search_coverage.length > 0 ? (
                  <div className="space-y-1">
                    {results.criminal_records.search_coverage.map((coverage, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {coverage}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No searches performed</p>
                )}
              </div>
              
              {/* Criminal Records Evidence */}
              <div className="space-y-4">
                {/* Search Details Evidence */}
                {((results.criminal_records as any).evidence?.search_details || []).map((search: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">{search.jurisdiction}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {search.certification}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Search Type:</span>
                        <span className="text-muted-foreground">{search.search_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Records Searched:</span>
                        <span className="text-muted-foreground">{search.records_searched?.toLocaleString() || 'Complete Database'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Case Range:</span>
                        <span className="text-muted-foreground text-xs font-mono">{search.case_number_range || search.database_version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Date:</span>
                        <span className="text-muted-foreground">{new Date(search.search_timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Result:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{search.results}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Court Certifications */}
                {((results.criminal_records as any).evidence?.court_certifications || []).map((cert: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Court Certification</h4>
                      <Badge variant="outline" className="ml-auto">
                        {cert.certification_number}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Court:</span>
                        <span className="text-muted-foreground">{cert.court_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Certified By:</span>
                        <span className="text-muted-foreground">{cert.certified_by}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Period:</span>
                        <span className="text-muted-foreground">{cert.search_period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Issue Date:</span>
                        <span className="text-muted-foreground">{new Date(cert.date_issued).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Status:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{cert.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Database Queries */}
                {((results.criminal_records as any).evidence?.database_queries || []).map((query: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">{query.database}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {query.query_id}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Query Parameters:</span>
                        <span className="text-muted-foreground">{query.search_parameters?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aliases Checked:</span>
                        <span className="text-muted-foreground">{query.search_parameters?.aliases_checked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Query Time:</span>
                        <span className="text-muted-foreground">{new Date(query.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Result:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{query.result}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Results Summary */}
                {results.criminal_records.records_found === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-600">No Criminal Records Found</p>
                    <p className="text-sm text-muted-foreground">Comprehensive search across multiple databases confirmed clean record</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Searched {((results.criminal_records as any).evidence?.search_details || []).length} jurisdictions • 
                      {((results.criminal_records as any).evidence?.database_queries || []).length} database queries completed
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-red-600">
                      {results.criminal_records.records_found} Criminal Record(s) Found
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Civil Records Tab */}
        <TabsContent value="civil">
          <Card>
            <CardHeader>
              <CardTitle>Civil Records Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.civil_records.evictions.length}</div>
                  <div className="text-sm text-muted-foreground">Evictions</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.civil_records.judgments.length}</div>
                  <div className="text-sm text-muted-foreground">Judgments</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-2xl font-bold">{results.civil_records.liens.length}</div>
                  <div className="text-sm text-muted-foreground">Liens</div>
                </div>
              </div>
              
              {/* Civil Records Evidence */}
              <div className="space-y-4">
                {/* Court Records Evidence */}
                {((results.civil_records as any).evidence?.court_records || []).map((record: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">{record.court_name}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {record.certification_number}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Record Type:</span>
                        <span className="text-muted-foreground">{record.record_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Period:</span>
                        <span className="text-muted-foreground">{record.search_period}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cases Searched:</span>
                        <span className="text-muted-foreground text-xs font-mono">{record.case_numbers_searched || `${record.records_reviewed?.toLocaleString()} records`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Date:</span>
                        <span className="text-muted-foreground">{new Date(record.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Result:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{record.results}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Property Searches */}
                {((results.civil_records as any).evidence?.property_searches || []).map((search: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Property Lien Search</h4>
                      <Badge variant="outline" className="ml-auto">
                        {search.confirmation}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="text-muted-foreground">{search.source}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Type:</span>
                        <span className="text-muted-foreground">{search.search_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Properties:</span>
                        <span className="text-muted-foreground">{search.properties_searched}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Lien Types Searched:</span>
                        <div className="flex flex-wrap gap-1">
                          {search.lien_types?.map((type: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{type}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Result:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{search.results}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Judgment Details */}
                {((results.civil_records as any).evidence?.judgment_details || []).map((judgment: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Judgment Registry Search</h4>
                      <Badge variant="outline" className="ml-auto">
                        {judgment.verification_id}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Database:</span>
                        <span className="text-muted-foreground">{judgment.database}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Scope:</span>
                        <span className="text-muted-foreground">{judgment.search_scope}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Threshold:</span>
                        <span className="text-muted-foreground">{judgment.amount_threshold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Years Covered:</span>
                        <span className="text-muted-foreground">{judgment.years_covered} years</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Result:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">{judgment.results}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Results Summary */}
                {results.civil_records.records_found === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-600">No Civil Records Found</p>
                    <p className="text-sm text-muted-foreground">Comprehensive civil records search confirmed clean history</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Searched evictions, judgments, and liens across multiple databases
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-yellow-600">
                      {results.civil_records.records_found} Civil Record(s) Found
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sex Offender Registry Tab */}
        <TabsContent value="registry">
          <Card>
            <CardHeader>
              <CardTitle>Sex Offender Registry Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Registry Search Evidence */}
              <div className="space-y-4">
                {/* Registry Confirmations */}
                {((results.sex_offender_check as any).evidence?.registry_confirmations || []).map((confirmation: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">{confirmation.registry_name}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {confirmation.confirmation_number}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Search Status:</span>
                        <span className="text-muted-foreground">{confirmation.search_status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coverage:</span>
                        <span className="text-muted-foreground">{confirmation.search_coverage || confirmation.verification_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Records Found:</span>
                        <span className="text-muted-foreground">{confirmation.records_found}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Search Time:</span>
                        <span className="text-muted-foreground">{new Date(confirmation.search_timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-medium">Status:</span>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">Verified Clear</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Search Parameters */}
                {(results.sex_offender_check as any).evidence?.search_parameters && (
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Search Parameters</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Name Variations Searched:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((results.sex_offender_check as any).evidence.search_parameters.name_variations || []).map((name: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Location Filters:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((results.sex_offender_check as any).evidence.search_parameters.location_filters || []).map((location: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{location}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span>Date Range:</span>
                        <span className="text-muted-foreground">{(results.sex_offender_check as any).evidence.search_parameters.date_range}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Timeline */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Verification Timeline</h4>
                  </div>
                  <div className="space-y-2">
                    {((results.sex_offender_check as any).evidence?.verification_timestamps || []).map((verification: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{verification.registry}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{new Date(verification.timestamp).toLocaleString()}</div>
                          <div className="text-xs font-medium text-green-600">{verification.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registry Search Summary */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Registries Searched</h4>
                  <div className="space-y-1">
                    {results.sex_offender_check.registries_searched.map((registry, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {registry}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Results Summary */}
                {!results.sex_offender_check.found ? (
                  <div className="text-center p-6 border-2 border-dashed border-green-200 bg-green-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="font-medium text-green-600">No Registry Records Found</p>
                    <p className="text-sm text-muted-foreground">Comprehensive registry search confirmed clean record</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Searched {((results.sex_offender_check as any).evidence?.registry_confirmations || []).length} registries with multiple name variations
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border-2 border-red-200 bg-red-50 rounded-lg">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                    <p className="font-medium text-red-600">Registry Records Found</p>
                    <p className="text-sm text-red-500">This person appears on sex offender registries</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sources & Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Sources Used</h4>
              <div className="space-y-1">
                {results.data_sources.sources_used.map((source, index) => (
                  <Badge key={index} variant="outline" className="mr-2">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Search completed on {new Date(results.data_sources.search_date).toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundCheckResults;