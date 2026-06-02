
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Shield, Heart, Lock, Users, Activity, AlertTriangle, Eye, Settings } from 'lucide-react';
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard';

const EnterpriseSecurityTab = () => {
  const [activeSecurityTab, setActiveSecurityTab] = useState('system-health');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Enterprise Security Center
          </CardTitle>
          <p className="text-sm text-gray-600">
            Monitor system health, security threats, and access controls
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSecurityTab} onValueChange={setActiveSecurityTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="system-health" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                System Health
              </TabsTrigger>
              <TabsTrigger value="access-control" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Access Control
              </TabsTrigger>
              <TabsTrigger value="audit-logs" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Audit Logs
              </TabsTrigger>
              <TabsTrigger value="security-settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Security Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="system-health" className="mt-6">
              <SystemHealthDashboard />
            </TabsContent>
            
            <TabsContent value="access-control" className="mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      User Access Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">Active Sessions</h4>
                        <p className="text-2xl font-bold text-green-600">248</p>
                        <p className="text-sm text-gray-600">Currently online</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">Failed Logins</h4>
                        <p className="text-2xl font-bold text-red-600">12</p>
                        <p className="text-sm text-gray-600">Last 24 hours</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium">Suspicious Activity</h4>
                        <p className="text-2xl font-bold text-yellow-600">3</p>
                        <p className="text-sm text-gray-600">Requires attention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Role-Based Access Control</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Admin Access</p>
                          <p className="text-sm text-gray-600">Full system access</p>
                        </div>
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          5 users
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Landlord Access</p>
                          <p className="text-sm text-gray-600">Property management</p>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          142 users
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Tenant Access</p>
                          <p className="text-sm text-gray-600">Basic user access</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          1,248 users
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="audit-logs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Security Audit Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Failed login attempt</p>
                          <p className="text-sm text-gray-600">admin@example.com - 2 minutes ago</p>
                        </div>
                      </div>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Unusual access pattern</p>
                          <p className="text-sm text-gray-600">user@example.com - 15 minutes ago</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Warning</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium">Admin access granted</p>
                          <p className="text-sm text-gray-600">admin@openkey.com - 1 hour ago</p>
                        </div>
                      </div>
                      <Badge variant="outline">Info</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security-settings" className="mt-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-600">Require 2FA for admin users</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Enabled
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Session Timeout</p>
                          <p className="text-sm text-gray-600">Auto-logout after inactivity</p>
                        </div>
                        <Badge variant="outline">
                          30 minutes
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Password Policy</p>
                          <p className="text-sm text-gray-600">Minimum security requirements</p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Strict
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      Security Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <p className="font-medium text-yellow-800">SSL Certificate Expiring</p>
                        <p className="text-sm text-yellow-700">Certificate expires in 30 days</p>
                      </div>
                      <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">Security Update Available</p>
                        <p className="text-sm text-blue-700">New security patches available</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnterpriseSecurityTab;
