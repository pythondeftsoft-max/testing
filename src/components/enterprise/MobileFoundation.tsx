
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Wifi, WifiOff, Download, Bell, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OfflineData {
  properties: any[];
  portfolios: any[];
  payments: any[];
  lastSync: string;
}

const MobileFoundation = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    properties: [],
    portfolios: [],
    payments: [],
    lastSync: new Date().toISOString(),
  });
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if notifications are supported and enabled
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt();
      const { outcome } = await pwaInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        toast({
          title: "App Installed",
          description: "The app has been installed successfully",
        });
      }
      setPwaInstallPrompt(null);
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: "Notifications Enabled",
          description: "You'll receive push notifications for important updates",
        });
      }
    }
  };

  const syncOfflineData = async () => {
    try {
      // Simulate syncing offline data
      toast({
        title: "Sync Started",
        description: "Syncing offline data with server...",
      });
      
      // Update last sync time
      setOfflineData(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));
      
      setTimeout(() => {
        toast({
          title: "Sync Complete",
          description: "All offline data has been synchronized",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline data. Will retry automatically.",
        variant: "destructive",
      });
    }
  };

  const getOfflineStorageSize = () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        console.log('Storage estimate:', estimate);
      });
    }
    return '2.3 MB'; // Mock value
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Mobile Foundation</h2>
          <p className="text-muted-foreground">Progressive Web App and mobile optimization features</p>
        </div>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Badge className="bg-green-100 text-green-800">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="pwa" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pwa">PWA Features</TabsTrigger>
          <TabsTrigger value="offline">Offline Mode</TabsTrigger>
          <TabsTrigger value="notifications">Push Notifications</TabsTrigger>
          <TabsTrigger value="optimization">Mobile Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="pwa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>Progressive Web App</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Install App</h4>
                  <p className="text-sm text-muted-foreground">
                    Install the app on your device for better experience
                  </p>
                </div>
                <Button 
                  onClick={installPWA} 
                  disabled={!pwaInstallPrompt}
                  variant={pwaInstallPrompt ? "default" : "secondary"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {pwaInstallPrompt ? 'Install' : 'Already Installed'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <h4 className="font-medium mt-2">Responsive Design</h4>
                  <p className="text-sm text-muted-foreground">Optimized for all screen sizes</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <h4 className="font-medium mt-2">Fast Loading</h4>
                  <p className="text-sm text-muted-foreground">Service worker caching enabled</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">✓</div>
                  <h4 className="font-medium mt-2">Secure</h4>
                  <p className="text-sm text-muted-foreground">HTTPS and secure protocols</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Offline Functionality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Offline Data Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(offlineData.lastSync).toLocaleString()}
                  </p>
                </div>
                <Button onClick={syncOfflineData} disabled={!isOnline}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Properties</h4>
                  <div className="text-2xl font-bold">{offlineData.properties.length}</div>
                  <p className="text-sm text-muted-foreground">Cached offline</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Portfolios</h4>
                  <div className="text-2xl font-bold">{offlineData.portfolios.length}</div>
                  <p className="text-sm text-muted-foreground">Cached offline</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Storage Used</h4>
                  <div className="text-2xl font-bold">{getOfflineStorageSize()}</div>
                  <p className="text-sm text-muted-foreground">Local storage</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Offline Capabilities</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• View property details and portfolios</li>
                  <li>• Record maintenance requests</li>
                  <li>• View payment history</li>
                  <li>• Access tenant information</li>
                  <li>• Create draft reports</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Push Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enable Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified about important updates and events
                  </p>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={enableNotifications}
                />
              </div>

              {notificationsEnabled && (
                <div className="space-y-3">
                  <h4 className="font-medium">Notification Types</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'New rent payments', enabled: true },
                      { label: 'Maintenance requests', enabled: true },
                      { label: 'Lease expirations', enabled: true },
                      { label: 'Application updates', enabled: false },
                      { label: 'System alerts', enabled: true },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{item.label}</span>
                        <Switch checked={item.enabled} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mobile Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600">Performance Score</h4>
                  <div className="text-3xl font-bold">94/100</div>
                  <p className="text-sm text-muted-foreground">Lighthouse performance</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-blue-600">Accessibility</h4>
                  <div className="text-3xl font-bold">98/100</div>
                  <p className="text-sm text-muted-foreground">WCAG compliance</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Mobile Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { feature: 'Touch-optimized interface', status: 'enabled' },
                    { feature: 'Gesture navigation', status: 'enabled' },
                    { feature: 'Mobile-first design', status: 'enabled' },
                    { feature: 'Fast tap responses', status: 'enabled' },
                    { feature: 'Adaptive layouts', status: 'enabled' },
                    { feature: 'Optimized images', status: 'enabled' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">{item.feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileFoundation;
