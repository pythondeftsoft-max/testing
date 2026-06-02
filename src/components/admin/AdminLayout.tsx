import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings } from 'lucide-react';
import { QuickCaptureWidget } from '@/components/innovation/QuickCaptureWidget';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccessRequests } from '@/hooks/useAccessRequests';
import { useAuth } from '@/providers/AuthProvider';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function AdminLayout({ children, activeTab = '' }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: accessRequests } = useAccessRequests();
  const { user, signOut } = useAuth();
  const pendingAccessRequests = accessRequests?.filter(req => req.status === 'pending').length || 0;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSetActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams);
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar 
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          pendingAccessRequests={pendingAccessRequests}
        />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-card border-b border-border sticky top-0 z-40 h-16">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="text-xl font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  OpenKey
                </button>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4">
                <QuickCaptureWidget />
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Platform Administrator</p>
                </div>
                <Button 
                  onClick={handleSignOut} 
                  variant="outline"
                  size="sm"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
