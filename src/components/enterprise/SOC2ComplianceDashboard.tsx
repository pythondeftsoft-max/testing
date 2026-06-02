import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Users, 
  Database, 
  Lock,
  Download,
  Eye
} from 'lucide-react';

const SOC2ComplianceDashboard = () => {
  const [selectedFramework, setSelectedFramework] = useState('soc2');

  const complianceData = {
    soc2: {
      overall: 94,
      controls: [
        { id: 'CC1.1', name: 'Control Environment', status: 'compliant', description: 'Organization maintains policies and procedures', lastReview: '2024-01-15' },
        { id: 'CC2.1', name: 'Communication and Information', status: 'compliant', description: 'Information system controls', lastReview: '2024-01-10' },
        { id: 'CC3.1', name: 'Risk Assessment', status: 'in-progress', description: 'Risk identification and analysis', lastReview: '2024-01-05' },
        { id: 'CC4.1', name: 'Monitoring Activities', status: 'compliant', description: 'Internal monitoring controls', lastReview: '2024-01-12' },
        { id: 'CC5.1', name: 'Control Activities', status: 'non-compliant', description: 'Security policy enforcement', lastReview: '2024-01-08' },
        { id: 'CC6.1', name: 'Logical Access', status: 'compliant', description: 'User access management', lastReview: '2024-01-14' },
        { id: 'CC7.1', name: 'System Operations', status: 'compliant', description: 'Operational controls', lastReview: '2024-01-11' },
        { id: 'CC8.1', name: 'Change Management', status: 'in-progress', description: 'System change controls', lastReview: '2024-01-07' }
      ]
    },
    gdpr: {
      overall: 87,
      controls: [
        { id: 'Art.5', name: 'Data Processing Principles', status: 'compliant', description: 'Lawfulness, fairness, transparency', lastReview: '2024-01-13' },
        { id: 'Art.6', name: 'Lawful Basis', status: 'compliant', description: 'Legal basis for processing', lastReview: '2024-01-09' },
        { id: 'Art.17', name: 'Right to Erasure', status: 'in-progress', description: 'Data deletion procedures', lastReview: '2024-01-06' },
        { id: 'Art.25', name: 'Data Protection by Design', status: 'compliant', description: 'Privacy by design implementation', lastReview: '2024-01-12' },
        { id: 'Art.32', name: 'Security of Processing', status: 'non-compliant', description: 'Technical security measures', lastReview: '2024-01-04' },
        { id: 'Art.33', name: 'Breach Notification', status: 'compliant', description: 'Incident response procedures', lastReview: '2024-01-10' }
      ]
    },
    iso27001: {
      overall: 91,
      controls: [
        { id: 'A.5.1', name: 'Information Security Policies', status: 'compliant', description: 'Security policy framework', lastReview: '2024-01-14' },
        { id: 'A.6.1', name: 'Organization of Information Security', status: 'compliant', description: 'Security organization structure', lastReview: '2024-01-11' },
        { id: 'A.7.1', name: 'Human Resource Security', status: 'in-progress', description: 'Personnel security controls', lastReview: '2024-01-08' },
        { id: 'A.8.1', name: 'Asset Management', status: 'compliant', description: 'Asset inventory and classification', lastReview: '2024-01-13' },
        { id: 'A.9.1', name: 'Access Control', status: 'compliant', description: 'Access management controls', lastReview: '2024-01-12' },
        { id: 'A.10.1', name: 'Cryptography', status: 'non-compliant', description: 'Encryption standards', lastReview: '2024-01-05' }
      ]
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Compliant</Badge>;
      case 'in-progress':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'non-compliant':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Non-Compliant</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getFrameworkColor = (score: number) => {
    if (score >= 95) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const currentFramework = complianceData[selectedFramework as keyof typeof complianceData];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">SOC 2 Compliance Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage enterprise compliance frameworks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Audit Trail
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Score</p>
                <p className={`text-2xl font-bold ${getFrameworkColor(currentFramework.overall)}`}>
                  {currentFramework.overall}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliant Controls</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentFramework.controls.filter(c => c.status === 'compliant').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-warning" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentFramework.controls.filter(c => c.status === 'in-progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Non-Compliant</p>
                <p className="text-2xl font-bold text-foreground">
                  {currentFramework.controls.filter(c => c.status === 'non-compliant').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Framework Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Frameworks</CardTitle>
          <CardDescription>Select a framework to view detailed compliance status</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedFramework} onValueChange={setSelectedFramework}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="soc2">SOC 2 Type II</TabsTrigger>
              <TabsTrigger value="gdpr">GDPR</TabsTrigger>
              <TabsTrigger value="iso27001">ISO 27001</TabsTrigger>
            </TabsList>

            <TabsContent value="soc2" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">SOC 2 Type II Controls</h3>
                  <Progress value={94} className="w-32" />
                </div>
                {complianceData.soc2.controls.map((control) => (
                  <Card key={control.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">{control.id}</span>
                            <h4 className="font-medium">{control.name}</h4>
                            {getStatusBadge(control.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{control.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Last reviewed: {control.lastReview}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gdpr" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">GDPR Compliance Controls</h3>
                  <Progress value={87} className="w-32" />
                </div>
                {complianceData.gdpr.controls.map((control) => (
                  <Card key={control.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">{control.id}</span>
                            <h4 className="font-medium">{control.name}</h4>
                            {getStatusBadge(control.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{control.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Last reviewed: {control.lastReview}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="iso27001" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">ISO 27001 Controls</h3>
                  <Progress value={91} className="w-32" />
                </div>
                {complianceData.iso27001.controls.map((control) => (
                  <Card key={control.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm text-muted-foreground">{control.id}</span>
                            <h4 className="font-medium">{control.name}</h4>
                            {getStatusBadge(control.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{control.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Last reviewed: {control.lastReview}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SOC2ComplianceDashboard;