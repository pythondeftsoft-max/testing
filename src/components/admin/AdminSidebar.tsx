import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, Building2, FolderOpen, ShieldCheck, Shield, Gift, CreditCard, Palette, FileText, Mail, BarChart3, Activity, MessageSquare, MessageCircle, Users, Calendar, Bell, DollarSign, MapPin, Trophy, Wrench, Calculator, Presentation, Lightbulb, Code2, Clock, Network, LifeBuoy, TrendingUp, ClipboardCheck, FlaskConical } from 'lucide-react';
import { useSmsSystemEnabled } from '@/hooks/useSmsSystemEnabled';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  pendingAccessRequests: number;
}

export function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  searchParams,
  setSearchParams,
  pendingAccessRequests 
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { enabled: smsEnabled } = useSmsSystemEnabled();
  
  const handleNavigation = (tab: string) => {
    // Always navigate to /admin with the tab parameter
    navigate(`/admin?tab=${tab}`);
  };
  
  const menuItems = {
    dashboard: [
      { value: 'overview', label: 'Dashboard Home', icon: Home }
    ],
    management: [
      { value: 'house-hunter', label: 'Match Maker', icon: Search },
      { value: 'property-management', label: 'Property Mgmt', icon: Building2 },
      { value: 'client-services', label: 'Client Services', icon: Users },
      { value: 'lease-renewals', label: 'Lease Renewals', icon: Calendar },
      { value: 'territories-teams', label: 'Territories & Teams', icon: MapPin },
      { value: 'directory', label: 'Directory', icon: FolderOpen },
    ],
    communications: [
      { value: 'communications', label: 'Email Hub', icon: Mail },
      { value: 'messages', label: 'Messages', icon: MessageSquare },
      { value: 'admin-messaging', label: 'Admin Messaging', icon: MessageCircle },
      ...(smsEnabled ? [{ value: 'worker-messaging', label: 'My Messages', icon: MessageCircle }] : []),
      { value: 'notification-center', label: 'Notification Center', icon: Bell },
      { value: 'maintenance', label: 'Maintenance', icon: Wrench },
    ],
    analytics: [
      { value: 'overview', label: 'Analytics', icon: BarChart3, isAnalytics: true },
      { value: 'activity', label: 'Activity', icon: Activity },
      { value: 'worker-performance', label: 'Worker Performance', icon: Trophy },
      { value: 'formulas', label: 'Formulas', icon: Calculator },
      { value: 'time-clocked', label: 'Time Clocked', icon: Clock },
      { value: 'growth-traction', label: 'Growth Traction', icon: TrendingUp, route: '/admin/growth-traction' },
    ],
    administration: [
      { 
        value: 'access-permissions', 
        label: 'Access & Permissions', 
        icon: ShieldCheck,
        badge: pendingAccessRequests > 0 ? pendingAccessRequests : undefined
      },
      { 
        value: 'important', 
        label: 'Important', 
        icon: FileText
      },
      { value: 'enterprise-security', label: 'Security', icon: Shield },
      { value: 'agent-command-center', label: 'AI Agents', icon: Users },
      { value: 'agent-api', label: 'API', icon: Code2 },
      { value: 'system-map', label: 'System Map', icon: Network },
    ],
    system: [
      { value: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
      { value: 'points-referrals', label: 'Points & Referrals', icon: Gift },
      { value: 'billing', label: 'Billing', icon: CreditCard },
      { value: 'rent-tracking', label: 'Rent Tracking', icon: DollarSign },
      { value: 'white-label', label: 'White Label', icon: Palette },
      { value: 'blog', label: 'Content', icon: FileText },
      { value: 'implementation-center', label: 'Implementation Center', icon: FileText },
    ],
    business: [
      { value: 'sales-pipeline', label: 'Sales Pipeline', icon: DollarSign },
      { value: 'cost-estimator', label: 'Cost Estimator', icon: Calculator },
      { value: 'support-tickets', label: 'Support Tickets', icon: LifeBuoy },
      { value: 'pitch-deck', label: 'Pitch Deck', icon: Presentation },
      { value: 'workflow-figures', label: 'Workflow Figures', icon: FileText },
    ],
    innovation: [
      { value: 'innovation-inbox', label: 'Innovation Inbox', icon: Lightbulb },
    ],
    agency: [
      { value: 'agency-sales', label: 'Agency Sales', icon: TrendingUp },
      { value: 'agency-management', label: 'Agency Management', icon: Building2 },
      { value: 'agency-map', label: 'Agency Map', icon: MapPin },
      { value: 'competitive-analysis', label: 'Competitive Analysis', icon: BarChart3 },
      { value: 'platform-analytics', label: 'Platform Analytics', icon: Activity },
    ],
    qa: [
      { value: 'launch-checklist', label: 'Launch Checklist', icon: ClipboardCheck, route: '/admin/qa/launch-checklist' },
      { value: 'multi-agency-qa', label: 'Multi-Agency Harness', icon: FlaskConical, route: '/admin/qa/multi-agency' },
    ]
  };

  const renderMenuItem = (item: any) => {
    const isActive = activeTab === item.value;
    const Icon = item.icon;
    const handleClick = () => {
      if (item.route) {
        navigate(item.route);
      } else {
        handleNavigation(item.value);
      }
    };

    return (
      <SidebarMenuItem key={item.value}>
        <SidebarMenuButton 
          onClick={handleClick}
          className={cn(
            "w-full justify-start cursor-pointer",
            isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          )}
        >
          <Icon className="w-4 h-4" />
          {!collapsed && (
            <>
              <span>{item.label}</span>
              {item.badge && (
                <Badge variant="destructive" className="ml-auto px-1.5 py-0 text-xs">
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Sidebar Header with Collapse Button */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && <span className="font-semibold text-sidebar-foreground">Menu</span>}
        <SidebarTrigger className={collapsed ? "mx-auto" : "ml-auto"} />
      </div>

      <SidebarContent>
        {/* Dashboard Home */}
        <SidebarGroup>
          <SidebarMenu>
            {menuItems.dashboard.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Management Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.management.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Communications Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Communications</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.communications.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Analytics Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.analytics.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Administration Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.administration.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.system.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Business Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.business.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Innovation Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Innovation</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.innovation.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* Agency Portal Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Agency Portal</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.agency.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>

        {/* QA Section */}
        <SidebarGroup>
          <SidebarGroupLabel>QA</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.qa.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
