import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home,
  Building,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  Bell,
  MessageSquare,
  Wrench,
  Calendar,
  DollarSign,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: string | number;
  subItems?: NavItem[];
}

interface MobileOptimizedSidebarProps {
  userType?: 'landlord' | 'tenant' | 'admin';
  notifications?: number;
}

const MobileOptimizedSidebar = ({ userType = 'landlord', notifications = 0 }: MobileOptimizedSidebarProps) => {
  const { open, setOpen } = useSidebar();
  const collapsed = !open;
  const location = useLocation();
  const isMobile = useIsMobile();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['main']);
  const [isVisible, setIsVisible] = useState(false);

  // Enhanced navigation structure based on user type
  const navigationItems: Record<string, NavItem[]> = {
    landlord: [
      { title: 'Dashboard', url: '/', icon: Home },
      { title: 'Properties', url: '/properties', icon: Building, badge: '12' },
      { title: 'Tenants', url: '/tenants', icon: Users },
      { title: 'Finances', url: '/finances', icon: DollarSign, 
        subItems: [
          { title: 'Cash Flow', url: '/finances/cash-flow', icon: BarChart3 },
          { title: 'Expenses', url: '/finances/expenses', icon: CreditCard },
          { title: 'Reports', url: '/finances/reports', icon: FileText }
        ]
      },
      { title: 'Maintenance', url: '/maintenance', icon: Wrench },
      { title: 'Messages', url: '/messages', icon: MessageSquare, badge: notifications > 0 ? notifications : undefined },
      { title: 'Calendar', url: '/calendar', icon: Calendar },
      { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      { title: 'Settings', url: '/settings', icon: Settings }
    ],
    tenant: [
      { title: 'Dashboard', url: '/', icon: Home },
      { title: 'My Rent', url: '/rent', icon: DollarSign },
      { title: 'Maintenance', url: '/maintenance', icon: Wrench },
      { title: 'Messages', url: '/messages', icon: MessageSquare, badge: notifications > 0 ? notifications : undefined },
      { title: 'Documents', url: '/documents', icon: FileText },
      { title: 'Settings', url: '/settings', icon: Settings }
    ],
    admin: [
      { title: 'Dashboard', url: '/', icon: Home },
      { title: 'Properties', url: '/properties', icon: Building },
      { title: 'Users', url: '/users', icon: Users },
      { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      { title: 'Security', url: '/security', icon: Shield },
      { title: 'Settings', url: '/settings', icon: Settings }
    ]
  };

  const currentItems = navigationItems[userType] || navigationItems.landlord;

  // Handle mobile visibility
  useEffect(() => {
    if (isMobile) {
      setIsVisible(!collapsed);
    } else {
      setIsVisible(true);
    }
  }, [collapsed, isMobile]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && !collapsed) {
      setOpen(false);
    }
  }, [location.pathname, isMobile, setOpen]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getNavItemClassName = (path: string) => cn(
    "w-full justify-start transition-all duration-200 ease-in-out",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    {
      "bg-sidebar-accent text-sidebar-accent-foreground font-medium": isActive(path),
      "text-sidebar-foreground": !isActive(path),
    }
  );

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedGroups.includes(item.title);
    const Icon = item.icon;

    return (
      <SidebarMenuItem key={item.title}>
        {hasSubItems ? (
          <>
            <SidebarMenuButton
              onClick={() => toggleGroup(item.title)}
              className={cn(
                "w-full justify-between",
                level > 0 && "ml-4"
              )}
              style={{ paddingLeft: `${level * 16 + 16}px` }}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="truncate">{item.title}</span>
                )}
              </div>
              
              {!collapsed && (
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </motion.div>
              )}
            </SidebarMenuButton>
            
            <AnimatePresence>
              {isExpanded && !collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 py-1">
                    {item.subItems?.map(subItem => renderNavItem(subItem, level + 1))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              className={getNavItemClassName(item.url)}
              style={{ paddingLeft: `${level * 16 + 16}px` }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate flex-1">{item.title}</span>
                  {item.badge && (
                    <Badge 
                      variant={typeof item.badge === 'number' && item.badge > 0 ? 'destructive' : 'secondary'}
                      className="h-5 text-xs shrink-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    );
  };

  // Mobile overlay
  const MobileOverlay = () => (
    <AnimatePresence>
      {isMobile && !collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </AnimatePresence>
  );

  return (
    <>
      <MobileOverlay />
      
      <Sidebar
        className={cn(
          "transition-all duration-300 ease-in-out border-r border-sidebar-border",
          isMobile && "fixed inset-y-0 left-0 z-50",
          collapsed && isMobile && "-translate-x-full",
          !collapsed && isMobile && "translate-x-0"
        )}
        collapsible={isMobile ? "none" : "icon"}
      >
        {/* Header with trigger */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!collapsed && (
            <motion.div
              initial={isMobile ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-blue-gold flex items-center justify-center">
                <Building className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-sidebar-foreground">OpenKey</span>
            </motion.div>
          )}
          
          <SidebarTrigger className="p-1.5">
            {isMobile ? (
              collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </SidebarTrigger>
        </div>

        <SidebarContent>
          <ScrollArea className="flex-1">
            <SidebarGroup>
              <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {currentItems.map(item => renderNavItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </ScrollArea>

          {/* Footer */}
          {!collapsed && (
            <motion.div
              initial={isMobile ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="p-4 border-t border-sidebar-border"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                asChild
              >
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Help & Support</span>
                </div>
              </Button>
            </motion.div>
          )}
        </SidebarContent>
      </Sidebar>
    </>
  );
};

export default MobileOptimizedSidebar;