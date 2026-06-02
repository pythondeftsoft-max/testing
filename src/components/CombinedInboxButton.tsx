import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare } from 'lucide-react';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useLandlordUnreadMessageCount } from '@/hooks/useLandlordUnreadMessageCount';

interface CombinedInboxButtonProps {
  portfolioId?: string;
  className?: string;
}

export const CombinedInboxButton: React.FC<CombinedInboxButtonProps> = ({ 
  portfolioId = 'everything',
  className = ''
}) => {
  const navigate = useNavigate();
  const { unreadCount: notificationCount } = useNotificationCount();
  const { unreadCount: messageCount } = useLandlordUnreadMessageCount();
  
  // Calculate combined count - display actual number or "9+" if over 9
  const combinedCount = notificationCount + messageCount;
  const displayCount = combinedCount > 9 ? '9+' : combinedCount;
  const hasUnread = combinedCount > 0;

  const handleClick = () => {
    navigate(`/landlord-inbox?portfolioId=${portfolioId}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center h-9 w-auto px-2 sm:h-10 sm:px-3 rounded-lg border transition-all duration-200 ${
        hasUnread 
          ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500'
          : 'border-openkey-blue/20 text-openkey-blue bg-card hover:bg-openkey-blue hover:text-white'
      } ${className}`}
      title="Notifications & Messages"
    >
      <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      <span className="text-xs mx-0.5 sm:mx-1 opacity-50">/</span>
      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      
      {hasUnread && (
        <span className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 bg-destructive text-destructive-foreground rounded-full text-[10px] sm:text-xs font-medium flex items-center justify-center min-w-[16px] sm:min-w-[20px]">
          {displayCount}
        </span>
      )}
    </button>
  );
};

export default CombinedInboxButton;
