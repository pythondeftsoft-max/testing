import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { OfflineBanner } from './OfflineBanner';
import { ClipboardList, RefreshCw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
}

const InspectorLayout: React.FC<Props> = ({ children }) => {
  const { pathname } = useLocation();
  const item = (to: string, label: string, Icon: any) => (
    <Link
      to={to}
      className={cn(
        'flex-1 flex flex-col items-center gap-0.5 py-2 text-xs',
        pathname.startsWith(to) ? 'text-primary font-medium' : 'text-muted-foreground',
      )}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <OfflineBanner />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-card flex z-40">
        {item('/inspector/today', 'Today', ClipboardList)}
        {item('/inspector/sync', 'Sync', RefreshCw)}
        <Link
          to="/"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground"
        >
          <Home className="w-5 h-5" />
          Exit
        </Link>
      </nav>
    </div>
  );
};

export default InspectorLayout;
