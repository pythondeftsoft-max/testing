import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Server, 
  Activity, 
  Zap, 
  Globe, 
  BarChart3, 
  Settings, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';

const LoadBalancingManager = () => {
  const [autoScaling, setAutoScaling] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');

  const serverInstances = [
    { id: 'srv-001', region: 'us-east-1', status: 'healthy', load: 65, cpu: 45, memory: 72, requests: 1250 },
    { id: 'srv-002', region: 'us-east-1', status: 'healthy', load: 78, cpu: 62, memory: 68, requests: 1890 },
    { id: 'srv-003', region: 'us-west-2', status: 'warning', load: 92, cpu: 88, memory: 95, requests: 2340 },
    { id: 'srv-004', region: 'eu-west-1', status: 'healthy', load: 42, cpu: 35, memory: 58, requests: 980 },
    { id: 'srv-005', region: 'ap-south-1', status: 'healthy', load: 55, cpu: 48, memory: 63, requests: 1450 },
    { id: 'srv-006', region: 'us-east-1', status: 'scaling', load: 25, cpu: 18, memory: 32, requests: 450 }
  ];

  const regions = [
    { id: 'us-east-1', name: 'US East (N. Virginia)', instances: 3, status: 'healthy', latency: 42 },
    { id: 'us-west-2', name: 'US West (Oregon)', instances: 1, status: 'warning', latency: 65 },
    { id: 'eu-west-1', name: 'Europe (Ireland)', instances: 1, status: 'healthy', latency: 125 },
    { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', instances: 1, status: 'healthy', latency: 185 }
  ];

  const cdnStats = {
    totalRequests: 2450000,
    cacheHitRate: 94.2,
    bandwidth: 1.2,
    avgResponseTime: 89,
    edgeLocations: 48
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground"><AlertCircle className="w-3 h-3 mr-1" />Warning</Badge>;
      case 'scaling':
        return <Badge variant="outline"><Zap className="w-3 h-3 mr-1" />Scaling</Badge>;
      default:
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 60) return 'text-success';
    if (load < 80) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Load Balancing Manager</h2>
          <p className="text-muted-foreground">Monitor and manage enterprise-grade scalability infrastructure</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch 
              checked={autoScaling} 
              onCheckedChange={setAutoScaling}
              id="auto-scaling"
            />
            <label htmlFor="auto-scaling" className="text-sm font-medium">Auto-scaling</label>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Instances</p>
                <p className="text-2xl font-bold text-foreground">{serverInstances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-success" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Load</p>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(serverInstances.reduce((acc, srv) => acc + srv.load, 0) / serverInstances.length)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Regions</p>
                <p className="text-2xl font-bold text-foreground">{regions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wifi className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">CDN Hit Rate</p>
                <p className="text-2xl font-bold text-success">{cdnStats.cacheHitRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Requests/min</p>
                <p className="text-2xl font-bold text-foreground">
                  {(serverInstances.reduce((acc, srv) => acc + srv.requests, 0) / 1000).toFixed(1)}k
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="instances" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="instances">Server Instances</TabsTrigger>
          <TabsTrigger value="regions">Regional Distribution</TabsTrigger>
          <TabsTrigger value="cdn">CDN Performance</TabsTrigger>
          <TabsTrigger value="autoscaling">Auto-scaling</TabsTrigger>
        </TabsList>

        <TabsContent value="instances">
          <Card>
            <CardHeader>
              <CardTitle>Server Instance Monitor</CardTitle>
              <CardDescription>Real-time status and performance of all server instances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serverInstances.map((instance) => (
                  <Card key={instance.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-mono text-sm font-medium">{instance.id}</span>
                            <Badge variant="outline">{instance.region}</Badge>
                            {getStatusBadge(instance.status)}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Overall Load</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={instance.load} className="flex-1" />
                                <span className={`text-sm font-medium ${getLoadColor(instance.load)}`}>
                                  {instance.load}%
                                </span>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Cpu className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">CPU</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={instance.cpu} className="flex-1" />
                                <span className="text-sm font-medium">{instance.cpu}%</span>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <HardDrive className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Memory</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={instance.memory} className="flex-1" />
                                <span className="text-sm font-medium">{instance.memory}%</span>
                              </div>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Requests/min</span>
                              </div>
                              <span className="text-sm font-medium">{instance.requests.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">Scale</Button>
                          <Button variant="ghost" size="sm">Details</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions">
          <Card>
            <CardHeader>
              <CardTitle>Regional Distribution</CardTitle>
              <CardDescription>Geographic distribution of server instances and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {regions.map((region) => (
                  <Card key={region.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{region.name}</h4>
                            <Badge variant="outline">{region.id}</Badge>
                            {getStatusBadge(region.status)}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-muted-foreground">Instances</span>
                              <p className="text-lg font-semibold">{region.instances}</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Avg Latency</span>
                              <p className="text-lg font-semibold">{region.latency}ms</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Status</span>
                              <p className="text-lg font-semibold capitalize">{region.status}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            {region.latency > 100 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm">Configure</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdn">
          <Card>
            <CardHeader>
              <CardTitle>CDN Performance</CardTitle>
              <CardDescription>Content delivery network optimization and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Cache Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Hit Rate</span>
                        <span className="font-medium text-success">{cdnStats.cacheHitRate}%</span>
                      </div>
                      <Progress value={cdnStats.cacheHitRate} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Response Time</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Average</span>
                        <span className="font-medium">{cdnStats.avgResponseTime}ms</span>
                      </div>
                      <Progress value={100 - cdnStats.avgResponseTime / 5} className="h-2" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Traffic Stats</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Requests</span>
                        <span className="font-medium">{(cdnStats.totalRequests / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Bandwidth</span>
                        <span className="font-medium">{cdnStats.bandwidth} TB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Edge Locations</span>
                        <span className="font-medium">{cdnStats.edgeLocations}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autoscaling">
          <Card>
            <CardHeader>
              <CardTitle>Auto-scaling Configuration</CardTitle>
              <CardDescription>Configure automated scaling rules and thresholds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Auto-scaling Enabled</h4>
                    <p className="text-sm text-muted-foreground">Automatically scale instances based on load</p>
                  </div>
                  <Switch checked={autoScaling} onCheckedChange={setAutoScaling} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Scale Up Triggers</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">CPU Usage</span>
                        <span className="text-sm font-medium">≥ 80%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Memory Usage</span>
                        <span className="text-sm font-medium">≥ 85%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Request Queue</span>
                        <span className="text-sm font-medium">≥ 100</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Scale Down Triggers</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">CPU Usage</span>
                        <span className="text-sm font-medium">≤ 30%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Memory Usage</span>
                        <span className="text-sm font-medium">≤ 40%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Request Queue</span>
                        <span className="text-sm font-medium">≤ 10</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoadBalancingManager;