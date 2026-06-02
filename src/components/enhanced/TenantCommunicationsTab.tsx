
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Send, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  User,
  Building2
} from 'lucide-react';
import { EnhancedTenantProfileData } from '@/hooks/useEnhancedTenantProfile';

interface TenantCommunicationsTabProps {
  tenantData: EnhancedTenantProfileData;
}

export const TenantCommunicationsTab = ({ tenantData }: TenantCommunicationsTabProps) => {
  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'payment': return 'bg-green-100 text-green-800 border-green-300';
      case 'lease': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'general': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const unreadCount = tenantData.communications.filter(c => !c.readAt).length;
  const totalMessages = tenantData.communications.length;

  return (
    <div className="space-y-6">
      {/* Communication Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {totalMessages}
            </div>
            <div className="text-sm text-gray-600">Total Messages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {unreadCount}
            </div>
            <div className="text-sm text-gray-600">Unread Messages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {tenantData.analytics.averageResponseTime ? 
                `${tenantData.analytics.averageResponseTime.toFixed(1)}h` : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Avg Response Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Message Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Communications
            </span>
            <Button size="sm" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              New Message
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalMessages === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No communications yet</h3>
              <p className="text-sm">Start a conversation with this tenant to keep track of all interactions.</p>
              <Button className="mt-4" size="sm">
                <Send className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {tenantData.communications.map((message) => (
                  <div key={message.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {message.senderType === 'tenant' ? (
                            <User className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Building2 className="h-4 w-4 text-green-600" />
                          )}
                          <span className="font-medium capitalize">
                            {message.senderType}
                          </span>
                        </div>
                        <Badge className={getMessageTypeColor(message.messageType)}>
                          {message.messageType}
                        </Badge>
                        <Badge className={getPriorityColor(message.priority)}>
                          {message.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(message.sentAt).toLocaleDateString()} {new Date(message.sentAt).toLocaleTimeString()}
                        {message.readAt ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-orange-600" />
                        )}
                      </div>
                    </div>
                    
                    {message.subject && (
                      <h4 className="font-medium mb-2">{message.subject}</h4>
                    )}
                    
                    <p className="text-gray-700 text-sm mb-2">
                      {message.messageContent}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Status: {message.status}</span>
                      {message.readAt && (
                        <span>Read: {new Date(message.readAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
