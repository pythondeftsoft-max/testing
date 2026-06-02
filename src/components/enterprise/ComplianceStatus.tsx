import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertCircle, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export const ComplianceStatus = () => {
  const [selectedFramework, setSelectedFramework] = useState<string>("soc2");
  const queryClient = useQueryClient();

  const { data: complianceData, isLoading } = useQuery({
    queryKey: ["compliance-checklist", selectedFramework],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_checklist')
        .select('*')
        .eq('framework', selectedFramework)
        .order('control_id');

      if (error) throw error;
      return data;
    },
  });

  const updateControlMutation = useMutation({
    mutationFn: async ({ 
      framework, 
      control_id, 
      status, 
      evidence_urls 
    }: { 
      framework: string; 
      control_id: string; 
      status: string; 
      evidence_urls?: string[] 
    }) => {
      const { data, error } = await supabase
        .rpc('update_compliance_control', {
          p_framework: framework,
          p_control_id: control_id,
          p_implementation_status: status,
          p_evidence_urls: evidence_urls || null,
          p_responsible_party: null
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-checklist"] });
      queryClient.invalidateQueries({ queryKey: ["enterprise-security-dashboard"] });
      toast.success("Compliance control updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update compliance control");
      console.error("Error updating control:", error);
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'verified':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      not_implemented: "destructive",
      in_progress: "default",
      implemented: "secondary",
      verified: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const calculateProgress = (controls: any[]) => {
    if (!controls || controls.length === 0) return 0;
    
    const implementedCount = controls.filter(
      control => control.implementation_status === 'implemented' || control.implementation_status === 'verified'
    ).length;
    
    return Math.round((implementedCount / controls.length) * 100);
  };

  const frameworks = [
    { id: "soc2", name: "SOC 2", description: "Security, Availability, Processing Integrity, Confidentiality, Privacy" },
    { id: "gdpr", name: "GDPR", description: "General Data Protection Regulation" },
    { id: "hipaa", name: "HIPAA", description: "Health Insurance Portability and Accountability Act" },
    { id: "pci_dss", name: "PCI DSS", description: "Payment Card Industry Data Security Standard" }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-2 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Framework Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {frameworks.map((framework) => (
          <Card 
            key={framework.id}
            className={`cursor-pointer transition-colors ${
              selectedFramework === framework.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedFramework(framework.id)}
          >
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{framework.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateProgress(complianceData || [])}%
              </div>
              <p className="text-xs text-muted-foreground">
                {framework.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Compliance Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {frameworks.find(f => f.id === selectedFramework)?.name} Compliance Controls
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={calculateProgress(complianceData || [])} className="h-2" />
            </div>
            <span className="text-sm font-medium">
              {calculateProgress(complianceData || [])}% Complete
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {complianceData && complianceData.length > 0 ? (
            <div className="space-y-4">
              {complianceData.map((control) => (
                <div key={control.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(control.implementation_status)}
                        <h3 className="font-medium">{control.control_name}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({control.control_id})
                        </span>
                        {getStatusBadge(control.implementation_status)}
                      </div>
                      
                      {control.control_description && (
                        <p className="text-sm text-muted-foreground">
                          {control.control_description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {control.last_reviewed_at && (
                          <span>Last reviewed: {new Date(control.last_reviewed_at).toLocaleDateString()}</span>
                        )}
                        {control.next_review_due && (
                          <span>Next review: {new Date(control.next_review_due).toLocaleDateString()}</span>
                        )}
                      </div>

                      {control.evidence_urls && control.evidence_urls.length > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <FileText className="h-3 w-3" />
                          <span>{control.evidence_urls.length} evidence file(s)</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {control.implementation_status === 'not_implemented' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateControlMutation.mutate({
                            framework: selectedFramework,
                            control_id: control.control_id,
                            status: 'in_progress'
                          })}
                          disabled={updateControlMutation.isPending}
                        >
                          Start Implementation
                        </Button>
                      )}
                      
                      {control.implementation_status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateControlMutation.mutate({
                            framework: selectedFramework,
                            control_id: control.control_id,
                            status: 'implemented'
                          })}
                          disabled={updateControlMutation.isPending}
                        >
                          Mark Complete
                        </Button>
                      )}

                      {control.implementation_status === 'implemented' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateControlMutation.mutate({
                            framework: selectedFramework,
                            control_id: control.control_id,
                            status: 'verified'
                          })}
                          disabled={updateControlMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No compliance controls found for {frameworks.find(f => f.id === selectedFramework)?.name}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Compliance controls need to be initialized for this framework
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};