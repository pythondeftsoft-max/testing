import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";

export const SecurityIncidentList = () => {
  const [filter, setFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ["security-incidents", filter],
    queryFn: async () => {
      let query = supabase
        .from('security_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== "all") {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('security_incidents')
        .update({ 
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["enterprise-security-dashboard"] });
      toast.success("Incident status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update incident status");
      console.error("Error updating incident:", error);
    },
  });

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive"
    };
    
    return (
      <Badge variant={variants[severity] || "default"}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      investigating: "default",
      resolved: "secondary",
      false_positive: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Incidents</CardTitle>
        <div className="flex gap-2">
          {["all", "open", "investigating", "resolved"].map((status) => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {incidents && incidents.length > 0 ? (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(incident.severity)}
                      <h3 className="font-medium">{incident.title}</h3>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {incident.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: {incident.incident_type}</span>
                      <span>Detection: {incident.detection_method}</span>
                      <span>Created: {new Date(incident.created_at).toLocaleString()}</span>
                      {incident.resolved_at && (
                        <span>Resolved: {new Date(incident.resolved_at).toLocaleString()}</span>
                      )}
                    </div>

                    {incident.affected_user_id && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>User ID: {incident.affected_user_id}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {incident.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateIncidentMutation.mutate({
                          id: incident.id,
                          status: 'investigating'
                        })}
                        disabled={updateIncidentMutation.isPending}
                      >
                        Investigate
                      </Button>
                    )}
                    
                    {incident.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => updateIncidentMutation.mutate({
                          id: incident.id,
                          status: 'resolved'
                        })}
                        disabled={updateIncidentMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                {incident.metadata && Object.keys(incident.metadata).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Metadata
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(incident.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {filter === "all" ? "No security incidents found" : `No ${filter} incidents`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};