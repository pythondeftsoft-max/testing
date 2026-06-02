import React, { useState, useEffect } from 'react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, ChevronRight } from 'lucide-react';
import type { AgencyNavItem } from './agencyNavConfig';

interface Props {
  items: AgencyNavItem[];
  activeTab: string;
  activeSub: string;
  onSelect: (tab: string, sub?: string) => void;
  agencyName: string;
  roleName: string;
  role: string;
}

export const AgencyAppSidebar: React.FC<Props> = ({
  items, activeTab, activeSub, onSelect, agencyName, roleName,
}) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  // Accordion: only one group open at a time.
  const [openGroup, setOpenGroup] = useState<string>(activeTab);
  useEffect(() => { setOpenGroup(activeTab); }, [activeTab]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{agencyName}</p>
              <p className="text-xs text-muted-foreground truncate">{roleName}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.value === activeTab;
                const hasChildren = !!item.children?.length;

                if (!hasChildren) {
                  return (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => {
                          onSelect(item.value);
                          setOpenGroup(item.value);
                        }}
                        className={isActive ? 'bg-primary/10 text-primary font-medium' : ''}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isOpen = openGroup === item.value;

                return (
                  <Collapsible
                    key={item.value}
                    open={isOpen}
                    onOpenChange={(o) => setOpenGroup(o ? item.value : '')}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.label}
                          onClick={() => {
                            if (collapsed) onSelect(item.value, item.defaultSub);
                          }}
                          className={isActive ? 'bg-primary/10 text-primary font-medium' : ''}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                          <ChevronRight className="ml-auto w-4 h-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children!.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = isActive && sub.value === activeSub;
                            return (
                              <SidebarMenuSubItem key={sub.value}>
                                <SidebarMenuSubButton
                                  isActive={isSubActive}
                                  onClick={() => onSelect(item.value, sub.value)}
                                  className={
                                    isSubActive
                                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
                                      : ''
                                  }
                                >
                                  <SubIcon className="w-3.5 h-3.5" />
                                  <span>{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground px-2 py-1">OpenKey Agency Portal</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
